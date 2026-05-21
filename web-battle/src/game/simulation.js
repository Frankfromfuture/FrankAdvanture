/**
 * 蒙特卡洛模拟器 (M2.1c)
 *
 * 跑 N 局完整通关，输出每关 base/excellent/perfect 通关率，
 * 用于验证数值平衡是否符合设计目标:
 *   - 基础通关率 ≥ 95% (新手亲和)
 *   - 优秀通关率 ≈ 60% (中等挑战)
 *   - 卓越通关率 ≈ 25% (硬核冲分)
 *
 * 运行: node src/game/simulation.js [局数] [关卡 ID]
 *   默认 100 局 / 关 1
 */

import {
  GAME_CONFIG,
  buyRecruit,
  computeBattlePreview,
  createInitialState,
  discardFromHand,
  getActiveLine,
  getEffectiveApLimit,
  getLineAp,
  placeCardInSlot,
  resolveMonth,
} from './engine.js'
import { fileURLToPath } from 'node:url'

function seedRng(seed) {
  let state = seed >>> 0
  return function rng() {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

/**
 * 朴素 AI 策略 (代表"中等水平玩家"):
 * 1. 优先按 baseOutput 降序填 P5 → P1 → P3 → P2 → P4
 * 2. AP 用完即止, 超额放弃
 * 3. 招聘市场: 若 💰 充裕且卡的稀有度 > common, 买 1 张
 * 4. 弃牌: 优先弃 baseOutput 最低的
 */
function playOneRun(rng) {
  let state = createInitialState({ levelId: 1, rng })
  let safety = 60

  while (!state.result && safety-- > 0) {
    // 弃牌
    while (state.discardRequired > 0) {
      const handSorted = [...state.hand].sort((a, b) => (a.baseOutput || 0) - (b.baseOutput || 0))
      const toss = handSorted[0]
      if (!toss) break
      const res = discardFromHand(state, toss.uid)
      state = res.ok ? res.state : state
      if (!res.ok) break
    }

    // 招聘 (粗略: 若 budget > 30 买第 1 张)
    if (state.strategicBudget > 30 && state.recruitMarket?.length) {
      const target = state.recruitMarket[0]
      const res = buyRecruit(state, target.uid)
      if (res.ok) state = res.state
    }

    // 布产线: 按 baseOutput 降序选, 填 P5/P1/P3/P2/P4
    const activeLine = getActiveLine(state)
    if (activeLine && activeLine.status === 'planning') {
      const slotOrder = state.event?.bossRule?.type === 'p3_min_tier' ? [2, 4, 0, 1, 3] : [4, 0, 2, 1, 3]
      const apLimit = getEffectiveApLimit(state)
      const tierRank = { '专员': 1, '经理': 2, '总监': 3, VP: 4, CXO: 5, '顶级': 5 }
      const empCards = state.hand
        .filter((c) => c.type === 'emp' || c.type === 'srv' || c.type === 'fun')
        .sort((a, b) => (b.baseOutput || 0) - (a.baseOutput || 0))

      for (const slotIdx of slotOrder) {
        const candidates = slotIdx === 2 && state.event?.bossRule?.type === 'p3_min_tier'
          ? [...empCards].sort((a, b) => ((tierRank[b.tier] ?? 0) - (tierRank[a.tier] ?? 0)) || ((b.baseOutput || 0) - (a.baseOutput || 0)))
          : empCards
        for (const card of candidates) {
          const stillInHand = state.hand.some((c) => c.uid === card.uid)
          if (!stillInHand) continue
          const projected = activeLine.slots.map((s, i) => (i === slotIdx ? card : s))
          if (getLineAp(projected) > apLimit) continue
          if (activeLine.slots[slotIdx]) continue
          const res = placeCardInSlot(state, card.uid, slotIdx)
          if (res.ok) {
            state = res.state
            break
          }
        }
      }
    }

    // 结算月
    const res = resolveMonth(state, rng)
    if (!res.ok) {
      // 卡死 fallback: 不放置直接结算
      break
    }
    state = res.state
  }

  return {
    passed: !!state.result?.passed,
    rating: state.result?.rating ?? '?',
    cumulativeIncome: state.cumulativeIncome,
    target: state.level.target,
    cash: state.cash,
    month: state.month,
    reason: state.result?.reason ?? 'timeout',
  }
}

function runMonteCarlo(n = 100, seed = 42) {
  const results = []
  for (let i = 0; i < n; i++) {
    const rng = seedRng(seed + i)
    results.push(playOneRun(rng))
  }
  return results
}

function summarize(results) {
  const total = results.length
  const passed = results.filter((r) => r.passed).length
  const ratings = { S: 0, A: 0, B: 0, C: 0, F: 0, '?': 0 }
  let avgIncome = 0
  let avgMonths = 0
  const reasons = {}
  results.forEach((r) => {
    ratings[r.rating] = (ratings[r.rating] || 0) + 1
    avgIncome += r.cumulativeIncome
    avgMonths += r.month
    reasons[r.reason] = (reasons[r.reason] || 0) + 1
  })
  avgIncome = Math.round(avgIncome / total)
  avgMonths = (avgMonths / total).toFixed(2)
  const excellent = ratings.A + ratings.S
  const perfect = ratings.S
  return {
    total,
    passRate: ((passed / total) * 100).toFixed(1) + '%',
    excellentRate: ((excellent / total) * 100).toFixed(1) + '%',
    perfectRate: ((perfect / total) * 100).toFixed(1) + '%',
    ratings,
    avgIncome,
    avgTarget: results[0]?.target ?? 0,
    avgMonths,
    reasons,
  }
}

// CLI 入口
if (typeof process !== 'undefined' && fileURLToPath(import.meta.url) === process.argv[1]) {
  const n = parseInt(process.argv[2]) || 100
  console.log(`\n=== 蒙特卡洛模拟: ${n} 局, 关卡 1 ===\n`)
  const results = runMonteCarlo(n)
  const summary = summarize(results)
  console.log(`局数:           ${summary.total}`)
  console.log(`目标 ¥:         ${summary.avgTarget}`)
  console.log(`平均累计 ¥:     ${summary.avgIncome}  (${((summary.avgIncome / summary.avgTarget) * 100).toFixed(0)}% of target)`)
  console.log(`平均结算月份:   ${summary.avgMonths}`)
  console.log()
  console.log(`基础通关率:     ${summary.passRate}    (设计目标 ≥ 95%)`)
  console.log(`优秀通关率:     ${summary.excellentRate}    (设计目标 ≈ 60%)`)
  console.log(`卓越通关率:     ${summary.perfectRate}    (设计目标 ≈ 25%)`)
  console.log()
  console.log('评级分布:')
  Object.entries(summary.ratings).forEach(([k, v]) => {
    if (v) console.log(`  ${k}: ${v}  (${((v / summary.total) * 100).toFixed(1)}%)`)
  })
  console.log()
  console.log('结束原因:')
  Object.entries(summary.reasons).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}  (${((v / summary.total) * 100).toFixed(1)}%)`)
  })
  console.log()
}

export { playOneRun, runMonteCarlo, summarize, seedRng }
