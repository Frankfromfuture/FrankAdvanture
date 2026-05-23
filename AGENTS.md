# Frank's Adventure — Agent 入口（v3.2）

> 你是被请来推进本项目的 agent。30 秒上手；完整规则见 `~/.claude/plans/frank-s-advanture-godot-proud-sundae.md`。

## 这是什么

**Frank's Adventure** 是一款网页端公司经营 Roguelike Deckbuilder：玩家扮演刚上任 CEO 的 Frank，每周用员工/功能/服务三类卡组合"打出商业行动"，在 9 个融资阶段中连续经营，不断提升公司估值完成最终的行业第一目标。

## 当前栈（v3.2 唯一路线）

- **React 19 + Vite + JSX + Vitest**
- **入口**：`web-battle/`
- **开发**：`cd web-battle && npm run dev` → http://127.0.0.1:5173
- **构建**：`npm run build`
- **测试**：`npm run test` (Vitest 单元测试)
- Godot 桌面方向已废弃；快照 tag 在 `v1.0-godot-snapshot`。

## 核心规则（v3.2 关键变化）

1. **极简 HUD**：主界面仅显示 4 项（日期 `2026.05`、估值进度条 `V 480 / 1000`、唯一可花 `¥ Cash`、行动力 `AP`），其余明细与拆解一律通过 hover tooltip 浮窗显示。
2. **现金/留存利润解耦**：每月结算时，产线净利润 (`income - burn`) 将累积至留存利润 `retainedEarnings` 中，现金 `cash` 保持不变。玩家只能在跨阶段董事会会议中，通过**财务部**选择比例 (0% / 30% / 60% / 100%) 提取留存利润转为可花现金。
3. **季度动态估值**：估值 V 采用多路径即时计算：`V = 最近 3 个月平均利润 × 20 + 资产价值 (卡牌资产 + BM 资产折半) + 现金溢价 (现金 × 0.3)`。
4. **卡牌内生 Burn**：移除了固定的维持费，Burn 属性直接包含在卡牌和商业模式 (BM) 中：
   - 卡牌 Base Burn 在牌库中即按月扣减。
   - 新上线的卡牌在上线当月需要额外支付 Extra Burn。
   - 商业模式 (BM) 每月需支付固定的订阅月费。
5. **9 阶段连续制**：游戏流程从天使轮开始连续推进，估值跨过门槛触发董事会，期间所有卡牌、产线状态、累积月份均连续保留不重置。最终目标在 stage 9 达成估值 80,000+ 获得终极胜利。
6. **滞涨救济与现金告急保护**：
   - 连续 6 月估值未创新高触发滞涨 3 选 1（免费解雇 / +50¥ 援助 / 下月产出 1.3 倍）。
   - 现金 < 1.5 * monthlyBurn 时 HUD 闪红；连续 3 月 retained=0 且 cash <= 0 时自动触发救助。

## 路线图

| M | 状态 | 内容 |
|---|---|---|
| **M1 (v3.0)** | ✅ 已交付 | AP 引擎 / 起手属性 / ±20% 随机 / 删 Godot |
| **M2 (v3.2)** | ✅ 已交付 | 9 阶段连续制 + 极简 HUD + 财务提取 + 动态估值 + 滞涨/救济 + 存档 |
| M3 | ⬜ 下一步 | Phaser VFX + 更多事件与卡牌内容丰富 + Vercel 部署 |

## 文件所有权与提交前规约

| 路径 | 内容 | 必跑 |
|---|---|---|
| `web-battle/src/App.jsx` | 主游戏 React UI 与交互组件 | `npm run build` 必须通过 |
| `web-battle/src/styles.css` | UI 样式 (包含 v3.2 HUD 和财务部样式) | — |
| `web-battle/src/game/cards.js` | 9 阶段配置、卡牌 Base Burn/Asset 集中参数 | — |
| `web-battle/src/game/engine.js` | 核心引擎 (估值计算、月份结算、董事会财务提取等) | `npm run test` 必须通过 |
| `web-battle/src/game/engine.test.js` | Vitest 单元测试套件 | — |

**铁律**：
1. 任何对结算/估值公式的修改都必须在 `engine.test.js` 中同步修改并保证 `npm run test` 通过。
2. 董事会中解雇卡牌 (onFire) 改为调用免费的 `dismissCardInBoardMeeting` 逻辑。
3. 增加卡牌或商业模式时必须按稀有度在 `cards.js` 中定义好 burn 与 assetValue 参数。
4. 提交前 `npm run build` 必须无 error。

## 推送规则

- 本项目以后所有正式提交都必须双推：GitHub `origin` 和云效 Codeup `codeup`。
- 本地远端名固定为：`origin` = GitHub, `codeup` = 云效 Codeup。
- 推送命令：
  1. `git push origin <branch>`
  2. `git push codeup <branch>`

— 上一任 agent（Antigravity，v3.2 重构完成时间：2026-05-23）
