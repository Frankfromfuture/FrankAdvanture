import {
  CARD_TEMPLATES,
  EVENTS,
  LARGE_AFFIXES,
  LEVELS,
  RARITY_VARIANCE,
  SMALL_AFFIXES,
  STARTER_DECK,
  STARTER_HAND,
  expandDeck,
  getCardTemplate,
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
}

const RECRUIT_RARITY_TABLE = {
  1: { common: 1, rare: 0, elite: 0, epic: 0 },
  2: { common: 0.75, rare: 0.25, elite: 0, epic: 0 },
  3: { common: 0.65, rare: 0.35, elite: 0, epic: 0 },
  4: { common: 0.55, rare: 0.35, elite: 0.1, epic: 0 },
  5: { common: 0.45, rare: 0.4, elite: 0.15, epic: 0 },
  6: { common: 0.4, rare: 0.4, elite: 0.15, epic: 0.05 },
  7: { common: 0.35, rare: 0.4, elite: 0.2, epic: 0.05 },
  8: { common: 0.3, rare: 0.4, elite: 0.22, epic: 0.08 },
  9: { common: 0.25, rare: 0.38, elite: 0.27, epic: 0.1 },
  10: { common: 0.2, rare: 0.35, elite: 0.32, epic: 0.13 },
}

let instanceCounter = 0

export function createInitialState({ levelId = 1, rng = Math.random } = {}) {
  instanceCounter = 0
  const level = LEVELS.find((item) => item.id === levelId) ?? LEVELS[0]
  const hand = expandDeck(STARTER_HAND).map((id) => createCardInstance(id, 'hand', rng))
  const drawPile = shuffle(expandDeck(STARTER_DECK).map((id) => createCardInstance(id, 'deck', rng)), rng)
  const event = pickEvent(rng)
  const recruitMarket = createRecruitMarket(level.id, getRecruitMarketSize(1), rng)
  const apAvailable = Math.max(1, GAME_CONFIG.baseAp + (event.apDelta ?? 0))

  return {
    level,
    month: 1,
    cash: level.startCash + (event.cashDelta ?? 0),
    cumulativeIncome: 0,
    strategicBudget: level.startBudget,
    apCarry: 0,
    apAvailable,
    activeLineId: 'A',
    selectedCardUid: null,
    hand,
    drawPile,
    coolingPile: [],
    recruitMarket,
    event,
    lines: [
      createLine('A', 'planning'),
      createLine('B', 'idle'),
    ],
    discardRequired: Math.max(0, hand.length - GAME_CONFIG.handLimit),
    lastSettlement: null,
    result: null,
    log: [
      `第 1 月开始: ${event.name}`,
      `${level.milestone} 目标 ¥${level.target}`,
    ],
  }
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

  return {
    ...template,
    uid: `${template.id}-${++instanceCounter}`,
    location,
    cost: Math.max(1, Math.round(adjusted.cost)),
    baseOutput: Math.max(0, Math.round(adjusted.baseOutput)),
    baseCostMedian: baseCost,
    baseOutputMedian: baseOutput,
    outputDelta: getDelta(adjusted.baseOutput, baseOutput),
    costDelta: getDelta(adjusted.cost, baseCost),
    effects: template.effects.map((effect) => rollEffectText(effect, rng)),
    affixes,
    affixEffects,
    coolingRemaining: 0,
  }
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
    costDelta: 'neutral',
    effects: overrides.effects ?? template.effects.map((effect) => effect.replace(/\s±\d+%/g, '')),
    affixes: overrides.affixes ?? [],
    affixEffects: overrides.affixEffects ?? [],
    coolingRemaining: overrides.coolingRemaining ?? 0,
  }
}

export function getActiveLine(state) {
  return state.lines.find((line) => line.id === state.activeLineId)
}

export function getLineAp(slots) {
  return slots.reduce((total, card) => total + (card?.ap ?? 0), 0)
}

export function getEffectiveApLimit(state, slots = getActiveLine(state)?.slots ?? []) {
  const serviceBonus = slots.reduce((sum, card) => {
    if (!card) return sum
    return sum + card.effects.reduce((effectSum, effect) => {
      if (!effect.includes('MONTH_AP')) return effectSum
      return effectSum + readSignedNumber(effect)
    }, 0)
  }, 0)
  return Math.max(1, state.apAvailable + serviceBonus)
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
  const projectedAp = getLineAp(newSlots)
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

export function buyRecruit(state, candidateUid) {
  const card = state.recruitMarket.find((item) => item.uid === candidateUid)
  if (!card) return reject(state, '候选人已离开市场')
  if (card.cost > state.strategicBudget) return reject(state, `战略预算不足: 需要 💰${card.cost}`)
  return accept({
    ...state,
    strategicBudget: state.strategicBudget - card.cost,
    drawPile: [{ ...card, location: 'deck' }, ...state.drawPile],
    recruitMarket: state.recruitMarket.filter((item) => item.uid !== candidateUid),
    log: [`招聘 ${card.name}, 加入牌堆`, ...state.log].slice(0, 7),
  })
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

  const activeProducingLines = workingLines.filter((line) => line.status === 'working' && line.slots.some(Boolean))
  const lineReports = activeProducingLines.map((line) => ({
    lineId: line.id,
    ...computeLineOutput(line.slots),
  }))
  const rawIncome = lineReports.reduce((sum, report) => sum + report.total, 0)
  const eventIncome = Math.round(rawIncome * (state.event.incomeMultiplier ?? 1))
  const maintenanceWaived = lineReports.some((report) => report.maintenanceWaived)
  const maintenance = maintenanceWaived ? 0 : Math.round(state.level.maintenance * (state.event.maintenanceMultiplier ?? 1))
  const nextCash = state.cash + eventIncome - maintenance
  const nextCumulativeIncome = state.cumulativeIncome + eventIncome
  const usedAp = hasNewLine ? getLineAp(activeLine.slots) : 0
  const apLimit = getEffectiveApLimit(state)
  const apCarry = Math.min(GAME_CONFIG.carryApCap, Math.floor(Math.max(0, apLimit - usedAp) * 0.5))

  const afterWork = advanceWorkingLines(workingLines)
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

  const drawPool = shuffle([...returned, ...afterWork.instantReturn, ...state.drawPile], rng)
  const isFinalMonth = state.month >= GAME_CONFIG.monthsPerStage
  const rating = getRating(nextCumulativeIncome, state.level.target)
  const result = isFinalMonth || nextCash <= 0
    ? {
        passed: nextCumulativeIncome >= state.level.target && nextCash > 0,
        rating,
        bestMonth: Math.max(eventIncome, state.lastSettlement?.income ?? 0),
        reason: nextCash <= 0 ? '现金归零' : '半年结算',
      }
    : null

  if (result) {
    return accept({
      ...state,
      cash: nextCash,
      cumulativeIncome: nextCumulativeIncome,
      apCarry,
      lines: afterWork.lines,
      coolingPile: [...stillCooling, ...afterWork.newCooling],
      drawPile: drawPool,
      selectedCardUid: null,
      lastSettlement: buildSettlementReport({
        month: state.month,
        eventIncome,
        rawIncome,
        maintenance,
        lineReports,
        apCarry,
        usedAp,
      }),
      result,
      log: [
        result.passed ? `${state.level.milestone} 达成: ${rating}` : `${state.level.milestone} 未达成`,
        `第 ${state.month} 月收入 ¥${eventIncome}, 维持费 ¥${maintenance}`,
        ...state.log,
      ].slice(0, 7),
    })
  }

  const nextEvent = pickEvent(rng)
  const nextApAvailable = Math.max(1, GAME_CONFIG.baseAp + apCarry + (nextEvent.apDelta ?? 0))
  const drawCount = Math.min(GAME_CONFIG.drawPerMonth, Math.max(0, GAME_CONFIG.handLimit - state.hand.length))
  const drawn = drawCards(drawCount, drawPool)
  const nextHand = [...state.hand, ...drawn.drawn.map((card) => ({ ...card, location: 'hand' }))]
  const nextActiveLineId = chooseNextPlanningLine(afterWork.lines, state.activeLineId)
  const nextLines = afterWork.lines.map((line) => (
    line.id === nextActiveLineId ? { ...line, status: 'planning' } : line
  ))

  return accept({
    ...state,
    month: state.month + 1,
    event: nextEvent,
    cash: nextCash + (nextEvent.cashDelta ?? 0),
    cumulativeIncome: nextCumulativeIncome,
    apCarry,
    apAvailable: nextApAvailable,
    activeLineId: nextActiveLineId,
    hand: nextHand,
    drawPile: drawn.drawPile,
    coolingPile: [...stillCooling, ...afterWork.newCooling],
    recruitMarket: createRecruitMarket(state.level.id, getRecruitMarketSize(state.month + 1), rng),
    lines: nextLines,
    selectedCardUid: null,
    discardRequired: Math.max(0, nextHand.length - GAME_CONFIG.handLimit),
    lastSettlement: buildSettlementReport({
      month: state.month,
      eventIncome,
      rawIncome,
      maintenance,
      lineReports,
      apCarry,
      usedAp,
    }),
    log: [
      `第 ${state.month} 月收入 ¥${eventIncome}, 维持费 ¥${maintenance}`,
      returned.length ? `${returned.length} 张卡冷却结束回到牌堆` : '无冷却回归',
      `第 ${state.month + 1} 月事件: ${nextEvent.name}`,
      ...state.log,
    ].slice(0, 7),
  })
}

export function computeBattlePreview(state) {
  const reports = state.lines
    .filter((line) => line.status === 'working' || (line.id === state.activeLineId && line.slots.some(Boolean)))
    .map((line) => ({
      lineId: line.id,
      status: line.status,
      ...computeLineOutput(line.slots),
    }))
  const rawIncome = reports.reduce((sum, report) => sum + report.total, 0)
  const eventIncome = Math.round(rawIncome * (state.event.incomeMultiplier ?? 1))
  const maintenanceWaived = reports.some((report) => report.maintenanceWaived)
  const maintenance = maintenanceWaived ? 0 : Math.round(state.level.maintenance * (state.event.maintenanceMultiplier ?? 1))
  return {
    reports,
    rawIncome,
    eventIncome,
    maintenance,
    netCash: eventIncome - maintenance,
  }
}

export function computeLineOutput(slots) {
  const cards = slots.map((card) => card ?? null)
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
  let lineMultiplier = 1
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

  cards.forEach((card, index) => {
    if (!card) return

    if (index === 0) addMult(index, 1.2, 'P1 启动位 +20%')
    if (index === 2) {
      addMult(1, 1.2, 'P3 中枢邻位 +20%')
      addMult(3, 1.2, 'P3 中枢邻位 +20%')
    }

    const left = cards[index - 1]
    const right = cards[index + 1]
    if (card.type === 'emp' && left?.type === 'emp' && left.dept === card.dept) addMult(index, 1.2, '同部门相邻 +20%')
    if (card.type === 'emp' && right?.type === 'emp' && right.dept === card.dept) addMult(index, 1.2, '同部门相邻 +20%')

    const allEffects = [...card.effects, ...card.affixEffects]
    allEffects.forEach((effect) => {
      const normalized = effect.replace('TRIGGER: ', '')
      const pct = readPercentFactor(normalized)
      const xMult = readMultiplier(normalized)
      const yen = readYen(normalized)

      if (normalized.includes('MONTH_NO_MAINTAIN')) maintenanceWaived = true
      if (normalized.includes('MONTH_BONUS')) monthBonus += yen
      if (normalized.includes('LINE_XMULT')) lineMultiplier *= xMult
      if (normalized.includes('IF_ALL_THREE_DEPT_IN_LINE') && hasAllThreeDept) lineMultiplier *= xMult
      if (normalized.startsWith('LINE_ALL_R')) applyDept('R', pct, '全线研发加成')
      if (normalized.startsWith('LINE_ALL_S')) applyDept('S', pct, '全线销售加成')
      if (normalized.startsWith('LINE_ALL:')) {
        if (yen) applyAllFlat(yen, '全线基础 +¥')
        else addAllMult(pct, '全线乘数')
      }

      if (normalized.startsWith('RIGHT:')) addMult(index + 1, pct || xMult, `${card.name} →`)
      if (normalized.startsWith('LEFT:')) addMult(index - 1, pct || xMult, `${card.name} ←`)
      if (normalized.startsWith('BOTH:')) {
        addMult(index - 1, pct || xMult, `${card.name} ↔`)
        addMult(index + 1, pct || xMult, `${card.name} ↔`)
      }
      if (normalized.startsWith('ADJ_R')) applyAdjacentDept(index, 'R', pct || xMult, `${card.name} 邻接研发`)
      if (normalized.startsWith('ADJ_S')) applyAdjacentDept(index, 'S', pct || xMult, `${card.name} 邻接销售`)

      if (normalized.startsWith('SAME_DEPT_ADJ')) {
        if (left?.dept === card.dept) yen ? addFlat(index, yen, '同部门现金') : addMult(index, pct, '同部门强化')
        if (right?.dept === card.dept) yen ? addFlat(index, yen, '同部门现金') : addMult(index, pct, '同部门强化')
      }
      if (normalized.startsWith('SAME_DEPT_ADJ_EXTRA')) {
        if (left?.dept === card.dept || right?.dept === card.dept) addMult(index, pct, '词条同部门强化')
      }
      if (normalized.includes('SELF_IF_P1') && index === 0) addMult(index, pct || xMult, 'P1 自身')
      if (normalized.includes('SELF_IF_P3') && !normalized.includes('BOTH') && index === 2) addMult(index, pct || xMult, 'P3 自身')
      if (normalized.includes('SELF_IF_P3') && normalized.includes('BOTH') && index === 2) {
        addMult(index - 1, pct, `${card.name} P3 双向`)
        addMult(index + 1, pct, `${card.name} P3 双向`)
      }
      if (normalized.includes('SELF_IF_P5') && index === 4) addMult(index, pct || xMult, 'P5 自身')
      if (normalized.includes('SELF_IF_RIGHT_FUN') && right?.type === 'fun') addMult(index, xMult, '右邻功能')
      if (normalized.includes('SELF_IF_LEFT_DEPT_R') && left?.dept === 'R') addMult(index, xMult, '左邻研发')
      if (normalized.includes('SELF_IF_LINE_HAS_FUN') && lineHasFun) addMult(index, xMult, '产线含功能')
      if (normalized.includes('SELF_IF_ADJ_FUN') && (left?.type === 'fun' || right?.type === 'fun')) addMult(index, pct || xMult, '相邻功能')
      if (normalized.includes('SELF_IF_LEFT_DEPT_R_AND_RIGHT_DEPT_S') && left?.dept === 'R' && right?.dept === 'S') addMult(index, xMult, '研发+销售夹心')
      if (normalized.includes('LEFT_DEPT != RIGHT_DEPT') && left?.dept && right?.dept && left.dept !== right.dept) {
        addMult(index - 1, pct, '跨部门协作')
        addMult(index + 1, pct, '跨部门协作')
      }
    })
  })

  results.forEach((result) => {
    const mult = result.mults.reduce((product, value) => product * value, 1)
    result.output = Math.max(0, Math.round((result.base + result.flat) * mult))
  })

  const subtotalBeforeP5 = results.reduce((sum, result) => sum + result.output, 0)
  if (results[4]?.card && subtotalBeforeP5 > 0 && results[4].output / subtotalBeforeP5 >= 0.6) {
    addMult(4, 1.5, 'P5 收割位 x1.5')
    const result = results[4]
    const mult = result.mults.reduce((product, value) => product * value, 1)
    result.output = Math.max(0, Math.round((result.base + result.flat) * mult))
  }

  const total = Math.round(results.reduce((sum, result) => sum + result.output, 0) * lineMultiplier + monthBonus)
  return {
    slotResults: results,
    total,
    lineMultiplier,
    monthBonus,
    maintenanceWaived,
    synergyCount: results.reduce((sum, result) => sum + result.notes.length, 0),
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

function advanceWorkingLines(lines) {
  const newCooling = []
  const nextLines = lines.map((line) => {
    if (line.status !== 'working') return line
    const workingMonthsLeft = Math.max(0, line.workingMonthsLeft - 1)
    if (workingMonthsLeft > 0) return { ...line, workingMonthsLeft }
    const coolingCards = line.slots.filter(Boolean).map((card) => ({
      ...card,
      location: 'cooling',
      coolingRemaining: card.affixEffects.includes('NO_COOLDOWN') ? 0 : GAME_CONFIG.cooldownMonths,
    }))
    coolingCards.forEach((card) => {
      if (card.coolingRemaining <= 0) return
      newCooling.push(card)
    })
    return createLine(line.id, 'idle')
  })
  const instantReturn = lines
    .filter((line) => line.status === 'working' && line.workingMonthsLeft <= 1)
    .flatMap((line) => line.slots.filter((card) => card?.affixEffects.includes('NO_COOLDOWN')).map((card) => ({
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

export function createRecruitMarket(levelId, count, rng = Math.random) {
  return Array.from({ length: count }, () => createCardInstance(pickRecruitTemplate(levelId, rng).id, 'market', rng))
}

export function getRecruitMarketSize(month) {
  return Math.min(3, Math.max(0, month - 1))
}

function pickRecruitTemplate(levelId, rng) {
  const rarity = weightedPick(RECRUIT_RARITY_TABLE[levelId] ?? RECRUIT_RARITY_TABLE[1], rng)
  const pool = CARD_TEMPLATES.filter((card) => (
    card.inRecruitPool &&
    card.unlockLevel <= levelId &&
    card.rarity === rarity &&
    card.type !== 'leg'
  ))
  if (pool.length) return randomItem(pool, rng)
  return randomItem(CARD_TEMPLATES.filter((card) => card.inRecruitPool && card.unlockLevel <= levelId), rng)
}

function pickEvent(rng) {
  return randomItem(EVENTS, rng)
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
  return { state, ok: true, message: '' }
}

function reject(state, message) {
  return { state, ok: false, message }
}
