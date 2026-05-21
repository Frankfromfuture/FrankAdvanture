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
  RECRUIT_PACKS,
  RARITY_VARIANCE,
  SMALL_AFFIXES,
  STARTER_DECK,
  STARTER_HAND,
  UPGRADE_PATHS,
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
  recruitChoices: 3,
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

const DEPT_LABELS = { R: '研发', S: '销售', O: '运营' }

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
    recruitChoiceUsed: false,
    revealedRecruitCard: null,
    event,
    lines: [
      createLine('A', 'planning'),
      createLine('B', 'idle'),
    ],
    discardRequired: Math.max(0, hand.length - GAME_CONFIG.handLimit),
    lastSettlement: null,
    result: null,
    // ===== 关间「董事会会议」相关 state =====
    activeBusinessModels: [],         // Array<{ id, charged: boolean }>
    intermissionState: null,          // null | { phase, event, ... } (见 enterIntermission)
    legendaryRollStreak: 0,           // 连续未刷出传奇关数（保底用）
    businessModelSlotCap: 4,          // 商业模式槽位上限 (战斗区 2×2 起步, 关 7 → 5)
    nextLevelModifiers: {             // 事件 / charge 影响下关
      targetMultiplier: 1,
      handPenalty: 0,
      unlockedEpicDepts: [],
      pendingCards: [],               // 进入下关初始牌堆的卡 id 列表
    },
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
  const adjustedBaseOutput = Math.max(0, Math.round(adjusted.baseOutput))
  const adjustedCost = Math.max(1, Math.round(adjusted.cost))

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

/**
 * 战斗内开卡包：candidateUid 现在指向 packMarket 里某个卡包的 uid
 * 旧 API 名保留 (buyRecruit) 兼容测试与上游调用
 *
 * 返回 state 时附加 `revealedRecruitCard` 字段 —— UI 拿去做开包动画
 */
export function buyRecruit(state, candidateUid, rng = Math.random) {
  if (state.recruitChoiceUsed) return reject(state, '本月已经完成一次招聘选择')
  const pack = state.recruitMarket.find((item) => item.uid === candidateUid)
  if (!pack) return reject(state, '卡包已离开市场')
  if (pack.cost > state.strategicBudget) return reject(state, `战略预算不足: 需要 💰${pack.cost}`)
  const template = pickCardFromPack(pack, state.level.id, rng)
  if (!template) return reject(state, `${pack.name} 当前没有可用卡`)
  const card = createCardInstance(template.id, 'deck', rng)
  return accept({
    ...state,
    strategicBudget: state.strategicBudget - pack.cost,
    drawPile: [card, ...state.drawPile],
    recruitMarket: [],
    recruitChoiceUsed: true,
    revealedRecruitCard: card,
    log: [`开 ${pack.name}: 抽到 ${card.name}`, ...state.log].slice(0, 7),
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
    ...computeLineOutput(line.slots, { event: state.event, bmStats }),
  }))
  const rawIncome = lineReports.reduce((sum, report) => sum + report.total, 0)
  const eventIncome = Math.round(rawIncome * (state.event.incomeMultiplier ?? 1))
  const maintenanceWaived = lineReports.some((report) => report.maintenanceWaived)
  const rawMaintenance = maintenanceWaived
    ? 0
    : Math.round(state.level.maintenance * (state.event.maintenanceMultiplier ?? 1))
  const maintenance = Math.max(0, Math.round(rawMaintenance * (1 - bmStats.maintenanceDiscount)))
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
  const bossCheck = evaluateBossRule(state.event, activeProducingLines)
  const result = isFinalMonth || nextCash <= 0
    ? {
        passed: nextCumulativeIncome >= state.level.target && nextCash > 0 && bossCheck.passed,
        rating,
        bestMonth: Math.max(eventIncome, state.lastSettlement?.income ?? 0),
        reason: nextCash <= 0 ? '现金归零' : bossCheck.passed ? '半年结算' : bossCheck.reason,
        defeatedByEvent: nextCash <= 0 ? state.event.name : bossCheck.passed ? '' : state.event.name,
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

  const nextMonth = state.month + 1
  const nextEvent = pickEventForMonth(state.level.id, nextMonth, rng)
  const apHandRich = bmStats.apIfHandRichEnabled && state.hand.length >= 6 ? 1 : 0
  const nextApAvailable = Math.max(1, GAME_CONFIG.baseAp + apCarry + (nextEvent.apDelta ?? 0) + apHandRich)
  const effectiveHandLimit = GAME_CONFIG.handLimit + bmStats.handLimitBonus + (nextEvent.handLimitDelta ?? 0)
  const handAdjusted = applyEventHandDelta(state.hand, drawPool, nextEvent.handDelta ?? 0, rng)
  const drawPerMonth = GAME_CONFIG.drawPerMonth + bmStats.drawBonus + (nextEvent.drawBonus ?? 0)
  const drawCount = Math.min(drawPerMonth, Math.max(0, effectiveHandLimit - handAdjusted.hand.length))
  const drawn = drawCards(drawCount, handAdjusted.drawPile)
  const nextHand = [...handAdjusted.hand, ...drawn.drawn.map((card) => ({ ...card, location: 'hand' }))]
  const nextActiveLineId = chooseNextPlanningLine(afterWork.lines, state.activeLineId)
  const nextLines = afterWork.lines.map((line) => (
    line.id === nextActiveLineId ? { ...line, status: 'planning' } : line
  ))

  return accept({
    ...state,
    month: nextMonth,
    event: nextEvent,
    cash: nextCash + (nextEvent.cashDelta ?? 0),
    cumulativeIncome: nextCumulativeIncome,
    apCarry,
    apAvailable: nextApAvailable,
    activeLineId: nextActiveLineId,
    hand: nextHand,
    drawPile: drawn.drawPile,
    coolingPile: [...stillCooling, ...afterWork.newCooling],
    recruitMarket: createRecruitMarket(state.level.id, getRecruitMarketSize(nextMonth), rng),
    recruitChoiceUsed: false,
    revealedRecruitCard: null,
    lines: nextLines,
    selectedCardUid: null,
    discardRequired: Math.max(0, nextHand.length - effectiveHandLimit),
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
      `第 ${nextMonth} 月事件: ${nextEvent.name}`,
      ...state.log,
    ].slice(0, 7),
  })
}

export function computeBattlePreview(state) {
  const bmStats = computeBusinessModelStats(state)
  const reports = state.lines
    .filter((line) => line.status === 'working' || (line.id === state.activeLineId && line.slots.some(Boolean)))
    .map((line) => ({
      lineId: line.id,
      status: line.status,
      ...computeLineOutput(line.slots, { event: state.event, bmStats }),
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

export function computeLineOutput(slots, context = {}) {
  const cards = slots.map((card) => card ?? null)
  const bmStats = context.bmStats ?? {}
  const event = context.event ?? {}
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

    if (index === 0) addMult(index, 1.2 + (bmStats.p1Bonus ?? 0), 'P1 启动位')
    if (index === 2) {
      addMult(1, 1.2, 'P3 中枢邻位 +20%')
      addMult(3, 1.2, 'P3 中枢邻位 +20%')
    }

    const left = cards[index - 1]
    const right = cards[index + 1]
    const sameDeptFactor = 1.2 + (bmStats.sameDeptAdjBonus ?? 0)
    if (card.type === 'emp' && left?.type === 'emp' && left.dept === card.dept) addMult(index, sameDeptFactor, '同部门相邻')
    if (card.type === 'emp' && right?.type === 'emp' && right.dept === card.dept) addMult(index, sameDeptFactor, '同部门相邻')
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

  const subtotalBeforeP5 = results.reduce((sum, result) => sum + result.output, 0)
  if (results[4]?.card && subtotalBeforeP5 > 0 && results[4].output / subtotalBeforeP5 >= 0.6) {
    addMult(4, 1.5 + (bmStats.p5Bonus ?? 0), 'P5 收割位')
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
  // 5 选 3 随机抽包：洗牌 RECRUIT_PACKS，取前 count 个，附带 uid 以便 UI key/选中
  const shuffled = shuffle([...RECRUIT_PACKS], rng).slice(0, count)
  return shuffled.map((pack) => ({
    ...pack,
    uid: `${pack.id}-${++instanceCounter}`,
    levelId,
  }))
}

export function getRecruitMarketSize(month) {
  return month >= 1 ? GAME_CONFIG.recruitChoices : 0
}

/**
 * 按 pack.filter 过滤可入池卡，再以 drawWeight + 关卡稀有度权重综合加权抽 1 张
 * 返回卡片模板（caller 负责 createCardInstance）
 */
function pickCardFromPack(pack, levelId, rng) {
  const rarityWeights = RECRUIT_RARITY_TABLE[levelId] ?? RECRUIT_RARITY_TABLE[1]
  const pool = CARD_TEMPLATES.filter((card) => {
    if (!card.inRecruitPool) return false
    if (card.unlockLevel > levelId) return false
    if (card.type === 'leg') return false
    if (pack.filter.type && card.type !== pack.filter.type) return false
    if (pack.filter.dept && card.dept !== pack.filter.dept) return false
    return true
  })
  if (!pool.length) return null
  // 综合权重 = drawWeight × 关卡稀有度倾向
  const weighted = pool.map((card) => ({
    card,
    weight: (card.drawWeight ?? 10) * (rarityWeights[card.rarity] ?? 0.5),
  }))
  return weightedRandomPick(weighted, rng)
}

function weightedRandomPick(items, rng) {
  const total = items.reduce((sum, x) => sum + x.weight, 0)
  if (total <= 0) return items[0]?.card ?? null
  let roll = rng() * total
  for (const x of items) {
    roll -= x.weight
    if (roll <= 0) return x.card
  }
  return items[items.length - 1].card
}

function pickEvent(rng) {
  return randomItem(EVENTS, rng)
}

function pickEventForMonth(levelId, month, rng) {
  if (month >= GAME_CONFIG.monthsPerStage) {
    return BOSS_EVENTS.find((event) => event.levelId === levelId) ?? BOSS_EVENTS[levelId - 1] ?? pickEvent(rng)
  }
  return pickEvent(rng)
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
    sameDeptAdjBonus: 0,
    p1Bonus: 0,
    p5Bonus: 0,
    deptBonusR: 0,
    deptBonusS: 0,
    deptBonusO: 0,
    lineApDiscount: 0,
    srvApDiscount: 0,
    chargedReuseLine: false,
    chargedWaiveMaintenance: false,
    levelEndBudgetBonus: 0,
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
      case 'sameDeptAdjBonus': stats.sameDeptAdjBonus += p.value; break
      case 'p1Bonus': stats.p1Bonus += p.value; break
      case 'p5Bonus': stats.p5Bonus += p.value; break
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
    }
  })
  return stats
}

/**
 * 进入董事会会议：在通关结算后调用
 * 生成事件 + 商店刷出 + 商学院刷出
 */
export function enterIntermission(state, rng = Math.random) {
  if (!state.result?.passed) return reject(state, '关卡未通关，无法进入董事会会议')
  if (state.intermissionState) return reject(state, '已在董事会会议中')
  if (state.level.id >= LEVELS.length) return reject(state, '已是最终关，无关间环节')

  // 评级 → 战略预算奖励
  const ratingBonus = { S: 10, A: 5, B: 0, C: 0 }[state.result.rating] ?? 0
  const baseBudget = 20
  const bmStats = computeBusinessModelStats(state)
  const chargedBonus = Math.round((baseBudget + ratingBonus) * bmStats.levelEndBudgetBonus)
  const grantedBudget = baseBudget + ratingBonus + chargedBonus

  const nextLevelId = state.level.id + 1
  const event = randomItem(BOARD_EVENTS, rng)
  const shopRoll = rollShopRoll(nextLevelId, state.legendaryRollStreak, rng)
  const schoolRoll = rollSchoolRoll(nextLevelId, state.activeBusinessModels, rng)

  return accept({
    ...state,
    strategicBudget: state.strategicBudget + grantedBudget,
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
        packs: shopRoll.packs.map(() => null),  // null = 未购买 | { pickIndex }
      },
      hrActionsCount: 0,
      fireActionsCount: 0,
      cardActionLog: {},  // uid -> 'upgraded' | 'fired'
      grantedBudget,
      ratingBonus,
      chargedBudgetBonus: chargedBonus,
      logTrail: [`关 ${state.level.id} 末发放 💰${grantedBudget}（基础 ${baseBudget} + 评级 ${ratingBonus}${chargedBonus ? ' + ESG ' + chargedBonus : ''}）`],
    },
    log: [`💼 进入第 ${nextLevelId - 1}→${nextLevelId} 轮董事会会议`, ...state.log].slice(0, 7),
  })
}

/**
 * 解析事件选项
 */
export function resolveEvent(state, optionId, rng = Math.random) {
  const im = state.intermissionState
  if (!im || im.phase !== 'event') return reject(state, '当前不在事件阶段')
  const option = im.event.options.find((o) => o.id === optionId)
  if (!option) return reject(state, '选项无效')
  if (option.cost && state.strategicBudget < option.cost) return reject(state, '💰 战略预算不足')

  let nextState = { ...state }
  if (option.cost) {
    nextState.strategicBudget -= option.cost
  }
  let resultMessage = option.result || ''
  const eff = option.effect
  const nextMods = { ...nextState.nextLevelModifiers }

  switch (eff.type) {
    case 'noop': break
    case 'removeBudgetBonus':
      nextState.strategicBudget += eff.value ?? 0
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
      nextState.strategicBudget += eff.budget ?? 0
      nextMods.handPenalty = (nextMods.handPenalty ?? 0) + 1
      break
    case 'unlockEpic':
      nextMods.unlockedEpicDepts = [...(nextMods.unlockedEpicDepts ?? []), eff.dept]
      break
    case 'gamble': {
      const win = rng() < 0.5
      const delta = win ? eff.win : eff.lose
      nextState.strategicBudget = Math.max(0, nextState.strategicBudget + delta)
      resultMessage = win ? `✓ 抄底成功 +💰${eff.win}` : `✗ 抄错方向 ${delta} 💰`
      break
    }
    case 'increaseBmSlot':
      nextState.businessModelSlotCap += 1
      break
    case 'budgetGain':
      nextState.strategicBudget += eff.value ?? 0
      break
  }

  return accept({
    ...nextState,
    nextLevelModifiers: nextMods,
    intermissionState: {
      ...im,
      phase: 'hub',
      resolvedOptionId: optionId,
      resolvedMessage: resultMessage,
      logTrail: [resultMessage, ...im.logTrail],
    },
  })
}

/**
 * 商店刷新（💰5）
 */
export function rollShop(state, rng = Math.random) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  if (state.strategicBudget < 5) return reject(state, '💰 不足以刷新（需 5）')
  const nextLevelId = state.level.id + 1
  const newRoll = rollShopRoll(nextLevelId, state.legendaryRollStreak, rng)
  return accept({
    ...state,
    strategicBudget: state.strategicBudget - 5,
    intermissionState: {
      ...im,
      shopRoll: newRoll,
      purchased: { epic: false, legendary: false, packs: newRoll.packs.map(() => null) },
    },
  })
}

/**
 * 购买商店商品 (epic / legendary)
 */
export function purchaseShopItem(state, slotKey) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  if (im.purchased[slotKey]) return reject(state, '该商品已购买')
  const item = im.shopRoll[slotKey === 'epic' ? 'epicCard' : 'legendaryCard']
  if (!item) return reject(state, '该槽位无商品')
  const cost = im.shopRoll[slotKey === 'epic' ? 'epicCost' : 'legendaryCost']
  if (state.strategicBudget < cost) return reject(state, '💰 不足')

  const nextMods = { ...state.nextLevelModifiers }
  nextMods.pendingCards = [...(nextMods.pendingCards ?? []), item.id]

  return accept({
    ...state,
    strategicBudget: state.strategicBudget - cost,
    nextLevelModifiers: nextMods,
    revealedRecruitCard: item,        // 触发开卡动画
    intermissionState: {
      ...im,
      purchased: { ...im.purchased, [slotKey]: true },
      logTrail: [`购买 ${item.name} (-💰${cost})`, ...im.logTrail],
    },
  })
}

/**
 * 抽卡包：购买卡包并指定从 fromN 张中挑选哪一张
 * pickIndex: 0..fromN-1 (用户在 UI 中选定)
 * 如未提供 pickIndex，仅扣费并展开 3 张候选；后续再选
 */
export function openPack(state, packSlotIdx, pickIndex) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  const packEntry = im.shopRoll.packs[packSlotIdx]
  if (!packEntry) return reject(state, '该卡包槽位为空')
  const already = im.purchased.packs[packSlotIdx]

  // 第一步：扣费 + 展开
  if (!already) {
    if (state.strategicBudget < packEntry.cost) return reject(state, '💰 不足')
    return accept({
      ...state,
      strategicBudget: state.strategicBudget - packEntry.cost,
      intermissionState: {
        ...im,
        purchased: {
          ...im.purchased,
          packs: im.purchased.packs.map((p, i) => i === packSlotIdx ? { opened: true, pickIndex: null } : p),
        },
        logTrail: [`购买 ${packEntry.packDef.name} (-💰${packEntry.cost})`, ...im.logTrail],
      },
    })
  }

  // 第二步：已展开 → 选定 pickIndex
  if (already.pickIndex !== null) return reject(state, '已挑选完毕')
  if (pickIndex === undefined || pickIndex < 0 || pickIndex >= packEntry.contents.length) {
    return reject(state, '选项无效')
  }
  const picked = packEntry.contents[pickIndex]
  const nextMods = { ...state.nextLevelModifiers }

  // 商业模式特殊处理：直接进商业模式槽位
  if (packEntry.packDef.poolType === 'business_model' || (packEntry.packDef.poolType === 'mystery' && picked.isBusinessModel)) {
    // 自动加入 activeBusinessModels（若超槽位由 UI 引导 replace）
    const slotCap = state.businessModelSlotCap
    if (state.activeBusinessModels.length >= slotCap) {
      return reject(state, '商业模式槽位已满，请先到商学院替换')
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
        logTrail: [`商业洞察 → ${picked.bmName}`, ...im.logTrail],
      },
    })
  }

  // 普通卡牌进下关牌堆
  nextMods.pendingCards = [...(nextMods.pendingCards ?? []), picked.id]
  return accept({
    ...state,
    nextLevelModifiers: nextMods,
    revealedRecruitCard: picked,      // 触发开卡动画
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

/**
 * 升职：mode='rarity' 升稀有度 / mode='affix' 加词缀
 */
export function upgradeCard(state, cardUid, mode, affixId) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  const action = im.cardActionLog[cardUid]
  if (action) return reject(state, '该卡本场会议已操作过')

  const card = findCardAcrossPiles(state, cardUid)
  if (!card) return reject(state, '卡牌未找到')
  if (card.type !== 'emp') return reject(state, '仅员工卡可升职')
  if (card.rarity === 'legendary') return reject(state, '传奇卡不可升职')

  let cost = 0
  let upgraded = { ...card }

  if (mode === 'rarity') {
    const path = UPGRADE_PATHS[card.rarity]
    if (!path) return reject(state, '该稀有度已达上限')
    cost = path.cost
    if (state.strategicBudget < cost) return reject(state, '💰 不足')
    upgraded.rarity = path.next
    upgraded.baseOutput = Math.round(card.baseOutput * 1.25)
  } else if (mode === 'affix') {
    cost = 8
    if (state.strategicBudget < cost) return reject(state, '💰 不足')
    const affix = AFFIX_POOL.find((a) => a.id === affixId)
    if (!affix) return reject(state, '词缀无效')
    upgraded.affixes = [...(card.affixes || []), { id: affix.id, name: affix.label, effects: affix.effects }]
    upgraded.affixEffects = [...(card.affixEffects || []), ...affix.effects]
  } else {
    return reject(state, '升职模式无效')
  }

  return accept({
    ...replaceCardAcrossPiles(state, cardUid, upgraded),
    strategicBudget: state.strategicBudget - cost,
    intermissionState: {
      ...im,
      cardActionLog: { ...im.cardActionLog, [cardUid]: 'upgraded' },
      hrActionsCount: im.hrActionsCount + 1,
      logTrail: [`${card.name} 升职 → ${mode === 'rarity' ? upgraded.rarity : affixId}`, ...im.logTrail],
    },
  })
}

/**
 * “向社会输送人才”：永久移除一张卡
 */
export function fireCard(state, cardUid) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  if (im.fireActionsCount >= 5) return reject(state, '本场会议“向社会输送人才”上限 5 张')
  if (im.cardActionLog[cardUid]) return reject(state, '该卡本场会议已操作过')

  const card = findCardAcrossPiles(state, cardUid)
  if (!card) return reject(state, '卡牌未找到')

  const levelId = state.level.id
  const cost = levelId <= 3 ? 3 : levelId <= 6 ? 5 : 8
  if (state.strategicBudget < cost) return reject(state, '💰 不足')

  return accept({
    ...removeCardAcrossPiles(state, cardUid),
    strategicBudget: state.strategicBudget - cost,
    intermissionState: {
      ...im,
      cardActionLog: { ...im.cardActionLog, [cardUid]: 'fired' },
      fireActionsCount: im.fireActionsCount + 1,
      hrActionsCount: im.hrActionsCount + 1,
      logTrail: [`“向社会输送人才” ${card.name} (-💰${cost})`, ...im.logTrail],
    },
  })
}

/**
 * 购买商业模式
 */
export function purchaseBusinessModel(state, schoolSlotIdx, replaceIdx = null) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  const bmId = im.schoolRoll[schoolSlotIdx]
  if (!bmId) return reject(state, '该槽位为空')
  const bm = BUSINESS_MODELS.find((b) => b.id === bmId)
  if (!bm) return reject(state, '商业模式未找到')
  if (state.strategicBudget < bm.cost) return reject(state, '💰 不足')

  const slotCap = state.businessModelSlotCap
  let nextActive = [...state.activeBusinessModels]
  if (nextActive.length >= slotCap) {
    if (replaceIdx === null || replaceIdx === undefined) return reject(state, '槽位已满，需指定替换的槽位')
    nextActive = nextActive.filter((_, i) => i !== replaceIdx)
  }
  nextActive.push({ id: bmId, charged: true })

  // 标记该商业模式已购买
  const nextSchoolRoll = im.schoolRoll.map((id, i) => i === schoolSlotIdx ? null : id)

  return accept({
    ...state,
    strategicBudget: state.strategicBudget - bm.cost,
    activeBusinessModels: nextActive,
    intermissionState: {
      ...im,
      schoolRoll: nextSchoolRoll,
      logTrail: [`商学院: 习得 ${bm.name} (-💰${bm.cost})`, ...im.logTrail],
    },
  })
}

/**
 * 商学院刷新（💰4）
 */
export function rollSchool(state, rng = Math.random) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')
  if (state.strategicBudget < 4) return reject(state, '💰 不足以刷新（需 4）')
  const newRoll = rollSchoolRoll(state.level.id + 1, state.activeBusinessModels, rng)
  return accept({
    ...state,
    strategicBudget: state.strategicBudget - 4,
    intermissionState: { ...im, schoolRoll: newRoll },
  })
}

/**
 * 退出董事会会议：构建下关初始 state
 * 保留：strategicBudget / activeBusinessModels / businessModelSlotCap
 * 重置：lines / month / cumulativeIncome / event / cash
 * 重建：drawPile + hand 来自 (上关 drawPile + hand + coolingPile - 已“向社会输送人才” + 已购买卡 + 事件奖励卡)
 */
export function exitIntermission(state, rng = Math.random) {
  const im = state.intermissionState
  if (!im) return reject(state, '不在董事会会议中')

  const nextLevelId = state.level.id + 1
  const nextLevelDef = LEVELS.find((l) => l.id === nextLevelId)
  if (!nextLevelDef) return reject(state, '已是最终关')

  // 收集所有持续到下关的卡
  const allCards = [
    ...state.hand,
    ...state.drawPile,
    ...state.coolingPile,
  ]

  // 加入本次会议买的卡
  const pendingCards = (state.nextLevelModifiers.pendingCards ?? [])
  const purchasedCards = pendingCards.map((cardId) => createCardInstance(cardId, 'deck', rng))

  const combined = [...allCards, ...purchasedCards].map((c) => ({ ...c, location: 'deck', coolingRemaining: 0 }))

  // 抽起手 10 张
  const shuffled = shuffle(combined, rng)
  const handLimit = GAME_CONFIG.handLimit - (state.nextLevelModifiers.handPenalty ?? 0)
  const startingHandSize = Math.min(handLimit, shuffled.length)
  const startingHand = shuffled.slice(0, startingHandSize).map((c) => ({ ...c, location: 'hand' }))
  const remainingDeck = shuffled.slice(startingHandSize)

  // 应用目标倍率
  const adjustedTarget = Math.round(nextLevelDef.target * (state.nextLevelModifiers.targetMultiplier ?? 1))

  const event = pickEvent(rng)
  const apAvailable = Math.max(1, GAME_CONFIG.baseAp + (event.apDelta ?? 0))

  // 商业模式槽位上限按关卡推进
  const slotCap = nextLevelId >= 7 ? Math.max(5, state.businessModelSlotCap)
    : nextLevelId >= 4 ? Math.max(4, state.businessModelSlotCap)
    : state.businessModelSlotCap

  // 关末更新传奇连续未刷计数
  const purchasedLegendary = im.purchased.legendary
  const newStreak = purchasedLegendary || im.shopRoll.legendaryCard
    ? 0
    : state.legendaryRollStreak + 1

  // 重新充能所有 onCharge BM
  const rechargedBMs = state.activeBusinessModels.map((b) => ({ ...b, charged: true }))

  return accept({
    level: { ...nextLevelDef, target: adjustedTarget },
    month: 1,
    cash: nextLevelDef.startCash + (event.cashDelta ?? 0),
    cumulativeIncome: 0,
    strategicBudget: state.strategicBudget,  // 全保留
    apCarry: 0,
    apAvailable,
    activeLineId: 'A',
    selectedCardUid: null,
    hand: startingHand,
    drawPile: remainingDeck,
    coolingPile: [],
    recruitMarket: createRecruitMarket(nextLevelId, getRecruitMarketSize(1), rng),
    recruitChoiceUsed: false,
    event,
    lines: [createLine('A', 'planning'), createLine('B', 'idle')],
    discardRequired: Math.max(0, startingHand.length - GAME_CONFIG.handLimit),
    lastSettlement: null,
    result: null,
    activeBusinessModels: rechargedBMs,
    intermissionState: null,
    legendaryRollStreak: newStreak,
    businessModelSlotCap: slotCap,
    nextLevelModifiers: { targetMultiplier: 1, handPenalty: 0, unlockedEpicDepts: [], pendingCards: [] },
    log: [
      `🚀 进入 ${nextLevelDef.milestone} (目标 ¥${adjustedTarget})`,
      `携带 💰${state.strategicBudget} + ${state.activeBusinessModels.length} 个商业模式`,
    ],
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
  const usedTypes = new Set()
  const slotProbs = [SHOP_PROBS.packC, SHOP_PROBS.packD, SHOP_PROBS.packE]
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
    items.push(pickPackItem(pack.poolType, nextLevelId, rng, items))
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
