# 游戏机制重构：极简 HUD + 财务化估值 + 卡牌内生 Burn + 9 阶段连续制

## Context

当前游戏问题：
1. 关卡制（10 关每关 6 月，状态重置）缺乏长线连续感
2. **三货币**（现金 / 战略预算 / 累计收入）决策维度过高
3. **Burn 不到位**，维持费固定，玩家不会因扩张焦虑
4. **关内月度招聘**和**关末战略商店**职责混乱
5. **估值=累计收入** 不真实，无法体现"经营效率"
6. HUD 信息密度过高（6 个 HudItem），玩家认知负担大

目标：

1. **时间锚现实**：用 `new Date()` 起点，单调向前推（年.月）
2. **9 阶段连续制**：估值跨门槛 → 触发董事会，状态全程连续不重置
3. **现金/留存利润 解耦**：cash 独立于月度流量；profit 进入 retainedEarnings 累积；董事会才能"提取"
4. **季度动态估值**：`V = 3月平均利润 × 20 + 资产 + 现金溢价`
5. **Burn 内生于牌库**：base burn + extra burn（上线那月） + BM 月费
6. **董事会唯一招聘/调整入口**：移除战斗界面 PackMarket
7. **极简 HUD**：主界面只 4 项（日期、估值条、¥、AP），其它数据全 hover 显示
8. **localStorage 自动存档**
9. 文档全面重写（6 份 .md）

---

## 核心机制设计

### 极简 HUD（关键 UI 原则）

```
主界面（默认）：
┌──────────────────────────────────────────────────────────┐
│ 2026.05    [V 480 / 1000 ▰▰▰▱▱]      ¥124    AP 4/8   │
└──────────────────────────────────────────────────────────┘
```

**默认只显示 4 个数字**，所有次要数据隐藏到 hover tooltip：

| HUD 项 | 默认 | Hover 显示 |
|--------|------|-----------|
| 日期 | `2026.05` | 「已经营 X 月 · 当前阶段 种子轮 · 本阶段 3 月」 |
| 估值进度条 | 条 + 百分比 | 「V 480 / 1000 → A 轮 \| PE 350 + 资产 80 + 现金溢价 50 \| 季度均利润 35」 |
| ¥124 | 数字 | 「现金 124（可花）+ 留存利润 87（董事会可提取）\| 下月预估 burn 15 \| 月度净 +20」 |
| AP 4/8 | 数字 | 「当前 4 / 限额 8 \| 来自卡牌 AP 总和」 |

**保留的醒目反馈**：
- 现金 ≤ burn × 1.5 → ¥ 闪红
- 滞涨建议触发 → toast 弹 3-5 秒可关闭
- 估值跨阶段 → 进度条全亮 + 阶段晋升弹窗

**移除的 HUD 项**：
- 品牌副标题（hover 日期才出现）
- 战略预算（不存在了）
- 现金/累计收入冗余（合并）

**事件面板（右）瘦身**：
- 删除 `<PackMarket>`
- 保留事件卡 + 本月预估（核心月度决策信息）
- 「本月预估」hover 时展示完整 income/burn 分解

### 货币关系链

```
[每月结算（自动）]
  income = Σ产线产出 + Σ BM 月加成
  burn   = Σ卡 base burn (在牌库就扣)
         + Σ卡 extra burn (上线那月加扣)
         + Σ BM 月费
  profit = income - burn

  // cash 不动！
  retainedEarnings = max(0, retainedEarnings + profit)
  profitHistory.push(profit)  // 保留原始（含负），供估值

[董事会触发（跨阶段）]
  1. 投资人注资 → cash += stage.entryGrant
  2. 玩家选提取比例 (0% / 30% / 60% / 100%):
       cash += retainedEarnings × ratio
       retainedEarnings -= 已提取
     （不动 profitHistory → 不影响估值）
  3. 购买 / 升级 / 解雇 / 订阅 → cash 扣

[估值（即时计算）]
  quarterlyAvgProfit = avg(profitHistory 最近 3 月)
                       （不足 3 月用全部均值）
  peValue       = max(0, quarterlyAvgProfit × 20)
  assetValue    = Σ(卡稀有度资产值) × 0.5 + Σ(BM 稀有度资产值) × 0.5
  treasuryValue = max(0, cash) × 0.3
  V = peValue + assetValue + treasuryValue
```

### 变量职责

| 变量 | 性质 | 主界面 | Hover | 是否可花 |
|------|------|-------|-------|---------|
| income | 流量 | 隐藏 | ¥ hover 内 | 否 |
| burn | 流量 | 隐藏 | ¥ hover 内 | 否 |
| profit | 流量 | settlement 动画 | - | 否 |
| **¥ cash** | 存量 | HUD 数字 | hover 显示分解 | **唯一可花** |
| **留存利润** | 存量 | **隐藏** | ¥ hover 显示 | 否（董事会提取） |
| profitHistory | 数组 | 隐藏 | - | - |
| 季度均利润 | 派生 | 隐藏 | V hover 显示 | - |
| **估值 V** | 派生 | HUD 进度条 | hover 显示 breakdown | 仅阶段进度 |

### 阶段表（9 阶段）

| Stage | 名 | V 门槛 | 注资 ¥ | 季度均利润对应 | 预期到达月 |
|-------|----|--------|--------|---------------|----------|
| 1 | 天使轮 | 0 | 起手 30 | - | M0 |
| 2 | 种子轮 | 300 | +25 | ~15/月 | M2-3 |
| 3 | A 轮 | 1000 | +50 | ~50/月 | M8-10 |
| 4 | B 轮 | 2500 | +100 | ~125/月 | M15-18 |
| 5 | C 轮 | 5000 | +200 | ~250/月 | M22-26 |
| 6 | D 轮 | 10000 | +400 | ~500/月 | M30-35 |
| 7 | IPO | 20000 | +700 | ~1000/月 | M38-45 |
| 8 | 千亿 | 40000 | +1200 | ~2000/月 | M48-58 |
| 9 | 行业第一 | 80000 | +2000 | ~4000/月 | M60+，终极胜利 |

升阶规则单向：V ≥ next threshold 连续 2 月 → 触发；升阶后不退回。

### Burn 数值（RARITY_TABLE，集中调参）

| Rarity | card base burn | card extra burn | card asset value | BM 月费 | BM asset value |
|--------|---------------|-----------------|------------------|---------|----------------|
| common | 1 | 0 | 5 | 2 | 8 |
| rare | 2 | 1 | 15 | 4 | 25 |
| epic | 4 | 2 | 50 | 8 | 80 |
| legendary | 7 | 4 | 150 | 14 | 240 |

### 焦灼期解决（三路径 + 滞涨救济）

**三路径**：利润 / 资产 / 现金 三条路推进估值，不会单一路径死锁。

**滞涨救济**：连续 6 月 V 未创新高 → 弹 toast 3 选 1（可关闭）：
- A. 精简团队：免费解雇 burn 最高 1 张卡
- B. 注资援助：即时 +50¥
- C. 战略冲刺：下月所有产线输出 ×1.3

冷却 6 月。

### 现金告急保护

- `cash < monthlyBurn × 1.5` → HUD ¥ 项柔和脉冲红
- `cash < 0` → 仍可运行；董事会购买按钮 disabled
- 连续 3 月 retained = 0 且 cash ≤ 0 → 自动 +30¥ 救助 + 解雇 burn 最高 1 张

### 董事会重新分工

跨阶段触发 → `enterIntermission` → **不重置任何状态**（全连续）：

1. **财务部（顶部新加）**：滑动条选提取留存利润比例 0/30/60/100% + 即时预览金额
2. **投资部 Shop**：epic / legendary 单买（¥ 一次性）
3. **人事部 HR**：升级卡（rarity↑）+ **解雇卡**（移除，下月起减 burn）
4. **商学院 School**：BM 订阅签约（¥ 签约费 + 月费）/ 退订
5. **董事访谈**：选下阶段事件 buff/debuff

> **删除战斗界面 `<PackMarket>`**。

### 时间系统

- `createInitialState` 调 `new Date()` → `game.year`, `game.month`
- 每次 `resolveMonth` 月份 +1（跨 12 → 年 +1, 月 = 1）
- HUD 「日期」`2026.05`
- `elapsedMonths` 累加跟踪

### 存档（localStorage）

- key：`frank-battle-state-v1`
- 启动 `_loadGameState() ?? createInitialState()`
- 每次 `setGame` 后写入
- `version: 1`，不匹配 → fallback
- 设置「清除存档并重开」

---

## 实现步骤

### 步骤 1 — `src/game/cards.js`

- 新增 `STAGES`（9 阶段，`{ id, key, name, threshold, entryGrant, theme }`）
- 新增 `RARITY_TABLE`（集中数值表）
- `CARD_TEMPLATES` 构造时按 rarity 自动附加 `burn / extraBurn / assetValue`
- `BUSINESS_MODELS` 构造时附加 `monthlyCost / assetValue`
- 删 `getRecruitMarketSize` 等月度招聘工具
- 删/淘汰 `LEVELS`（可保留作 fallback）
- 新增工具：`findStageByValuation`、`getCardBurn`、`getCardExtraBurn`、`getBMMonthlyCost`、`getCardAssetValue`、`getBMAssetValue`

### 步骤 2 — `src/game/engine.js`（核心重构）

- **`createInitialState`**：
  - `const now = new Date()`; `year/month` 取自现实
  - `cash: 30`、`retainedEarnings: 0`、`valuation: 0`、`stage: STAGES[0]`
  - `elapsedMonths: 0`、`profitHistory: []`、`valuationHistory: []`、`stagnationCooldown: 0`
  - 删字段：`level`、`strategicBudget`、`recruitMarket`、`recruitChoiceUsed`、`cumulativeIncome`
- 新增 `computeMonthlyBurn(state)`：deck base + line extra + BM monthly
- 新增 `computeQuarterlyAvgProfit(profitHistory, elapsedMonths)`：3 月均，不足取全部均
- 新增 `computeValuation(state)`：三路径
- **`resolveMonth`** 重写：
  1. `income`、`burn`、`profit` 计算
  2. `profitHistory.push(profit)`，trim 6
  3. `nextRetained = max(0, retainedEarnings + profit)` — **cash 不动**
  4. `nextV = computeValuation(state w/ nextRetained)`
  5. 月份推进（跨年）、`elapsedMonths += 1`
  6. 升阶检测（连续 2 月达标）、滞涨检测、现金告急检测
- **`enterIntermission`**：cash += `entryGrant`；带 `withdrawalRatio: 0.30` 字段
- 新增 `applyWithdrawal(state, ratio)`：cash += retained × ratio; retained -= 已提取
- **`exitIntermission`**：不再 `createInitialState`，状态全连续
- 新增 `dismissCardInBoardMeeting(state, cardUid)`
- 新增 `applyStagnationAdvice(state, choice)`
- 现有 `purchaseShopItem` 等改 cash（替代 strategicBudget）

### 步骤 3 — `src/App.jsx`（HUD 极简 + 改造）

- **`TopHud`** 大改造（关键）：
  - **只保留 4 项**：「日期」「估值进度条」「¥」「AP」
  - 删除「现金」「战略预算」「累计收入」HudItem
  - 「品牌副标题」改为 hover 日期才显示
  - 每个 HUD 项加 `title` / 自定义 hover tooltip（用现有的 `data-tip` 模式或新加 `.hover-detail-panel`）
  - 进度条 hover → 显示 V breakdown
  - ¥ hover → 显示「现金 / 留存 / 下月预估 burn / 月度净」
- **战斗右侧面板**：删 `<PackMarket />` + `EditableBlock id="event-market"`
- **HudItem 现金告急**：`cash < monthlyBurn × 1.5` → `.warn` 闪红
- 新增 `<StagnationAdvisor>` toast 组件
- **`SettingsOverlay`**：加「清除存档并重开」按钮
- **`ResultOverlay`**：仅 stage 9 触发
- **`BoardMeetingHub`** 改造：
  - hub 顶部加「财务部」面板（滑动条选提取比例 + 实时预览）
  - 投资部 / 人事部 / 商学院 / 董事访谈 维持
  - 人事部加「解雇」按钮 + 确认
  - 商学院 BM 显示月费 + 退订
  - 价格统一用 ¥
- `RecruitPackReveal` 保留供董事会用

### 步骤 4 — localStorage 存档

- 新增 `GAME_STATE_STORAGE_KEY = 'frank-battle-state-v1'`
- `_loadGameState()` / `_saveGameState(game)`，结构带 `version: 1`
- `useState(() => _loadGameState() ?? createInitialState())`
- `useEffect(() => _saveGameState(game), [game])`

### 步骤 5 — `src/styles.css`

- `.top-hud` 改 grid template 适配 4 项
- `.hud-item.warn` 现金告急脉冲
- `.hud-hover-tooltip` 通用 hover 详情面板（深色背景、半透明、像素风）
- `.stage-progress` 估值进度条
- `.stagnation-toast` 滞涨建议
- `.finance-station` 财务部滑动条面板
- `.board-meeting-station.hr-dismiss` 解雇按钮
- 删冗余：`.pack-market`, `.recruit-market`

### 步骤 6 — 文档全面重写（6 份 .md）

| 文件 | 改动重点 |
|------|---------|
| `GAME_DESIGN_FOUNDATION.md` | 重写 §A：9 阶段连续制 + 真实日期 + 现金/留存解耦 + 单可花 ¥；新增「货币关系链」「季度估值（3 月均 × 20）」「Burn 内生」章节 |
| `BATTLEFIELD_DESIGN.md` | 移除 §5 Phase 3 招聘市场；新增「极简 HUD + hover 详情」设计章节；新增「下月预估 burn」「留存利润」展示规则 |
| `BOARD_MEETING_DESIGN.md` | 触发改"跨阶段"；新增「财务部」（提取留存）；人事部加「解雇」；商学院 BM 改月费订阅 |
| `CARDS_DESIGN.md` | 删月度招聘段落；卡 / BM 增 `burn / extraBurn / assetValue / monthlyCost`（按 RARITY_TABLE）；起始 10 张 common |
| `AGENTS.md` | 更新 v3.2：极简 HUD + 9 阶段 + 现金/留存解耦 + 季度估值 + 卡牌内生 burn |
| `README.md` | 同步核心规则速览 |

---

## 关键文件清单（修改）

- `src/game/cards.js` — STAGES、RARITY_TABLE、卡/BM 字段
- `src/game/engine.js` — createInitialState / resolveMonth / enterIntermission / exitIntermission / computeMonthlyBurn / computeValuation / computeQuarterlyAvgProfit / applyWithdrawal / dismissCardInBoardMeeting / applyStagnationAdvice
- `src/App.jsx` — HUD 极简（4 项 + hover tooltip）、删 PackMarket、StagnationAdvisor、董事会财务部 + 解雇 UI、存档、设置清存档
- `src/styles.css` — HUD grid、warn 脉冲、hover tooltip、估值进度、滞涨 toast、财务部、解雇
- 6 份 `.md` 文档

## 不动的文件

- `src/CardView.jsx`, `src/CompendiumScreen.jsx`, `src/PhaserBattleFX.jsx`, `src/ServiceFunSvg.jsx`, `src/DaylightBoardroomBg.jsx`, `src/PackBox3D.jsx`
- `src/人物/*`
- 战斗界面 CEO 面板、产线舞台、手牌区视觉不变（只删 PackMarket）

---

## 验证 (Verification)

1. `cd web-battle && npm run build` 零报错
2. `npm run dev`，开新游戏：
   - HUD **只 4 项**：`2026.05` · 进度条 · `¥30` · `AP 0/X`
   - 鼠标悬浮：
     - 日期 → 显示「已经营 0 月 · 天使轮」
     - 进度条 → 显示「V 0 / 300 → 种子 \| 各路径分解」
     - ¥ → 显示「现金 30 + 留存 0 + 下月 burn 10」
     - AP → 显示来源
   - 右侧事件面板**没有**「招聘卡包」
3. 启动产线 3-4 月：
   - cash **不变**（保持 30）
   - 留存累积（hover ¥ 时才能看到）
   - 估值进度条增长
4. 跨越 300 V 连续 2 月 → 自动种子轮董事会：
   - 财务部：滑动条选提取比例（默认 30%），实时预览
   - 注资 +25¥
   - 提取 30% 留存 → cash 增、retained 减
   - 投资部 / 人事部 / 商学院 操作
   - 退出：全部状态连续
5. 玩 20+ 月：
   - 现金告急时 ¥ 闪红
   - 跨过 A 轮 / B 轮各触发 1 次董事会
6. 滞涨：6 月 V 无新高 → 弹 toast 3 选 1
7. 刷新页面：存档生效
8. 设置「清除存档并重开」：返回起点
9. 推到 stage 9 → ResultOverlay「行业第一 · 终极胜利」

---

## 风险与降级

- **HUD 信息隐藏过度**：保留醒目反馈（现金告急闪红、阶段晋升弹窗、滞涨 toast）防止玩家错过关键信号；hover tooltip 要快速响应（无延迟）且字号清晰
- **估值复杂度**：hover breakdown + 引导提示帮助玩家理解
- **存档兼容**：`v1`，结构不匹配 → fallback `createInitialState`
- **Burn 失控**：玩家可董事会随时解雇；滞涨救济兜底
- **¥ 跌至 0**：董事会购买 disabled；玩家先提取留存
- **留存归零 + cash ≤ 0 持续**：自动救助
- **滞涨救济滥用**：6 月冷却
- **平衡微调**：所有参数集中 `cards.js` 顶部（`STAGES` + `RARITY_TABLE`）
- **3 月均估值早期失真**：不足 3 月取全部均
