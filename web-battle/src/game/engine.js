import {
  AFFIX_POOL,
  BOSS_EVENTS,
  BOARD_EVENTS,
  BUSINESS_MODELS,
  CARD_TEMPLATES,
  EVENTS,
  LARGE_AFFIXES,
  LEVELS,
  PACK_DEFINITIONS,
  RARITY_VARIANCE,
  SMALL_AFFIXES,
  STARTER_DECK,
  STARTER_HAND,
  UPGRADE_PATHS,
  expandDeck,
  getCardTemplate,
  STAGES,
  findStageByValuation,
  getCardBurn,
  getCardExtraBurn,
  getBMMonthlyCost,
  getCardAssetValue,
  getBMAssetValue,
  getCashConversionRate,
  getMonthlyOperationCost,
  usesStandardEmpSchema,
  getDeptL1Effects,
  rollRandomFunctions,
} from './cards.js'

export const GAME_CONFIG = {
  baseAp: 5,
  carryApCap: 5,
  drawPerMonth: 3,
  handLimit: 10,
  lineSlots: 5,
  monthsPerStage: 6,
  productionMonths: 2,
  cooldownMonths: 1,
  recruitChoices: 3,
}


const DEPT_LABELS = { R: '研发', S: '销售', O: '运营' }

let instanceCounter = 0

export function getAllCards(state) {
  const cards = []
  if (state.hand) cards.push(...state.hand)
  if (state.drawPile) cards.push(...state.drawPile)
  if (state.coolingPile) cards.push(...state.coolingPile)
  if (state.lines) {
    for (const line of state.lines) {
      if (line.slots) {
        for (const card of line.slots) {
          if (card) cards.push(card)
        }
      }
    }
  }
  return cards
}

export function sortHandDefault(hand) {
  const DEPT_ORDER = { 'R': 1, 'S': 2, 'O': 3, 'NONE': 4 }
  return [...hand].sort((a, b) => {
    const orderA = DEPT_ORDER[a.dept] ?? 99
    const orderB = DEPT_ORDER[b.dept] ?? 99
    if (orderA !== orderB) return orderA - orderB
    if (a.ap !== b.ap) return a.ap - b.ap
    return a.name.localeCompare(b.name, 'zh-CN')
  })
}

export function pickRandomDriftDirection(rng) {
  const dirs = ['left-up', 'left-down', 'left', 'right', 'up', 'down']
  const r = rng ? rng() : Math.random()
  return dirs[Math.floor(r * dirs.length)]
}

export function createInitialState({ profession = 'scientist', rng = Math.random } = {}) {
  instanceCounter = 0
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  
  const driftDirection = pickRandomDriftDirection(rng)

  let dept = 'R'
  let founderId = 'EMP_FOUNDER_R'
  if (profession === 'sales') {
    dept = 'S'
    founderId = 'EMP_FOUNDER_S'
  } else if (profession === 'cxo') {
    dept = 'O'
    founderId = 'EMP_FOUNDER_O'
  }

  const founderCard = createCardInstance(founderId, 'hand', rng)
  const hand = sortHandDefault([
    ...expandDeck(STARTER_HAND).map((id) => createCardInstance(id, 'hand', rng)),
    founderCard
  ])

  const commonPool = CARD_TEMPLATES.filter((c) => c.type === 'emp' && c.dept === dept && c.rarity === 'common')
  const managerPool = CARD_TEMPLATES.filter((c) => c.type === 'emp' && c.dept === dept && (c.rarity === 'rare' || c.rarity === 'elite'))
  
  const commonCardId = commonPool.length ? commonPool[Math.floor(rng() * commonPool.length)].id : `EMP_${dept}_01`
  const managerCardId = managerPool.length ? managerPool[Math.floor(rng() * managerPool.length)].id : `EMP_${dept}_02`

  const starterDeckIds = [...expandDeck(STARTER_DECK), commonCardId, managerCardId]
  const drawPile = shuffle(starterDeckIds.map((id) => createCardInstance(id, 'deck', rng)), rng)
  const event = pickEvent(rng)
  const apAvailable = Math.max(1, GAME_CONFIG.baseAp + (event.apDelta ?? 0))
  const stage = STAGES[0]

  const initialState = {
    stage,
    year,
    month,
    elapsedMonths: 0,
    cash: 30 + (event.cashDelta ?? 0),
    valuation: 0,
    highestValuation: 0,
    profitHistory: [],
    lastMonthProfit: 0,
    valuationHistory: [],
    consecutiveAboveThreshold: 0,
    highlightCount: 0,       // v4 PR4: 本阶段已触发的高光次数（上限 2）
    highlightPending: null,  // v4 PR4: 待选高光奖励 (3 张卡候选)
    apCarry: 0,
    apAvailable,
    activeLineId: 'A',
    selectedCardUid: null,
    hand,
    drawPile,
    coolingPile: [],
    event,
    lines: [
      createLine('A', 'planning'),
      createLine('B', 'idle'),
    ],
    discardRequired: Math.max(0, hand.length - GAME_CONFIG.handLimit),
    lastSettlement: null,
    result: null,
    activeBusinessModels: [],
    intermissionState: null,
    driftDirection,
    legendaryRollStreak: 0,
    businessModelSlotCap: 4,
    nextLevelModifiers: {
      targetMultiplier: 1,
      handPenalty: 0,
      unlockedEpicDepts: [],
      pendingCards: [],
    },
    log: [
      `第 1 月开始: ${event.name}`,
      `进入阶段: ${stage.name} (${stage.theme})`,
    ],
  }

  initialState.valuation = computeValuation(initialState)
  initialState.highestValuation = initialState.valuation
  return initialState
}

export function createCardInstance(templateId, location = 'deck', rng = Math.random) {
  const template = getCardTemplate(templateId)
  const baseCost = readMedian(template.costSpec)
  const baseOutput = readMedian(template.baseOutputSpec)
  const cost = rollSpec(template.costSpec, rng)
  const baseOutputRolled = rollSpec(template.baseOutputSpec, rng)
  const affixes = rollAffixes(template.rarity, rng)
  const affixEffects = affixes.flatMap((affix) => affix.effects)
  const adjusted = applyCardAffixStats({ cost, baseOutput: baseOutputRolled }, affixEffects)
  const adjustedBaseOutput = Math.max(0, Math.round(adjusted.baseOutput))
  const adjustedCost = Math.max(1, Math.round(adjusted.cost))

  // v4 schema: 普通员工卡 = 固定部门 L1 主轴 + 按稀有度随机功能；其余（创始人 / 传奇 / 功能 / 服务）保留模板原效果
  let finalEffects
  let randomFunctions = []
  if (usesStandardEmpSchema(template)) {
    const l1Effects = getDeptL1Effects(template.dept, template.tier)
    randomFunctions = rollRandomFunctions(template.rarity, rng)
    const fnEffects = randomFunctions.flatMap(fn => fn.effects)
    finalEffects = [...l1Effects, ...fnEffects].map((effect) => rollEffectText(effect, rng))
  } else {
    finalEffects = template.effects.map((effect) => rollEffectText(effect, rng))
  }

  return {
    ...template,
    uid: `${template.id}-${++instanceCounter}`,
    location,
    cost: adjustedCost,
    baseOutput: adjustedBaseOutput,
    baseCostMedian: baseCost,
    baseOutputMedian: baseOutput,
    outputDelta: getDelta(adjusted.baseOutput, baseOutput),
    outputDeltaPct: getDeltaPct(adjustedBaseOutput, baseOutput),
    costDelta: getDelta(adjusted.cost, baseCost),
    costDeltaPct: getDeltaPct(adjustedCost, baseCost),
    effects: finalEffects,
    affixes,
    affixEffects,
    randomFunctions, // v4: 记录抽到的随机功能（用于 UI 展示与图鉴编辑）
    coolingRemaining: 0,
  }
}
export function computeMonthlyBurn(state) {
  const allCards = getAllCards(state)
  let burnSum = 0
  for (const card of allCards) {
    burnSum += getCardBurn(card)
  }

  // Newly played cards on the active planning line that is starting production this month
  const activeLine = getActiveLine(state)
  const hasNewLine = activeLine?.slots.some(Boolean)
  if (hasNewLine) {
    for (const card of activeLine.slots) {
      if (card) {
        burnSum += getCardExtraBurn(card)
      }
    }
  }

  // Business Model monthly cost
  if (state.activeBusinessModels) {
    for (const slot of state.activeBusinessModels) {
      const bm = BUSINESS_MODELS.find((b) => b.id === slot.id)
      if (bm) {
        burnSum += getBMMonthlyCost(bm)
      }
    }
  }

  return burnSum
}

/**
 * 估值公式 (v4 方案 B)
 *   V = cash × 1
 *     + (cardAssetSum + bmAssetSum) × 2
 *     + 最近 3 月平均正利润 × 4
 *
 * - 现金权重大: 玩家有动力守现金
 * - 资产权重 2 倍: 让卡牌构筑在中后期仍有意义
 * - 最近 3 月平均利润 ×4: 保留增长奖励，但避免单月爆发直接打穿多个阶段
 */
export function computeValuation(state) {
  const cashValue = Math.max(0, state.cash)

  // Card asset value
  const allCards = getAllCards(state)
  let cardAssetSum = 0
  for (const card of allCards) {
    cardAssetSum += getCardAssetValue(card)
  }

  // BM asset value
  let bmAssetSum = 0
  if (state.activeBusinessModels) {
    for (const slot of state.activeBusinessModels) {
      const bm = BUSINESS_MODELS.find((b) => b.id === slot.id)
      if (bm) {
        bmAssetSum += getBMAssetValue(bm)
      }
    }
  }

  const assetValue = (cardAssetSum + bmAssetSum) * 2
  const profitSamples = (state.profitHistory?.length ? state.profitHistory.slice(-3) : [state.lastMonthProfit ?? 0])
    .map((profit) => Math.max(0, profit ?? 0))
  const avgProfit = profitSamples.length
    ? profitSamples.reduce((sum, profit) => sum + profit, 0) / profitSamples.length
    : 0
  const profitValue = avgProfit * 4

  return Math.round(cashValue + assetValue + profitValue)
}


export function makeFixedCard(templateId, overrides = {}) {
  const template = getCardTemplate(templateId)
  return {
    ...template,
    uid: overrides.uid ?? `${template.id}-fixed-${++instanceCounter}`,
    location: overrides.location ?? 'test',
    cost: overrides.cost ?? readMedian(template.costSpec),
    baseOutput: overrides.baseOutput ?? readMedian(template.baseOutputSpec),
    baseCostMedian: readMedian(template.costSpec),
    baseOutputMedian: readMedian(template.baseOutputSpec),
    outputDelta: 'neutral',
    outputDeltaPct: 0,
    costDelta: 'neutral',
    costDeltaPct: 0,
    effects: overrides.effects ?? template.effects.map((effect) => effect.replace(/\s±\d+%/g, '')),
    affixes: overrides.affixes ?? [],
    affixEffects: overrides.affixEffects ?? [],
    coolingRemaining: overrides.coolingRemaining ?? 0,
  }
}

export function getActiveLine(state) {
  return state.lines.find((line) => line.id === state.activeLineId)
}

/**
 * v4 R 部门主轴：累加产线中所有 "DRAW_NEXT_MONTH: +N" 效果
 * 输入: 本月正在生产的产线数组 (activeProducingLines)
 */
export function sumDrawNextMonthBonus(producingLines) {
  if (!producingLines?.length) return 0
  let total = 0
  for (const line of producingLines) {
    for (const card of (line.slots ?? [])) {
      if (!card?.effects) continue
      for (const effect of card.effects) {
        const m = /DRAW_NEXT_MONTH:\s*\+?(-?\d+)/i.exec(effect)
        if (m) total += parseInt(m[1], 10) || 0
      }
    }
  }
  return total
}

/**
 * v4 流派质变 buff：检测产线中同部门 R/S/O 卡的数量，触发 2/3/4/5 张阈值的 buff
 * 注意：此处只计算 buff 描述，实际产出乘数已在 computeLineOutput / applyDeptMassBonus 应用
 *      下月效果（额外抽牌 / AP +N / 手牌上限 +N）由 resolveMonth 在月末读取
 */
export function detectDeptMass(slots) {
  const counts = { R: 0, S: 0, O: 0 }
  for (const card of (slots ?? [])) {
    if (card?.dept && counts[card.dept] != null) counts[card.dept] += 1
  }
  return counts
}

/**
 * 根据流派质变阈值返回应在 computeLineOutput 阶段应用的整线产出乘数
 * R 流派的"额外抽牌"在月末读取（不在此函数）
 * S 流派的整线 +X% / ×N 在此函数返回
 * O 流派的"下月 AP +N"在月末读取（不在此函数）
 */
export function getDeptMassLineMultiplier(slots) {
  const counts = detectDeptMass(slots)
  let mult = 1
  // S 流派：暴击轴
  const s = counts.S
  if (s === 2) mult *= 1.20
  else if (s === 3) mult *= 1.35
  else if (s === 4) mult *= 1.40
  else if (s === 5) mult *= 1.80
  return mult
}

/**
 * 月末读取：本月有 N 张 R 卡在某产线 → 下月额外抽牌
 * R 流派阈值: 2→+1 / 3→+2 / 4→+3+立即抽 / 5→+4+手牌上限+3
 * 返回 { drawBonus, handLimitBonus, instantDraw }
 */
export function getDeptMassRBonus(producingLines) {
  let drawBonus = 0
  let handLimitBonus = 0
  let instantDraw = 0
  for (const line of (producingLines ?? [])) {
    const counts = detectDeptMass(line.slots)
    const r = counts.R
    if (r === 2) drawBonus += 1
    else if (r === 3) drawBonus += 2
    else if (r === 4) { drawBonus += 3; instantDraw += 1 }
    else if (r === 5) { drawBonus += 4; handLimitBonus += 3 }
  }
  return { drawBonus, handLimitBonus, instantDraw }
}

/**
 * O 流派月末读取：下月 AP +N
 */
export function getDeptMassOBonus(producingLines) {
  let apBonus = 0
  for (const line of (producingLines ?? [])) {
    const counts = detectDeptMass(line.slots)
    const o = counts.O
    if (o === 2) apBonus += 1
    else if (o === 3) apBonus += 2
    else if (o === 4) apBonus += 3
    else if (o === 5) apBonus += 5
  }
  return apBonus
}

// ============================================================================
// v4 槽位区位 buff（按部门匹配，每槽不同主题）
// ============================================================================
//   P1 销售先锋 (S ×1.5) | P2 销售助攻 (S ×1.3) | P3 研发中枢 (R ×1.5) | P4 运营中场 (O ×1.3) | P5 运营收尾 (O ×1.5)
const POSITION_BUFFS = [
  { S: 1.5 }, // P1
  { S: 1.3 }, // P2
  { R: 1.5 }, // P3
  { O: 1.3 }, // P4
  { O: 1.5 }, // P5
]

/**
 * 取槽位区位加成倍数（部门匹配则 >1，其他部门 1.0）
 */
export function getPositionalBuff(slotIndex, dept) {
  const buff = POSITION_BUFFS[slotIndex] ?? {}
  return buff[dept] ?? 1.0
}

// ============================================================================
// v4 产线 Combo 检测（5 个）
// ============================================================================
const TIER_RANK = { 专员: 1, 经理: 2, 总监: 3, VP: 4, CXO: 5, 创始人: 6 }

/**
 * 检测产线中所有触发的 combo
 * 返回：{
 *   pairBonus: 双子触发的卡 index 列表（这些卡 +30%）
 *   chainMultiplier: 升阶链触发 → 1.5 倍整线
 *   fullRosterMultiplier: 满编同部门 → 2.0 倍整线（与流派质变叠加）
 *   rainbowMultiplier: 三色管理 → 1.4 倍整线
 *   rainbowDrawBonus: 三色管理触发额外抽 1
 *   execMeetingMultiplier: 高管会议 → 1.8 倍整线
 *   execMeetingApBonus: 高管会议触发下月 AP +3
 *   labels: 触发的 combo 名称数组（UI 用）
 * }
 */
export function detectCombos(slots) {
  const cards = slots.map((c) => c ?? null)
  const result = {
    pairBonus: [],
    chainMultiplier: 1,
    fullRosterMultiplier: 1,
    rainbowMultiplier: 1,
    rainbowDrawBonus: 0,
    execMeetingMultiplier: 1,
    execMeetingApBonus: 0,
    labels: [],
  }

  // 1. 双子 combo：相邻两槽都是同部门"专员"
  for (let i = 0; i < cards.length - 1; i++) {
    const a = cards[i]; const b = cards[i + 1]
    if (!a || !b) continue
    if (a.dept === b.dept && a.tier === '专员' && b.tier === '专员') {
      if (!result.pairBonus.includes(i)) result.pairBonus.push(i)
      if (!result.pairBonus.includes(i + 1)) result.pairBonus.push(i + 1)
      if (!result.labels.includes('双子')) result.labels.push('双子')
    }
  }

  // 2. 升阶链：连续 3 个槽位含"同部门专员→经理→总监"
  for (let i = 0; i < cards.length - 2; i++) {
    const a = cards[i]; const b = cards[i + 1]; const c = cards[i + 2]
    if (!a || !b || !c) continue
    if (a.dept === b.dept && b.dept === c.dept
      && a.tier === '专员' && b.tier === '经理' && c.tier === '总监') {
      result.chainMultiplier = 1.5
      result.labels.push('升阶链')
      break
    }
  }

  // 3. 满编：整条产线 5 张全是同部门
  const nonEmpty = cards.filter(Boolean)
  if (nonEmpty.length === 5) {
    const dept0 = nonEmpty[0].dept
    if (dept0 && dept0 !== 'NONE' && nonEmpty.every((c) => c.dept === dept0)) {
      result.fullRosterMultiplier = 2.0
      result.labels.push('满编')
    }
  }

  // 4. 三色管理：含 3 张同 tier 不同部门（R/S/O）
  const tierGroups = {}
  for (const c of cards) {
    if (!c || !c.tier || !c.dept || c.dept === 'NONE') continue
    if (!tierGroups[c.tier]) tierGroups[c.tier] = new Set()
    tierGroups[c.tier].add(c.dept)
  }
  for (const [tier, depts] of Object.entries(tierGroups)) {
    if (depts.size >= 3) {
      result.rainbowMultiplier = 1.4
      result.rainbowDrawBonus = 1
      result.labels.push('三色管理')
      // 高管会议：进一步检查是否是 VP/CXO 级
      if (tier === 'VP' || tier === 'CXO') {
        result.execMeetingMultiplier = 1.8
        result.execMeetingApBonus = 3
        result.labels.push('高管会议')
      }
      break
    }
  }

  return result
}

/**
 * v4: 计算产线 AP 总消耗。
 * - bmStats.srvApDiscount: 服务卡每张 AP -N（最低 1）
 * - bmStats.lineApDiscount: 整条产线 AP -N（最低 1，先计算后再减）
 */
export function getLineAp(slots, bmStats = {}) {
  const srvDiscount = bmStats.srvApDiscount ?? 0
  const lineDiscount = bmStats.lineApDiscount ?? 0
  const cardSum = slots.reduce((total, card) => {
    if (!card) return total
    const baseAp = card.ap ?? 0
    const effectiveAp = card.type === 'srv'
      ? Math.max(1, baseAp - srvDiscount)
      : baseAp
    return total + effectiveAp
  }, 0)
  // 整线 discount：cardSum > 0 时才生效，min 1
  const total = cardSum > 0 ? Math.max(1, cardSum - lineDiscount) : 0
  return total
}

export function getEffectiveApLimit(state, slots = getActiveLine(state)?.slots ?? []) {
  let founderBonus = 0
  if (state.hand.some((card) => card?.id === 'EMP_FOUNDER_O')) {
    founderBonus += 1
  }
  if (slots.some((card) => card?.id === 'EMP_FOUNDER_O')) {
    founderBonus += 3
  }

  const serviceBonus = slots.reduce((sum, card) => {
    if (!card) return sum
    return sum + card.effects.reduce((effectSum, effect) => {
      if (!effect.includes('MONTH_AP')) return effectSum
      return effectSum + readSignedNumber(effect)
    }, 0)
  }, 0)
  return Math.max(1, state.apAvailable + serviceBonus + founderBonus)
}

export function placeCardInSlot(state, cardUid, slotIndex) {
  if (state.result) return reject(state, '本关已结算')
  const activeLine = getActiveLine(state)
  if (!activeLine || activeLine.status !== 'planning') return reject(state, '当前没有可布置产线')
  if (slotIndex < 0 || slotIndex >= GAME_CONFIG.lineSlots) return reject(state, '槽位不存在')

  const handIndex = state.hand.findIndex((card) => card.uid === cardUid)
  if (handIndex < 0) return reject(state, '请选择一张手牌')

  const card = state.hand[handIndex]
  const newSlots = activeLine.slots.map((slot, index) => (index === slotIndex ? card : slot))
  const replacedCard = activeLine.slots[slotIndex]
  const bmStats = computeBusinessModelStats(state)
  const projectedAp = getLineAp(newSlots, bmStats)
  const projectedLimit = getEffectiveApLimit(state, newSlots)
  if (projectedAp > projectedLimit) {
    return reject(state, `AP 不足: ${projectedAp}/${projectedLimit}`)
  }

  const handWithoutCard = state.hand.filter((item) => item.uid !== cardUid)
  const nextHand = replacedCard ? [...handWithoutCard, { ...replacedCard, location: 'hand' }] : handWithoutCard
  const nextLines = replaceLine(state.lines, activeLine.id, {
    ...activeLine,
    slots: newSlots.map((slot) => (slot ? { ...slot, location: 'line' } : null)),
  })

  return accept({
    ...state,
    hand: nextHand,
    lines: nextLines,
    selectedCardUid: null,
    discardRequired: Math.max(0, nextHand.length - GAME_CONFIG.handLimit),
  })
}

export function returnSlotToHand(state, lineId, slotIndex) {
  const line = state.lines.find((item) => item.id === lineId)
  if (!line || line.status !== 'planning') return reject(state, '只能撤回正在布置的产线')
  const card = line.slots[slotIndex]
  if (!card) return reject(state, '槽位为空')
  const nextSlots = line.slots.map((slot, index) => (index === slotIndex ? null : slot))
  const nextHand = [...state.hand, { ...card, location: 'hand' }]

  return accept({
    ...state,
    hand: nextHand,
    lines: replaceLine(state.lines, lineId, { ...line, slots: nextSlots }),
    discardRequired: Math.max(0, nextHand.length - GAME_CONFIG.handLimit),
  })
}

export function clearPlanningLine(state) {
  const line = getActiveLine(state)
  if (!line || line.status !== 'planning') return reject(state, '当前没有可清空产线')
  const returned = line.slots.filter(Boolean).map((card) => ({ ...card, location: 'hand' }))
  const nextHand = [...state.hand, ...returned]
  return accept({
    ...state,
    hand: nextHand,
    lines: replaceLine(state.lines, line.id, { ...line, slots: emptySlots() }),
    discardRequired: Math.max(0, nextHand.length - GAME_CONFIG.handLimit),
  })
}

export function autoDeployActiveLine(state) {
  if (state.result) return reject(state, '本关已结算')
  const activeLine = getActiveLine(state)
  if (!activeLine || activeLine.status !== 'planning') return reject(state, '当前没有可布置产线')

  // Pool of all available cards: hand + slots of the active line
  const C = [...state.hand, ...activeLine.slots.filter(Boolean)].map(card => ({ ...card, location: 'hand' }))
  if (C.length === 0) return accept(state)

  const bmStats = computeBusinessModelStats(state)
  
  let bestSlots = [...activeLine.slots]
  let bestOutput = -1

  function permute(slotIndex, currentSlots, usedUids) {
    if (slotIndex === 5) {
      const simulatedHand = C.filter(c => !usedUids.has(c.uid))
      const tempState = { ...state, hand: simulatedHand }
      const limit = getEffectiveApLimit(tempState, currentSlots)
      const ap = getLineAp(currentSlots, bmStats)
      if (ap <= limit) {
        const out = computeLineOutput(currentSlots, { bmStats, event: state.event, hand: simulatedHand }).total
        if (out > bestOutput) {
          bestOutput = out
          bestSlots = [...currentSlots]
        }
      }
      return
    }

    // Option 1: Place null (empty)
    currentSlots[slotIndex] = null
    permute(slotIndex + 1, currentSlots, usedUids)

    // Option 2: Place one of the unused cards
    for (let i = 0; i < C.length; i++) {
      const card = C[i]
      if (!usedUids.has(card.uid)) {
        usedUids.add(card.uid)
        currentSlots[slotIndex] = card
        permute(slotIndex + 1, currentSlots, usedUids)
        usedUids.delete(card.uid)
      }
    }
    currentSlots[slotIndex] = null
  }

  permute(0, [null, null, null, null, null], new Set())

  // Next hand consists of cards in C that were NOT chosen for the slots
  const nextHand = C.filter(card => !bestSlots.some(s => s && s.uid === card.uid))
  const nextLines = replaceLine(state.lines, activeLine.id, {
    ...activeLine,
    slots: bestSlots.map((slot) => (slot ? { ...slot, location: 'line' } : null)),
  })

  return accept({
    ...state,
    hand: nextHand,
    lines: nextLines,
    selectedCardUid: null,
    discardRequired: Math.max(0, nextHand.length - GAME_CONFIG.handLimit),
  })
}


export function discardFromHand(state, cardUid) {
  const card = state.hand.find((item) => item.uid === cardUid)
  if (!card || state.discardRequired <= 0) return reject(state, '当前不需要弃牌')
  const hand = state.hand.filter((item) => item.uid !== cardUid)
  return accept({
    ...state,
    hand,
    drawPile: [...state.drawPile, { ...card, location: 'deck' }],
    discardRequired: Math.max(0, hand.length - GAME_CONFIG.handLimit),
    log: [`${card.name} 回到牌堆`, ...state.log].slice(0, 7),
  })
}



/**
 * 清空 revealedRecruitCard（关闭开包动画后 UI 调用）
 */
export function dismissRecruitReveal(state) {
  if (!state.revealedRecruitCard) return accept(state)
  return accept({ ...state, revealedRecruitCard: null })
}

export function resolveMonth(state, rng = Math.random) {
  if (state.result) return reject(state, '本关已结算')
  if (state.discardRequired > 0) return reject(state, `需要先弃 ${state.discardRequired} 张手牌`)

  const activeLine = getActiveLine(state)
  const hasNewLine = activeLine?.slots.some(Boolean)
  const workingLines = state.lines.map((line) => {
    if (line.id === state.activeLineId && hasNewLine) {
      return { ...line, status: 'working', workingMonthsLeft: GAME_CONFIG.productionMonths }
    }
    return line
  })

  const bmStats = computeBusinessModelStats(state)
  const activeProducingLines = workingLines.filter((line) => line.status === 'working' && line.slots.some(Boolean))
  const lineReports = activeProducingLines.map((line) => ({
    lineId: line.id,
    ...computeLineOutput(line.slots, { event: state.event, bmStats, hand: state.hand }),
  }))

  const rawIncome = lineReports.reduce((sum, report) => sum + report.total, 0)

  // Event income multiplier 钳到 [0.8, 1.4] 抑制极端波动
  const eventIncomeMult = Math.max(0.8, Math.min(1.4, state.event.incomeMultiplier ?? 1))
  const eventIncome = Math.round(rawIncome * eventIncomeMult)

  // Calculate Monthly Burn
  const baseBurn = computeMonthlyBurn(state)
  const isMaintenanceWaivedByLine = lineReports.some((report) => report.maintenanceWaived)
  const isMaintenanceWaivedByBM = bmStats.chargedWaiveMaintenance
  const maintenanceWaived = isMaintenanceWaivedByLine || isMaintenanceWaivedByBM

  let monthlyBurn = baseBurn
  if (maintenanceWaived) {
    monthlyBurn = 0
  } else {
    // Event maintenanceMultiplier 钳到 [0.7, 1.6]
    const eventMaintMult = Math.max(0.7, Math.min(1.6, state.event.maintenanceMultiplier ?? 1))
    monthlyBurn = Math.round(monthlyBurn * eventMaintMult)
    monthlyBurn = Math.max(0, Math.round(monthlyBurn * (1 - bmStats.maintenanceDiscount)))
  }

  // Consume waiveMaintenance if used
  let nextActiveBusinessModels = state.activeBusinessModels
  if (isMaintenanceWaivedByBM && !isMaintenanceWaivedByLine) {
    nextActiveBusinessModels = state.activeBusinessModels.map((slot) => {
      const bm = BUSINESS_MODELS.find((b) => b.id === slot.id)
      if (bm?.payload?.type === 'waiveMaintenance') {
        return { ...slot, charged: false }
      }
      return slot
    })
  }

  const profit = eventIncome - monthlyBurn
  const nextProfitHistory = [...(state.profitHistory ?? []), profit].slice(-6)

  // 现金转化率 (CCR): 正利润按比例入 cash；负利润全额扣减
  const ccr = getCashConversionRate(state.stage.id, bmStats.ccrBonus ?? 0)
  const cashGain = profit >= 0 ? Math.round(profit * ccr) : profit
  const monthlyOpCost = getMonthlyOperationCost(state.stage.id)
  let finalCash = state.cash + cashGain - monthlyOpCost

  // Temp state for valuation (cash 已更新，lastMonthProfit 记录本月利润)
  let rescuedState = {
    ...state,
    cash: finalCash,
    activeBusinessModels: nextActiveBusinessModels,
    profitHistory: nextProfitHistory,
    lastMonthProfit: profit,
  }
  let nextV = computeValuation(rescuedState)
  let nextHighestValuation = Math.max(state.highestValuation ?? 0, nextV)

  // 失败状态检查：每月末 cash < 0 → game over
  if (finalCash < 0) {
    const afterWorkLost = advanceWorkingLines(workingLines, false)
    return accept({
      ...rescuedState,
      valuation: nextV,
      highestValuation: nextHighestValuation,
      lines: afterWorkLost.lines,
      result: {
        passed: false,
        gameOver: true,
        reason: '现金破产',
        bestMonth: Math.max(eventIncome, state.lastSettlement?.income ?? 0),
      },
      lastSettlement: buildSettlementReport({
        month: state.month,
        eventIncome,
        rawIncome,
        maintenance: monthlyBurn,
        lineReports,
        apCarry: 0,
        usedAp: hasNewLine ? getLineAp(activeLine.slots, bmStats) : 0,
      }),
      log: [
        `💀 第 ${state.month} 月: 现金破产 (¥${finalCash})，游戏结束`,
        `本月利润 ¥${profit}，CCR 转化 ¥${cashGain}，运营成本 ¥${monthlyOpCost}`,
        ...state.log,
      ].slice(0, 7),
    })
  }

  // AP Calculation
  const usedAp = hasNewLine ? getLineAp(activeLine.slots, bmStats) : 0
  const apLimit = getEffectiveApLimit(state)
  const apCarry = Math.min(GAME_CONFIG.carryApCap, Math.floor(Math.max(0, apLimit - usedAp) * 0.5))

  // v4: 任一产线刚好完成 → 检查 reuseLine BM charge 是否可用
  const anyLineFinishing = workingLines.some((l) => l.status === 'working' && l.workingMonthsLeft <= 1)
  const useReuseCharge = anyLineFinishing && bmStats.chargedReuseLine
  const afterWork = advanceWorkingLines(workingLines, useReuseCharge)

  // 消耗 reuseLine charge
  if (useReuseCharge) {
    nextActiveBusinessModels = nextActiveBusinessModels.map((slot) => {
      const bm = BUSINESS_MODELS.find((b) => b.id === slot.id)
      if (bm?.payload?.type === 'reuseLine') {
        return { ...slot, charged: false }
      }
      return slot
    })
    // sync rescuedState
    rescuedState = { ...rescuedState, activeBusinessModels: nextActiveBusinessModels }
  }
  const returned = []
  const stillCooling = []
  state.coolingPile.forEach((card) => {
    const coolingRemaining = Math.max(0, (card.coolingRemaining ?? 1) - 1)
    if (coolingRemaining <= 0) {
      returned.push({ ...card, location: 'deck', coolingRemaining: 0 })
    } else {
      stillCooling.push({ ...card, coolingRemaining })
    }
  })

  const drawPool = shuffle([...returned, ...afterWork.instantReturn, ...rescuedState.drawPile], rng)

  // Stage promotion check
  const currentStageIndex = STAGES.findIndex(s => s.id === state.stage.id)
  const nextStage = STAGES[currentStageIndex + 1]
  
  const nextConsecutiveAboveThreshold = nextStage && nextV >= nextStage.threshold ? 1 : 0
  const isStagePromoted = !!(nextStage && nextV >= nextStage.threshold)

  let result = null
  if (isStagePromoted) {
    if (nextStage.id === 9) {
      result = {
        passed: true,
        gameWon: true,
        reason: '终极胜利',
        bestMonth: Math.max(eventIncome, state.lastSettlement?.income ?? 0),
      }
    } else {
      result = {
        passed: true,
        stagePromotion: true,
        nextStage: nextStage,
        reason: '估值达标',
        bestMonth: Math.max(eventIncome, state.lastSettlement?.income ?? 0),
      }
    }
  }

  const nextMonthNum = state.month + 1
  let nextYear = state.year
  let nextMonth = nextMonthNum
  if (nextMonthNum > 12) {
    nextMonth = 1
    nextYear += 1
  }
  const elapsedMonths = (state.elapsedMonths ?? 0) + 1

  if (result) {
    return accept({
      ...rescuedState,
      valuation: nextV,
      highestValuation: nextHighestValuation,
      apCarry,
      lines: afterWork.lines,
      coolingPile: [...stillCooling, ...afterWork.newCooling],
      drawPile: drawPool,
      selectedCardUid: null,
      consecutiveAboveThreshold: 0,
      lastSettlement: buildSettlementReport({
        month: state.month,
        eventIncome,
        rawIncome,
        maintenance: monthlyBurn,
        lineReports,
        apCarry,
        usedAp,
      }),
      result,
      log: [
        result.gameWon ? `行业第一！终极胜利达成！` : `达成阶段晋升: ${nextStage.name}`,
        `第 ${state.month} 月利润 ¥${profit} (CCR ${Math.round(ccr * 100)}% → +¥${cashGain}), 运营 -¥${monthlyOpCost}`,
        ...state.log,
      ].slice(0, 7),
    })
  }

  // Standard month transition
  const isNewQuarter = (nextMonth - 1) % 3 === 0
  const nextEvent = isNewQuarter ? pickEvent(rng) : state.event
  const nextDriftDirection = isNewQuarter ? pickRandomDriftDirection(rng) : (state.driftDirection || 'right-up')
  const apHandRich = bmStats.apIfHandRichEnabled && rescuedState.hand.length >= 6 ? 1 : 0

  // v4 R 部门主轴：本月刚结算的所有产线中 R 卡的 DRAW_NEXT_MONTH 累加到下月抽牌
  const rDeptDrawBonus = sumDrawNextMonthBonus(activeProducingLines)
  // v4 流派质变 R/O 流派月末 buff
  const deptMassR = getDeptMassRBonus(activeProducingLines)
  const deptMassO = getDeptMassOBonus(activeProducingLines)
  // v4 combo: 累加所有产线的 rainbow draw + exec meeting AP
  const comboDrawBonus = lineReports.reduce((s, r) => s + (r.rainbowDrawBonus ?? 0), 0)
  const comboApBonus = lineReports.reduce((s, r) => s + (r.execMeetingApBonus ?? 0), 0)

  // v4 流派质变 O 流派下月 AP 加成 + combo 高管会议下月 AP +3
  const nextApAvailable = Math.max(1, GAME_CONFIG.baseAp + apCarry + (nextEvent.apDelta ?? 0) + apHandRich + deptMassO + comboApBonus)

  const isFounderRInHand = rescuedState.hand.some(c => c.id === 'EMP_FOUNDER_R')
  const isFounderRInSlots = activeLine && activeLine.slots.some(c => c && c.id === 'EMP_FOUNDER_R')

  let scientistDrawBonus = 0
  let isScientistActive = false
  if (isFounderRInHand) {
    scientistDrawBonus += 1
    isScientistActive = true
  }
  if (isFounderRInSlots) {
    scientistDrawBonus += 3
    isScientistActive = true
  }

  const baseHandLimit = GAME_CONFIG.handLimit + bmStats.handLimitBonus + (nextEvent.handLimitDelta ?? 0) + deptMassR.handLimitBonus
  const effectiveHandLimit = isScientistActive ? 10 : baseHandLimit

  const handAdjusted = applyEventHandDelta(rescuedState.hand, drawPool, nextEvent.handDelta ?? 0, rng)
  const drawPerMonth = GAME_CONFIG.drawPerMonth + bmStats.drawBonus + (nextEvent.drawBonus ?? 0) + scientistDrawBonus + rDeptDrawBonus + deptMassR.drawBonus + deptMassR.instantDraw + comboDrawBonus
  const drawCount = Math.min(drawPerMonth, Math.max(0, effectiveHandLimit - handAdjusted.hand.length))
  const drawn = drawCards(drawCount, handAdjusted.drawPile)
  const nextHand = sortHandDefault([...handAdjusted.hand, ...drawn.drawn.map((card) => ({ ...card, location: 'hand' }))])
  const nextActiveLineId = chooseNextPlanningLine(afterWork.lines, state.activeLineId)
  const nextLines = afterWork.lines.map((line) => (
    line.id === nextActiveLineId 
      ? { ...line, status: 'planning' } 
      : (line.status === 'planning' ? { ...line, status: 'idle' } : line)
  ))

  // 应用下月事件的 cashDelta（外部资金注入，不走 CCR）
  const finalCashWithEvent = finalCash + (nextEvent.cashDelta ?? 0)

  // 即使利润为正，下月事件 cashDelta 为大负数也可能导致破产
  if (finalCashWithEvent < 0) {
    return accept({
      ...rescuedState,
      cash: finalCashWithEvent,
      valuation: computeValuation({ ...rescuedState, cash: finalCashWithEvent }),
      highestValuation: nextHighestValuation,
      event: nextEvent,
      result: {
        passed: false,
        gameOver: true,
        reason: '现金破产（事件冲击）',
        bestMonth: Math.max(eventIncome, state.lastSettlement?.income ?? 0),
      },
      lastSettlement: buildSettlementReport({
        month: state.month,
        eventIncome,
        rawIncome,
        maintenance: monthlyBurn,
        lineReports,
        apCarry: 0,
        usedAp,
      }),
      log: [
        `💀 第 ${nextMonth} 月开局: 事件 ${nextEvent.name} (¥${nextEvent.cashDelta}) 让现金 < 0，破产`,
        ...state.log,
      ].slice(0, 7),
    })
  }

  // v4 PR4 高光时刻：单月利润 ≥ next stage threshold × 30%，每阶段最多触发 2 次
  // 注: currentStageIndex / nextStage 在前面已声明过，复用同一个 nextStage
  const nextStageForHighlight = nextStage
  const highlightTrigger = nextStageForHighlight
    && (state.highlightCount ?? 0) < 2
    && profit >= nextStageForHighlight.threshold * 0.3
  let nextHighlightPending = state.highlightPending ?? null
  let nextHighlightCount = state.highlightCount ?? 0
  let highlightLog = ''
  if (highlightTrigger && !nextHighlightPending) {
    nextHighlightPending = pickHighlightCandidates(state.stage.id, rng)
    nextHighlightCount += 1
    highlightLog = `🎉 高光时刻 ${nextHighlightCount}/2：本月利润 ¥${profit} ≥ ${Math.ceil(nextStageForHighlight.threshold * 0.3)}，请从 3 张候选中挑选 1 张免费加入牌堆`
  }

  const finalState = {
    ...rescuedState,
    year: nextYear,
    month: nextMonth,
    elapsedMonths,
    valuation: nextV,
    highestValuation: nextHighestValuation,
    event: nextEvent,
    driftDirection: nextDriftDirection,
    cash: finalCashWithEvent,
    apCarry,
    apAvailable: nextApAvailable,
    activeLineId: nextActiveLineId,
    hand: nextHand,
    drawPile: drawn.drawPile,
    coolingPile: [...stillCooling, ...afterWork.newCooling],
    lines: nextLines,
    selectedCardUid: null,
    discardRequired: Math.max(0, nextHand.length - effectiveHandLimit),
    consecutiveAboveThreshold: nextConsecutiveAboveThreshold,
    highlightCount: nextHighlightCount,
    highlightPending: nextHighlightPending,
    lastSettlement: buildSettlementReport({
      month: state.month,
      eventIncome,
      rawIncome,
      maintenance: monthlyBurn,
      lineReports,
      apCarry,
      usedAp,
    }),
    log: [
      ...(highlightLog ? [highlightLog] : []),
      `第 ${state.month} 月利润 ¥${profit} (CCR ${Math.round(ccr * 100)}% → +¥${cashGain}), 运营 -¥${monthlyOpCost}`,
      returned.length ? `${returned.length} 张卡冷却结束回到牌堆` : '无冷却回归',
      `第 ${nextMonth} 月事件: ${nextEvent.name}`,
      ...state.log,
    ].slice(0, 7),
  }

  return accept(finalState)
}

/**
 * v4 PR4: 从当前阶段可解锁的 elite/epic 员工卡池中随机抽 3 张候选
 */
function pickHighlightCandidates(stageId, rng) {
  // 高光奖励池：所有 elite/epic 员工卡（不限 unlockLevel，因为触发条件本身已严苛）
  const pool = CARD_TEMPLATES.filter(c =>
    c.type === 'emp' &&
    (c.rarity === 'elite' || c.rarity === 'epic') &&
    c.tier !== '创始人' &&
    c.inRecruitPool !== false
  )
  if (pool.length < 3) return null
  // 安全洗牌取前 3 张（避免 fixedRng 等情况下死循环）
  const indices = pool.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices.slice(0, 3).map(i => createCardInstance(pool[i].id, 'shop', rng))
}

/**
 * v4 PR4: 玩家从 3 张高光候选中选 1 张，加入牌堆
 */
export function pickHighlightCard(state, candidateIndex) {
  const pending = state.highlightPending
  if (!Array.isArray(pending) || candidateIndex < 0 || candidateIndex >= pending.length) {
    return reject(state, '无高光候选')
  }
  const picked = pending[candidateIndex]
  return accept({
    ...state,
    drawPile: [...state.drawPile, { ...picked, location: 'deck' }],
    highlightPending: null,
    log: [`🎉 高光奖励 → ${picked.name} 加入牌堆`, ...state.log].slice(0, 7),
  })
}

export function dismissHighlightCard(state) {
  if (!state.highlightPending) return accept(state)
  return accept({
    ...state,
    highlightPending: null,
    log: ['高光时刻跳过', ...state.log].slice(0, 7),
  })
}

export function computeBattlePreview(state) {
  const bmStats = computeBusinessModelStats(state)
  const reports = state.lines
    .filter((line) => line.status === 'working' || (line.id === state.activeLineId && line.slots.some(Boolean)))
    .map((line) => ({
      lineId: line.id,
      status: line.status,
      ...computeLineOutput(line.slots, { event: state.event, bmStats, hand: state.hand }),
    }))
  const rawIncome = reports.reduce((sum, report) => sum + report.total, 0)
  const eventIncomeMult = Math.max(0.8, Math.min(1.4, state.event.incomeMultiplier ?? 1))
  const eventIncome = Math.round(rawIncome * eventIncomeMult)

  // Calculate preview monthly burn (与 resolveMonth 一致的钳位)
  const baseBurn = computeMonthlyBurn(state)
  const isMaintenanceWaivedByLine = reports.some((report) => report.maintenanceWaived)
  const isMaintenanceWaivedByBM = bmStats.chargedWaiveMaintenance
  const maintenanceWaived = isMaintenanceWaivedByLine || isMaintenanceWaivedByBM

  let monthlyBurn = baseBurn
  if (maintenanceWaived) {
    monthlyBurn = 0
  } else {
    const eventMaintMult = Math.max(0.7, Math.min(1.6, state.event.maintenanceMultiplier ?? 1))
    monthlyBurn = Math.round(monthlyBurn * eventMaintMult)
    monthlyBurn = Math.max(0, Math.round(monthlyBurn * (1 - bmStats.maintenanceDiscount)))
  }

  const profit = eventIncome - monthlyBurn
  const ccr = getCashConversionRate(state.stage.id, bmStats.ccrBonus ?? 0)
  const cashGain = profit >= 0 ? Math.round(profit * ccr) : profit
  const monthlyOpCost = getMonthlyOperationCost(state.stage.id)

  return {
    reports,
    rawIncome,
    eventIncome,
    maintenance: monthlyBurn,
    netCash: eventIncome - monthlyBurn,
    profit,
    ccr,
    cashGain,
    monthlyOpCost,
    cashDelta: cashGain - monthlyOpCost,
  }
}

export function computeLineOutput(slots, context = {}) {
  const cards = slots.map((card) => card ?? null)
  const bmStats = context.bmStats ?? {}
  const event = context.event ?? {}
  const hand = context.hand ?? []
  const lineHasFun = cards.some((card) => card?.type === 'fun')
  const hasAllThreeDept = ['R', 'S', 'O'].every((dept) => cards.some((card) => card?.dept === dept))
  const results = cards.map((card, index) => ({
    card,
    index,
    base: card?.baseOutput ?? 0,
    flat: 0,
    mults: [],
    output: 0,
    notes: [],
  }))

  const isFounderSInHand = hand.some((c) => c?.id === 'EMP_FOUNDER_S')
  const isFounderSInSlots = cards.some((c) => c?.id === 'EMP_FOUNDER_S')
  // v4 流派质变 S 流派整线乘数（2/3/4/5 张同部门 S 触发）
  const deptMassSMultiplier = getDeptMassLineMultiplier(slots)
  let salesMultiplier = 1
  if (isFounderSInHand) {
    salesMultiplier = 1.2
  }
  if (isFounderSInSlots) {
    salesMultiplier = 1.8
  }

  let lineMultiplier = 1 * salesMultiplier * deptMassSMultiplier
  let monthBonus = 0
  let maintenanceWaived = false

  function addMult(index, factor, label) {
    if (!cards[index] || !Number.isFinite(factor) || factor === 1) return
    results[index].mults.push(factor)
    results[index].notes.push(label)
  }

  function addFlat(index, amount, label) {
    if (!cards[index] || !Number.isFinite(amount) || amount === 0) return
    results[index].flat += amount
    results[index].notes.push(label)
  }

  // v4 combo 检测
  const combos = detectCombos(cards)

  cards.forEach((card, index) => {
    if (!card) return

    // v4 槽位区位 buff（按部门匹配）：P1/P2 销售强、P3 研发强、P4/P5 运营强
    const positionalFactor = getPositionalBuff(index, card.dept)
    if (positionalFactor !== 1.0) {
      addMult(index, positionalFactor, `P${index + 1} 区位加成`)
    }
    // 保留 BM 的 p1Bonus（如果存在），但不再硬编码 P1/P5 收割类规则
    if (index === 0 && bmStats.p1Bonus) addMult(index, 1 + bmStats.p1Bonus, 'BM P1 加成')

    // v4 combo: 双子（相邻 2 个同部门专员）→ 这些卡 +30%
    if (combos.pairBonus.includes(index)) addMult(index, 1.3, 'Combo 双子')

    const left = cards[index - 1]
    const right = cards[index + 1]
    if (card.dept === 'R' && bmStats.deptBonusR) addMult(index, 1 + bmStats.deptBonusR, '商业模式研发倾斜')
    if (card.dept === 'S' && bmStats.deptBonusS) addMult(index, 1 + bmStats.deptBonusS, '商业模式销售倾斜')
    if (card.dept === 'O' && bmStats.deptBonusO) addMult(index, 1 + bmStats.deptBonusO, '商业模式运营倾斜')
    if (event.deptBoost?.[card.dept]) addMult(index, event.deptBoost[card.dept], `${event.name} 部门波动`)

    const allEffects = [...card.effects, ...card.affixEffects]
    allEffects.forEach((effect) => {
      const ast = parseEffectAst(effect)

      if (ast.flags.noMaintain) maintenanceWaived = true
      if (ast.monthBonus) monthBonus += ast.monthBonus
      if (ast.kind === 'lineMultiplier') lineMultiplier *= ast.factor
      if (ast.condition === 'allThreeDept' && hasAllThreeDept) lineMultiplier *= ast.factor
      if (ast.kind === 'deptAll') applyDept(ast.dept, ast.factor, `全线${DEPT_LABELS[ast.dept] ?? ''}加成`)
      if (ast.kind === 'lineAll') {
        if (ast.flat) applyAllFlat(ast.flat, '全线基础 +¥')
        else addAllMult(ast.factor, '全线乘数')
      }
      if (ast.kind === 'neighbor') {
        if (ast.direction === 'left' || ast.direction === 'both') addMult(index - 1, ast.factor, `${card.name} ↔`)
        if (ast.direction === 'right' || ast.direction === 'both') addMult(index + 1, ast.factor, `${card.name} ↔`)
      }
      if (ast.kind === 'adjacentDept') applyAdjacentDept(index, ast.dept, ast.factor, `${card.name} 邻接${DEPT_LABELS[ast.dept] ?? ''}`)
      if (ast.kind === 'sameDept') {
        if (left?.dept === card.dept) ast.flat ? addFlat(index, ast.flat, '同部门现金') : addMult(index, ast.factor, '同部门强化')
        if (right?.dept === card.dept) ast.flat ? addFlat(index, ast.flat, '同部门现金') : addMult(index, ast.factor, '同部门强化')
      }
      if (ast.kind === 'sameDeptExtra' && (left?.dept === card.dept || right?.dept === card.dept)) addMult(index, ast.factor, '词条同部门强化')
      if (ast.kind === 'selfIf') {
        if (ast.condition === 'p1' && index === 0) addMult(index, ast.factor, 'P1 自身')
        if (ast.condition === 'p3' && index === 2 && ast.target !== 'both' && ast.target !== 'line') addMult(index, ast.factor, 'P3 自身')
        if (ast.condition === 'p3' && index === 2 && ast.target === 'both') {
          addMult(index - 1, ast.factor, `${card.name} P3 双向`)
          addMult(index + 1, ast.factor, `${card.name} P3 双向`)
        }
        if (ast.condition === 'p3' && index === 2 && ast.target === 'line') addAllMult(ast.factor, `${card.name} P3 全线`)
        if (ast.condition === 'p5' && index === 4) addMult(index, ast.factor, 'P5 自身')
        if (ast.condition === 'rightFun' && right?.type === 'fun') addMult(index, ast.factor, '右邻功能')
        if (ast.condition === 'leftDeptR' && left?.dept === 'R') addMult(index, ast.factor, '左邻研发')
        if (ast.condition === 'lineHasFun' && lineHasFun) addMult(index, ast.factor, '产线含功能')
        if (ast.condition === 'adjFun' && (left?.type === 'fun' || right?.type === 'fun')) addMult(index, ast.factor, '相邻功能')
        if (ast.condition === 'rdSalesSandwich' && left?.dept === 'R' && right?.dept === 'S') addMult(index, ast.factor, '研发+销售夹心')
      }
      if (ast.kind === 'crossDeptBoth' && left?.dept && right?.dept && left.dept !== right.dept) {
        addMult(index - 1, ast.factor, '跨部门协作')
        addMult(index + 1, ast.factor, '跨部门协作')
      }
    })
  })

  results.forEach((result) => {
    const mult = result.mults.reduce((product, value) => product * value, 1)
    result.output = Math.max(0, Math.round((result.base + result.flat) * mult))
  })

  // v4 combo: 整线级倍数（升阶链 / 满编 / 三色 / 高管会议）叠加到 lineMultiplier
  lineMultiplier *= combos.chainMultiplier
  lineMultiplier *= combos.fullRosterMultiplier
  lineMultiplier *= combos.rainbowMultiplier
  lineMultiplier *= combos.execMeetingMultiplier

  const total = Math.round(results.reduce((sum, result) => sum + result.output, 0) * lineMultiplier + monthBonus)
  return {
    slotResults: results,
    total,
    lineMultiplier,
    monthBonus,
    maintenanceWaived,
    synergyCount: results.reduce((sum, result) => sum + result.notes.length, 0),
    combos: combos.labels, // v4: 触发的 combo 名称数组（UI 展示用）
    rainbowDrawBonus: combos.rainbowDrawBonus,
    execMeetingApBonus: combos.execMeetingApBonus,
  }

  function applyDept(dept, factor, label) {
    cards.forEach((target, targetIndex) => {
      if (target?.dept === dept) addMult(targetIndex, factor, label)
    })
  }

  function addAllMult(factor, label) {
    cards.forEach((target, targetIndex) => {
      if (target?.baseOutput > 0) addMult(targetIndex, factor, label)
    })
  }

  function applyAllFlat(amount, label) {
    cards.forEach((target, targetIndex) => {
      if (target?.type === 'emp') addFlat(targetIndex, amount, label)
    })
  }

  function applyAdjacentDept(index, dept, factor, label) {
    if (cards[index - 1]?.dept === dept) addMult(index - 1, factor, label)
    if (cards[index + 1]?.dept === dept) addMult(index + 1, factor, label)
  }
}

function createLine(id, status = 'idle') {
  return {
    id,
    status,
    slots: emptySlots(),
    workingMonthsLeft: 0,
  }
}

function emptySlots() {
  return Array.from({ length: GAME_CONFIG.lineSlots }, () => null)
}

function replaceLine(lines, lineId, replacement) {
  return lines.map((line) => (line.id === lineId ? replacement : line))
}

/**
 * v4: 增加 reuseLineCharge 参数 —— 若 true，则在产线结束时不进入冷却，直接重置为 idle
 * 该参数对所有刚结束的产线生效一次（消费 charge），由 BM "颠覆式创新"/"四宫格战略"提供
 */
function advanceWorkingLines(lines, reuseLineCharge = false) {
  const newCooling = []
  const nextLines = lines.map((line) => {
    if (line.status !== 'working') return line
    const workingMonthsLeft = Math.max(0, line.workingMonthsLeft - 1)
    if (workingMonthsLeft > 0) return { ...line, workingMonthsLeft }
    const skipCooldown = reuseLineCharge // v4: 一次性跳过冷却
    const coolingCards = line.slots.filter(Boolean).map((card) => ({
      ...card,
      location: skipCooldown ? 'deck' : 'cooling',
      coolingRemaining: (skipCooldown || card.affixEffects.includes('NO_COOLDOWN'))
        ? 0
        : GAME_CONFIG.cooldownMonths,
    }))
    coolingCards.forEach((card) => {
      if (card.coolingRemaining <= 0) return
      newCooling.push(card)
    })
    return createLine(line.id, 'idle')
  })
  const instantReturn = lines
    .filter((line) => line.status === 'working' && line.workingMonthsLeft <= 1)
    .flatMap((line) => line.slots.filter((card) => {
      if (!card) return false
      return reuseLineCharge || card.affixEffects.includes('NO_COOLDOWN')
    }).map((card) => ({
      ...card,
      location: 'deck',
      coolingRemaining: 0,
    })))
  return {
    lines: nextLines,
    newCooling,
    instantReturn,
  }
}

function chooseNextPlanningLine(lines, previousActiveLineId) {
  const preferred = previousActiveLineId === 'A' ? 'B' : 'A'
  const preferredLine = lines.find((line) => line.id === preferred && line.status === 'idle')
  if (preferredLine) return preferred
  return lines.find((line) => line.status === 'idle')?.id ?? previousActiveLineId
}

function drawCards(count, drawPile) {
  return {
    drawn: drawPile.slice(0, count),
    drawPile: drawPile.slice(count),
  }
}
function pickEvent(rng) {
  return randomItem(EVENTS, rng)
}
function applyEventHandDelta(hand, drawPile, delta, rng) {
  if (!delta) return { hand, drawPile }
  if (delta > 0) {
    const drawn = drawCards(Math.min(delta, drawPile.length), drawPile)
    return {
      hand: [...hand, ...drawn.drawn.map((card) => ({ ...card, location: 'hand' }))],
      drawPile: drawn.drawPile,
    }
  }
  const removeCount = Math.min(Math.abs(delta), hand.length)
  if (removeCount <= 0) return { hand, drawPile }
  const shuffledHand = shuffle(hand, rng)
  const removed = shuffledHand.slice(0, removeCount).map((card) => ({ ...card, location: 'deck' }))
  const keptUids = new Set(shuffledHand.slice(removeCount).map((card) => card.uid))
  return {
    hand: hand.filter((card) => keptUids.has(card.uid)),
    drawPile: shuffle([...removed, ...drawPile], rng),
  }
}

function evaluateBossRule(event, activeProducingLines) {
  if (!event?.bossRule || event.bossRule.type === 'none') return { passed: true, reason: '' }
  if (event.bossRule.type === 'p3_min_tier') {
    const tierRank = { '专员': 1, '经理': 2, '总监': 3, VP: 4, CXO: 5, '顶级': 5 }
    const minRank = tierRank[event.bossRule.minTier] ?? 2
    const passed = activeProducingLines.some((line) => {
      const p3 = line.slots[2]
      return p3?.type === 'emp' && (tierRank[p3.tier] ?? 0) >= minRank
    })
    return passed ? { passed: true, reason: '' } : { passed: false, reason: 'Boss 事件未满足: P3 需要经理级以上' }
  }
  return { passed: true, reason: '' }
}

function rollAffixes(rarity, rng) {
  if (rarity === 'elite' && rng() < 0.3) return [randomItem(SMALL_AFFIXES, rng)]
  if (rarity === 'epic') {
    const affixes = [randomItem(LARGE_AFFIXES, rng)]
    if (rng() < 0.3) affixes.push(randomItem(SMALL_AFFIXES, rng))
    return affixes
  }
  return []
}

function applyCardAffixStats(stats, effects) {
  return effects.reduce((current, effect) => {
    const factor = readPercentFactor(effect)
    if (effect.startsWith('COST')) return { ...current, cost: current.cost * factor }
    if (effect.startsWith('BASE_OUTPUT')) return { ...current, baseOutput: current.baseOutput * factor }
    return current
  }, stats)
}

export function parseEffectAst(effect = '') {
  const normalized = effect.replace('TRIGGER: ', '').trim()
  const percentMatch = normalized.match(/([+-])(\d+(?:\.\d+)?)%/)
  const multiplierMatch = normalized.match(/x(\d+(?:\.\d+)?)/)
  const flat = readYen(normalized)
  const factor = percentMatch ? readPercentFactor(normalized) : multiplierMatch ? Number(multiplierMatch[1]) : 1
  const ast = {
    raw: effect,
    normalized,
    kind: 'unknown',
    factor,
    flat,
    monthBonus: normalized.includes('MONTH_BONUS') ? flat : 0,
    flags: {
      noMaintain: normalized.includes('MONTH_NO_MAINTAIN'),
    },
  }

  if (normalized.includes('IF_ALL_THREE_DEPT_IN_LINE')) return { ...ast, kind: 'conditionalLineMultiplier', condition: 'allThreeDept' }
  if (normalized.includes('LINE_XMULT')) return { ...ast, kind: 'lineMultiplier' }
  if (normalized.startsWith('LINE_ALL_R')) return { ...ast, kind: 'deptAll', dept: 'R' }
  if (normalized.startsWith('LINE_ALL_S')) return { ...ast, kind: 'deptAll', dept: 'S' }
  if (normalized.startsWith('LINE_ALL_O')) return { ...ast, kind: 'deptAll', dept: 'O' }
  if (normalized.startsWith('LINE_ALL:')) return { ...ast, kind: 'lineAll' }
  if (normalized.startsWith('RIGHT:')) return { ...ast, kind: 'neighbor', direction: 'right' }
  if (normalized.startsWith('LEFT:')) return { ...ast, kind: 'neighbor', direction: 'left' }
  if (normalized.startsWith('BOTH:')) return { ...ast, kind: 'neighbor', direction: 'both' }
  if (normalized.startsWith('ADJ_R')) return { ...ast, kind: 'adjacentDept', dept: 'R' }
  if (normalized.startsWith('ADJ_S')) return { ...ast, kind: 'adjacentDept', dept: 'S' }
  if (normalized.startsWith('ADJ_O')) return { ...ast, kind: 'adjacentDept', dept: 'O' }
  if (normalized.startsWith('SAME_DEPT_ADJ_EXTRA')) return { ...ast, kind: 'sameDeptExtra' }
  if (normalized.startsWith('SAME_DEPT_ADJ') || normalized.startsWith('SAME_DEPT_S_ADJ') || normalized.startsWith('SAME_DEPT_O_ADJ')) return { ...ast, kind: 'sameDept' }
  if (normalized.includes('LEFT_DEPT != RIGHT_DEPT')) return { ...ast, kind: 'crossDeptBoth' }
  if (normalized.includes('SELF_IF_P1')) return { ...ast, kind: 'selfIf', condition: 'p1' }
  if (normalized.includes('SELF_IF_P3')) {
    const target = normalized.includes('LINE_ALL') ? 'line' : normalized.includes('BOTH') ? 'both' : 'self'
    return { ...ast, kind: 'selfIf', condition: 'p3', target }
  }
  if (normalized.includes('SELF_IF_P5')) return { ...ast, kind: 'selfIf', condition: 'p5' }
  if (normalized.includes('SELF_IF_RIGHT_FUN')) return { ...ast, kind: 'selfIf', condition: 'rightFun' }
  if (normalized.includes('SELF_IF_LEFT_DEPT_R_AND_RIGHT_DEPT_S')) return { ...ast, kind: 'selfIf', condition: 'rdSalesSandwich' }
  if (normalized.includes('SELF_IF_LEFT_DEPT_R')) return { ...ast, kind: 'selfIf', condition: 'leftDeptR' }
  if (normalized.includes('SELF_IF_LINE_HAS_FUN')) return { ...ast, kind: 'selfIf', condition: 'lineHasFun' }
  if (normalized.includes('SELF_IF_ADJ_FUN')) return { ...ast, kind: 'selfIf', condition: 'adjFun' }

  return ast
}

function rollSpec(spec, rng) {
  if (typeof spec === 'number') return spec
  const median = readMedian(spec)
  const variance = readVariance(spec)
  if (!variance || median === 0) return median
  const factor = 1 + (rng() * 2 - 1) * variance
  return Math.max(0, Math.round(median * factor))
}

function rollEffectText(effect, rng) {
  return effect.replace(/([+x])(\d+(?:\.\d+)?)(%|¥)?\s±(\d+)%/g, (_match, prefix, valueText, suffix = '', varianceText) => {
    const value = Number(valueText)
    const variance = Number(varianceText) / 100
    const rolled = value * (1 + (rng() * 2 - 1) * variance)
    const formatted = prefix === 'x' ? formatMultiplier(rolled) : String(Math.max(1, Math.round(rolled)))
    return `${prefix}${formatted}${suffix}`
  })
}

function readMedian(spec) {
  if (typeof spec === 'number') return spec
  const match = String(spec).match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function readVariance(spec) {
  const match = String(spec).match(/±(\d+(?:\.\d+)?)%/)
  return match ? Number(match[1]) / 100 : 0
}

function readPercentFactor(text) {
  const match = text.match(/([+-])(\d+(?:\.\d+)?)%/)
  if (!match) return 1
  const direction = match[1] === '-' ? -1 : 1
  return 1 + direction * (Number(match[2]) / 100)
}

function readMultiplier(text) {
  const match = text.match(/x(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : 1
}

function readYen(text) {
  const match = text.match(/([+-])¥(\d+(?:\.\d+)?)/)
  if (!match) return 0
  return (match[1] === '-' ? -1 : 1) * Number(match[2])
}

function readSignedNumber(text) {
  const match = text.match(/([+-])(\d+(?:\.\d+)?)/)
  if (!match) return 0
  return (match[1] === '-' ? -1 : 1) * Number(match[2])
}

function getDelta(value, median) {
  if (!median) return 'neutral'
  const ratio = (value - median) / median
  if (ratio >= 0.15) return 'great'
  if (ratio >= 0.05) return 'up'
  if (ratio <= -0.15) return 'bad'
  if (ratio <= -0.05) return 'down'
  return 'neutral'
}

function getDeltaPct(value, median) {
  if (!median) return 0
  return Math.round(((value - median) / median) * 100)
}

function buildSettlementReport({ month, eventIncome, rawIncome, maintenance, lineReports, apCarry, usedAp }) {
  return {
    month,
    income: eventIncome,
    rawIncome,
    maintenance,
    lineReports,
    apCarry,
    usedAp,
  }
}

function getRating(income, target) {
  if (income >= target * 2) return '卓越'
  if (income >= target * 1.5) return '优秀'
  if (income >= target) return '达标'
  return '未达标'
}

function weightedPick(weights, rng) {
  const entries = Object.entries(weights)
  const roll = rng()
  let cursor = 0
  for (const [key, weight] of entries) {
    cursor += weight
    if (roll <= cursor) return key
  }
  return entries[entries.length - 1][0]
}

function randomItem(items, rng) {
  return items[Math.floor(rng() * items.length)]
}

function shuffle(items, rng) {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1))
    const current = next[index]
    next[index] = next[swapIndex]
    next[swapIndex] = current
  }
  return next
}

function formatMultiplier(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function accept(state) {
  if (state && state.stage && Number.isFinite(state.cash)) {
    const valuation = computeValuation(state)
    return {
      state: {
        ...state,
        valuation,
        highestValuation: Math.max(state.highestValuation ?? 0, valuation),
      },
      ok: true,
      message: '',
    }
  }
  return { state, ok: true, message: '' }
}

function reject(state, message) {
  return { state, ok: false, message }
}

// ============================================================================
// 关间「董事会会议」(详见 BOARD_MEETING_DESIGN.md)
// ============================================================================

const SHOP_PROBS = {
  legendary: 0.4,
  packC: 0.8,
  packD: 0.6,
  packE: 0.4,
}

const LEGENDARY_PITY_THRESHOLD = 3 // 连续 3 关未刷出 → 第 4 关 60%

/**
 * 汇总当前激活商业模式的统计 buff
 */
export function computeBusinessModelStats(state) {
  const stats = {
    drawBonus: 0,
    handLimitBonus: 0,
    maintenanceDiscount: 0,
    apIfHandRichEnabled: false,
    p1Bonus: 0,
    deptBonusR: 0,
    deptBonusS: 0,
    deptBonusO: 0,
    lineApDiscount: 0,
    srvApDiscount: 0,
    chargedReuseLine: false,
    chargedWaiveMaintenance: false,
    levelEndBudgetBonus: 0,
    ccrBonus: 0, // 现金转化率 buff（PR4 中由 BM_03/18/21 等提供）
  }
  if (!state.activeBusinessModels?.length) return stats
  state.activeBusinessModels.forEach((slot) => {
    const bm = BUSINESS_MODELS.find((item) => item.id === slot.id)
    if (!bm) return
    const p = bm.payload
    switch (p.type) {
      case 'drawBonus': stats.drawBonus += p.value; break
      case 'handLimitBonus': stats.handLimitBonus += p.value; break
      case 'maintenanceDiscount': stats.maintenanceDiscount += p.value; break
      case 'apIfHandRich': stats.apIfHandRichEnabled = true; break
      case 'p1Bonus': stats.p1Bonus += p.value; break
      case 'deptBonus':
        if (p.dept === 'R') stats.deptBonusR += p.value
        if (p.dept === 'S') stats.deptBonusS += p.value
        if (p.dept === 'O') stats.deptBonusO += p.value
        break
      case 'lineApDiscount': stats.lineApDiscount += p.value; break
      case 'srvApDiscount': stats.srvApDiscount += p.value; break
      case 'reuseLine': stats.chargedReuseLine = slot.charged !== false; break
      case 'waiveMaintenance': stats.chargedWaiveMaintenance = slot.charged !== false; break
      case 'levelEndBudgetBonus': stats.levelEndBudgetBonus += p.value; break
      case 'ccrBonus': stats.ccrBonus += p.value; break
    }
  })
  return stats
}

/**
 * 进入董事会会议：在通关结算后调用
 * 生成事件 + 商店刷出 + 商学院刷出
 */
export function enterIntermission(state, rng = Math.random) {
  if (!state.result?.stagePromotion) return reject(state, '未达晋升条件，无法进入董事会')
  if (state.intermissionState) return reject(state, '已在董事会会议中')
  
  const nextStage = state.result.nextStage
  if (!nextStage) return reject(state, '下阶段无效')

  // v4: BM levelEndBudgetBonus 提升 entryGrant (BM_12/34/35/36 = 10-15%, BM_38 = 25%, BM_39 = 30%)
  const bmStats = computeBusinessModelStats(state)
  const grantedBudget = Math.round(nextStage.entryGrant * (1 + (bmStats.levelEndBudgetBonus ?? 0)))
  const event = randomItem(BOARD_EVENTS, rng)
  const shopRoll = rollShopRoll(nextStage.id, state.legendaryRollStreak, rng)
  const schoolRoll = rollSchoolRoll(nextStage.id, state.activeBusinessModels, rng)

  return accept({
    ...state,
    cash: state.cash + grantedBudget,
    intermissionState: {
      phase: 'event',
      event,
      resolvedOptionId: null,
      resolvedMessage: '',
      shopRoll,
      schoolRoll,
      purchased: {
        epic: false,
        legendary: false,
        packs: shopRoll.packs.map(() => null),
      },
      schoolPurchased: false,
      hrActionsCount: 0,
      fireActionsCount: 0,
      cardActionLog: {},
      grantedBudget,
      nextStageId: nextStage.id,
      logTrail: [`晋升至 ${nextStage.name}，获得投资人注资 ¥${grantedBudget}`],
    },
    log: [`💼 进入阶段晋升董事会会议: ${nextStage.name}`, ...state.log].slice(0, 7),
  })
}

export function resolveEvent(state, optionId, rng = Math.random) {
  const im = state.intermissionState
  if (!im || im.phase !== 'event') return reject(state, '当前不在事件阶段')
  const option = im.event.options.find((o) => o.id === optionId)
  if (!option) return reject(state, '选项无效')
  if (option.cost && state.cash < option.cost) return reject(state, '¥ 现金不足')

  let nextState = { ...state }
  if (option.cost) {
    nextState.cash -= option.cost
  }
  let resultMessage = option.result || ''
  const eff = option.effect
  const nextMods = { ...nextState.nextLevelModifiers }

  switch (eff.type) {
    case 'noop': break
    case 'removeBudgetBonus':
      nextState.cash += eff.value ?? 0
      break
    case 'recruitLegendary': {
      const legPool = CARD_TEMPLATES.filter((c) => c.rarity === 'legendary' && c.dept === eff.dept)
      if (legPool.length) {
        const picked = randomItem(legPool, rng)
        nextMods.pendingCards = [...(nextMods.pendingCards ?? []), picked.id]
      }
      break
    }
    case 'increaseNextTarget':
      nextMods.targetMultiplier = (nextMods.targetMultiplier ?? 1) + (eff.value ?? 0)
      break
    case 'budgetGainNextMonthPenalty':
      nextState.cash += eff.budget ?? 0
      nextMods.handPenalty = (nextMods.handPenalty ?? 0) + 1
      break
    case 'unlockEpic':
      nextMods.unlockedEpicDepts = [...(nextMods.unlockedEpicDepts ?? []), eff.dept]
      break
    case 'gamble': {
      const win = rng() < 0.5
      const delta = win ? eff.win : eff.lose
      nextState.cash = Math.max(0, nextState.cash + delta)
      resultMessage = win ? `✓ 抄底成功 +¥${eff.win}` : `✗ 抄错方向 ${delta} ¥`
      break
    }
    case 'increaseBmSlot':
      nextState.businessModelSlotCap += 1
      break
    case 'budgetGain':
      nextState.cash += eff.value ?? 0
      break
  }

  // Update option label format in logTrail
  const cleanedLabel = option.label.replace(/💰/g, '¥')

  return accept({
    ...nextState,
    nextLevelModifiers: nextMods,
    intermissionState: {
      ...im,
      phase: 'hub',
      resolvedOptionId: optionId,
      resolvedMessage: resultMessage,
      logTrail: [resultMessage, `选择: ${cleanedLabel}`, ...im.logTrail],
    },
  })
}

export function rollShop(state, rng = Math.random) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  if (state.cash < 5) return reject(state, '¥ 不足以刷新（需 5）')
  const nextStageId = im.nextStageId
  const newRoll = rollShopRoll(nextStageId, state.legendaryRollStreak, rng)
  return accept({
    ...state,
    cash: state.cash - 5,
    intermissionState: {
      ...im,
      shopRoll: newRoll,
      purchased: { epic: false, legendary: false, packs: newRoll.packs.map(() => null) },
    },
  })
}

export function purchaseShopItem(state, slotKey) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  if (im.purchased[slotKey]) return reject(state, '该商品已购买')
  const item = im.shopRoll[slotKey === 'epic' ? 'epicCard' : 'legendaryCard']
  if (!item) return reject(state, '该槽位无商品')
  const cost = im.shopRoll[slotKey === 'epic' ? 'epicCost' : 'legendaryCost']
  if (state.cash < cost) return reject(state, '¥ 不足')

  const nextMods = { ...state.nextLevelModifiers }
  nextMods.pendingCards = [...(nextMods.pendingCards ?? []), item.id]

  return accept({
    ...state,
    cash: state.cash - cost,
    nextLevelModifiers: nextMods,
    revealedRecruitCard: item,
    intermissionState: {
      ...im,
      purchased: { ...im.purchased, [slotKey]: true },
      logTrail: [`购买 ${item.name} (-¥${cost})`, ...im.logTrail],
    },
  })
}

export function openPack(state, packSlotIdx, pickIndex) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  const packEntry = im.shopRoll.packs[packSlotIdx]
  if (!packEntry) return reject(state, '该卡包槽位为空')
  const already = im.purchased.packs[packSlotIdx]

  if (!already) {
    if (state.cash < packEntry.cost) return reject(state, '¥ 不足')
    return accept({
      ...state,
      cash: state.cash - packEntry.cost,
      intermissionState: {
        ...im,
        purchased: {
          ...im.purchased,
          packs: im.purchased.packs.map((p, i) => i === packSlotIdx ? { opened: true, pickIndex: null } : p),
        },
        logTrail: [`购买 ${packEntry.packDef.name} (-¥${packEntry.cost})`, ...im.logTrail],
      },
    })
  }

  if (already.pickIndex !== null) return reject(state, '已挑选完毕')
  if (pickIndex === undefined || pickIndex < 0 || pickIndex >= packEntry.contents.length) {
    return reject(state, '选项无效')
  }
  const picked = packEntry.contents[pickIndex]
  const nextMods = { ...state.nextLevelModifiers }

  if (packEntry.packDef.poolType === 'business_model' || (packEntry.packDef.poolType === 'mystery' && picked.isBusinessModel)) {
    const slotCap = state.businessModelSlotCap
    if (state.activeBusinessModels.length >= slotCap) {
      return reject(state, '商业模式槽位已满，请先退订部分模式')
    }
    return accept({
      ...state,
      activeBusinessModels: [...state.activeBusinessModels, { id: picked.bmId, charged: true }],
      intermissionState: {
        ...im,
        purchased: {
          ...im.purchased,
          packs: im.purchased.packs.map((p, i) => i === packSlotIdx ? { opened: true, pickIndex } : p),
        },
        logTrail: [`商业模式 → ${picked.bmName}`, ...im.logTrail],
      },
    })
  }

  nextMods.pendingCards = [...(nextMods.pendingCards ?? []), picked.id]
  return accept({
    ...state,
    nextLevelModifiers: nextMods,
    revealedRecruitCard: picked,
    intermissionState: {
      ...im,
      purchased: {
        ...im.purchased,
        packs: im.purchased.packs.map((p, i) => i === packSlotIdx ? { opened: true, pickIndex } : p),
      },
      logTrail: [`${packEntry.packDef.name} → ${picked.name}`, ...im.logTrail],
    },
  })
}

export function upgradeCard(state, cardUid, mode, affixId) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  if (im.hrActionsCount >= 1) return reject(state, '本期已进行过人事变动（升职或附加词缀）')
  const action = im.cardActionLog[cardUid]
  if (action) return reject(state, '该卡本场会议已操作过')

  const card = findCardAcrossPiles(state, cardUid)
  if (!card) return reject(state, '卡牌未找到')
  if (card.type !== 'emp') return reject(state, '仅员工卡可升职')

  let cost = 0
  let upgraded = { ...card }
  let logText = ''

  if (mode === 'tier' || mode === 'rarity') {
    const path = UPGRADE_PATHS[card.tier]
    if (!path) return reject(state, '该职级已达上限')
    cost = path.cost
    if (state.cash < cost) return reject(state, '¥ 现金不足')
    upgraded.tier = path.next
    upgraded.baseOutput = Math.round(card.baseOutput * 1.25)
    upgraded.effects = upgradeTierEffects(card, path.next)
    logText = `${card.name} 升职: ${card.tier || '未知'} → ${upgraded.tier} (-¥${cost})`
  } else if (mode === 'affix') {
    cost = 8
    if (state.cash < cost) return reject(state, '¥ 现金不足')
    const affix = AFFIX_POOL.find((a) => a.id === affixId)
    if (!affix) return reject(state, '词缀无效')
    upgraded.affixes = [...(card.affixes || []), { id: affix.id, name: affix.label, effects: affix.effects }]
    upgraded.affixEffects = [...(card.affixEffects || []), ...affix.effects]
    logText = `${card.name} 附加词缀: ${affix.label} (-¥${cost})`
  } else {
    return reject(state, '升职模式无效')
  }

  return accept({
    ...replaceCardAcrossPiles(state, cardUid, upgraded),
    cash: state.cash - cost,
    intermissionState: {
      ...im,
      cardActionLog: { ...im.cardActionLog, [cardUid]: 'upgraded' },
      hrActionsCount: im.hrActionsCount + 1,
      logTrail: [logText, ...im.logTrail],
    },
  })
}

export function fireCard(state, cardUid) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  if (im.fireActionsCount >= 5) return reject(state, '本场会议“向社会输送人才”上限 5 张')
  if (im.cardActionLog[cardUid]) return reject(state, '该卡本场会议已操作过')

  const card = findCardAcrossPiles(state, cardUid)
  if (!card) return reject(state, '卡牌未找到')

  const stageId = state.stage.id
  const cost = stageId <= 3 ? 3 : stageId <= 6 ? 5 : 8
  if (state.cash < cost) return reject(state, '¥ 现金不足')

  return accept({
    ...removeCardAcrossPiles(state, cardUid),
    cash: state.cash - cost,
    intermissionState: {
      ...im,
      cardActionLog: { ...im.cardActionLog, [cardUid]: 'fired' },
      fireActionsCount: im.fireActionsCount + 1,
      hrActionsCount: im.hrActionsCount + 1,
      logTrail: [`“向社会输送人才” ${card.name} (-¥${cost})`, ...im.logTrail],
    },
  })
}

function upgradeTierEffects(card, nextTier) {
  if (card.type !== 'emp' || !card.dept || !nextTier) return card.effects
  const currentL1 = new Set(getDeptL1Effects(card.dept, card.tier))
  const preserved = (card.effects ?? []).filter((effect) => !currentL1.has(effect))
  const nextL1 = getDeptL1Effects(card.dept, nextTier)
  return [...nextL1, ...preserved]
}

export function purchaseBusinessModel(state, schoolSlotIdx, replaceIdx = null) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  if (im.schoolPurchased) return reject(state, '本期商学院只能订阅一个商业模式')
  const bmId = im.schoolRoll[schoolSlotIdx]
  if (!bmId) return reject(state, '该槽位为空')
  const bm = BUSINESS_MODELS.find((b) => b.id === bmId)
  if (!bm) return reject(state, '商业模式未找到')
  if (state.cash < bm.cost) return reject(state, '¥ 不足')

  const slotCap = state.businessModelSlotCap
  let nextActive = [...state.activeBusinessModels]
  if (nextActive.length >= slotCap) {
    if (replaceIdx === null || replaceIdx === undefined) return reject(state, '槽位已满，需指定替换的槽位')
    nextActive = nextActive.filter((_, i) => i !== replaceIdx)
  }
  nextActive.push({ id: bmId, charged: true })
  const nextSchoolRoll = im.schoolRoll.map((id, i) => i === schoolSlotIdx ? null : id)

  return accept({
    ...state,
    cash: state.cash - bm.cost,
    activeBusinessModels: nextActive,
    intermissionState: {
      ...im,
      schoolRoll: nextSchoolRoll,
      schoolPurchased: true,
      logTrail: [`商学院: 订阅 ${bm.name} (-¥${bm.cost})`, ...im.logTrail],
    },
  })
}

export function rollSchool(state, rng = Math.random) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  if (state.cash < 4) return reject(state, '¥ 不足以刷新（需 4）')
  const nextStageId = im.nextStageId
  const newRoll = rollSchoolRoll(nextStageId, state.activeBusinessModels, rng)
  return accept({
    ...state,
    cash: state.cash - 4,
    intermissionState: { ...im, schoolRoll: newRoll },
  })
}

/**
 * 董事会人事部「向社会输送人才」按钮使用的自由解雇函数。
 * v4 起，董事会的解雇不再走 fireCard 的付费路径，统一通过此函数（免费）。
 * 救济机制已被移除（cash < 0 即 game over），此函数仅服务 HR Office 流程。
 */
export function dismissCardInBoardMeeting(state, cardUid) {
  const card = findCardAcrossPiles(state, cardUid)
  if (!card) return reject(state, '卡牌未找到')

  const im = state.intermissionState
  if (im && im.fireActionsCount >= 5) {
    return reject(state, '本场会议“向社会输送人才”上限 5 张')
  }

  const nextIm = im ? {
    ...im,
    cardActionLog: { ...im.cardActionLog, [cardUid]: 'fired' },
    fireActionsCount: im.fireActionsCount + 1,
    logTrail: [`“向社会输送人才” ${card.name} (减少月 burn ${getCardBurn(card)})`, ...im.logTrail],
  } : null

  return accept({
    ...removeCardAcrossPiles(state, cardUid),
    intermissionState: nextIm,
    log: [`董事会人事部「向社会输送人才」: ${card.name} (减少月 burn ${getCardBurn(card)})`, ...state.log].slice(0, 7)
  })
}

export function unsubscribeBusinessModel(state, id) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  
  if (!state.activeBusinessModels.some(b => b.id === id)) {
    return reject(state, '未订阅该商业模式')
  }
  
  const nextActive = state.activeBusinessModels.filter(b => b.id !== id)
  return accept({
    ...state,
    activeBusinessModels: nextActive,
    intermissionState: {
      ...im,
      logTrail: [`退订商业模式 ${BUSINESS_MODELS.find(b => b.id === id)?.name ?? id}`, ...im.logTrail]
    }
  })
}

export function exitIntermission(state, rng = Math.random) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')

  const nextStageId = im.nextStageId
  const nextStage = STAGES.find((s) => s.id === nextStageId)
  if (!nextStage) return reject(state, '阶段无效')

  const rechargedBMs = state.activeBusinessModels.map((b) => ({ ...b, charged: true }))

  const pendingCards = state.nextLevelModifiers.pendingCards ?? []
  const purchasedCards = pendingCards.map((cardId) => createCardInstance(cardId, 'deck', rng))
  const nextDrawPile = shuffle([...state.drawPile, ...purchasedCards], rng)

  const slotCap = nextStage.id >= 7 ? Math.max(5, state.businessModelSlotCap)
    : nextStage.id >= 4 ? Math.max(4, state.businessModelSlotCap)
    : state.businessModelSlotCap

  const purchasedLegendary = im.purchased.legendary
  const newStreak = purchasedLegendary || im.shopRoll.legendaryCard
    ? 0
    : state.legendaryRollStreak + 1

  // Perform month transition into the first month of the new stage
  const nextMonthNum = state.month + 1
  let nextYear = state.year
  let nextMonth = nextMonthNum
  if (nextMonthNum > 12) {
    nextMonth = 1
    nextYear += 1
  }
  const elapsedMonths = (state.elapsedMonths ?? 0) + 1

  const isNewQuarter = (nextMonth - 1) % 3 === 0
  const nextEvent = isNewQuarter ? pickEvent(rng) : state.event
  const nextDriftDirection = isNewQuarter ? pickRandomDriftDirection(rng) : (state.driftDirection || 'right-up')
  // Temporarily apply next active BMs to state to compute correct BM stats for draw count/AP
  const tempState = { ...state, activeBusinessModels: rechargedBMs }
  const bmStats = computeBusinessModelStats(tempState)

  const apHandRich = bmStats.apIfHandRichEnabled && state.hand.length >= 6 ? 1 : 0
  const nextApAvailable = Math.max(1, GAME_CONFIG.baseAp + state.apCarry + (nextEvent.apDelta ?? 0) + apHandRich)

  const isFounderRInHand = state.hand.some(c => c.id === 'EMP_FOUNDER_R')
  const lastSettlement = state.lastSettlement
  const wasFounderRInSlots = !!(lastSettlement && lastSettlement.lineReports && lastSettlement.lineReports.some(lr => lr.slotResults.some(sr => sr.card && sr.card.id === 'EMP_FOUNDER_R')))

  let scientistDrawBonus = 0
  let isScientistActive = false
  if (isFounderRInHand) {
    scientistDrawBonus += 1
    isScientistActive = true
  }
  if (wasFounderRInSlots) {
    scientistDrawBonus += 3
    isScientistActive = true
  }

  const baseHandLimit = GAME_CONFIG.handLimit + bmStats.handLimitBonus + (nextEvent.handLimitDelta ?? 0)
  const effectiveHandLimit = isScientistActive ? 10 : baseHandLimit

  const handAdjusted = applyEventHandDelta(state.hand, nextDrawPile, nextEvent.handDelta ?? 0, rng)
  const drawPerMonth = GAME_CONFIG.drawPerMonth + bmStats.drawBonus + (nextEvent.drawBonus ?? 0) + scientistDrawBonus
  const drawCount = Math.min(drawPerMonth, Math.max(0, effectiveHandLimit - handAdjusted.hand.length))
  const drawn = drawCards(drawCount, handAdjusted.drawPile)
  const nextHand = sortHandDefault([...handAdjusted.hand, ...drawn.drawn.map((card) => ({ ...card, location: 'hand' }))])

  const nextActiveLineId = chooseNextPlanningLine(state.lines, state.activeLineId)
  const nextLines = state.lines.map((line) => (
    line.id === nextActiveLineId 
      ? { ...line, status: 'planning' } 
      : (line.status === 'planning' ? { ...line, status: 'idle' } : line)
  ))

  return accept({
    ...state,
    stage: nextStage,
    year: nextYear,
    month: nextMonth,
    elapsedMonths,
    event: nextEvent,
    driftDirection: nextDriftDirection,
    apAvailable: nextApAvailable,
    hand: nextHand,
    drawPile: drawn.drawPile,
    activeBusinessModels: rechargedBMs,
    intermissionState: null,
    result: null,
    legendaryRollStreak: newStreak,
    highlightCount: 0, // v4 PR4: 每阶段重置高光配额
    businessModelSlotCap: slotCap,
    nextLevelModifiers: { targetMultiplier: 1, handPenalty: 0, unlockedEpicDepts: [], pendingCards: [] },
    activeLineId: nextActiveLineId,
    lines: nextLines,
    log: [
      `🚀 进入阶段: ${nextStage.name} (${nextStage.theme})`,
      `第 ${nextMonth} 月开始: ${nextEvent.name}`,
      ...state.log,
    ].slice(0, 7),
  })
}

// ----- 辅助：跨牌堆查找/替换/移除卡 -----

function findCardAcrossPiles(state, uid) {
  return [...state.hand, ...state.drawPile, ...state.coolingPile].find((c) => c.uid === uid)
}

function replaceCardAcrossPiles(state, uid, replacement) {
  const mapper = (card) => card.uid === uid ? replacement : card
  return {
    ...state,
    hand: state.hand.map(mapper),
    drawPile: state.drawPile.map(mapper),
    coolingPile: state.coolingPile.map(mapper),
  }
}

function removeCardAcrossPiles(state, uid) {
  const filter = (card) => card.uid !== uid
  return {
    ...state,
    hand: state.hand.filter(filter),
    drawPile: state.drawPile.filter(filter),
    coolingPile: state.coolingPile.filter(filter),
  }
}

// ----- 商店 / 商学院刷新 -----

function rollShopRoll(nextLevelId, legendaryStreak, rng) {
  const epicTemplates = CARD_TEMPLATES.filter((c) => c.rarity === 'epic' && c.type === 'emp')
  const epicCard = epicTemplates.length ? createCardInstance(randomItem(epicTemplates, rng).id, 'shop', rng) : null
  const epicCost = nextLevelId + 8

  const legendaryProb = legendaryStreak >= LEGENDARY_PITY_THRESHOLD ? 0.6 : SHOP_PROBS.legendary
  const legendaryRoll = rng() < legendaryProb
  let legendaryCard = null
  if (legendaryRoll) {
    const legPool = CARD_TEMPLATES.filter((c) => c.rarity === 'legendary')
    if (legPool.length) legendaryCard = createCardInstance(randomItem(legPool, rng).id, 'shop', rng)
  }
  const legendaryCost = nextLevelId * 4 + 15

  // 卡包槽位 C/D/E
  const packs = []
  
  // 1. 强制将神秘礼包排在第一位 (确保神秘礼包必出且作为 packs[0])
  const mysteryDef = PACK_DEFINITIONS.find((p) => p.id === 'PACK_MYSTERY')
  if (mysteryDef) {
    packs.push({
      packDef: mysteryDef,
      cost: mysteryDef.cost,
      contents: rollPackContents(mysteryDef, nextLevelId, rng)
    })
  }

  // 2. 随机滚动另外两个卡包 (对应 slot D/E 概率，排除神秘礼包)
  const usedTypes = new Set(['PACK_MYSTERY'])
  const slotProbs = [SHOP_PROBS.packD, SHOP_PROBS.packE]
  slotProbs.forEach((prob) => {
    if (rng() >= prob) return
    const candidatePacks = PACK_DEFINITIONS.filter((p) => !usedTypes.has(p.id))
    if (!candidatePacks.length) return
    const pack = randomItem(candidatePacks, rng)
    usedTypes.add(pack.id)
    packs.push({ packDef: pack, cost: pack.cost, contents: rollPackContents(pack, nextLevelId, rng) })
  })

  return { epicCard, epicCost, legendaryCard, legendaryCost, packs }
}

function rollPackContents(pack, nextLevelId, rng) {
  const items = []
  for (let i = 0; i < pack.fromN; i++) {
    const raw = pickPackItem(pack.poolType, nextLevelId, rng, items)
    if (raw && raw.isBusinessModel) {
      items.push(raw)
    } else if (raw) {
      items.push(createCardInstance(raw.id, 'deck', rng))
    }
  }
  return items
}

function pickPackItem(poolType, nextLevelId, rng, existing) {
  const usedIds = new Set(existing.map((it) => it.id || it.bmId))
  const filterUnique = (pool) => pool.filter((c) => !usedIds.has(c.id))

  if (poolType === 'employee_common') {
    const pool = filterUnique(CARD_TEMPLATES.filter((c) => c.type === 'emp' && c.rarity === 'common' && c.unlockLevel <= nextLevelId))
    return pool.length ? randomItem(pool, rng) : CARD_TEMPLATES[0]
  }
  if (poolType === 'employee_elite') {
    const pool = filterUnique(CARD_TEMPLATES.filter((c) => c.type === 'emp' && c.rarity === 'elite' && c.unlockLevel <= nextLevelId))
    return pool.length ? randomItem(pool, rng) : randomItem(CARD_TEMPLATES.filter((c) => c.type === 'emp' && c.rarity === 'epic'), rng)
  }
  if (poolType === 'service') {
    const pool = filterUnique(CARD_TEMPLATES.filter((c) => c.type === 'srv' && c.unlockLevel <= nextLevelId))
    return pool.length ? randomItem(pool, rng) : CARD_TEMPLATES[0]
  }
  if (poolType === 'function') {
    const pool = filterUnique(CARD_TEMPLATES.filter((c) => c.type === 'fun' && c.unlockLevel <= nextLevelId))
    return pool.length ? randomItem(pool, rng) : CARD_TEMPLATES[0]
  }
  if (poolType === 'business_model') {
    const pool = BUSINESS_MODELS.filter((b) => b.unlockLevel <= nextLevelId && !usedIds.has(b.id))
    const bm = pool.length ? randomItem(pool, rng) : BUSINESS_MODELS[0]
    return { isBusinessModel: true, bmId: bm.id, bmName: bm.name, bmDescription: bm.description, bmRarity: bm.rarity }
  }
  if (poolType === 'mystery') {
    // 10% 传奇 / 30% epic / 60% rare
    const r = rng()
    let pool
    if (r < 0.1) pool = CARD_TEMPLATES.filter((c) => c.rarity === 'legendary')
    else if (r < 0.4) pool = CARD_TEMPLATES.filter((c) => c.rarity === 'epic' && c.unlockLevel <= nextLevelId)
    else pool = CARD_TEMPLATES.filter((c) => c.rarity === 'rare' && c.unlockLevel <= nextLevelId)
    pool = filterUnique(pool)
    return pool.length ? randomItem(pool, rng) : CARD_TEMPLATES[0]
  }
  return CARD_TEMPLATES[0]
}

function rollSchoolRoll(nextLevelId, activeBMs, rng) {
  const ownedIds = new Set(activeBMs.map((b) => b.id))
  const pool = BUSINESS_MODELS.filter((b) => b.unlockLevel <= nextLevelId && !ownedIds.has(b.id))
  const result = []
  const usedHere = new Set()
  while (result.length < 3 && pool.length > usedHere.size) {
    const candidates = pool.filter((b) => !usedHere.has(b.id))
    if (!candidates.length) break
    const picked = randomItem(candidates, rng)
    result.push(picked.id)
    usedHere.add(picked.id)
  }
  // 若不足 3 个，填 null
  while (result.length < 3) result.push(null)
  return result
}
