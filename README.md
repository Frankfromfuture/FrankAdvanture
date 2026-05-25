# Frank's Adventure

> **Frank's Adventure** 是一款网页端公司经营 Roguelike Deckbuilder：玩家扮演刚上任 CEO 的 Frank，每周用 员工 / 功能 / 服务 三类卡组合「打出商业行动」，在 9 个融资阶段中连续经营，不断提升公司估值以达成行业第一的终极目标。

[![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%20%2B%20JSX%20%2B%20Vitest-61dafb)]()
[![Status](https://img.shields.io/badge/status-v4%20PR1%20Landed-orange)]()
[![Style](https://img.shields.io/badge/style-Pixel%20%2B%202.5D-7c3aed)]()

> **v4 重构 PR1 已落地**：估值公式简化为 `V = cash + 资产×2 + 上月利润×8`；月利润按现金转化率 CCR (阶段 1-3 = 70% / 4-6 = 60% / 7-9 = 50%) 入账；**月末 cash < 0 即 game over**（移除所有救济）；阶段门槛 `[0, 250, 700, 1500, 3000, 6000, 12000, 22000, 40000]`。PR2-4（卡牌新 schema、流派质变、Combo、区位 buff、高光时刻、事件双向化等）规划中，详见 `~/.claude/plans/delightful-chasing-castle.md`。
> **当前实装规模**：80 张卡牌模板 + 3 张创始人 EPIC 卡 + 37 张商业模式 + 5 张董事访谈事件 + 9 阶段融资旅程。

---

## ✨ 核心特色与 v3.3 规则

1. **极简 HUD**：主界面仅显示 4 项（日期 `2026.05`、估值进度条 `V 480 / 1000`、唯一可支配 `¥ Cash`、行动力 `AP`），其余明细与拆解一律通过 hover tooltip 浮窗显示。
2. **现金/留存利润解耦**：每月结算时，产线净利润 (`income - burn`) 将累积至留存利润 `retainedEarnings` 中，现金 `cash` 保持不变。玩家只能在跨阶段董事会会议中，通过**财务部**选择比例 (0% / 30% / 60% / 100%) 提取留存利润转为可支配的 ¥ 现金。
3. **季度动态估值**：估值 V 采用多路径即时计算：`V = 最近 3 个月平均利润 × 20 + 资产价值 (卡牌资产 + BM 资产折半) + 现金溢价 (现金 × 0.3)`。
4. **卡牌内生 Burn**：移除了固定的维持费，Burn 属性直接包含在卡牌和商业模式 (BM) 中：
   - 卡牌 Base Burn 在牌库中即按月扣减。
   - 新上线的卡牌在上线当月需要额外支付 Extra Burn。
   - 商业模式 (BM) 每月需支付固定的订阅月费。
5. **9 阶段连续制**：游戏流程从天使轮开始连续推进，估值跨过门槛触发董事会，期间所有卡牌、产线状态、累积月份均连续保留不重置。最终目标在 stage 9 达成估值 80,000+ 获得终极胜利。
6. **滞涨救济与现金告急保护**：
   - 连续 6 月估值未创新高触发滞涨 3 选 1（免费解雇 / +50¥ 援助 / 下月产出 1.3 倍）。
   - 现金 < 1.5 * monthlyBurn 时 HUD 闪红；连续 3 月 retained=0 且 cash <= 0 时自动触发救助。
7. **起始职业选择**：开始新游戏时有科学家、销售冠军、大厂 CXO 三种背景选择，界面呈现 3D 反透视效果。选择后起始牌堆追加 1 张随机 common 同部门员工 + 1 张随机 rare/elite 同部门经理/总监，外加一张专属的 **EPIC 级「创始人」牌**默认在起手手牌中：
   - **科学家 Founder** (`EMP_FOUNDER_R`)：EPIC，AP 3，基础产出 66。功能 *AI-Driven 研发*——在手时月初抽牌 +1；在产线时月初抽牌 +3（手牌仍受 `handLimit` 约束）。
   - **销售冠军 Founder** (`EMP_FOUNDER_S`)：EPIC，AP 3，基础产出 66。功能 *Sales High*——在手时全产线收入 ×1.2；在产线时全产线收入 ×1.8。
   - **大厂 CXO Founder** (`EMP_FOUNDER_O`)：EPIC，AP 3，基础产出 66。功能 *精益管理*——在手时最大 AP +1；在产线时本月 AP 再额外 +3。

> 起始牌组总规模：**25 张** = 7 张 `STARTER_HAND` + 1 张创始人 + 15 张 `STARTER_DECK` + 2 张职业补充。

8. **完整董事会会议**：估值跨过门槛后进入【董事会】，含 5 大功能区——
   - **财务部**：单次提取留存利润 (0% / 30% / 60% / 100%) 转为现金。
   - **投资部 (Shop)**：5 槽位（A 史诗必出 / B 传奇 40%+保底 / C 神秘礼包必出 / D-E 随机卡包），刷新 ¥5。
   - **人事部 (HR)**：升职（rarity ¥10-20，词缀 ¥8）/ 解雇（按阶段 ¥3-8，单场上限 5 张）。
   - **商学院**：3 槽位订阅商业模式（37 张可选），默认 BM 槽位上限 4 个，刷新 ¥4。
   - **董事访谈**：进场强制 1 张 BOARD_EVENT，3 选 1 战略调整。

---

## 🚀 快速开始

```bash
cd web-battle
npm install
npm run dev          # 启动本地开发服务器 -> http://127.0.0.1:5173
npm run build        # 验证生产编译（无 error 编译通过）
npm run test         # Vitest 单元测试（确保 engine.test.js 通过）
```

需要 **Node 18+**。

---

## 🛠 技术栈

| 模块 | 选型 |
|---|---|
| **核心 UI 框架** | **React 19 + JSX** |
| **项目构建** | **Vite** |
| **测试框架** | **Vitest** |
| **样式语言** | **Vanilla CSS (styles.css)** |
| **特效表现** | **Phaser 3.x**（做 combo 和粒子 VFX 辅助层） |

---

## 📁 仓库结构

```
.
├── README.md                          ← 本文件
├── AGENTS.md                          ← Agent 快速上手指南与推送规范
├── GAME_DESIGN_FOUNDATION.md          ← 核心设计规则 (v3.2)
├── CARDS_DESIGN.md                    ← 卡牌及商业模式集中配置数据与公式
├── BATTLEFIELD_DESIGN.md              ← 主战斗场景 UI / 动效流程
├── BOARD_MEETING_DESIGN.md            ← 董事会会议（HR/Shop/财务部/商学院）设计
└── web-battle/
    ├── src/
    │   ├── App.jsx                    ← 主游戏 React UI 与交互组件
    │   ├── styles.css                 ← 核心 UI 样式
    │   ├── CardView.jsx               ← 卡牌渲染渲染组件
    │   ├── CompendiumScreen.jsx       ← 卡牌图鉴与调试编辑器
    │   └── game/
    │       ├── cards.js               ← 9 阶段配置、卡牌及事件参数
    │       ├── engine.js              ← 核心引擎 (估值计算、月份结算、提取等)
    │       └── engine.test.js         ← 引擎单元测试
```

---

## 🎮 融资阶段与晋升注资

跨过估值门槛并在下一月结算达标后将触发**董事会会议**，投资人会注入阶段注资 (Entry Grant) 到现金中：

| Stage | 阶段名 | 估值门槛 ($V$) | 阶段注资 (¥ cash) |
|---|---|---|---|
| 1 | 天使轮 | 0 | 起步 ¥30 (开局自动注入) |
| 2 | 种子轮 | 300 | +¥25 |
| 3 | A 轮 | 1,000 | +¥50 |
| 4 | B 轮 | 2,500 | +¥100 |
| 5 | C 轮 | 5,000 | +¥200 |
| 6 | D 轮 | 10,000 | +¥400 |
| 7 | IPO | 20,000 | +¥700 |
| 8 | 千亿 | 40,000 | +¥1,200 |
| 9 | 行业第一 | 80,000 | 直接达成终极胜利 |

---

## 🤝 开发约定与提规

- **测试铁律**：任何对结算/估值公式的修改都必须在 `engine.test.js` 中同步修改并保证 `npm run test` 通过。
- **构建铁律**：提交前必须跑 `npm run build`，不允许有任何 error。
- **解雇卡牌**：董事会中解雇卡牌 (onFire) 改为调用免费的 `dismissCardInBoardMeeting` 逻辑。
- **双推送规范**：正式提交必须双推：
  1. `git push origin <branch>` (GitHub)
  2. `git push codeup <branch>` (云效)
