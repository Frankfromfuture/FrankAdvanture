/**
 * Frank's Adventure headless AI simulator.
 *
 * Runs the real game engine without opening a browser:
 * - auto deploys the active production line
 * - resolves months with seeded randomness
 * - enters board meetings and makes stochastic "good enough" decisions
 * - records income, valuation, cash, burn, draws, cards, AP, and stage changes
 *
 * Usage:
 *   npm run simulate -- --runs 20 --months 60 --seed 42
 *   npm run simulate -- --runs 1 --json --out /tmp/frank-sim.json
 */

import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import {
  autoDeployActiveLine,
  claimRivalReward,
  computeBattlePreview,
  computeBusinessModelStats,
  computeMonthlyBurn,
  computeMonthlyScalePressure,
  computeValuation,
  createInitialState,
  discardFromHand,
  dismissCardInBoardMeeting,
  enterIntermission,
  exitIntermission,
  getActiveLine,
  getAllCards,
  getEffectiveApLimit,
  getLineAp,
  openPack,
  pickHighlightCard,
  playFunctionCard,
  purchaseBusinessModel,
  purchaseShopItem,
  resolveEvent,
  resolveMonth,
  rollSchool,
  rollShop,
  setCompetitiveAction,
  upgradeCard,
} from './engine.js'
import {
  BUSINESS_MODELS,
  UPGRADE_PATHS,
  getBMAssetValue,
  getBMMonthlyCost,
  getCardAssetValue,
  getCardBurn,
  getCardExtraBurn,
  getMonthlyOperationCost,
} from './cards.js'
import { COMPETITIVE_ACTIONS } from './rivals.js'

const RARITY_SCORE = { common: 0, rare: 8, elite: 18, epic: 34, legendary: 72 }
const TIER_SCORE = { 专员: 0, 经理: 8, 总监: 18, VP: 34, CXO: 56, 创始人: 46, 基础: 0, 进阶: 12, 顶级: 30, 功能: 8 }
const VERSION = 'headless-ai-v2-boss'
const COMPETITIVE_ACTION_BY_ID = Object.fromEntries(COMPETITIVE_ACTIONS.map((action) => [action.id, action]))

export function seedRng(seed) {
  let state = seed >>> 0
  return function rng() {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function parseArgs(argv) {
  const args = {
    runs: 10,
    months: 72,
    seed: 42,
    profession: 'scientist',
    json: false,
    out: '',
    verbose: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--json') args.json = true
    else if (arg === '--verbose') args.verbose = true
    else if (arg === '--runs') args.runs = Number(argv[++i] ?? args.runs)
    else if (arg === '--months') args.months = Number(argv[++i] ?? args.months)
    else if (arg === '--seed') args.seed = Number(argv[++i] ?? args.seed)
    else if (arg === '--profession') args.profession = argv[++i] ?? args.profession
    else if (arg === '--out') args.out = argv[++i] ?? ''
  }
  return args
}

function randInt(rng, max) {
  return Math.floor(rng() * max)
}

function randomTop(rng, items, scoreFn, topN = 2) {
  const scored = items
    .map((item) => ({ item, score: scoreFn(item) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score)
  if (!scored.length) return null
  const pool = scored.slice(0, Math.max(1, Math.min(topN, scored.length)))
  return pool[randInt(rng, pool.length)].item
}

function cardScore(card) {
  if (!card) return -Infinity
  const output = card.baseOutput ?? 0
  const asset = getCardAssetValue(card)
  const burn = getCardBurn(card)
  const extraBurn = getCardExtraBurn(card)
  const ap = card.ap ?? 0
  const rarity = RARITY_SCORE[card.rarity] ?? 0
  const tier = TIER_SCORE[card.tier] ?? 0
  const typeBonus = card.type === 'emp' ? 12 : card.type === 'fun' ? 18 : 10
  const effectBonus = (card.effects?.length ?? 0) * 6 + (card.affixEffects?.length ?? 0) * 5
  return output * 1.15 + asset * 1.2 + rarity + tier + typeBonus + effectBonus - burn * 9 - extraBurn * 4 - ap * 8
}

function businessModelScore(bm) {
  if (!bm) return -Infinity
  const asset = getBMAssetValue(bm)
  const monthlyCost = getBMMonthlyCost(bm)
  const rarity = RARITY_SCORE[bm.rarity] ?? 0
  const effectText = `${bm.description ?? ''} ${bm.payload?.type ?? ''}`
  let effectBonus = 0
  if (/ap|AP|draw|hand|ccr|income|Bonus|Multiplier|discount|waive/i.test(effectText)) effectBonus += 32
  if (/maintenance|burn|Cost|discount|waive/i.test(effectText)) effectBonus += 20
  if (/slot|legendary|epic/i.test(effectText)) effectBonus += 16
  return asset * 1.3 + rarity + effectBonus - bm.cost * 0.9 - monthlyCost * 8
}

function battleSnapshot(battle) {
  if (!battle) return null
  return {
    active: !!battle.active,
    archetypeId: battle.archetypeId,
    archetypeName: battle.archetypeName,
    rivalName: battle.rivalName,
    tier: battle.tier,
    isUltimate: !!battle.isUltimate,
    playerShare: battle.playerShare,
    rivalShare: battle.rivalShare,
    monthsElapsed: battle.monthsElapsed ?? 0,
    lastShareDelta: battle.lastShareDelta ?? 0,
    lastRivalIncome: battle.lastRivalIncome ?? battle.estimatedMonthlyIncome ?? 0,
    lastEffectivePlayerIncome: battle.lastEffectivePlayerIncome ?? 0,
    pendingAction: battle.pendingAction ?? null,
  }
}

function upcomingRivalSnapshot(rival) {
  if (!rival) return null
  return {
    archetypeId: rival.archetypeId,
    archetypeName: rival.archetypeName,
    rivalName: rival.name,
    tier: rival.tier,
    isUltimate: !!rival.isUltimate,
    estimatedMonthlyIncome: rival.estimatedMonthlyIncome,
    startElapsedMonth: rival.startElapsedMonth,
  }
}

function summarizeCards(cards) {
  const counts = {}
  for (const card of cards) {
    const key = `${card.type}:${card.rarity}:${card.tier ?? '-'}`
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

function snapshot(state, extra = {}) {
  const preview = computeBattlePreview(state)
  const bmStats = computeBusinessModelStats(state)
  const activeLine = getActiveLine(state)
  const allCards = getAllCards(state)
  const activeBMs = (state.activeBusinessModels ?? [])
    .map((slot) => BUSINESS_MODELS.find((bm) => bm.id === slot.id))
    .filter(Boolean)
  return {
    date: `${state.year}.${String(state.month).padStart(2, '0')}`,
    elapsedMonths: state.elapsedMonths ?? 0,
    stageId: state.stage.id,
    stage: state.stage.name,
    stageMonths: (state.elapsedMonths ?? 0) - (state.stageStartedElapsedMonths ?? 0),
    majorEvent: state.majorEvent ? {
      id: state.majorEvent.id,
      name: state.majorEvent.name,
      remainingMonths: state.majorEvent.remainingMonths,
    } : null,
    majorEventCountdown: state.majorEventCountdown,
    valuation: state.valuation,
    computedValuation: computeValuation(state),
    cash: state.cash,
    retainedEarnings: state.retainedEarnings,
    lastMonthProfit: state.lastMonthProfit,
    income: preview.eventIncome,
    rawIncome: preview.rawIncome,
    burn: preview.maintenance,
    profit: preview.profit,
    cashDelta: preview.cashDelta,
    cashGain: preview.cashGain,
    ccr: preview.ccr,
    opCost: getMonthlyOperationCost(state.stage.id) + computeMonthlyScalePressure(state),
    apUsed: getLineAp(activeLine?.slots ?? [], bmStats),
    apLimit: getEffectiveApLimit(state, activeLine?.slots ?? []),
    baseBurn: computeMonthlyBurn(state),
    burnSources: {
      cards: allCards.reduce((sum, card) => sum + getCardBurn(card), 0),
      extraActiveLine: (getActiveLine(state)?.slots ?? []).reduce((sum, card) => sum + (card ? getCardExtraBurn(card) : 0), 0),
      businessModels: activeBMs.reduce((sum, bm) => sum + getBMMonthlyCost(bm), 0),
    },
    assets: {
      cards: allCards.reduce((sum, card) => sum + getCardAssetValue(card), 0),
      businessModels: activeBMs.reduce((sum, bm) => sum + getBMAssetValue(bm), 0),
    },
    piles: {
      hand: state.hand.length,
      drawPile: state.drawPile.length,
      coolingPile: state.coolingPile.length,
      allCards: allCards.length,
    },
    cardSummary: summarizeCards(allCards),
    activeBusinessModels: activeBMs.map((bm) => ({
      id: bm.id,
      name: bm.name,
      rarity: bm.rarity,
      monthlyCost: getBMMonthlyCost(bm),
      score: Math.round(businessModelScore(bm)),
    })),
    battle: battleSnapshot(state.battle),
    upcomingRival: upcomingRivalSnapshot(state.upcomingRival),
    defeatedRivals: [...(state.defeatedRivals ?? [])],
    rivalRewardPending: state.rivalRewardPending?.length ?? 0,
    lines: state.lines.map((line) => ({
      id: line.id,
      status: line.status,
      ap: getLineAp(line.slots, bmStats),
      cards: line.slots.map((card) => card ? {
        id: card.id,
        name: card.name,
        type: card.type,
        rarity: card.rarity,
        tier: card.tier,
        ap: card.ap,
        output: card.baseOutput ?? 0,
        burn: getCardBurn(card),
        score: Math.round(cardScore(card)),
      } : null),
    })),
    ...extra,
  }
}

function cardIds(cards) {
  return new Set(cards.map((card) => card.uid))
}

function chooseBoardEventOption(state, rng) {
  const im = state.intermissionState
  const valid = im.event.options.filter((option) => !option.cost || state.cash >= option.cost)
  return randomTop(rng, valid, (option) => {
    const effect = option.effect ?? {}
    let score = 0
    if (option.cost) score -= option.cost * 4
    switch (effect.type) {
      case 'noop': score += 8; break
      case 'removeBudgetBonus': score += (effect.value ?? 0) * 8 - 12; break
      case 'recruitLegendary': score += 95; break
      case 'increaseNextTarget': score -= 70; break
      case 'budgetGainNextMonthPenalty': score += (effect.budget ?? 0) * 10 - 25; break
      case 'unlockEpic': score += 45; break
      case 'gamble': score += ((effect.win ?? 0) + (effect.lose ?? 0)) * 4; break
      case 'increaseBmSlot': score += 70; break
      case 'budgetGain': score += (effect.value ?? 0) * 10; break
      default: score += 0
    }
    return score + rng() * 8
  }, 2)
}

function choosePackPick(contents) {
  let bestIndex = 0
  let bestScore = -Infinity
  contents.forEach((item, index) => {
    let score = 0
    if (item.isBusinessModel) {
      const bm = BUSINESS_MODELS.find((candidate) => candidate.id === item.bmId)
      score = businessModelScore(bm)
    } else {
      score = cardScore(item)
    }
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })
  return bestIndex
}

function estimateCompetitiveActionCost(action, preview) {
  let cashCost = action.cashCost ?? 0
  if (action.cashAsPercentProfit) {
    cashCost += Math.round(Math.max(0, preview.profit ?? 0) * action.cashAsPercentProfit)
  }
  return cashCost
}

function chooseCompetitiveAction(state, rng) {
  if (!state.battle?.active || state.battle.pendingAction) return null
  const preview = computeBattlePreview(state)
  const battle = state.battle
  const candidates = COMPETITIVE_ACTIONS
    .map((action) => {
      const cashCost = estimateCompetitiveActionCost(action, preview)
      const apCost = action.apCost ?? 0
      return { action, cashCost, apCost }
    })
    .filter(({ cashCost, apCost }) => state.cash >= cashCost && state.apAvailable >= apCost)

  return randomTop(rng, candidates, ({ action, cashCost, apCost }) => {
    if (action.id === 'skip') return 5 + rng()
    let score = 0
    const rivalIncome = battle.lastRivalIncome ?? battle.estimatedMonthlyIncome ?? 0
    const shareNeed = 80 - (battle.playerShare ?? 50)
    const danger = Math.max(0, 35 - (battle.playerShare ?? 50))
    const monthsLeft = Math.max(1, 6 - (battle.monthsElapsed ?? 0))

    if (action.id === 'price-war') {
      score += 36
      score += shareNeed <= 14 ? 28 : 0
      score += monthsLeft <= 2 ? 18 : 0
      score += preview.profit > 0 ? 10 : -12
    } else if (action.id === 'brand-push') {
      score += 24
      score += rivalIncome > preview.eventIncome ? 22 : 4
      score += state.cash > cashCost + 300 ? 12 : -18
    } else if (action.id === 'poach') {
      score += 18
      score += ['talent-raider', 'copycat-king', 'ultimate'].includes(battle.archetypeId) ? 28 : 0
      score += danger > 0 ? 10 : 0
      score += state.cash > cashCost + 500 ? 8 : -22
    }

    score += danger * 0.8
    score -= cashCost * 0.08
    score -= apCost * 10
    return score + rng() * 6
  }, 2)?.action ?? COMPETITIVE_ACTION_BY_ID.skip
}

function functionOptionScore(state, card, option) {
  const effectText = JSON.stringify(option.effect ?? {})
  const preview = computeBattlePreview(state)
  let score = cardScore(card) * 0.08
  const cost = option.cost ?? option.effect?.cost ?? 0
  if (state.cash < cost) return -Infinity
  score -= cost * 0.18
  if (/rivalDebuff|skillBlocked/.test(effectText)) score += state.battle?.active ? 55 : state.upcomingRival ? 18 : -8
  if (/delayBoss/.test(effectText)) score += state.upcomingRival ? 50 : state.battle?.active ? 28 : 4
  if (/cashToRunway/.test(effectText)) score += preview.cashDelta < 0 ? 42 : computeMonthlyBurn(state) > state.cash * 0.18 ? 24 : 2
  if (/emergencyBoard/.test(effectText)) score += !state.emergencyBoardMeetingPending && computeValuation(state) > (state.stage?.threshold ?? 0) * 1.15 ? 22 : -10
  if (/peBuff/.test(effectText)) score += preview.profit > 0 ? 26 : 6
  if (/drawSelect/.test(effectText)) score += state.hand.length <= 5 ? 18 : 7
  return score
}

function chooseFunctionCardAction(state, rng) {
  if (state.discardRequired > 0) return null
  const candidates = state.hand
    .filter((card) => card.type === 'fun' && (card.actionOptions?.length ?? 0) > 0)
    .flatMap((card) => card.actionOptions.map((option) => ({ card, option })))
  if (!candidates.length) return null
  const picked = randomTop(rng, candidates, ({ card, option }) => functionOptionScore(state, card, option), 2)
  if (!picked) return null
  const score = functionOptionScore(state, picked.card, picked.option)
  if (score < 18 && rng() > 0.18) return null
  return picked
}

function worstBusinessModelIndex(state) {
  let worstIndex = 0
  let worstScore = Infinity
  state.activeBusinessModels.forEach((slot, index) => {
    const bm = BUSINESS_MODELS.find((candidate) => candidate.id === slot.id)
    const score = businessModelScore(bm)
    if (score < worstScore) {
      worstScore = score
      worstIndex = index
    }
  })
  return worstIndex
}

function chooseEmployeeForHr(state) {
  const cards = getAllCards(state).filter((card) => card.type === 'emp' && UPGRADE_PATHS[card.tier])
  return randomTop(nullSafeRng, cards, (card) => {
    const path = UPGRADE_PATHS[card.tier]
    return cardScore(card) + (path ? 30 - path.cost : -100)
  }, 3)
}

const nullSafeRng = () => 0.42

function handleBoardMeeting(state, rng, log) {
  let current = state
  const entered = enterIntermission(current, rng)
  if (!entered.ok) return current
  current = entered.state
  log.push({
    type: 'boardEnter',
    stage: current.result?.stagePromotion ? current.result?.nextStage?.name : current.stage.name,
    promotion: !!current.result?.stagePromotion,
    cash: current.cash,
  })

  const option = chooseBoardEventOption(current, rng)
  if (option) {
    const resolved = resolveEvent(current, option.id, rng)
    if (resolved.ok) {
      current = resolved.state
      log.push({ type: 'boardEvent', option: option.label, cash: current.cash })
    }
  }

  if (current.intermissionState?.phase === 'hub') {
    if (rng() < 0.35 && current.cash >= 9) {
      const rolled = rollShop(current, rng)
      if (rolled.ok) current = rolled.state
    }

    for (const slotKey of ['legendary', 'epic']) {
      const item = current.intermissionState?.shopRoll?.[slotKey === 'legendary' ? 'legendaryCard' : 'epicCard']
      const cost = current.intermissionState?.shopRoll?.[slotKey === 'legendary' ? 'legendaryCost' : 'epicCost']
      if (item && cost && current.cash >= cost && cardScore(item) > cost * 3.5) {
        const bought = purchaseShopItem(current, slotKey)
        if (bought.ok) {
          current = bought.state
          log.push({ type: 'shopCard', card: item.name, cost, cash: current.cash })
        }
      }
    }

    const packs = current.intermissionState?.shopRoll?.packs ?? []
    for (let index = 0; index < packs.length; index++) {
      const pack = packs[index]
      if (!pack || current.cash < pack.cost || rng() < 0.35) continue
      const opened = openPack(current, index)
      if (!opened.ok) continue
      current = opened.state
      const pickIndex = choosePackPick(pack.contents)
      const picked = openPack(current, index, pickIndex)
      if (picked.ok) {
        current = picked.state
        const item = pack.contents[pickIndex]
        log.push({ type: 'pack', pack: pack.packDef.name, pick: item.bmName ?? item.name, cost: pack.cost, cash: current.cash })
      }
    }

    if (rng() < 0.3 && current.cash >= 8) {
      const card = chooseEmployeeForHr(current)
      if (card) {
        const path = UPGRADE_PATHS[card.tier]
        if (path && current.cash >= path.cost) {
          const upgraded = upgradeCard(current, card.uid, 'tier')
          if (upgraded.ok) {
            current = upgraded.state
            log.push({ type: 'hrUpgrade', card: card.name, from: card.tier, to: path.next, cash: current.cash })
          }
        }
      }
    }

    if (rng() < 0.25 && current.cash >= 4) {
      const rolled = rollSchool(current, rng)
      if (rolled.ok) current = rolled.state
    }

    const schoolRoll = current.intermissionState?.schoolRoll ?? []
    const schoolOptions = schoolRoll
      .map((id, index) => ({ index, bm: BUSINESS_MODELS.find((candidate) => candidate.id === id) }))
      .filter((entry) => entry.bm && current.cash >= entry.bm.cost)
    const pickedBm = randomTop(rng, schoolOptions, (entry) => businessModelScore(entry.bm) - entry.bm.cost * 0.8, 2)
    if (pickedBm && businessModelScore(pickedBm.bm) > pickedBm.bm.cost * 1.2) {
      let replaceIdx = null
      if (current.activeBusinessModels.length >= current.businessModelSlotCap) {
        replaceIdx = worstBusinessModelIndex(current)
        const oldBm = BUSINESS_MODELS.find((bm) => bm.id === current.activeBusinessModels[replaceIdx]?.id)
        if (businessModelScore(pickedBm.bm) <= businessModelScore(oldBm) + 15) replaceIdx = null
      }
      if (current.activeBusinessModels.length < current.businessModelSlotCap || replaceIdx !== null) {
        const bought = purchaseBusinessModel(current, pickedBm.index, replaceIdx)
        if (bought.ok) {
          current = bought.state
          log.push({ type: 'schoolBm', bm: pickedBm.bm.name, cost: pickedBm.bm.cost, cash: current.cash })
        }
      }
    }

    if (current.cash < computeMonthlyBurn(current) * 1.4 && rng() < 0.45) {
      const weakest = randomTop(rng, getAllCards(current).filter((card) => card.type !== 'emp' || card.tier !== '创始人'), (card) => -cardScore(card), 2)
      if (weakest && getCardBurn(weakest) >= 3) {
        const dismissed = dismissCardInBoardMeeting(current, weakest.uid)
        if (dismissed.ok) {
          current = dismissed.state
          log.push({ type: 'dismiss', card: weakest.name, burnSaved: getCardBurn(weakest), cash: current.cash })
        }
      }
    }
  }

  const exited = exitIntermission(current, rng)
  if (exited.ok) {
    current = exited.state
    log.push({ type: 'boardExit', stage: current.stage.name, cash: current.cash, valuation: current.valuation })
  }
  return current
}

function playOneMonth(state, rng, monthIndex) {
  const before = snapshot(state)
  const beforeHand = cardIds(state.hand)
  const decisions = []

  while (state.discardRequired > 0) {
    const toss = randomTop(rng, state.hand, (card) => -cardScore(card), 2)
    if (!toss) break
    const discarded = discardFromHand(state, toss.uid)
    if (!discarded.ok) break
    decisions.push({ type: 'discard', card: toss.name })
    state = discarded.state
  }

  const functionAction = chooseFunctionCardAction(state, rng)
  if (functionAction) {
    const played = playFunctionCard(state, functionAction.card.uid, functionAction.option.id, rng)
    if (played.ok) {
      state = played.state
      decisions.push({ type: 'functionCard', card: functionAction.card.name, option: functionAction.option.label })
    } else {
      decisions.push({ type: 'functionCardFailed', card: functionAction.card.name, reason: played.message })
    }
  }

  const activeLine = getActiveLine(state)
  if (activeLine?.status === 'planning' && activeLine.slots.every((slot) => !slot)) {
    const deployed = autoDeployActiveLine(state)
    if (deployed.ok) {
      state = deployed.state
      const line = getActiveLine(state)
      decisions.push({
        type: 'autoDeploy',
        lineId: line?.id,
        ap: getLineAp(line?.slots ?? []),
        cards: (line?.slots ?? []).filter(Boolean).map((card) => card.name),
      })
    }
  }

  if (state.battle?.active && !state.battle.pendingAction) {
    const action = chooseCompetitiveAction(state, rng)
    if (action) {
      const acted = setCompetitiveAction(state, action.id)
      if (acted.ok) {
        const cashCost = acted.state.battle?.pendingActionCost ?? 0
        state = acted.state
        decisions.push({
          type: 'competitiveAction',
          action: action.name,
          actionId: action.id,
          cashCost,
          apCost: action.apCost ?? 0,
        })
      } else {
        decisions.push({ type: 'competitiveActionFailed', action: action.name, reason: acted.message })
      }
    }
  }

  const previewBeforeSettle = computeBattlePreview(state)
  const battleBeforeSettle = battleSnapshot(state.battle)
  const upcomingBeforeSettle = upcomingRivalSnapshot(state.upcomingRival)
  const defeatedBeforeSettle = state.defeatedRivals?.length ?? 0
  const activeLineBeforeSettle = getActiveLine(state)
  const bmStatsBeforeSettle = computeBusinessModelStats(state)
  const usedApBeforeSettle = getLineAp(activeLineBeforeSettle?.slots ?? [], bmStatsBeforeSettle)
  const apLimitBeforeSettle = getEffectiveApLimit(state, activeLineBeforeSettle?.slots ?? [])
  const settled = resolveMonth(state, rng)
  if (!settled.ok) {
    return {
      state,
      record: { monthIndex, before, error: settled.message, decisions },
      done: true,
    }
  }

  state = settled.state
  const afterResolve = snapshot(state)
  const battleAfterResolve = battleSnapshot(state.battle)
  const upcomingAfterResolve = upcomingRivalSnapshot(state.upcomingRival)
  const defeatedAfterResolve = state.defeatedRivals?.length ?? 0
  const afterHand = cardIds(state.hand)
  const drawnCards = state.hand
    .filter((card) => !beforeHand.has(card.uid) && afterHand.has(card.uid))
    .map((card) => ({ id: card.id, name: card.name, rarity: card.rarity, tier: card.tier, ap: card.ap, burn: getCardBurn(card) }))

  const settlement = state.lastSettlement
  const record = {
    monthIndex,
    before,
    previewBeforeSettle: {
      income: previewBeforeSettle.eventIncome,
      burn: previewBeforeSettle.maintenance,
      profit: previewBeforeSettle.profit,
      cashDelta: previewBeforeSettle.cashDelta,
      ap: `${usedApBeforeSettle}/${apLimitBeforeSettle}`,
    },
    settlement: settlement ? {
      month: settlement.month,
      income: settlement.income,
      rawIncome: settlement.rawIncome,
      burn: settlement.maintenance,
      apCarry: settlement.apCarry,
      usedAp: settlement.usedAp,
    } : null,
    after: afterResolve,
    drawnCards,
    decisions,
    board: [],
    boss: {
      before: battleBeforeSettle,
      after: battleAfterResolve,
      upcomingBefore: upcomingBeforeSettle,
      upcomingAfter: upcomingAfterResolve,
      previewStarted: !upcomingBeforeSettle && !!upcomingAfterResolve,
      battleStarted: !battleBeforeSettle && !!battleAfterResolve,
      defeatedThisMonth: defeatedAfterResolve > defeatedBeforeSettle,
      rewardPending: state.rivalRewardPending?.length ?? 0,
    },
  }

  if (state.rivalRewardPending?.length) {
    const rewardNames = state.rivalRewardPending.map((card) => card.name)
    const claimed = claimRivalReward(state)
    if (claimed.ok) {
      state = claimed.state
      record.boss.rewardClaimed = rewardNames
      record.decisions.push({ type: 'claimRivalReward', cards: rewardNames })
      record.afterReward = snapshot(state)
    }
  }

  if (state.highlightPending?.length) {
    const pickedIndex = choosePackPick(state.highlightPending)
    const picked = state.highlightPending[pickedIndex]
    const res = pickHighlightCard(state, pickedIndex)
    if (res.ok) {
      state = res.state
      record.decisions.push({ type: 'highlightPick', card: picked.name })
    }
  }

  if (state.result?.boardMeeting || state.result?.stagePromotion) {
    state = handleBoardMeeting(state, rng, record.board)
    record.afterBoard = snapshot(state)
  }

  return {
    state,
    record,
    done: !!state.result?.gameOver || !!state.result?.gameWon,
  }
}

export function playOneRun({ seed = 42, profession = 'scientist', months = 72 } = {}) {
  const rng = seedRng(seed)
  let state = createInitialState({ profession, rng })
  const records = []

  for (let i = 1; i <= months; i++) {
    const result = playOneMonth(state, rng, i)
    state = result.state
    records.push(result.record)
    if (result.done) break
  }

  return {
    version: VERSION,
    seed,
    profession,
    monthsPlayed: records.length,
    final: snapshot(state, {
      result: state.result ?? null,
    }),
    records,
  }
}

export function runSimulations({ runs = 10, months = 72, seed = 42, profession = 'scientist' } = {}) {
  const results = []
  for (let i = 0; i < runs; i++) {
    results.push(playOneRun({ seed: seed + i, profession, months }))
  }
  return {
    version: VERSION,
    config: { runs, months, seed, profession },
    runs: results,
    summary: summarize(results),
  }
}

export function summarize(runs) {
  const total = runs.length
  const won = runs.filter((run) => run.final.result?.gameWon).length
  const gameOver = runs.filter((run) => run.final.result?.gameOver).length
  const maxStage = Math.max(...runs.map((run) => run.final.stageId))
  const avg = (fn) => total ? Math.round(runs.reduce((sum, run) => sum + fn(run), 0) / total) : 0
  const avgFloat = (fn) => total ? Number((runs.reduce((sum, run) => sum + fn(run), 0) / total).toFixed(2)) : 0
  const pct = (count) => `${((count / Math.max(1, total)) * 100).toFixed(1)}%`
  const stageCounts = {}
  const deathBuckets = {
    months1to3: 0,
    months4to6: 0,
    months7to12: 0,
    months13to24: 0,
    months25Plus: 0,
    aliveAtEnd: 0,
  }
  let drawEvents = 0
  let drawnTotal = 0
  let battlePreviews = 0
  let battlesStarted = 0
  let activeBattleMonths = 0
  let battlesWon = 0
  let rewardsClaimed = 0
  let battleTimeoutsOrLosses = 0
  for (const run of runs) {
    stageCounts[run.final.stage] = (stageCounts[run.final.stage] ?? 0) + 1
    const deathMonth = run.final.result?.gameOver ? run.monthsPlayed : null
    if (deathMonth == null) deathBuckets.aliveAtEnd += 1
    else if (deathMonth <= 3) deathBuckets.months1to3 += 1
    else if (deathMonth <= 6) deathBuckets.months4to6 += 1
    else if (deathMonth <= 12) deathBuckets.months7to12 += 1
    else if (deathMonth <= 24) deathBuckets.months13to24 += 1
    else deathBuckets.months25Plus += 1

    for (const record of run.records) {
      if (Array.isArray(record.drawnCards)) {
        drawEvents += 1
        drawnTotal += record.drawnCards.length
      }
      if (record.boss?.previewStarted) battlePreviews += 1
      if (record.boss?.battleStarted) battlesStarted += 1
      if (record.boss?.before || record.boss?.after) activeBattleMonths += 1
      if (record.boss?.defeatedThisMonth) battlesWon += 1
      if (record.boss?.rewardClaimed?.length) rewardsClaimed += 1
      if (record.boss?.before && !record.boss?.after && !record.boss?.defeatedThisMonth) {
        battleTimeoutsOrLosses += 1
      }
    }
  }
  const cumulativeDeaths = {
    by3: deathBuckets.months1to3,
    by6: deathBuckets.months1to3 + deathBuckets.months4to6,
    by12: deathBuckets.months1to3 + deathBuckets.months4to6 + deathBuckets.months7to12,
    by24: deathBuckets.months1to3 + deathBuckets.months4to6 + deathBuckets.months7to12 + deathBuckets.months13to24,
    byEnd: gameOver,
  }

  return {
    total,
    winRate: pct(won),
    gameOverRate: pct(gameOver),
    maxStage,
    avgMonths: avgFloat((run) => run.monthsPlayed),
    avgFinalValuation: avg((run) => run.final.valuation),
    avgFinalCash: avg((run) => run.final.cash),
    avgFinalBurn: avg((run) => run.final.burn),
    avgFinalProfit: avg((run) => run.final.profit),
    avgCards: avgFloat((run) => run.final.piles.allCards),
    avgDrawnPerMonth: drawEvents ? Number((drawnTotal / drawEvents).toFixed(2)) : 0,
    boss: {
      previews: battlePreviews,
      started: battlesStarted,
      activeMonths: activeBattleMonths,
      won: battlesWon,
      rewardsClaimed,
      timeoutOrLost: battleTimeoutsOrLosses,
      avgDefeatedRivals: avgFloat((run) => run.final.defeatedRivals?.length ?? 0),
      maxDefeatedRivals: Math.max(0, ...runs.map((run) => run.final.defeatedRivals?.length ?? 0)),
    },
    deathBuckets: Object.fromEntries(Object.entries(deathBuckets).map(([key, count]) => [key, { count, rate: pct(count) }])),
    cumulativeDeaths: Object.fromEntries(Object.entries(cumulativeDeaths).map(([key, count]) => [key, { count, rate: pct(count) }])),
    stageCounts,
    bestRun: runs
      .map((run) => ({ seed: run.seed, valuation: run.final.valuation, stage: run.final.stage, cash: run.final.cash, months: run.monthsPlayed }))
      .sort((a, b) => b.valuation - a.valuation)[0] ?? null,
    worstRun: runs
      .map((run) => ({ seed: run.seed, valuation: run.final.valuation, stage: run.final.stage, cash: run.final.cash, months: run.monthsPlayed, result: run.final.result?.reason ?? null }))
      .sort((a, b) => a.valuation - b.valuation)[0] ?? null,
  }
}

function printHuman(report, verbose = false) {
  const s = report.summary
  console.log(`\n=== Frank's Adventure Headless AI Simulation (${VERSION}) ===\n`)
  console.log(`runs=${report.config.runs} months=${report.config.months} seed=${report.config.seed} profession=${report.config.profession}`)
  console.log(`winRate=${s.winRate} gameOverRate=${s.gameOverRate} maxStage=${s.maxStage}`)
  console.log(`avgMonths=${s.avgMonths} avgFinalV=${s.avgFinalValuation} avgCash=${s.avgFinalCash} avgBurn=${s.avgFinalBurn} avgProfit=${s.avgFinalProfit}`)
  console.log(`avgCards=${s.avgCards} avgDrawnPerMonth=${s.avgDrawnPerMonth}`)
  console.log(`boss=${JSON.stringify(s.boss)}`)
  console.log(`deathBuckets=${JSON.stringify(s.deathBuckets)}`)
  console.log(`cumulativeDeaths=${JSON.stringify(s.cumulativeDeaths)}`)
  console.log(`stageCounts=${JSON.stringify(s.stageCounts)}`)
  if (s.bestRun) console.log(`best=${JSON.stringify(s.bestRun)}`)
  if (s.worstRun) console.log(`worst=${JSON.stringify(s.worstRun)}`)

  const run = report.runs[0]
  if (!run) return
  console.log(`\n--- Sample Run seed=${run.seed} final=${run.final.stage} V=${run.final.valuation} cash=${run.final.cash} ---`)
  const rows = verbose ? run.records : run.records.slice(0, 18)
  for (const record of rows) {
    const after = record.afterBoard ?? record.afterReward ?? record.after
    const board = record.board?.length ? ` board=${record.board.map((item) => item.type).join('/')}` : ''
    const drawn = record.drawnCards?.length ? ` drawn=${record.drawnCards.map((card) => card.name).join('、')}` : ''
    const bossParts = []
    if (record.boss?.previewStarted) {
      bossParts.push(`preview=${record.boss.upcomingAfter?.archetypeName}`)
    }
    if (record.boss?.battleStarted) {
      bossParts.push(`bossStart=${record.boss.after?.archetypeName}`)
    }
    const bossState = record.boss?.after ?? record.boss?.before
    if (bossState) {
      bossParts.push(`boss=${bossState.archetypeName}:${Math.round(bossState.playerShare)}%/${bossState.monthsElapsed}m`)
    }
    const action = record.decisions?.find((item) => item.type === 'competitiveAction')
    if (action) {
      bossParts.push(`action=${action.action}`)
    }
    if (record.boss?.defeatedThisMonth) {
      bossParts.push(`bossWon=${record.boss.before?.archetypeName ?? record.boss.after?.archetypeName ?? 'rival'}`)
    }
    if (record.boss?.rewardClaimed?.length) {
      bossParts.push(`reward=${record.boss.rewardClaimed.join('、')}`)
    }
    const boss = bossParts.length ? ` ${bossParts.join(' ')}` : ''
    console.log(
      `#${record.monthIndex} ${after.date} ${after.stage} V=${after.valuation} cash=${after.cash} ` +
      `inc=${record.previewBeforeSettle?.income} burn=${record.previewBeforeSettle?.burn} profit=${record.previewBeforeSettle?.profit} ` +
      `AP=${record.previewBeforeSettle?.ap}${drawn}${board}${boss}`
    )
  }
  if (!verbose && run.records.length > rows.length) {
    console.log(`... ${run.records.length - rows.length} more months (use --verbose or --json)`)
  }
  console.log()
}

if (typeof process !== 'undefined' && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = parseArgs(process.argv.slice(2))
  const report = runSimulations(args)
  if (args.out) {
    fs.writeFileSync(args.out, JSON.stringify(report, null, 2))
  }
  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    printHuman(report, args.verbose)
    if (args.out) console.log(`wrote ${args.out}`)
  }
}
