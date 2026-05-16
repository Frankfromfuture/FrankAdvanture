# Frank's Adventure — Agent 入口（v3.0）

> 你是被请来推进本项目的 agent。30 秒上手；完整规则见 `~/.claude/plans/frank-s-advanture-godot-proud-sundae.md`。

## 这是什么

**Frank's Adventure** 是一款网页端公司经营 Roguelike Deckbuilder：玩家扮演刚上任 CEO 的 Frank，每周用员工/功能/服务三类卡组合"打出商业行动"，在 12 周内完成季度目标分数，沿 A 轮 → B 轮 → C 轮 → IPO → 上市后增长 → 行业龙头 → 世界级 七大融资阶段闯关。

## 当前栈（v3.0 唯一路线）

- **React 19 + Phaser 4 + Vite + JSX**（M2 引入 TypeScript）
- **入口**：`web-battle/`
- **开发**：`cd web-battle && npm run dev` → http://127.0.0.1:5173
- **构建**：`npm run build`
- Godot 桌面方向已废弃；快照 tag 在 `v1.0-godot-snapshot`，需要时 `git checkout v1.0-godot-snapshot` 可恢复。

## 核心规则（v3.0 关键变化）

- **AP 行动点数**（独立第三资源）：每周 5 AP, 周初重置。专员 1 / 经理 2 / 总监 3 AP。
- **¥ 资金**：只作 HP + 商店货币，不再支付出牌成本。
- **每周流程**：第 1 周抽 5 张；之后每周抽 3 张；可保留 1 张到下周（M2 接入 UI）；AP 上限内任意出牌。
- **执行力 ±20% 随机**：每局开局每张员工独立 roll，整局固定。
- **玩家属性 3 选 1**：科学家 / 销售冠军 / 管理大师 → 偏向部门 +2 张, 该部门 roll 偏向 +0~+20%。
- **关卡**：1 季度 = 12 周 = 1 小关；4 季度 = 1 大关（融资阶段）；每大关 Q4 是 Boss 季度。
- **目标分**：A 轮 220 / 280 / 350 / Boss 450 → 世界级 5,000+。
- **6 核心组合**：个人推进 / 项目小组 / PMF 验证 / 融资路演 / 公司战役（铁三角）/ 战略加速。

## 路线图

| M | 状态 | 内容 |
|---|---|---|
| **M1 (v3.0)** | ✅ 已交付 | AP 引擎 / 起手属性 / ±20% 随机 / 删 Godot |
| M2 | ⬜ 下一步 | 7 季度事件 + 12 周状态机 + localStorage 存档 + 保留 1 张 UI |
| M3 | ⬜ | 大关推进 + 三选一奖励 + 牌库编辑 |
| M4 | ⬜ | Boss + 简单商店 |
| M5 | ⬜ | 平衡 + Phaser VFX + 音效 + Vercel 部署 |

## 文件所有权与提交前规约

| 路径 | 内容 | 必跑 |
|---|---|---|
| `web-battle/src/App.jsx` | 主游戏组件（M2 后将拆 GameState/EconomyEngine） | `npm run build` 必须通过 |
| `web-battle/src/PhaserBattleFX.jsx` | Phaser VFX（只动画, 不含规则） | — |
| `web-battle/src/styles.css` | UI 样式 | — |
| `web-battle/src/game/`（待建）| 规则核心（EconomyEngine / ScoringEngine / EventEngine） | M2 拆出 |
| `web-battle/src/game/data/*.json`（待建）| 卡牌 / 事件 / 关卡配置 | — |
| `~/.claude/plans/...md` | 设计原档（v3.0） | 改规则前必读 |

**铁律**：
1. 改 `calculateScore` / AP 逻辑必须补 Vitest 单测（M2 引入测试栈）
2. 4 数学通道严禁交叉（功能牌不给倍率，咨询不加基础分）
3. 增加卡时 `cost` 字段含义是 AP，非 ¥
4. 提交前 `npm run build` 必须无 error

## 起手三选一（下一个 agent 选）

1. **M2 - 7 事件 + 12 周循环**：写 EventEngine, 让同套牌在不同事件下打法不同
2. **M2 - 保留 1 张 UI**：周末让玩家选 1 张未出过的牌保留到下周
3. **M2 - Vitest 引入 + AP 单测**：加 `__tests__/` 与 5 个核心场景

读完上面，去开工。完整规则细节见 `~/.claude/plans/frank-s-advanture-godot-proud-sundae.md`。

— 上一任 agent（Claude，M1 v3.0 完成时间：2026-05-17）
