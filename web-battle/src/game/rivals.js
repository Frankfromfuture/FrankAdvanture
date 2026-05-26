// 竞争公司系统：市场份额对决
// 详见 boss.md
//
// 时间线（年度）：
//   第 9 月 预告 / 第 10–12 月 备战 / 第 13 月起对决开始（≥80% 胜 / ≤0% 负 / 6 月超时取消）
// 触发月份基准为 elapsedMonths：
//   预告：elapsedMonths === 9, 21, 33, 45, 57
//   开战：elapsedMonths === 13, 25, 37, 49, 61
// 选这个时间是为了避开月 12/24/36/48/60 的 major event 和月%3=0 的季度董事会
//
// archetype 行为只动数值（incomeMult / burnMult / recruitDelta），不动卡牌实例，保持对引擎其它部分的零侵入。

import { CARD_TEMPLATES, STAGES, BUSINESS_MODELS } from './cards.js'

export const RIVAL_K = 10                  // 每月份额变化系数（最多 ±10 个百分点）
export const RIVAL_WIN_THRESHOLD = 80      // 玩家份额 ≥ 80% 即胜利
export const RIVAL_LOSE_THRESHOLD = 0      // 玩家份额 ≤ 0% 即输掉
export const RIVAL_INITIAL_SHARE = 50      // 双方初始 50/50
export const RIVAL_BATTLE_MAX_MONTHS = 6   // 6 月内未胜即取消
export const RIVAL_PREVIEW_MONTHS = 3      // 提前 3 月预告

// 5 个对手出现的 elapsedMonths（预告月）。+3 即开战月。
export const RIVAL_SCHEDULE = [
  { previewElapsedMonth: 9,  startElapsedMonth: 13, tier: 1, isUltimate: false },
  { previewElapsedMonth: 21, startElapsedMonth: 25, tier: 2, isUltimate: false },
  { previewElapsedMonth: 33, startElapsedMonth: 37, tier: 3, isUltimate: false },
  { previewElapsedMonth: 45, startElapsedMonth: 49, tier: 4, isUltimate: false },
  { previewElapsedMonth: 57, startElapsedMonth: 61, tier: 5, isUltimate: true },
]

export function findPreviewSchedule(elapsedMonths) {
  return RIVAL_SCHEDULE.find((s) => s.previewElapsedMonth === elapsedMonths) ?? null
}

export function findStartSchedule(elapsedMonths) {
  return RIVAL_SCHEDULE.find((s) => s.startElapsedMonth === elapsedMonths) ?? null
}

export const RIVAL_ARCHETYPES = [
  {
    id: 'price-butcher',
    name: '价格屠夫',
    title: '低价倾销',
    flavor: '靠规模化低价收割市场。',
    archetypeMul: 0.85,
    monthlyEffect: {
      // 累积式：每月让玩家 S 部门产出 -8%，叠到 -40% 封顶
      playerSDeptMult: 0.92,
      playerSDeptMultMin: 0.6,
      maxStacks: 5,
    },
    weaknessHint: '加强 R/O 部门、买入"品牌"BM 抵消',
    rivalNames: ['力恒电商', '速购网', '一元百货', '价倾科技', '低吼集团'],
    counterStrategies: [
      { id: 'CS_PB_R', label: '加强 R 部门 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '✓ R 部门加强，应对低价倾销' },
      { id: 'CS_PB_O', label: '加强 O 部门 (招募 1 张 O 传奇)', effect: { type: 'recruitLegendary', dept: 'O' }, result: '✓ O 部门加强，提升运营效率' },
      { id: 'CS_PB_BRAND', label: '买入"品牌"BM (+¥10)', effect: { type: 'budgetGain', value: 10 }, result: '✓ 品牌投资到位，+¥10 备用金' },
    ],
  },
  {
    id: 'talent-raider',
    name: '挖角狂魔',
    title: '高薪猎才',
    flavor: '挥舞钞票把行业人才一锅端。',
    archetypeMul: 1.0,
    monthlyEffect: {
      // 对决期每月：招聘市场可选数 -1（最低 1）、玩家月度 burn ×1.15
      recruitDelta: -1,
      playerBurnMult: 1.15,
    },
    weaknessHint: '备战期囤够低 burn 卡组、提前买好关键 BM',
    rivalNames: ['星耀人力', 'HiHire', '猎鹰咨询', '高薪猎', '人才共和'],
    counterStrategies: [
      { id: 'CS_TR_LOWBURN', label: '囤低 burn 卡组 (+¥8)', effect: { type: 'budgetGain', value: 8 }, result: '✓ 低 burn 卡组到位，挽留高薪压力下降' },
      { id: 'CS_TR_BMSLOT', label: '提前买关键 BM (+1 商业模式槽)', effect: { type: 'increaseBmSlot' }, result: '✓ 关键 BM 锁定，挖角风险降低' },
      { id: 'CS_TR_RECRUIT', label: '反挖人才 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '🔥 反挖成功，获得一张 R 传奇' },
    ],
  },
  {
    id: 'copycat-king',
    name: '山寨大王',
    title: '反向工程',
    flavor: '你出招、他抄招，速度还更快。',
    archetypeMul: 1.0,
    monthlyEffect: {
      // 对决期每 2 月：让玩家最高产出的 BM 效果 -25%（不复制、只削弱）
      everyNMonths: 2,
      bmTopEffectMult: 0.75,
    },
    weaknessHint: '在备战期把 BM 切换成低显高隐型',
    rivalNames: ['仿星科技', '抄抄网', '镜像工坊', '复刻者', '影子集团'],
    counterStrategies: [
      { id: 'CS_CC_HIDDEN', label: '切换低显高隐型 BM (+¥10)', effect: { type: 'budgetGain', value: 10 }, result: '✓ BM 隐性化，山寨难以削弱' },
      { id: 'CS_CC_BMSLOT', label: '扩张隐性 BM 槽 (+1 商业模式槽)', effect: { type: 'increaseBmSlot' }, result: '✓ 商业模式槽 +1，多线布置' },
      { id: 'CS_CC_O', label: '强化 O 部门 (招募 1 张 O 传奇)', effect: { type: 'recruitLegendary', dept: 'O' }, result: '✓ O 部门加强，运营优势确立' },
    ],
  },
  {
    id: 'capital-wall',
    name: '资本壁垒',
    title: '资本碾压',
    flavor: '没有花招，就是钱多。',
    archetypeMul: 1.4,
    monthlyEffect: {
      // 无主动效果，纯比拼经济硬度
    },
    weaknessHint: '必须靠备战期堆产线满载、AP 全花在 R&S 输出',
    rivalNames: ['浪潮资本', '巨擘集团', '万岳投资', '霸城控股', '银海资本'],
    counterStrategies: [
      { id: 'CS_CW_R', label: '强化 R 部门 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '✓ R 部门加强，硬碰硬有底气' },
      { id: 'CS_CW_S', label: '强化 S 部门 (招募 1 张 S 传奇)', effect: { type: 'recruitLegendary', dept: 'S' }, result: '✓ S 部门加强，输出火力提升' },
      { id: 'CS_CW_FUND', label: '加码备战金 (+¥15)', effect: { type: 'budgetGain', value: 15 }, result: '✓ 备战金到账，硬度拉满' },
    ],
  },
  {
    id: 'ultimate',
    name: '终极对手',
    title: '行业第一之敌',
    flavor: '集所有恶意于一身，挡在你登顶之路上。',
    archetypeMul: 1.2,
    monthlyEffect: {
      recruitDelta: -1,
      playerBurnMult: 1.10,
      everyNMonths: 2,
      bmTopEffectMult: 0.75,
      // 玩家每月 AP -1
      apDelta: -1,
    },
    weaknessHint: '通关战 —— 用前 4 次胜利累积的奖励才能稳赢',
    rivalNames: ['宿命对手·龙腾科技', '宿命对手·万象未来', '宿命对手·终焉资本'],
    counterStrategies: [
      { id: 'CS_ULT_FUND', label: '动用胜利奖励 (+¥20)', effect: { type: 'budgetGain', value: 20 }, result: '✓ 前 4 战累积奖励到账' },
      { id: 'CS_ULT_BMSLOT', label: '终极备战 (+1 商业模式槽)', effect: { type: 'increaseBmSlot' }, result: '✓ 商业模式槽 +1，多面备战' },
      { id: 'CS_ULT_R', label: '王牌增援 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '✓ R 部门王牌就位' },
    ],
  },
]

export function getArchetype(id) {
  return RIVAL_ARCHETYPES.find((a) => a.id === id) ?? null
}

// 决定本年度对手：第 N 年随机抽一个未被击败的 archetype（终极对手固定为 Y5）
export function pickArchetypeForSchedule(scheduleEntry, defeatedIds = [], rng = Math.random) {
  if (scheduleEntry.isUltimate) {
    return RIVAL_ARCHETYPES.find((a) => a.id === 'ultimate')
  }
  const pool = RIVAL_ARCHETYPES.filter((a) => a.id !== 'ultimate' && !defeatedIds.includes(a.id))
  if (!pool.length) {
    // 全部击败过则从非终极池随机
    const all = RIVAL_ARCHETYPES.filter((a) => a.id !== 'ultimate')
    return all[Math.floor(rng() * all.length)]
  }
  return pool[Math.floor(rng() * pool.length)]
}

export function pickRivalName(archetype, rng = Math.random) {
  const names = archetype.rivalNames ?? ['未知对手']
  return names[Math.floor(rng() * names.length)]
}

// 收入公式：rivalBaseIncome = stageThreshold[currentStage] × 0.6
// rivalTierMult = 1 + 0.15 × (tier − 1)
// rivalIncome = rivalBaseIncome × rivalTierMult × archetypeMul × monthDrift(±10%)
export function computeRivalIncome(stageId, tier, archetypeMul, rng = Math.random) {
  const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0]
  // 用下一阶段阈值的差作为更稳定的"规模基准"，避免 stage 1 阈值=0 时收入为 0
  const nextStage = STAGES.find((s) => s.id === stageId + 1) ?? stage
  const baseScale = Math.max(80, nextStage.threshold * 0.04)
  const tierMult = 1 + 0.15 * (tier - 1)
  const drift = 0.9 + rng() * 0.2  // ±10%
  return Math.round(baseScale * tierMult * archetypeMul * drift)
}

// 单月份额结算：incomeShareDelta = K × (yourIncome − rivalIncome) / (yourIncome + rivalIncome)
// 可选 boostK 给"价格战"竞争行动用
export function computeShareDelta(yourIncome, rivalIncome, { boostK = 0 } = {}) {
  const denom = Math.max(1, yourIncome + rivalIncome)
  const k = RIVAL_K + boostK
  return k * (yourIncome - rivalIncome) / denom
}

// 划道费：2 × 当前阶段阈值
export function computeTollFee(stageId) {
  const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0]
  const nextStage = STAGES.find((s) => s.id === stageId + 1) ?? stage
  // 用下一阶段阈值做参照，stage 1 阈值=0 时回退到 600
  return Math.max(600, Math.round(nextStage.threshold * 2 * 0.05))
}

// 胜利后给玩家的特色卡池
const ARCHETYPE_REWARD_POOL = {
  'price-butcher': {
    cardFilter: (c) => c.type === 'emp' && (c.dept === 'O' || c.dept === 'S') && (c.rarity === 'rare' || c.rarity === 'elite'),
    bmId: null, // 未来扩展用
  },
  'talent-raider': {
    cardFilter: (c) => c.type === 'emp' && (c.rarity === 'elite' || c.rarity === 'epic') && c.tier !== '创始人',
    bmId: null,
  },
  'copycat-king': {
    cardFilter: (c) => c.type === 'fun' && (c.rarity === 'rare' || c.rarity === 'elite'),
    bmId: null,
  },
  'capital-wall': {
    cardFilter: (c) => c.type === 'emp' && c.rarity === 'elite',
    bmId: null,
  },
  'ultimate': {
    cardFilter: (c) => c.type === 'emp' && (c.rarity === 'legendary' || c.rarity === 'epic'),
    bmId: null,
  },
}

// 胜利奖励：从特色卡池随机抽 3 张 templateId
export function pickRewardCardTemplates(archetypeId, count = 3, rng = Math.random) {
  const spec = ARCHETYPE_REWARD_POOL[archetypeId] ?? ARCHETYPE_REWARD_POOL['capital-wall']
  let pool = CARD_TEMPLATES.filter(spec.cardFilter)
  // 兜底：如果池子太小，扩展到全员工卡
  if (pool.length < count) {
    pool = CARD_TEMPLATES.filter((c) => c.type === 'emp' && c.tier !== '创始人' && c.rarity !== 'common')
  }
  if (!pool.length) return []
  const indices = pool.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  // ultimate 必给 1 张 legendary
  if (archetypeId === 'ultimate') {
    const legendaryIdx = pool.findIndex((c) => c.rarity === 'legendary')
    if (legendaryIdx >= 0) {
      const filtered = indices.filter((i) => i !== legendaryIdx).slice(0, count - 1)
      return [pool[legendaryIdx].id, ...filtered.map((i) => pool[i].id)]
    }
  }
  return indices.slice(0, count).map((i) => pool[i].id)
}

// 创建一个 schedule entry 对应的对手实例（在预告月调用）
export function createRivalInstance(scheduleEntry, stageIdAtPreview, defeatedIds, rng = Math.random) {
  const archetype = pickArchetypeForSchedule(scheduleEntry, defeatedIds, rng)
  const name = pickRivalName(archetype, rng)
  const estimatedMonthlyIncome = computeRivalIncome(stageIdAtPreview, scheduleEntry.tier, archetype.archetypeMul, () => 0.5)
  return {
    archetypeId: archetype.id,
    archetypeName: archetype.name,
    archetypeTitle: archetype.title,
    name,
    tier: scheduleEntry.tier,
    isUltimate: scheduleEntry.isUltimate,
    estimatedMonthlyIncome,
    weaknessHint: archetype.weaknessHint,
    flavor: archetype.flavor,
  }
}

// 战斗开始时的初始 battle 字段
export function createBattle(rivalInstance) {
  return {
    active: true,
    archetypeId: rivalInstance.archetypeId,
    archetypeName: rivalInstance.archetypeName,
    archetypeTitle: rivalInstance.archetypeTitle,
    rivalName: rivalInstance.name,
    tier: rivalInstance.tier,
    isUltimate: rivalInstance.isUltimate,
    estimatedMonthlyIncome: rivalInstance.estimatedMonthlyIncome,
    weaknessHint: rivalInstance.weaknessHint,
    flavor: rivalInstance.flavor,
    playerShare: RIVAL_INITIAL_SHARE,
    rivalShare: RIVAL_INITIAL_SHARE,
    monthsElapsed: 0,
    sDeptStacks: 0,   // 价格屠夫累积叠层
    copycatTickCount: 0, // 山寨大王累计触发次数
    lastShareDelta: 0,
    pickedStrategies: [], // boss 战期间董事会"应对策略"已选项 id（"放弃不用"不计入）
  }
}

// 根据当前 battle 生成"应对策略"事件，作为 boss 战时董事会战略指引的替代
export function buildBossCounterEvent(battle) {
  const archetype = getArchetype(battle.archetypeId)
  if (!archetype || !archetype.counterStrategies) return null
  return {
    id: `BOSS_COUNTER_${archetype.id}`,
    title: `应对策略 · ${archetype.name}`,
    flavor: `${archetype.flavor} 董事会要求确定本季度的应对方向：${archetype.weaknessHint}`,
    isBossCounter: true,
    archetypeId: archetype.id,
    options: [
      ...archetype.counterStrategies,
      { id: 'SKIP', label: '放弃不用 (跳过本次)', effect: { type: 'noop' }, result: '本次未采用应对策略', repeatable: true },
    ],
  }
}

// 计算本月 archetype 对玩家的数值修正
// 返回 { incomeMult, burnMult, recruitDelta, apDelta, bmTopEffectMult, sDeptMult }
export function computeArchetypeMonthlyMods(battle) {
  const archetype = getArchetype(battle.archetypeId)
  if (!archetype) return {}
  const effect = archetype.monthlyEffect ?? {}
  const mods = {
    incomeMult: 1,
    burnMult: 1,
    recruitDelta: 0,
    apDelta: 0,
    bmTopEffectMult: 1,
    sDeptMult: 1,
  }
  if (effect.playerSDeptMult != null) {
    const stacks = Math.min(battle.sDeptStacks ?? 0, effect.maxStacks ?? 5)
    const stackedMult = Math.pow(effect.playerSDeptMult, stacks)
    const minMult = effect.playerSDeptMultMin ?? 0.6
    mods.sDeptMult = Math.max(minMult, stackedMult)
  }
  if (effect.playerBurnMult != null) {
    mods.burnMult *= effect.playerBurnMult
  }
  if (effect.recruitDelta != null) {
    mods.recruitDelta += effect.recruitDelta
  }
  if (effect.apDelta != null) {
    mods.apDelta += effect.apDelta
  }
  if (effect.everyNMonths != null && effect.bmTopEffectMult != null) {
    const monthsElapsed = (battle.monthsElapsed ?? 0) + 1
    if (monthsElapsed % effect.everyNMonths === 0) {
      mods.bmTopEffectMult *= effect.bmTopEffectMult
    }
  }
  return mods
}

// 竞争行动（对决期玩家月度额外选择，4 选 1）
// 详见 boss.md §3
export const COMPETITIVE_ACTIONS = [
  {
    id: 'price-war',
    name: '价格战',
    description: '本月份额结算 K +5（爆发性）；消耗 8% 当月预估利润',
    cashCost: 0,                 // 实际扣减按 8% 预估利润算
    apCost: 0,
    cashAsPercentProfit: 0.08,  // 当月预估利润的 8%
    payload: { boostK: 5 },
  },
  {
    id: 'brand-push',
    name: '品牌投放',
    description: '现金 -300，本月对手收入 −20%',
    cashCost: 300,
    apCost: 0,
    payload: { rivalIncomeMult: 0.8 },
  },
  {
    id: 'poach',
    name: '挖人',
    description: 'AP -2 + 现金 -500，屏蔽对手 archetype 本月技能',
    cashCost: 500,
    apCost: 2,
    payload: { skillBlocked: true },
  },
  {
    id: 'skip',
    name: '跳过',
    description: '本月不主动行动',
    cashCost: 0,
    apCost: 0,
    payload: {},
  },
]

export function getCompetitiveAction(id) {
  return COMPETITIVE_ACTIONS.find((a) => a.id === id) ?? null
}

// 推进对决期叠层（在月末调用）
export function advanceArchetypeStacks(battle) {
  const archetype = getArchetype(battle.archetypeId)
  const effect = archetype?.monthlyEffect ?? {}
  let sDeptStacks = battle.sDeptStacks ?? 0
  let copycatTickCount = battle.copycatTickCount ?? 0
  if (effect.playerSDeptMult != null) {
    sDeptStacks = Math.min(sDeptStacks + 1, effect.maxStacks ?? 5)
  }
  if (effect.everyNMonths != null) {
    const monthsElapsed = (battle.monthsElapsed ?? 0) + 1
    if (monthsElapsed % effect.everyNMonths === 0) copycatTickCount += 1
  }
  return { sDeptStacks, copycatTickCount }
}
