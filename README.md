# Frank's Adventure

> 网页端「商业经营 Roguelike 卡牌」—— 玩家扮演刚上任 CEO 的 Frank，用员工 / 功能 / 服务三类卡组合「打出商业行动」，沿 **A 轮 → B 轮 → C 轮 → IPO → 百亿 → 千亿 → 500 强 → 国际巨头 → 行业第一** 闯关。

[![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Phaser%204%20%2B%20Vite-61dafb)]()
[![Status](https://img.shields.io/badge/status-M1%20delivered%20%2F%20M2%20WIP-orange)]()
[![Style](https://img.shields.io/badge/style-Pixel%20%2B%202.5D-7c3aed)]()

---

## ✨ 项目特色

- **像素 + 2.5D 透视** —— Balatro 风格的厚阴影、斜视桌面、扇形手牌
- **Fusion Pixel 12px 中文字体** —— TakWolf/fusion-pixel-font，CJK 全覆盖
- **像素斜角边框** —— `clip-path` 切外角 + `::before` 背景渐变绘制内角斜线
- **Roguelike 牌组构筑** —— 每关随机事件 / 招聘市场 / 商店升级
- **三资源轴**：💴 现金 ¥ · ⚡ 管理力 AP · 💰 战略预算

---

## 🚀 快速开始

```bash
cd web-battle
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # 生产构建
npm run test         # Vitest 单元测试（engine.test.js）
```

需要 **Node 18+**。

---

## 🛠 技术栈

| 层 | 选型 |
|---|---|
| UI 框架 | React 19（JSX，M2 接入 TypeScript）|
| 渲染 | DOM + CSS（卡面 / HUD）+ Phaser 4（VFX / 粒子）|
| 构建 | Vite 7 |
| 测试 | Vitest 4 |
| 字体 | Fusion Pixel 12px Monospaced（中文 zh_hans + 拉丁）|
| 图标 | lucide-react（HUD 部分图标）|

---

## 📁 仓库结构

```
.
├── README.md                          ← 本文件
├── AGENTS.md                          ← Agent 入口（30 秒上手）
├── GAME_DESIGN_FOUNDATION.md          ← 核心规则基石（§A 锁定 / §B 待填）
├── CARDS_DESIGN.md                    ← 卡表 / 起始牌组 / 平衡公式
├── BATTLEFIELD_DESIGN.md              ← 战斗界面布局 / 动效 / 文件骨架
└── web-battle/
    ├── src/
    │   ├── App.jsx                    ← 主战斗界面
    │   ├── styles.css                 ← 全部 CSS（像素 + 2.5D）
    │   ├── DaylightBoardroomBg.jsx    ← 像素背景
    │   └── game/
    │       ├── cards.js               ← 起始牌组 / 招聘池
    │       ├── engine.js              ← 战斗引擎（AP / 抽牌 / 结算）
    │       └── engine.test.js         ← 引擎单测
    └── public/assets/
        ├── fonts/                     ← Fusion Pixel woff2
        └── ui-icons/                  ← 像素 UI 图标
```

---

## 🎮 核心规则速览

> 详尽规则见 [`GAME_DESIGN_FOUNDATION.md`](./GAME_DESIGN_FOUNDATION.md)。

### 时间结构

```
1 局 = 1 个月（核心游戏循环）
1 关 = 6 局（半年）
全游戏 = 10 关 = 60 局
```

### 资源轴

| 资源 | 符号 | 性质 | 跨局保留 |
|---|---|---|---|
| 现金 | 💴 ¥ | 关卡通关条件 + 维持费 | 关卡末清零 |
| 管理力 | ⚡ AP | 每月布置产线的硬约束 | **未使用 AP 的一半进入下回合** |
| 战略预算 | 💰 | 购卡 / 商店专用 | 关卡末按评级发放 |

### 产线

- **2 条产线 × 5 格单行**，强制轮转布置
- 位置加成：P1 启动位 +20% · P3 中枢位（左右邻 +20%）· P5 收割位（贡献 ≥60% × 1.5）
- 邻接 buff：卡自身效果（→ 右邻 / ← 左邻 / ↔ 双向） + 同部门 +20%

### 牌组 & 每月流程

- 起始牌组 **25 张**（10 张起始手牌 + 15 张牌堆）
- 每月抽 5 张，**手牌上限 10 张**
- **起始 AP 5 点**，未使用部分一半进入下月
- 流程：月报 → 事件 → 招聘市场 → 抽牌 → **产线布置（核心决策）** → 激活结算 → 月末

### 卡牌三类

| 类型 | 部门 | 用法 |
|---|---|---|
| 员工卡 | R 研发 / S 销售 / O 运营 | 放产线槽位产出 ¥ |
| 服务卡 | 顶级 / 标准 / 基础 | 一次性 buff 或 AP/手牌操作 |
| 功能卡 | 全局 | 修改规则（如 +AP 上限、+1 抽牌）|

---

## 🎨 视觉规范

- **配色**：研发蓝 #2563eb / 销售红 #b91c1c / 运营绿 #15803d / 管理橙 #fb923c
- **稀有度色**：普通 #94a3b8 / 稀有 #60a5fa / 精英 #c084fc / 史诗 #fb923c / 传奇 #ffc857
- **边框**：4px 实线 + 7px 像素斜切角 + 内角 45° 斜线三角形
- **阴影**：`filter: drop-shadow()` 替代 box-shadow（兼容 `clip-path`）

---

## 🗺 路线图

| 里程碑 | 状态 | 内容 |
|---|---|---|
| **M1 (v3.0)** | ✅ | AP 引擎 / 起手属性 / ±20% 随机 / 像素 + 2.5D 视觉 |
| M2 | 🟡 进行中 | 12 周状态机 / 7 季度事件 / localStorage 存档 / 保留 1 张 UI |
| M3 | ⬜ | 大关推进 / 三选一奖励 / 牌库编辑 |
| M4 | ⬜ | Boss 战 / 商店系统 |
| M5 | ⬜ | 数值平衡 / Phaser VFX / 音效 / Vercel 部署 |

---

## 🤝 开发约定

| 路径 | 必跑 |
|---|---|
| `web-battle/src/game/` | `npm run test` |
| `web-battle/src/*.jsx` | `npm run build`（无 TS 检查则跑一次）|
| `*.md` 设计文档 | 单文档自洽，跨文档冲突以 `GAME_DESIGN_FOUNDATION.md` 为准 |

提交信息使用简体中文 + 短描述，例如：
```
手牌上限 10 / 起始 AP 5 / 未用 AP 一半转下回合
```

---

## 📜 License

私有项目，暂未公开授权。

---

## 🙏 致谢

- [TakWolf/fusion-pixel-font](https://github.com/TakWolf/fusion-pixel-font) — Fusion Pixel 中文像素字体
- [Phaser](https://phaser.io/) / [Vite](https://vitejs.dev/) / [React](https://react.dev/)
- 设计灵感：Slay the Spire · Balatro · 炉石传说
