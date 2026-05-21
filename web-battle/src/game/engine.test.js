import { describe, expect, it } from 'vitest'
import {
  buyRecruit,
  computeLineOutput,
  createInitialState,
  enterIntermission,
  exitIntermission,
  fireCard,
  GAME_CONFIG,
  getRecruitMarketSize,
  makeFixedCard,
  parseEffectAst,
  placeCardInSlot,
  purchaseBusinessModel,
  purchaseShopItem,
  resolveEvent,
  resolveMonth,
  upgradeCard,
} from './engine.js'

const calmEvent = {
  id: 'test-event',
  name: '测试事件',
  tone: '增益',
  description: '',
  effectLines: [],
  incomeMultiplier: 1,
  maintenanceMultiplier: 1,
  recruitExtra: 0,
  cashDelta: 0,
  apDelta: 0,
}

function fixedRng() {
  return 0.42
}

describe('Scoring engine', () => {
  it('applies P1 and directional right-side buffs without mixing channels', () => {
    const r = makeFixedCard('EMP_R_01', { baseOutput: 20, effects: ['RIGHT: +10%'] })
    const s = makeFixedCard('EMP_S_01', { baseOutput: 20, effects: [] })

    const report = computeLineOutput([r, s, null, null, null])

    expect(report.slotResults[0].output).toBe(24)
    expect(report.slotResults[1].output).toBe(22)
    expect(report.total).toBe(46)
  })

  it('lets a P3 function card amplify both adjacent production cards', () => {
    const r = makeFixedCard('EMP_R_01', { baseOutput: 20, effects: [] })
    const research = makeFixedCard('FUN_01', { effects: ['BOTH: +25%'] })
    const s = makeFixedCard('EMP_S_01', { baseOutput: 20, effects: [] })

    const report = computeLineOutput([null, r, research, s, null])

    expect(report.slotResults[1].output).toBe(30)
    expect(report.slotResults[3].output).toBe(30)
    expect(report.total).toBe(60)
  })

  it('parses effect strings into AST before scoring', () => {
    expect(parseEffectAst('RIGHT: +25%')).toMatchObject({ kind: 'neighbor', direction: 'right', factor: 1.25 })
    expect(parseEffectAst('SELF_IF_P3: LINE_ALL: +30%')).toMatchObject({ kind: 'selfIf', condition: 'p3', target: 'line', factor: 1.3 })
    expect(parseEffectAst('IF_ALL_THREE_DEPT_IN_LINE: LINE_XMULT: x1.5')).toMatchObject({ condition: 'allThreeDept', factor: 1.5 })
  })
})

describe('AP and month flow', () => {
  it('starts with seven cards, a ten-card hand cap, and five base AP', () => {
    const state = createInitialState({ rng: fixedRng })

    expect(state.hand).toHaveLength(7)
    expect(GAME_CONFIG.handLimit).toBe(10)
    expect(GAME_CONFIG.drawPerMonth).toBe(3)
    expect(state.apAvailable).toBe(5)
  })

  it('does not draw new cards when the hand is already at ten cards', () => {
    const fullHand = Array.from({ length: 10 }, (_, index) => (
      makeFixedCard('EMP_R_01', { uid: `full-hand-${index}`, location: 'hand' })
    ))
    const drawPile = [
      makeFixedCard('EMP_S_01', { uid: 'draw-1', location: 'deck' }),
      makeFixedCard('EMP_O_01', { uid: 'draw-2', location: 'deck' }),
    ]
    const state = {
      ...createInitialState({ rng: fixedRng }),
      event: calmEvent,
      hand: fullHand,
      drawPile,
      coolingPile: [],
      recruitMarket: [],
      lines: [
        { id: 'A', status: 'planning', slots: [null, null, null, null, null], workingMonthsLeft: 0 },
        { id: 'B', status: 'idle', slots: [null, null, null, null, null], workingMonthsLeft: 0 },
      ],
    }

    const resolved = resolveMonth(state, fixedRng).state

    expect(resolved.hand).toHaveLength(10)
    expect(resolved.drawPile.map((card) => card.uid).sort()).toEqual(['draw-1', 'draw-2'])
  })

  it('offers three face-up recruit choices every month', () => {
    expect(getRecruitMarketSize(1)).toBe(3)
    expect(getRecruitMarketSize(2)).toBe(3)
    expect(getRecruitMarketSize(3)).toBe(3)
    expect(getRecruitMarketSize(4)).toBe(3)
    expect(getRecruitMarketSize(5)).toBe(3)
    expect(createInitialState({ rng: fixedRng }).recruitMarket).toHaveLength(3)
  })

  it('refreshes the recruit market as a new three-card offer after settlement', () => {
    const monthOne = {
      ...createInitialState({ rng: fixedRng }),
      event: calmEvent,
      hand: [],
      drawPile: [],
      coolingPile: [],
      recruitMarket: [],
    }
    const monthTwo = resolveMonth(monthOne, fixedRng).state
    const monthThree = resolveMonth({ ...monthTwo, hand: [], drawPile: [], coolingPile: [] }, fixedRng).state

    expect(monthTwo.month).toBe(2)
    expect(monthTwo.recruitMarket).toHaveLength(3)
    expect(monthThree.month).toBe(3)
    expect(monthThree.recruitMarket).toHaveLength(3)
  })

  it('allows only one recruit pick from the face-up offer each month', () => {
    const state = { ...createInitialState({ rng: fixedRng }), strategicBudget: 999 }
    const firstPick = state.recruitMarket[0]
    const picked = buyRecruit(state, firstPick.uid)
    expect(picked.ok).toBe(true)
    expect(picked.state.recruitChoiceUsed).toBe(true)
    expect(picked.state.recruitMarket).toHaveLength(0)
    const second = buyRecruit(picked.state, firstPick.uid)
    expect(second.ok).toBe(false)
  })

  it('rejects a placement that exceeds the monthly AP limit', () => {
    const state = {
      ...createInitialState({ rng: fixedRng }),
      event: calmEvent,
      hand: [
        makeFixedCard('EMP_R_03'),
        makeFixedCard('EMP_S_03'),
        makeFixedCard('FUN_02'),
      ],
      lines: [
        { id: 'A', status: 'planning', slots: [null, null, null, null, null], workingMonthsLeft: 0 },
        { id: 'B', status: 'idle', slots: [null, null, null, null, null], workingMonthsLeft: 0 },
      ],
      activeLineId: 'A',
      apAvailable: 10,
    }

    const first = placeCardInSlot(state, state.hand[0].uid, 0).state
    const second = placeCardInSlot(first, first.hand[0].uid, 1).state
    const third = placeCardInSlot(second, second.hand[0].uid, 2)

    expect(third.ok).toBe(false)
    expect(third.message).toContain('AP 不足')
  })

  it('carries half of unused AP into the next month with a +5 cap', () => {
    const starting = {
      ...createInitialState({ rng: fixedRng }),
      event: calmEvent,
      hand: [makeFixedCard('EMP_R_01', { baseOutput: 20 })],
      lines: [
        { id: 'A', status: 'planning', slots: [null, null, null, null, null], workingMonthsLeft: 0 },
        { id: 'B', status: 'idle', slots: [null, null, null, null, null], workingMonthsLeft: 0 },
      ],
      activeLineId: 'A',
      apAvailable: 10,
      recruitMarket: [],
      drawPile: [],
      coolingPile: [],
    }
    const placed = placeCardInSlot(starting, starting.hand[0].uid, 0).state
    const resolved = resolveMonth(placed, fixedRng).state

    expect(resolved.apCarry).toBe(4)
  })

  it('moves completed production cards into cooldown after their second month', () => {
    const card = makeFixedCard('EMP_R_01', { baseOutput: 20 })
    const state = {
      ...createInitialState({ rng: fixedRng }),
      event: calmEvent,
      hand: [],
      drawPile: [],
      coolingPile: [],
      recruitMarket: [],
      activeLineId: 'B',
      lines: [
        { id: 'A', status: 'working', slots: [card, null, null, null, null], workingMonthsLeft: 1 },
        { id: 'B', status: 'planning', slots: [null, null, null, null, null], workingMonthsLeft: 0 },
      ],
    }

    const resolved = resolveMonth(state, fixedRng).state

    expect(resolved.lines.find((line) => line.id === 'A').slots.every((slot) => slot === null)).toBe(true)
    expect(resolved.coolingPile).toHaveLength(1)
    expect(resolved.coolingPile[0].uid).toBe(card.uid)
  })

  it('uses the level boss event on the final month', () => {
    const state = {
      ...createInitialState({ rng: fixedRng }),
      event: calmEvent,
      month: GAME_CONFIG.monthsPerStage - 1,
      hand: [],
      drawPile: [],
      coolingPile: [],
      recruitMarket: [],
      lines: [
        { id: 'A', status: 'planning', slots: [null, null, null, null, null], workingMonthsLeft: 0 },
        { id: 'B', status: 'idle', slots: [null, null, null, null, null], workingMonthsLeft: 0 },
      ],
    }
    const resolved = resolveMonth(state, fixedRng).state
    expect(resolved.month).toBe(GAME_CONFIG.monthsPerStage)
    expect(resolved.event.id).toBe('boss-series-a-roadshow')
  })

  it('fails the A round boss check when P3 is below manager tier', () => {
    const junior = makeFixedCard('EMP_R_01', { baseOutput: 150, cost: 1 })
    const state = {
      ...createInitialState({ rng: fixedRng }),
      event: {
        id: 'boss-series-a-roadshow',
        name: 'Boss · A 轮路演',
        tone: 'Boss',
        description: '',
        effectLines: [],
        incomeMultiplier: 1,
        maintenanceMultiplier: 1,
        bossRule: { type: 'p3_min_tier', minTier: '经理' },
      },
      month: GAME_CONFIG.monthsPerStage,
      cumulativeIncome: 2000,
      cash: 100,
      hand: [],
      drawPile: [],
      coolingPile: [],
      recruitMarket: [],
      activeLineId: 'A',
      lines: [
        { id: 'A', status: 'planning', slots: [null, null, junior, null, null], workingMonthsLeft: 0 },
        { id: 'B', status: 'idle', slots: [null, null, null, null, null], workingMonthsLeft: 0 },
      ],
    }
    const resolved = resolveMonth(state, fixedRng).state
    expect(resolved.result.passed).toBe(false)
    expect(resolved.result.reason).toContain('P3')
  })
})

describe('Intermission - 董事会会议', () => {
  function fakeRng() { return 0.5 }

  function preparedPassedState() {
    const state = createInitialState({ rng: fakeRng })
    return {
      ...state,
      result: { passed: true, rating: 'A', bestMonth: 100, reason: '半年结算' },
    }
  }

  it('enterIntermission 在未通关时拒绝', () => {
    const state = createInitialState({ rng: fakeRng })
    const res = enterIntermission(state, fakeRng)
    expect(res.ok).toBe(false)
  })

  it('enterIntermission 在通关后初始化事件 + 商店刷出', () => {
    const state = preparedPassedState()
    const res = enterIntermission(state, fakeRng)
    expect(res.ok).toBe(true)
    expect(res.state.intermissionState.phase).toBe('event')
    expect(res.state.intermissionState.event).toBeTruthy()
    expect(res.state.intermissionState.shopRoll).toBeTruthy()
    // 评级 A → +5 💰
    expect(res.state.strategicBudget).toBeGreaterThanOrEqual(state.strategicBudget + 20)
  })

  it('resolveEvent 后 phase 变 hub', () => {
    const state = preparedPassedState()
    const e1 = enterIntermission(state, fakeRng).state
    const optionId = e1.intermissionState.event.options[0].id  // 不一定能负担，但 noop 选项总能选
    const cheapOptionId = e1.intermissionState.event.options.find((o) => !o.cost)?.id ?? optionId
    const e2 = resolveEvent(e1, cheapOptionId, fakeRng)
    expect(e2.ok).toBe(true)
    expect(e2.state.intermissionState.phase).toBe('hub')
  })

  it('exitIntermission 重建下关 state，保留 💰 与商业模式', () => {
    const state = preparedPassedState()
    const e1 = enterIntermission(state, fakeRng).state
    const cheapOpt = e1.intermissionState.event.options.find((o) => !o.cost) ?? e1.intermissionState.event.options[0]
    const e2 = resolveEvent(e1, cheapOpt.id, fakeRng).state
    const budgetBefore = e2.strategicBudget
    const e3 = exitIntermission(e2, fakeRng).state
    expect(e3.intermissionState).toBe(null)
    expect(e3.level.id).toBe(2)
    expect(e3.strategicBudget).toBe(budgetBefore)  // 全保留
    expect(e3.month).toBe(1)
    expect(e3.cumulativeIncome).toBe(0)
    expect(e3.result).toBe(null)
  })

  it('fireCard 移除卡 + 扣 💰', () => {
    const state = preparedPassedState()
    const e1 = enterIntermission(state, fakeRng).state
    const opt = e1.intermissionState.event.options.find((o) => !o.cost)
    const e2 = resolveEvent(e1, opt.id, fakeRng).state
    const card = e2.hand[0]
    const before = e2.strategicBudget
    const e3 = fireCard(e2, card.uid)
    expect(e3.ok).toBe(true)
    expect(e3.state.strategicBudget).toBe(before - 3)  // 关 1 解雇 💰3
    expect(e3.state.hand.find((c) => c.uid === card.uid)).toBe(undefined)
  })

  it('upgradeCard 稀有度模式 +25% baseOutput', () => {
    const state = preparedPassedState()
    const e1 = enterIntermission(state, fakeRng).state
    const opt = e1.intermissionState.event.options.find((o) => !o.cost)
    const e2 = resolveEvent(e1, opt.id, fakeRng).state
    // 给玩家足够 💰
    const e2Rich = { ...e2, strategicBudget: 100 }
    const empCard = e2Rich.hand.find((c) => c.type === 'emp' && c.rarity === 'common')
    if (!empCard) return  // 没合适卡跳过
    const baseBefore = empCard.baseOutput
    const e3 = upgradeCard(e2Rich, empCard.uid, 'rarity')
    expect(e3.ok).toBe(true)
    const upgraded = [...e3.state.hand, ...e3.state.drawPile].find((c) => c.uid === empCard.uid)
    expect(upgraded.rarity).toBe('rare')
    expect(upgraded.baseOutput).toBe(Math.round(baseBefore * 1.25))
  })
})
