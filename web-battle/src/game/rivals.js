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

export const RIVAL_K = 12                  // 每月份额变化系数（最多 ±12 个百分点）
export const RIVAL_WIN_THRESHOLD = 80      // 玩家份额 ≥ 80% 即胜利
export const RIVAL_LOSE_THRESHOLD = 0      // 玩家份额 ≤ 0% 即输掉
export const RIVAL_INITIAL_SHARE = 50      // 双方初始 50/50
export const RIVAL_BATTLE_MAX_MONTHS = 7   // 7 月内未胜即取消
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
    archetypeMul: 0.95,
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
    archetypeMul: 0.95,
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
    archetypeMul: 1.25,
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
    archetypeMul: 1.12,
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

const TRACK_RIVAL_ARCHETYPES = [
  {
    id: 'ai-open-source-free-riders',
    track: 'ai',
    name: '开源白嫖派',
    title: 'Issue 驱动商业化',
    flavor: '他们把 README 写得像公益宣言，把企业版价格藏在销售电话里。',
    archetypeMul: 0.82,
    monthlyEffect: { playerSDeptMult: 0.94, playerSDeptMultMin: 0.7, maxStacks: 4 },
    weaknessHint: '把 R 部门资产化，别只给社区打白工',
    rivalNames: ['开源白嫖派', '免费版永动机', 'Star 数崇拜社'],
    counterStrategies: [
      { id: 'CS_AI_OS_R', label: '沉淀技术资产 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '✓ 核心模块私有化，白嫖边界清楚了' },
      { id: 'CS_AI_OS_S', label: '补企业销售 (+¥12)', effect: { type: 'budgetGain', value: 12 }, result: '✓ 社区流量开始转合同' },
      { id: 'CS_AI_OS_BM', label: '扩商业模式槽', effect: { type: 'increaseBmSlot' }, result: '✓ 开源、托管、企业版可以同时摆了' },
    ],
  },
  {
    id: 'ai-cloud-bill-beast',
    track: 'ai',
    name: '云账单吞金兽',
    title: 'Token 越跑越贵',
    flavor: '每次 Demo 掌声响起，财务软件里就多一行账单。',
    archetypeMul: 0.92,
    monthlyEffect: { playerBurnMult: 1.18, recruitDelta: -1 },
    weaknessHint: '用 O 部门压 burn，用功能牌换跑道',
    rivalNames: ['云账单吞金兽', 'GPU 吸金矿', '推理费黑洞'],
    counterStrategies: [
      { id: 'CS_AI_CLOUD_O', label: '优化推理链路 (招募 1 张 O 传奇)', effect: { type: 'recruitLegendary', dept: 'O' }, result: '✓ 账单曲线终于不再垂直起飞' },
      { id: 'CS_AI_CLOUD_FUND', label: '争取云券 (+¥18)', effect: { type: 'budgetGain', value: 18 }, result: '✓ 云券到账，先活两个月' },
      { id: 'CS_AI_CLOUD_SLOT', label: '买入降本 BM 槽', effect: { type: 'increaseBmSlot' }, result: '✓ FinOps 有地方落地了' },
    ],
  },
  {
    id: 'ai-blue-factory-cloud',
    track: 'ai',
    name: '蓝厂智能云',
    title: '大客户安全评审',
    flavor: '他们的方案书第一页写稳定，最后一页写年度合同。',
    archetypeMul: 1.02,
    monthlyEffect: { everyNMonths: 2, bmTopEffectMult: 0.78 },
    weaknessHint: '多 BM 分散风险，靠研发差异化绕开同质云服务',
    rivalNames: ['蓝厂智能云', '企业级蓝屏云', '稳字第一云'],
    counterStrategies: [
      { id: 'CS_AI_BLUE_R', label: '做差异化模型 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '✓ 模型指标压过采购表格' },
      { id: 'CS_AI_BLUE_SLOT', label: '多云架构 (+1 商业模式槽)', effect: { type: 'increaseBmSlot' }, result: '✓ 不再被单一云供应商拿捏' },
      { id: 'CS_AI_BLUE_FUND', label: '企业交付预算 (+¥15)', effect: { type: 'budgetGain', value: 15 }, result: '✓ 安全评审材料终于有人写了' },
    ],
  },
  {
    id: 'ai-valley-safety-board',
    track: 'ai',
    name: '硅谷安全委员会',
    title: '对齐审查',
    flavor: '他们每发布一个模型，都会先发布一篇自己为什么很负责的长文。',
    archetypeMul: 1.08,
    monthlyEffect: { apDelta: -1, playerBurnMult: 1.08 },
    weaknessHint: '董事会、合规和研发节奏要一起顶住',
    rivalNames: ['硅谷安全委员会', '对齐小组董事会', '免责声明研究院'],
    counterStrategies: [
      { id: 'CS_AI_SAFE_O', label: '搭合规中台 (招募 1 张 O 传奇)', effect: { type: 'recruitLegendary', dept: 'O' }, result: '✓ 审查材料开始自动生成' },
      { id: 'CS_AI_SAFE_R', label: '安全评测团队 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '✓ 红队报告比发布会还厚' },
      { id: 'CS_AI_SAFE_FUND', label: '应对听证会 (+¥20)', effect: { type: 'budgetGain', value: 20 }, result: '✓ 公关、律师和咖啡同时到位' },
    ],
  },
  {
    id: 'ai-one-model-alliance',
    track: 'ai',
    name: '万模归一联盟',
    title: '终局模型税',
    flavor: '他们宣称世界只需要一个模型，刚好就是他们家的。',
    archetypeMul: 1.18,
    monthlyEffect: { recruitDelta: -1, playerBurnMult: 1.12, everyNMonths: 2, bmTopEffectMult: 0.76, apDelta: -1 },
    weaknessHint: '终局战：R 的护城河、O 的成本线、S 的商业化缺一不可',
    rivalNames: ['万模归一联盟', '唯一 API 委员会', '通用智能收费站'],
    counterStrategies: [
      { id: 'CS_AI_ALL_FUND', label: '动用模型战备金 (+¥25)', effect: { type: 'budgetGain', value: 25 }, result: '✓ 战备金到账，token 还能烧' },
      { id: 'CS_AI_ALL_SLOT', label: '开放生态槽 (+1 商业模式槽)', effect: { type: 'increaseBmSlot' }, result: '✓ 生态伙伴终于不只在 PPT 里' },
      { id: 'CS_AI_ALL_R', label: '王牌研究员 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '✓ 核心论文能看懂了' },
    ],
  },
  {
    id: 'growth-99-subsidy-army',
    track: 'growth',
    name: '九块九补贴军',
    title: '现金券地毯式轰炸',
    flavor: '他们把 GMV 当烟花放，把利润表当节日牺牲品。',
    archetypeMul: 0.86,
    monthlyEffect: { playerSDeptMult: 0.9, playerSDeptMultMin: 0.62, maxStacks: 5 },
    weaknessHint: '用品牌和渠道效率，而不是跟着一起烧券',
    rivalNames: ['九块九补贴军', '满减敢死队', '包邮冲锋营'],
    counterStrategies: [
      { id: 'CS_GR_SUB_S', label: '加强渠道销售 (招募 1 张 S 传奇)', effect: { type: 'recruitLegendary', dept: 'S' }, result: '✓ 渠道开始算毛利了' },
      { id: 'CS_GR_SUB_BRAND', label: '品牌预算 (+¥14)', effect: { type: 'budgetGain', value: 14 }, result: '✓ 用户记住你，不只记住优惠券' },
      { id: 'CS_GR_SUB_SLOT', label: '会员体系槽', effect: { type: 'increaseBmSlot' }, result: '✓ 不再靠单次补贴续命' },
    ],
  },
  {
    id: 'growth-redbook-court',
    track: 'growth',
    name: '红书种草审判庭',
    title: 'KOC 证据链',
    flavor: '他们的每条笔记都像素人分享，除了报价单很专业。',
    archetypeMul: 0.94,
    monthlyEffect: { recruitDelta: -1, playerBurnMult: 1.12 },
    weaknessHint: '补 R 做内容产品化，补 S 做投放纪律',
    rivalNames: ['红书种草审判庭', '拔草陪审团', '生活方式检察院'],
    counterStrategies: [
      { id: 'CS_GR_RED_R', label: '内容产品化 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '✓ 种草不再全靠玄学' },
      { id: 'CS_GR_RED_S', label: '达人分层 (+¥16)', effect: { type: 'budgetGain', value: 16 }, result: '✓ 达人名单终于不是 Excel 玄学' },
      { id: 'CS_GR_RED_SLOT', label: '投放 BM 槽', effect: { type: 'increaseBmSlot' }, result: '✓ 预算有了归因，不再只靠感觉' },
    ],
  },
  {
    id: 'growth-short-video-blackbox',
    track: 'growth',
    name: '短视频流量黑箱',
    title: '算法心情管理',
    flavor: '昨天爆款，今天违规，明天建议你投钱。',
    archetypeMul: 1.02,
    monthlyEffect: { everyNMonths: 2, bmTopEffectMult: 0.75 },
    weaknessHint: '用多渠道和数据驱动，不要把命交给单一推荐流',
    rivalNames: ['短视频流量黑箱', '推荐流老虎机', '完播率占卜屋'],
    counterStrategies: [
      { id: 'CS_GR_VIDEO_S', label: '多渠道增长 (招募 1 张 S 传奇)', effect: { type: 'recruitLegendary', dept: 'S' }, result: '✓ 流量入口不再只有一个' },
      { id: 'CS_GR_VIDEO_R', label: '归因系统 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '✓ 终于知道钱花哪儿了' },
      { id: 'CS_GR_VIDEO_FUND', label: '热点备战金 (+¥18)', effect: { type: 'budgetGain', value: 18 }, result: '✓ 热点来了能追，没来也能活' },
    ],
  },
  {
    id: 'growth-mindshare-hypermart',
    track: 'growth',
    name: '全民心智大卖场',
    title: '货架即品牌',
    flavor: '他们的 SKU 比公司员工还多，每一个都说自己是爆品。',
    archetypeMul: 1.1,
    monthlyEffect: { playerBurnMult: 1.1, apDelta: -1 },
    weaknessHint: '用 O 稳交付，用 S 抢心智，别被 SKU 海淹没',
    rivalNames: ['全民心智大卖场', '货架霸屏所', '爆品复制中心'],
    counterStrategies: [
      { id: 'CS_GR_MIND_O', label: '供应链运营 (招募 1 张 O 传奇)', effect: { type: 'recruitLegendary', dept: 'O' }, result: '✓ 爆品终于能按时发货' },
      { id: 'CS_GR_MIND_S', label: '心智战役 (招募 1 张 S 传奇)', effect: { type: 'recruitLegendary', dept: 'S' }, result: '✓ 用户搜索词里出现你了' },
      { id: 'CS_GR_MIND_SLOT', label: '渠道组合槽', effect: { type: 'increaseBmSlot' }, result: '✓ 不再一条腿走货架' },
    ],
  },
  {
    id: 'growth-endgame-ltd',
    track: 'growth',
    name: '增长尽头有限公司',
    title: '所有渠道都已买过',
    flavor: '他们把所有增长方法试了一遍，最后开始卖增长方法课程。',
    archetypeMul: 1.2,
    monthlyEffect: { recruitDelta: -1, playerBurnMult: 1.12, everyNMonths: 2, bmTopEffectMult: 0.75, apDelta: -1 },
    weaknessHint: '终局战：品牌、产品、运营效率必须一起成型',
    rivalNames: ['增长尽头有限公司', '获客成本天花板', 'LTV 祈祷会'],
    counterStrategies: [
      { id: 'CS_GR_END_FUND', label: '终局投放金 (+¥25)', effect: { type: 'budgetGain', value: 25 }, result: '✓ CAC 还能再扛一轮' },
      { id: 'CS_GR_END_SLOT', label: '增长飞轮槽 (+1 商业模式槽)', effect: { type: 'increaseBmSlot' }, result: '✓ 增长不再只靠买量' },
      { id: 'CS_GR_END_S', label: '首席增长官 (招募 1 张 S 传奇)', effect: { type: 'recruitLegendary', dept: 'S' }, result: '✓ 增长会议终于有人讲人话' },
    ],
  },
  {
    id: 'ops-outsourcing-lowcost',
    track: 'ops',
    name: '外包低价军团',
    title: '报价单压路机',
    flavor: '他们承诺又快又好又便宜，通常会在第三周删掉前两个。',
    archetypeMul: 0.84,
    monthlyEffect: { playerSDeptMult: 0.93, playerSDeptMultMin: 0.68, maxStacks: 4 },
    weaknessHint: '用 O 做交付质量，用 S 讲清不是纯人月报价',
    rivalNames: ['外包低价军团', '人月批发部', '验收延期有限公司'],
    counterStrategies: [
      { id: 'CS_OP_OUT_O', label: '交付中台 (招募 1 张 O 传奇)', effect: { type: 'recruitLegendary', dept: 'O' }, result: '✓ 交付质量开始能复用' },
      { id: 'CS_OP_OUT_S', label: '价值销售 (+¥12)', effect: { type: 'budgetGain', value: 12 }, result: '✓ 客户开始讨论价值，不只砍价' },
      { id: 'CS_OP_OUT_SLOT', label: '服务化 BM 槽', effect: { type: 'increaseBmSlot' }, result: '✓ 人月变产品包，毛利好看了' },
    ],
  },
  {
    id: 'ops-talent-hunting-field',
    track: 'ops',
    name: '高薪挖角猎场',
    title: 'Offer 轰炸',
    flavor: '他们的人才战略很简单：把你的组织架构图当购物清单。',
    archetypeMul: 0.96,
    monthlyEffect: { recruitDelta: -1, playerBurnMult: 1.16 },
    weaknessHint: '保留低 burn 组织骨架，别让关键岗单点爆炸',
    rivalNames: ['高薪挖角猎场', 'Offer 连发器', '组织结构复制机'],
    counterStrategies: [
      { id: 'CS_OP_TAL_O', label: '组织韧性 (招募 1 张 O 传奇)', effect: { type: 'recruitLegendary', dept: 'O' }, result: '✓ 关键岗位有备份了' },
      { id: 'CS_OP_TAL_R', label: '工具替代人力 (招募 1 张 R 传奇)', effect: { type: 'recruitLegendary', dept: 'R' }, result: '✓ 不再每个缺口都靠加人' },
      { id: 'CS_OP_TAL_FUND', label: '留才预算 (+¥16)', effect: { type: 'budgetGain', value: 16 }, result: '✓ 薪酬会终于不只会叹气' },
    ],
  },
  {
    id: 'ops-compliance-red-stamp',
    track: 'ops',
    name: '合规红章办',
    title: '流程盖章流',
    flavor: '他们不一定做得快，但每一步都有三个章和七个附件。',
    archetypeMul: 1.0,
    monthlyEffect: { everyNMonths: 2, bmTopEffectMult: 0.76 },
    weaknessHint: '用运营和董事会节奏处理合规，不要让业务被流程冻住',
    rivalNames: ['合规红章办', '流程盖章流', '附件十三研究所'],
    counterStrategies: [
      { id: 'CS_OP_COM_O', label: '合规中台 (招募 1 张 O 传奇)', effect: { type: 'recruitLegendary', dept: 'O' }, result: '✓ 章还是要盖，但不再卡三个月' },
      { id: 'CS_OP_COM_SLOT', label: '风控 BM 槽', effect: { type: 'increaseBmSlot' }, result: '✓ 风险控制终于不是纯成本' },
      { id: 'CS_OP_COM_FUND', label: '审计预算 (+¥18)', effect: { type: 'budgetGain', value: 18 }, result: '✓ 审计老师喝上咖啡了' },
    ],
  },
  {
    id: 'ops-supply-chain-choke',
    track: 'ops',
    name: '供应链卡脖子社',
    title: '缺料与排产',
    flavor: '他们的强项是让你知道，世界上最贵的东西叫交期。',
    archetypeMul: 1.1,
    monthlyEffect: { playerBurnMult: 1.12, apDelta: -1 },
    weaknessHint: '用 O 把交付节奏稳住，用 S 守住关键客户',
    rivalNames: ['供应链卡脖子社', '交期黑洞', '排产表审判者'],
    counterStrategies: [
      { id: 'CS_OP_SUP_O', label: '供应链指挥部 (招募 1 张 O 传奇)', effect: { type: 'recruitLegendary', dept: 'O' }, result: '✓ 交期开始像个承诺了' },
      { id: 'CS_OP_SUP_S', label: '关键客户安抚 (+¥20)', effect: { type: 'budgetGain', value: 20 }, result: '✓ 客户愿意再等一个版本' },
      { id: 'CS_OP_SUP_SLOT', label: '备份供应商槽', effect: { type: 'increaseBmSlot' }, result: '✓ 不再被单一环节卡住' },
    ],
  },
  {
    id: 'ops-platform-main-switch',
    track: 'ops',
    name: '生态平台总闸门',
    title: '规则解释权',
    flavor: '他们的开放平台很开放，直到你的业务开始赚钱。',
    archetypeMul: 1.2,
    monthlyEffect: { recruitDelta: -1, playerBurnMult: 1.12, everyNMonths: 2, bmTopEffectMult: 0.74, apDelta: -1 },
    weaknessHint: '终局战：平台、合规、交付、客户关系要同时有备份',
    rivalNames: ['生态平台总闸门', '接口权限委员会', '开放平台收费站'],
    counterStrategies: [
      { id: 'CS_OP_GATE_FUND', label: '平台迁移预算 (+¥25)', effect: { type: 'budgetGain', value: 25 }, result: '✓ 迁移路线终于不是口号' },
      { id: 'CS_OP_GATE_SLOT', label: '多平台 BM 槽 (+1 商业模式槽)', effect: { type: 'increaseBmSlot' }, result: '✓ 生态不再只有一个闸门' },
      { id: 'CS_OP_GATE_O', label: '首席运营官 (招募 1 张 O 传奇)', effect: { type: 'recruitLegendary', dept: 'O' }, result: '✓ 总闸门旁边有了备用电源' },
    ],
  },
]

RIVAL_ARCHETYPES.push(...TRACK_RIVAL_ARCHETYPES)

TRACK_RIVAL_ARCHETYPES.forEach((archetype) => {
  archetype.archetypeMul = Number((archetype.archetypeMul * 0.9).toFixed(3))
  if (archetype.monthlyEffect?.playerBurnMult) {
    archetype.monthlyEffect.playerBurnMult = Number((1 + (archetype.monthlyEffect.playerBurnMult - 1) * 0.45).toFixed(3))
  }
  if (archetype.monthlyEffect?.bmTopEffectMult) {
    archetype.monthlyEffect.bmTopEffectMult = Number((1 - (1 - archetype.monthlyEffect.bmTopEffectMult) * 0.65).toFixed(3))
  }
})

export const RIVAL_TRACK_LINES = {
  ai: [
    'ai-open-source-free-riders',
    'ai-cloud-bill-beast',
    'ai-blue-factory-cloud',
    'ai-valley-safety-board',
    'ai-one-model-alliance',
  ],
  growth: [
    'growth-99-subsidy-army',
    'growth-redbook-court',
    'growth-short-video-blackbox',
    'growth-mindshare-hypermart',
    'growth-endgame-ltd',
  ],
  ops: [
    'ops-outsourcing-lowcost',
    'ops-talent-hunting-field',
    'ops-compliance-red-stamp',
    'ops-supply-chain-choke',
    'ops-platform-main-switch',
  ],
}

export function getArchetype(id) {
  return RIVAL_ARCHETYPES.find((a) => a.id === id) ?? null
}

// 决定本年度对手：第 N 年随机抽一个未被击败的 archetype（终极对手固定为 Y5）
export function pickArchetypeForSchedule(scheduleEntry, defeatedIds = [], rng = Math.random, professionTrack = 'ai') {
  const line = RIVAL_TRACK_LINES[professionTrack]
  if (line?.length) {
    const id = line[Math.max(0, Math.min(line.length - 1, (scheduleEntry.tier ?? 1) - 1))]
    const archetype = RIVAL_ARCHETYPES.find((a) => a.id === id)
    if (archetype) return archetype
  }
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
  const baseScale = Math.max(80, nextStage.threshold * 0.035)
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
export function pickRewardCardTemplates(archetypeId, count = 3, rng = Math.random, professionTrack = null) {
  const archetype = getArchetype(archetypeId)
  const track = professionTrack ?? archetype?.track
  const trackDept = track === 'ai' ? 'R' : track === 'growth' ? 'S' : track === 'ops' ? 'O' : null
  const spec = ARCHETYPE_REWARD_POOL[archetypeId] ?? (
    trackDept
      ? {
          cardFilter: (c) => c.type === 'emp'
            && c.rarity !== 'common'
            && c.tier !== '创始人'
            && (c.dept === trackDept || c.type === 'fun' || c.type === 'srv'),
          bmId: null,
        }
      : ARCHETYPE_REWARD_POOL['capital-wall']
  )
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
export function createRivalInstance(scheduleEntry, stageIdAtPreview, defeatedIds, rng = Math.random, professionTrack = 'ai') {
  const archetype = pickArchetypeForSchedule(scheduleEntry, defeatedIds, rng, professionTrack)
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
