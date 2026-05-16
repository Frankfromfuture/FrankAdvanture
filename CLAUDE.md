# Frank's Adventure — Agent 入口

> 你是一个被请来推进这个项目的 agent。本文件 30 秒带你上手，剩下的细节去 `ROADMAP.md`。

## 这是什么

**Frank's Adventure** 是一款 2.5D 公司组织战斗 Roguelike Deckbuilder（Balatro-like，公司化皮肤）：
- 玩家扮演 CEO Frank，**员工 = 卡牌**（部门=花色 × 职级=点数 × 个性标签 × 稀有度 × 经验值）
- 出 1–5 张卡组成"原创公司化牌型"（项目小组 / 跨部门协同 / 铁三角 / 创始团队 …）
- 靠 **执行力(chips) × 组织能力(mult)** 击穿项目分数门槛
- 主路径：A 轮 → B 轮 → C 轮 → IPO → 千亿市值 → 500 强 → 世界巨头
- 4 类永久道具（咨询包 / IT 系统 / 办公室 / CEO 特质）按 4 数学通道严格分离，杜绝倍率膨胀
- Boss = 同行 CEO 非对称施压（telegraph 牌型 → 商业事件 debuff），胜后 M&A 一张其核心员工

## 引擎与栈

- **Godot 4.6+**（GDScript 为主）
- 美术：扁平商务 UI + 像素卡面（Aseprite，64×96）
- 测试：headless GDScript runner

## 必跑命令

```bash
godot --headless --import                              # 同步 class_name 注册
godot --headless --script res://tests/test_main.gd     # 全部单测（应 21/21 通过）
godot --headless --script res://scripts/tools/demo_battle.gd  # CLI 战斗 demo
```

## 当前进度

- ✅ **M1 已完成**：核心战斗逻辑层（卡牌模型 / 12 牌型识别器 / 4 通道分数引擎 / CLI demo / 21 单测）
- ⬜ **M2 待开**：可视化 Battle 场景 + 卡片 drag-select + Map 视图（**下一个 agent 的起点**）
- ⬜ M3–M8：经济 / 道具 / Boss / 元进度 / 美术 / 平衡

## 你必须读的文档（按重要性排序）

1. **`ROADMAP.md`** — 文件所有权矩阵、提交前检查清单、M2–M8 详细任务接口、并行工作流建议
2. **设计原档**：`~/.claude/plans/frank-s-advanture-godot-proud-sundae.md`（不在仓库内，本地路径；如不可访问，则 ROADMAP.md 已涵盖核心设计）

## 协作铁律（不要踩雷）

1. **改 `scripts/hands/` 或 `scripts/scoring/` 必须补单测** — 平衡命脉所在
2. **改 `EmployeeCard` 字段必须同步更新 `data/employees/*.tres` 与 `CardFactory`**
3. **提交前必跑 import + 单测**，单测不绿不准合
4. **不要破坏 4 数学通道分离**：chips / mult / xMult / rewrite 各管各的，禁止 mult 系统给 chips 加分这种横向串联
5. **文件所有权矩阵在 `ROADMAP.md § 0.2`**，跨域改动前先看一眼

## 起手三选一

- 想做 UI / 战斗场景 → `ROADMAP.md § 3 M2`
- 想做平衡 / 模拟 → 写 `scripts/tools/sim_run.gd` 跑 1000 局通关率统计
- 想做内容 / 文案 → 列 20 商业事件 + 8 CEO 特质规则文档

读完上面，去开工。

— 上一任 agent（Claude，M1 完成时间：2026-05-16）
