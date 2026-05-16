# Frank's Adventure — 开发路线图（多 Agent 协作）

> 配套设计文档：`~/.claude/plans/frank-s-advanture-godot-proud-sundae.md`
> 当前阶段：**M1 完成（核心战斗原型逻辑层）**

---

## 0. 协作约定（拿到这份文档的下一个 agent 必读）

### 0.1 项目状态查询命令
```bash
# 在仓库根目录运行
godot --headless --import                                 # 同步 class_name 注册
godot --headless --script res://tests/test_main.gd        # 跑全部单测（应 21/21 通过）
godot --headless --script res://scripts/tools/demo_battle.gd  # 跑 CLI 战斗 demo
```

### 0.2 文件结构与所有权
| 路径 | 内容 | 修改权 |
|---|---|---|
| `project.godot` | Godot 项目配置 | 任何 agent |
| `scripts/cards/` | 卡牌数据模型与工厂 | 数据/规则 agent |
| `scripts/hands/` | 牌型识别 | 规则 agent（**改动需补测试**） |
| `scripts/scoring/` | 分数引擎 | 规则 agent（**改动需补测试**） |
| `scripts/bosses/` | Boss CEO 行为 | Boss/AI agent |
| `scripts/items/` | 4 类永久道具 | 平衡 agent |
| `scripts/events/` | 商业事件 | 内容 agent |
| `scripts/ui/` | 所有 .tscn / UI 脚本 | UI agent |
| `scripts/core/` | GameState / SaveSystem / 全局单例 | 架构 agent |
| `data/**/*.tres` | 配置型资源（员工卡 / 牌型 / 道具 / 事件） | 内容/策划 agent |
| `tests/` | 单元测试 | 改逻辑的 agent 必须同步更新 |
| `assets/` | 美术 / 音频 | 美术 agent |
| `localization/` | i18n CSV | i18n agent |

### 0.3 编码规范
- **GDScript** 为主，强类型尽量加（`Array[EmployeeCard]` 而非裸 `Array`）
- 所有共享类用 `class_name`，使用前先跑一次 `godot --headless --import`
- 公开静态方法优先（便于测试 & 解耦），私有函数加 `_` 前缀
- 不写"做什么"型注释，只在"为什么"非显然时加单行注释
- 中文注释 OK（设计文档与团队语言一致）

### 0.4 提交前检查清单
1. `godot --headless --import` 无 SCRIPT ERROR
2. `godot --headless --script res://tests/test_main.gd` 全绿
3. 改 `HandTypeMatcher` / `ScoreEngine` 必须补单测
4. 改 `EmployeeCard` 字段必须同步更新 `data/employees/*.tres` 与 `CardFactory`
5. 用 Godot Inspector 改过的 .tres 提交前用 `git diff` 检查 ext_resource id 没飘

---

## 1. 里程碑总览

| M | 名称 | 状态 | 关键交付 | 验收 |
|---|---|---|---|---|
| **M1** | 核心战斗原型 | ✅ 完成 | 卡牌模型 / 12 牌型 / 分数引擎 / CLI demo / 单测 | 21/21 测试通过 + demo 能跑通一项目 |
| **M2** | 路径与节点 | ⬜ 待开 | 7 主节点 × 路演/谈判/对赌 / Map 视图 / 失败胜利结算 | 玩家能从 A 轮线性走到 IPO（无道具） |
| **M3** | 经济与商店 | ⬜ 待开 | 融资 ¥ / 商店 / 雇佣解雇 / 卡包 | 完整商店循环可用 |
| **M4** | 4 类永久道具 | ⬜ 待开 | 咨询 / IT / 办公室 / CEO 特质 + 修饰器栈注入 | 4 通道全部进入 ScoreEngine, 单测覆盖 |
| **M5** | Boss + 事件 | ⬜ 待开 | 7 Boss CEO（非对称 debuff）+ 20 商业事件 + M&A | Boss 战完整可玩 |
| **M6** | 元进度 | ⬜ 待开 | 传奇卡池 / 难度阶梯 / 成就 / mid-run save | 跨局解锁链路打通 |
| **M7** | 美术音频打磨 | ⬜ 待开 | 像素卡面 65+ / 扁平 UI / 音效 BGM | 视觉与 Balatro 可比 |
| **M8** | 平衡测试封测 | ⬜ 待开 | 自动模拟 / 邀测 / Steam Demo | 通关曲线达标 |

---

## 2. M1 已交付（细节）

### 已存在的代码
- `scripts/cards/CardEnums.gd` — Department / Rarity / PersonalityTag 枚举 + 中文显示名 + 层级判定工具
- `scripts/cards/EmployeeCard.gd` — 5 维 `Resource`：name / department / rank / tags / rarity / experience
- `scripts/cards/CardFactory.gd` — 65 张起步牌库生成 + `make(...)` 工具
- `scripts/hands/HandType.gd` — 12 牌型枚举 + 基础值表 + `MatchResult` 类
- `scripts/hands/HandTypeMatcher.gd` — 纯静态识别器，从高到低优先级匹配
- `scripts/scoring/ScoreEngine.gd` — `ScoreBreakdown` + 4 通道架构（M4 钩子已留）
- `tests/test_main.gd` — 21 个测试（14 牌型 + 7 分数）
- `scripts/tools/demo_battle.gd` — CLI 战斗 demo（暴力枚举 AI 选最优手）
- `data/employees/*.tres` — 3 张样例员工卡（实习生 / 高级 PM / 传奇 CMO）作为 schema 模板

### 已知设计决策（不要轻改）
- **牌型优先级 = enum 数值大者优先**，铁三角(10) > 矩阵(7)、OKR(9) > 狼性(8)。基于"含 card_chips 后的实际最终分"测算的合理顺序。
- **scoring_cards 只包含真正参与牌型的卡**，非参与卡不计 `base_chips`（同 Balatro 的 kicker）。
- **ScoreEngine 算式**：`(card_chips + base_chips + bonus_chips) × (base_mult + bonus_mult) × x_mult`。4 通道严格分离，杜绝倍率膨胀。

### M1 尚未做（M2 入口任务）
- 没有 UI、没有真正的回合系统、没有 Battle 场景
- 没有 Map / 节点切换
- `demo_battle.gd` 是 CLI 演示而非游戏入口，`run/main_scene` 仍空

---

## 3. M2 任务详解（下一个 agent 拿这块开干）

### 3.1 目标
玩家能用键鼠 / 触摸完成 **手动选牌 → 出牌 → 看到分数 → 完成项目 → 进入下一关** 的可视化循环。

### 3.2 关键文件（建议新增）
- `scripts/core/GameState.gd` — autoload 单例：当前节点 / 当前关 / 当前牌库 / 当前手牌 / 累计分数
- `scripts/core/RunSeed.gd` — roguelike 随机源（用 `RandomNumberGenerator` 包一层带 seed）
- `scenes/battle/Battle.tscn` + `scripts/ui/BattleController.gd` — 战斗场景主控
- `scenes/ui/CardView.tscn` + `scripts/ui/CardView.gd` — 单张卡的可视化组件（drag select）
- `scenes/ui/HandView.tscn` + `scripts/ui/HandView.gd` — 手牌容器（横排扇形）
- `scenes/map/Map.tscn` + `scripts/ui/MapController.gd` — 7 节点 × 3 关的线性地图
- `data/balance/score_curve.tres` — 7 节点分数门槛配置 Resource

### 3.3 接口约定
- `GameState.start_run(seed: int)` — 初始化牌库 / 重置进度
- `GameState.start_battle(node_idx: int, sub_idx: int)` — 进入某关
- `GameState.play_hand(picked: Array[EmployeeCard]) -> ScoreEngine.ScoreBreakdown` — 出牌并结算
- `GameState.discard(picked: Array[EmployeeCard])` — 弃牌
- 信号：`signal battle_won`, `signal battle_lost`, `signal score_updated(total: int)`

### 3.4 验收
- 从 A 轮第 1 关开始，能手动选牌出牌走到 IPO 第 1 关（道具与 Boss 在 M4/M5 接入前用最弱占位）
- 牌型识别 ≤ 3 秒 / 出牌动画 ≤ 8 秒（用 Godot profiler 测）
- 单测仍 21/21 通过

### 3.5 容易踩的坑
- **Resource 引用**：在 .tres 里改 enum 字段后，`load()` 老资源可能 enum 名字漂移。改 enum 前先全局 grep
- **手牌排序**：Balatro 默认按 rank/suit 排，玩家可以拖拽。M2 先按 rank 升序自动排
- **drag selection 手感**：选中卡片要"浮起" 20–30 px + 染色，Balatro 这块手感是核心爽感来源
- **Resource autoload**：GameState 作为 autoload 时不能用 `class_name`，用 `Engine.get_main_loop().get_root().get_node("GameState")` 或 `/root/GameState`

---

## 4. M3 任务详解

### 4.1 目标
完整商店循环：完成项目 → 拿钱 → 进商店 → 雇人 / 解雇 / 卡包 / 刷新 → 进下一关。

### 4.2 关键交付
- `scripts/core/Economy.gd` — 融资计算：基础 ¥4 + 剩余出牌 ¥1/次 + 利息（¥5/¥5 持有，上限 ¥5）
- `scripts/shop/Shop.gd` — 商店结构：2 员工 + 1 道具占位 + 2 卡包
- `scripts/shop/Pack.gd` — 猎头包 / OD 包 / 咨询样品包（道具在 M4 之前用占位）
- `scenes/shop/Shop.tscn` — 商店 UI（员工大头照 + 价格 + 雇佣按钮）
- 雇佣价格曲线：普通 ¥3 / 稀有 ¥5 / 史诗 ¥7 / 传奇 ¥10
- 刷新：¥5 起，每次 +¥1（节点内累计，节点切换重置）

### 4.3 验收
- 从 A 轮通关后能正确拿 ¥，进商店能买员工进牌库，下一关能抽到新卡
- 解雇员工扣 ¥3 遣散费，牌库精确移除该卡

---

## 5. M4 任务详解（最重要的一关）

### 5.1 目标
4 类永久道具进入 ScoreEngine。**这是平衡命脉**，决定中后期数值是否崩。

### 5.2 通道严格分离（再次强调）
```
final = (card_chips + base_chips + sum_of_IT_+chips)
        × (base_mult + sum_of_office_+mult)
        × product_of_consulting_xMults
        ⇒ 然后 CEO 特质 rule 重写（可能改 base / 多触发等）
```

### 5.3 关键新增
- `scripts/items/Modifier.gd` — 修饰器基类 + enum Channel { CHIPS, MULT, XMULT, REWRITE }
- `scripts/items/ConsultingPack.gd` — 8 个咨询服务（xMult 通道）
- `scripts/items/ITSystem.gd` — 8 个 IT 系统（+chips 通道）
- `scripts/items/OfficePerk.gd` — 8 个办公室/福利（+mult 通道）
- `scripts/items/CEOTrait.gd` — 6 个 CEO 特质（rewrite 通道）
- `scripts/core/ModifierStack.gd` — 持有当前 run 所有道具，提供给 ScoreEngine
- `ScoreEngine.score(match_result, modifier_stack)` 接入

### 5.4 验收
- 自动化平衡测试脚本 `scripts/tools/sim_run.gd`：跑 1000 局，按平庸/强/弱 build 三档统计通关率，曲线为 A 轮 95% → 世界巨头 5–10%
- 单测覆盖 4 通道独立 & 组合场景（≥ 12 个新测试）
- 单手内 xMult 堆叠 ≤ ×10（pre 触发器）

---

## 6. M5–M8 概览

### M5 — Boss + 事件
- 7 Boss CEO，每个 2–3 种 debuff 模式（**非对称：Boss 不参与计分，只施压**）
- Boss 在回合开始 telegraph 自己出的牌型 → 对应商业事件 debuff
- 20+ 商业事件分支（3 选 1）
- 胜后 M&A：从 Boss 已亮的 5 张卡选 1 张并购

### M6 — 元进度
- 传奇员工卡池（解锁后进入抽卡池）
- 难度阶梯（创业版 → 独角兽 → 龙头）
- 成就系统
- **mid-run save**（强制，1.5–3h 单局不能丢档）

### M7 — 美术音频打磨
- 65 张像素卡面（Aseprite 64×96，外包候选）
- 扁平商务 UI（Figma 设计稿 → Godot Theme）
- lo-fi 商务 BGM + 卡片翻转 / 算盘音效 + 暴击分数飞字
- 卡牌晋升仪式感动画

### M8 — 平衡封测
- `sim_run.gd` 跑 1000 局通关率统计
- 邀测 20 玩家，记录每个节点的"猝死率"
- Steam 页面 + Next Fest Demo

---

## 7. 多 Agent 并行建议

可以并行推进的工作流：

| Agent | 工作流 | 起点 |
|---|---|---|
| **UI agent** | M2 Battle 场景 + 卡片视图 | 当前可立刻开工 |
| **平衡 agent** | 写 `sim_run.gd` 模拟脚本，验证 M1 牌型数值 | 当前可立刻开工 |
| **内容 agent** | 列 20 个商业事件 文案 + 设计 8 个 CEO 特质规则文档 | 当前可立刻开工 |
| **美术 agent** | 65 张像素卡面设计稿 / Figma UI 主题 | 与 UI agent 协调 |
| **Boss agent** | 8 个 Boss CEO 行为表 + debuff 系统设计 | M2 完成后 |

每个 agent 提交前必须跑通**§ 0.4 提交前检查清单**。

---

## 8. 风险登记

| 风险 | 阶段 | 对策 |
|---|---|---|
| Godot 4.6 重大 API 变动 | 全程 | 锁定 4.6.x，重大版本前先 sandbox 验证 |
| 倍率膨胀崩盘 | M4 起 | 4 通道分离 + M8 模拟脚本兜底 |
| 1.5–3h 单局劝退 | M6 | mid-run save 强制必做 |
| 多 agent 改同文件冲突 | 全程 | 遵守 § 0.2 所有权矩阵 + 单测必跑 |
| .tres 文件 ext_resource id 飘 | 全程 | 提交前 `git diff` 检查 |

---

## 9. 联系入口

- 设计文档：`~/.claude/plans/frank-s-advanture-godot-proud-sundae.md`
- 本路线图：`ROADMAP.md`（本文件）
- 跑测试：`godot --headless --script res://tests/test_main.gd`
- 跑 demo：`godot --headless --script res://scripts/tools/demo_battle.gd`

下一个接手的 agent，从 **§ 3 M2 任务详解** 开始。
