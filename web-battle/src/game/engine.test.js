import { describe, expect, it } from 'vitest'
import {
  computeLineOutput,
  createInitialState,
  GAME_CONFIG,
  getRecruitMarketSize,
  makeFixedCard,
  placeCardInSlot,
  resolveMonth,
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

  it('ramps the recruit market from empty to three cards over the first four months', () => {
    expect(getRecruitMarketSize(1)).toBe(0)
    expect(getRecruitMarketSize(2)).toBe(1)
    expect(getRecruitMarketSize(3)).toBe(2)
    expect(getRecruitMarketSize(4)).toBe(3)
    expect(getRecruitMarketSize(5)).toBe(3)
    expect(createInitialState({ rng: fixedRng }).recruitMarket).toHaveLength(0)
  })

  it('refreshes the recruit market using the month ramp after settlement', () => {
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
    expect(monthTwo.recruitMarket).toHaveLength(1)
    expect(monthThree.month).toBe(3)
    expect(monthThree.recruitMarket).toHaveLength(2)
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
})
