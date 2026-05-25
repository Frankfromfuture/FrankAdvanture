# 牌组设计文档 · 全卡表 + 装备化词条 + 创始人 + 商业模式

> **配套文档**：[GAME_DESIGN_FOUNDATION.md](./GAME_DESIGN_FOUNDATION.md)
> **版本**：v3.3 → **v4 重构进行中**（详见 [设计评审计划](~/.claude/plans/delightful-chasing-castle.md)）
> **v4 PR1 已落地**（不影响本文档卡表内容）：估值/CCR/失败状态重构。
> **v4 PR2 待实施**（将大幅重写本文档）：员工卡新 schema（专员裸卡 / 经理起加部门 L1 主轴 + 随机功能池按稀有度抽 N 个 lv1-4 功能）；流派质变阈值 (2/3/4/5 张同部门触发不同 buff)；禁用"永久 X" 类效果。届时本文档 §5-§9 员工卡定义会大改。
> **当前状态**：80 张卡 + 3 创始人 + 37 商业模式 + 5 董事访谈事件已实装并经 `engine.test.js` 验证（17 用例全绿）。

> **v3.3 更新（2026-05-24）**：
> - 新增 §3.5 RARITY_TABLE 完整参数；
> - 新增 §11.0 创始人卡专章（3 张 EPIC 创始人）；
> - 新增 §14 完整传奇卡列表（10 张，对应代码 LEG_* / SRV_LEG_* / FUN_LEG_*）；
> - 新增 §15 商业模式 (Business Models, 37 张)；
> - 新增 §16 升职 / 解雇 / 卡包定价；
> - 新增 §17 董事访谈事件 (BOARD_EVENTS, 5 张)。

---

## §1 使用说明

### 1.1 文档结构

- **§2 设计原则**
- **§3 数值波动与稀有度系统**：核心规则
- **§4 词条库**：精英/史诗专属
- **§5-§9 卡牌主数据库**：每张卡 YAML block，**数据权威源**
- **§10 速查表**：Markdown 表格视图（**非权威**）
- **§11 起始牌组配置**：关卡 1 精算配置
- **§12 招聘与商店规则**
- **§13 数值平衡原则**

修改 YAML 后，速查表需手动同步。

### 1.2 ID 命名规则

```
EMP_R_NN  研发部员工
EMP_S_NN  销售部员工
EMP_O_NN  运营部员工
FUN_NN    功能卡
SRV_NN    服务卡
LEG_NN    传奇卡（仅商店）
AFF_S_NN  小词条
AFF_L_NN  大词条
```

ID 永久不变。

### 1.3 数值表达规范

所有数值使用"中位数 + 波动率"表达：

```yaml
base_output: "20 ±10%"   # 中位数 20，开出时在 18-22 间随机
cost: "5 ±10%"           # 一次性现金价格波动
```

中位数是设计师可调的锚点值，波动率由稀有度决定。

### 1.4 v3.2 关键变化（与 v0.3 对比）

| 字段 | v0.3 | v3.2 |
|---|---|---|
| 货币 | 全部用 💰 战略预算 | **全部用 ¥ 现金，解耦留存利润，取消 💰** |
| 月度维持费 | 扣除 ¥ 维持费 | **取消固定维持费，改用卡牌内生 Base/Extra Burn 机制** |
| 招聘渠道 | 月度招聘市场 + 关卡末商店 | **取消月度招聘市场，招聘完全转入跨阶段董事会会议** |
| 商业模式 | 💰 购买，无月费 | **¥ 签约订阅，每月扣减对应的订阅月费，可在董事会免费退订** |

---

## §2 设计原则

### 2.1 装备化卡牌（核心创新）

**每张卡每次开出时数值随机波动**。同名卡每次不同，每张卡都是"具体的人"。

- 主题：现实招到的不是抽象岗位，是具体的张三李四
- 心理：每次招聘有"刷装备"的期待
- 平衡：低稀有度的卡如果 roll 出高数值，依然有竞争力

### 2.2 四稀有度阶梯

| 稀有度 | 中文 | 数值波动 | 词条 | 入池阶段 |
|---|---|---|---|---|
| common | 普通 | ±10% | 无 | 1+ |
| rare | 稀有 | ±15% | 无 | 2+ |
| elite | 精英 | ±20% | 30% 触发 1 个小词条 | 4+ |
| epic | 史诗 | ±25% | 必定 1 大词条 + 30% 额外小词条 | 6+ |

### 2.3 货币体系（v3.2 提取解耦版）

```
¥ 现金 (Cash)
  ├─ 来源：跨阶段董事会提取自留存利润 + 新阶段 Entry Grant 投资人注资
  ├─ 用于：董事会会议中的所有消费（招聘卡牌、升职、解雇、订阅商业模式等）
  └─ 唯一可花存量

留存利润 (Retained Earnings)
  ├─ 来源：每月结算时的公司净利润 (income - burn) 自动累积
  └─ 作用：在跨阶段董事会中，通过财务部选择比例 (0% / 30% / 60% / 100%) 提取为可花现金

估值 V (Valuation)
  ├─ 计算公式：V = PE 估值 (3 月均利润 × 20) + 资产估值 (卡牌资产 + BM 资产折半) + 现金溢价 (cash × 0.3)
  └─ 作用：升阶的唯一衡量指标
```

没有独立的 wage 字段，但卡牌具有内生的 Burn 属性：
- **卡牌 Base Burn**：在牌库中即按月扣减。
- **卡牌 Extra Burn**：新部署上线的卡牌在上线当月需要额外支付。
- **商业模式月费**：每月需支付固定的订阅月费。

---

## §3 数值波动与稀有度系统

### 3.1 波动算法

```
实际值 = round( 中位数 × (1 + 均匀随机[-波动率, +波动率]) )

最小不低于 1（避免出现 0 或负数）
百分比效果同样波动
```

### 3.2 数值确定时机

每张卡的**实际数值在以下时机确定**：

1. **起始牌组**：开局时为每张卡 roll 一次，整局固定
2. **董事会商店刷新**：刷新时 roll，玩家购买后保持该数值
3. **商店购买前**：购买前显示完整数值，玩家决定要不要

**关键**：卡的数值**一旦 roll 出就不再变化**。玩家可以"刷装备"心态对比新旧卡。

### 3.3 词条触发规则

- **common / rare**：100% 无词条
- **elite**：70% 无词条 / 30% 有 1 个小词条
- **epic**：100% 至少 1 个大词条 / 30% 额外 1 个小词条

词条**从所属池子均匀随机**，开卡时与数值同时 roll。

### 3.5 RARITY_TABLE 完整参数

每张卡 / BM 的 Burn 与资产值由稀有度统一决定（卡牌可在模板里 override）：

| 稀有度 | Base Burn | Extra Burn | 卡牌资产值 | BM 月费 | BM 资产值 | Draw 权重 |
|---|---|---|---|---|---|---|
| common  | 1 | 0 | 5   | 2  | 8   | 100 |
| rare    | 2 | 1 | 15  | 4  | 25  | 40  |
| elite   | 3 | 1 | 30  | 6  | 50  | 12  |
| epic    | 4 | 2 | 50  | 8  | 80  | 4   |
| legendary | 7 | 4 | 150 | 14 | 240 | 1   |

> Draw 权重见 `DEFAULT_DRAW_WEIGHTS`，用于洗牌池中按稀有度随机偏向 common。
> 资产值进入估值时再 ×0.5（见 GAME_DESIGN_FOUNDATION §A.6）。

### 3.4 显示规范

招聘市场和手牌显示示例：

```
┌─────────────────────────┐
│   研发专员 [普通]        │
│   AP: 1  价格¥: 5      │
│   基础产出: ¥22         │
│   → 右邻 +11%           │
└─────────────────────────┘

┌─────────────────────────┐
│  ★技术 VP★ [史诗]       │
│   AP: 5  价格¥: 35     │
│   基础产出: ¥145        │
│   全线研发 +28%          │
│   → 右邻 +35%           │
│   【大词条·流派反转】     │
│   【小词条·完美主义】     │
└─────────────────────────┘
```

稀有度用颜色边框区分：
- common 灰
- rare 蓝
- elite 紫
- epic 橙

---

## §4 词条库

### 4.1 小词条池（AFF_S_*）

```yaml
- id: AFF_S_01
  name: 加班狂
  effect:
    - "BASE_OUTPUT: +30%"
  flavor: "996 是福报"

- id: AFF_S_02
  name: 性价比
  effect:
    - "COST: -40%"
  flavor: "招到宝了"

- id: AFF_S_03
  name: 资深
  effect:
    - "COST: +50%"
    - "BASE_OUTPUT: +25%"
  flavor: "经验是有价的"

- id: AFF_S_04
  name: 新锐
  effect:
    - "COST: -30%"
    - "BASE_OUTPUT: -10%"
  flavor: "年轻有冲劲"

- id: AFF_S_05
  name: 团魂
  effect:
    - "SAME_DEPT_ADJ_EXTRA: +10%"
  flavor: "同事爱看到他"

- id: AFF_S_06
  name: 桥梁
  effect:
    - "DIFF_DEPT_ADJ_EXTRA: +15%"
  flavor: "三个部门都能聊几句"

- id: AFF_S_07
  name: 完美主义
  effect:
    - "SELF_IF_P3: +25%"
  flavor: "中枢位置发挥最好"

- id: AFF_S_08
  name: 收割者
  effect:
    - "SELF_IF_P5: +30%"
  flavor: "压轴时刻才出场"

- id: AFF_S_09
  name: 启动者
  effect:
    - "SELF_IF_P1: +25%"
  flavor: "开局必须给我"

- id: AFF_S_10
  name: 学霸
  effect:
    - "SELF_IF_ADJ_FUN: +20%"
  flavor: "靠工具放大能力"

- id: AFF_S_11
  name: 老员工
  effect:
    - "COOLDOWN: -1 month"
  flavor: "不需要那么长假"

- id: AFF_S_12
  name: 拼命三郎
  effect:
    - "BASE_OUTPUT: +40%"
    - "COOLDOWN: +1 month"
  flavor: "爆肝完得修养更久"
```

### 4.2 大词条池（AFF_L_*）

```yaml
- id: AFF_L_01
  name: 流派反转
  effect:
    - "REVERSE_DIRECTION"   # 左↔右效果对调
  flavor: "他做事和别人方向不一样"

- id: AFF_L_02
  name: 双倍工作
  effect:
    - "NO_COOLDOWN"
  flavor: "周末他也在公司"

- id: AFF_L_03
  name: 估值制造机
  effect:
    - "SELF_OUTPUT_STAR_RATE: x2"
  flavor: "他签的合同投资人最喜欢"

- id: AFF_L_04
  name: 现金奶牛
  effect:
    - "EACH_MONTH_ACTIVE: +¥10"
  flavor: "他自带客户"

- id: AFF_L_05
  name: 化学反应
  effect:
    - "SAME_DEPT_ADJ_EXTRA: +25%"
  flavor: "把整个部门带飞"

- id: AFF_L_06
  name: 老板宠儿
  effect:
    - "WHILE_ACTIVE: MONTH_AP +1"
  flavor: "老板眼里没有他不行"

- id: AFF_L_07
  name: 自学习
  effect:
    - "EACH_MONTH_ACTIVE: SELF_BASE_OUTPUT +5%"  # 本局内永久叠加
  flavor: "越用越值钱"

- id: AFF_L_08
  name: 大佬光环
  effect:
    - "LINE_ALL: +15%"
  flavor: "他在场，整条线都更卷"

- id: AFF_L_09
  name: 复制粘贴
  effect:
    - "IF_ADJ_SAME_DEPT: SELF: x1.5"
    - "IF_ADJ_SAME_DEPT: ADJ_SAME_DEPT: x1.5"
  flavor: "兄弟搭班子，效率翻倍"

- id: AFF_L_10
  name: 一颗螺丝钉
  effect:
    - "SAME_LINE_ALL: +12%"
  flavor: "默默推动整条线"

- id: AFF_L_11
  name: 跨界鬼才
  effect:
    - "IF_ALL_THREE_DEPT_IN_LINE: LINE_ALL: x1.5"
  flavor: "什么部门都能搞，多面手"

- id: AFF_L_12
  name: 估值担当
  effect:
    - "MONTH_STAR_RATE: +15%"
  flavor: "他的故事就是公司估值"
```

---

## §5 研发部员工卡（EMP_R_*）

> **部门标签**：`dept_R`  
> **设计原则**：右传 buff 流（→ 给右邻），契合"研发交付给下游"  
> **典型 build**：研发链 + P5 销售收割

```yaml
- id: EMP_R_01
  name: 研发专员
  type: emp
  dept: R
  tier: 专员
  rarity: common
  unlock_level: 1
  ap: 1
  cost: "5 ±10%"
  base_output: "20 ±10%"
  effects:
    - "RIGHT: +10% ±10%"
  flavor: "刚毕业的小伙子，加班贼狠"
  in_starter_deck: true
  in_recruit_pool: true

- id: EMP_R_02
  name: 研发经理
  type: emp
  dept: R
  tier: 经理
  rarity: common
  unlock_level: 1
  ap: 2
  cost: "11 ±10%"
  base_output: "45 ±10%"
  effects:
    - "RIGHT: +25% ±10%"
  flavor: "技术骨干升上来的，能写代码也能带人"
  in_starter_deck: true
  in_recruit_pool: true

- id: EMP_R_03
  name: 研发总监
  type: emp
  dept: R
  tier: 总监
  rarity: rare
  unlock_level: 2
  ap: 4
  cost: "22 ±15%"
  base_output: "85 ±15%"
  effects:
    - "RIGHT: +40% ±15%"
    - "SELF_IF_P1: +20%"
  flavor: "技术线最高决策者，路线图全靠他"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_R_04
  name: 算法专家
  type: emp
  dept: R
  tier: 专员
  rarity: rare
  unlock_level: 2
  ap: 2
  cost: "15 ±15%"
  base_output: "35 ±15%"
  effects:
    - "SELF_IF_RIGHT_FUN: x1.5"
    - "RIGHT: +15% ±15%"
  flavor: "懂数据、懂模型，但不太会说话"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_R_05
  name: 全栈工程师
  type: emp
  dept: R
  tier: 经理
  rarity: rare
  unlock_level: 2
  ap: 3
  cost: "17 ±15%"
  base_output: "55 ±15%"
  effects:
    - "BOTH: +15% ±15%"
  flavor: "一个人顶三个用，但跳槽风险大"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_R_06
  name: 架构师
  type: emp
  dept: R
  tier: 总监
  rarity: rare
  unlock_level: 3
  ap: 4
  cost: "25 ±15%"
  base_output: "75 ±15%"
  effects:
    - "SAME_DEPT_ADJ: +30%"
    - "RIGHT: +20% ±15%"
  flavor: "图画得比代码多，但你不能没有他"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_R_07
  name: 技术 VP
  type: emp
  dept: R
  tier: VP
  rarity: elite
  unlock_level: 4
  ap: 5
  cost: "35 ±20%"
  base_output: "120 ±20%"
  effects:
    - "LINE_ALL_R: +25%"
    - "RIGHT: +30% ±20%"
  flavor: "技术线副总裁，话不多但说话顶用"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_R_08
  name: 首席科学家
  type: emp
  dept: R
  tier: VP
  rarity: epic
  unlock_level: 6
  ap: 5
  cost: "45 ±25%"
  base_output: "140 ±25%"
  effects:
    - "SELF_IF_P3: BOTH: +40%"
    - "MONTH_STAR_RATE: +5%"
  flavor: "顶着 PhD 学位的明星，估值看脸的关键"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_R_09
  name: 极客实习生
  type: emp
  dept: R
  tier: 专员
  rarity: elite
  unlock_level: 4
  ap: 2
  cost: "10 ±20%"
  base_output: "38 ±20%"
  effects:
    - "RIGHT: +30% ±20%"
    - "TRIGGER: SELF_IF_LEFT_DEPT_R: SELF: x2"
  flavor: "成本极低产出极高，但容易被挖"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_FOUNDER_R
  name: 创始人 · 科学家
  type: emp
  dept: R
  tier: 创始人
  rarity: epic
  unlock_level: 1
  ap: 3
  cost: "15 ±10%"
  base_output: "66 ±10%"
  effects:
    - "FOUNDER_AI_RD"
  flavor: "“我们的目标是星辰大海与硬核科技！”——科学家出身的创始人，用代码与专利砸出行业未来。"
  in_starter_deck: false
  in_recruit_pool: false
```

---

## §6 销售部员工卡（EMP_S_*）

> **部门标签**：`dept_S`  
> **设计原则**：左拉 buff 流（← 给左邻）  
> **典型 build**：研发铺垫 + P5 销售收割

```yaml
- id: EMP_S_01
  name: 销售专员
  type: emp
  dept: S
  tier: 专员
  rarity: common
  unlock_level: 1
  ap: 1
  cost: "5 ±10%"
  base_output: "20 ±10%"
  effects:
    - "LEFT: +10% ±10%"
  flavor: "电话打到嗓子哑，提成是动力"
  in_starter_deck: true
  in_recruit_pool: true

- id: EMP_S_02
  name: 销售经理
  type: emp
  dept: S
  tier: 经理
  rarity: common
  unlock_level: 1
  ap: 2
  cost: "11 ±10%"
  base_output: "45 ±10%"
  effects:
    - "LEFT: +20% ±10%"
  flavor: "带一支小队，月度冠军常客"
  in_starter_deck: true
  in_recruit_pool: true

- id: EMP_S_03
  name: 销售总监
  type: emp
  dept: S
  tier: 总监
  rarity: rare
  unlock_level: 2
  ap: 4
  cost: "22 ±15%"
  base_output: "85 ±15%"
  effects:
    - "LEFT: +35% ±15%"
    - "SELF_IF_P5: x1.5"
  flavor: "客户全在他手机里，公司离不开他"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_S_04
  name: 大客户经理
  type: emp
  dept: S
  tier: 经理
  rarity: rare
  unlock_level: 2
  ap: 3
  cost: "17 ±15%"
  base_output: "55 ±15%"
  effects:
    - "LEFT: +15% ±15%"
    - "SELF_IF_LEFT_DEPT_R: x1.4"
  flavor: "专啃硬骨头，订单一签就是几百万"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_S_05
  name: BD 专员
  type: emp
  dept: S
  tier: 专员
  rarity: rare
  unlock_level: 2
  ap: 2
  cost: "13 ±15%"
  base_output: "30 ±15%"
  effects:
    - "LEFT: +12% ±15%"
    - "MONTH_BONUS: +¥3"
  flavor: "BD 全靠人脉，吃饭喝酒签合作"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_S_06
  name: 电商运营
  type: emp
  dept: S
  tier: 经理
  rarity: rare
  unlock_level: 3
  ap: 3
  cost: "18 ±15%"
  base_output: "50 ±15%"
  effects:
    - "BOTH: +12% ±15%"
    - "TRIGGER: SELF_IF_LINE_HAS_FUN: x1.3"
  flavor: "GMV 主义者，永远在 ABtest"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_S_07
  name: 销售 VP
  type: emp
  dept: S
  tier: VP
  rarity: elite
  unlock_level: 4
  ap: 5
  cost: "35 ±20%"
  base_output: "120 ±20%"
  effects:
    - "LINE_ALL_S: +25%"
    - "LEFT: +30% ±20%"
  flavor: "销售一把手，KPI 拍板靠他"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_S_08
  name: 销售之神
  type: emp
  dept: S
  tier: VP
  rarity: epic
  unlock_level: 6
  ap: 5
  cost: "45 ±25%"
  base_output: "140 ±25%"
  effects:
    - "SELF_IF_P5: SELF: x2.5"
    - "LEFT: +30% ±25%"
  flavor: "传说级销售，开口就是大单"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_S_09
  name: 客户成功
  type: emp
  dept: S
  tier: 经理
  rarity: rare
  unlock_level: 3
  ap: 3
  cost: "17 ±15%"
  base_output: "50 ±15%"
  effects:
    - "LEFT: +18% ±15%"
    - "SAME_DEPT_ADJ: +¥2"
  flavor: "续约率王者，老客户都认他"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_FOUNDER_S
  name: 创始人 · 销售冠军
  type: emp
  dept: S
  tier: 创始人
  rarity: epic
  unlock_level: 1
  ap: 3
  cost: "15 ±10%"
  base_output: "66 ±10%"
  effects:
    - "FOUNDER_SALES_HIGH"
  flavor: "“把这个 PPT 吹上天，今晚就签单！”——销冠出身 of 创始人，拥有把空气卖出高价 of 超级话术。"
  in_starter_deck: false
  in_recruit_pool: false
```

---

## §7 运营部员工卡（EMP_O_*）

> **部门标签**：`dept_O`  
> **设计原则**：辅助赋能流（双向 / 资源型）  
> **典型 build**：跨部门粘合 + 资源产出（¥）

```yaml
- id: EMP_O_01
  name: 运营专员
  type: emp
  dept: O
  tier: 专员
  rarity: common
  unlock_level: 1
  ap: 1
  cost: "5 ±10%"
  base_output: "22 ±10%"
  effects:
    - "SAME_DEPT_ADJ: +¥1"
  flavor: "Excel 大师，表格能开花"
  in_starter_deck: true
  in_recruit_pool: true

- id: EMP_O_02
  name: 运营经理
  type: emp
  dept: O
  tier: 经理
  rarity: common
  unlock_level: 1
  ap: 2
  cost: "11 ±10%"
  base_output: "48 ±10%"
  effects:
    - "SAME_DEPT_ADJ: +¥2"
    - "BOTH: +10% ±10%"
  flavor: "流程优化狂魔，省钱的能手"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_O_03
  name: 运营总监
  type: emp
  dept: O
  tier: 总监
  rarity: rare
  unlock_level: 2
  ap: 4
  cost: "22 ±15%"
  base_output: "85 ±15%"
  effects:
    - "SAME_DEPT_ADJ: +¥3"
    - "SELF_IF_P3: BOTH: +25%"
  flavor: "公司大管家，老板甩手掌柜全靠他"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_O_04
  name: HR 经理
  type: emp
  dept: O
  tier: 经理
  rarity: rare
  unlock_level: 2
  ap: 3
  cost: "16 ±15%"
  base_output: "45 ±15%"
  effects:
    - "LINE_ALL: +8% ±15%"
    - "MONTH_BONUS: +¥2"
  flavor: "招聘留人都是他，但绩效面谈让人怕"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_O_05
  name: 财务经理
  type: emp
  dept: O
  tier: 经理
  rarity: rare
  unlock_level: 2
  ap: 3
  cost: "18 ±15%"
  base_output: "40 ±15%"
  effects:
    - "MONTH_BONUS: +¥5"
    - "BOTH: +8% ±15%"
  flavor: "管钱袋子的人，老板真正的朋友"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_O_06
  name: 项目经理 PM
  type: emp
  dept: O
  tier: 经理
  rarity: rare
  unlock_level: 3
  ap: 3
  cost: "17 ±15%"
  base_output: "50 ±15%"
  effects:
    - "BOTH: +20% ±15%"
    - "TRIGGER: SELF_IF_LEFT_DEPT_R_AND_RIGHT_DEPT_S: SELF: x1.5"
  flavor: "甘特图战神，跨部门翻译机"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_O_07
  name: 运营 VP / COO
  type: emp
  dept: O
  tier: VP
  rarity: elite
  unlock_level: 4
  ap: 5
  cost: "38 ±20%"
  base_output: "115 ±20%"
  effects:
    - "LINE_ALL: +15%"
    - "MONTH_BONUS: +¥10"
  flavor: "首席运营官，公司日常运转的中枢"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_O_08
  name: 行政总管
  type: emp
  dept: O
  tier: 总监
  rarity: rare
  unlock_level: 3
  ap: 4
  cost: "20 ±15%"
  base_output: "70 ±15%"
  effects:
    - "MONTH_NO_MAINTAIN"
    - "BOTH: +10% ±15%"
  flavor: "省下的就是赚到的"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_O_09
  name: 数据分析师
  type: emp
  dept: O
  tier: 专员
  rarity: rare
  unlock_level: 2
  ap: 2
  cost: "13 ±15%"
  base_output: "32 ±15%"
  effects:
    - "BOTH: +18% ±15%"
    - "TRIGGER: SELF_IF_ADJ_FUN: SELF: x1.4"
  flavor: "SQL 写得比情书还多，数字驱动决策"
  in_starter_deck: false
  in_recruit_pool: true

- id: EMP_FOUNDER_O
  name: 创始人 · 大厂 CXO
  type: emp
  dept: O
  tier: 创始人
  rarity: epic
  unlock_level: 1
  ap: 3
  cost: "15 ±10%"
  base_output: "66 ±10%"
  effects:
    - "FOUNDER_LEAN_MANAGEMENT"
  flavor: "“先对齐一下底层逻辑，打通闭环！”——大厂高管出身 of 创始人，用降本增效和组织架构横扫商海。"
  in_starter_deck: false
  in_recruit_pool: false
```

---

## §8 功能卡（FUN_*）

> **设计原则**：占用产线格位、不产出基础 ¥，但提供强力 buff 或转化效果

```yaml
- id: FUN_01
  name: 市场调研
  type: fun
  dept: NONE
  tier: 功能
  rarity: common
  unlock_level: 1
  ap: 2
  cost: "7 ±10%"
  base_output: 0
  effects:
    - "BOTH: +25% ±10%"
  flavor: "了解客户才能搞定客户"
  in_starter_deck: true
  in_recruit_pool: true

- id: FUN_02
  name: 产品冲刺
  type: fun
  dept: NONE
  tier: 功能
  rarity: common
  unlock_level: 1
  ap: 3
  cost: "9 ±10%"
  base_output: 0
  effects:
    - "ADJ_R: x2 ±10%"
  flavor: "全部门拼一把，发版日就是验货日"
  in_starter_deck: true
  in_recruit_pool: true

- id: FUN_03
  name: 团队建设
  type: fun
  dept: NONE
  tier: 功能
  rarity: common
  unlock_level: 1
  ap: 2
  cost: "8 ±10%"
  base_output: 0
  effects:
    - "LINE_ALL: +¥15 ±10%"
  flavor: "团建不是吃饭，是凝聚力投资"
  in_starter_deck: true
  in_recruit_pool: true

- id: FUN_04
  name: 产品推广
  type: fun
  dept: NONE
  tier: 功能
  rarity: common
  unlock_level: 1
  ap: 3
  cost: "9 ±10%"
  base_output: 0
  effects:
    - "ADJ_S: x2 ±10%"
  flavor: "酒香也怕巷子深，推广要趁早"
  in_starter_deck: true
  in_recruit_pool: true

- id: FUN_05
  name: 数据分析
  type: fun
  dept: NONE
  tier: 功能
  rarity: common
  unlock_level: 2
  ap: 2
  cost: "7 ±10%"
  base_output: 0
  effects:
    - "LEFT: +30% ±10%"
  flavor: "用数据说话，向上汇报必备"
  in_starter_deck: false
  in_recruit_pool: true

- id: FUN_06
  name: 流程优化
  type: fun
  dept: NONE
  tier: 功能
  rarity: common
  unlock_level: 2
  ap: 2
  cost: "7 ±10%"
  base_output: 0
  effects:
    - "RIGHT: +30% ±10%"
  flavor: "把繁琐变简单，把简单变高效"
  in_starter_deck: false
  in_recruit_pool: true

- id: FUN_07
  name: 跨部门协作
  type: fun
  dept: NONE
  tier: 功能
  rarity: rare
  unlock_level: 3
  ap: 3
  cost: "13 ±15%"
  base_output: 0
  effects:
    - "TRIGGER: LEFT_DEPT != RIGHT_DEPT: BOTH: +40% ±15%"
  flavor: "墙太厚要敲掉，孤岛太多要修桥"
  in_starter_deck: false
  in_recruit_pool: true

- id: FUN_08
  name: OKR 制定
  type: fun
  dept: NONE
  tier: 功能
  rarity: rare
  unlock_level: 3
  ap: 3
  cost: "13 ±15%"
  base_output: 0
  effects:
    - "LINE_ALL: +15% ±15%"
    - "MONTH_STAR_RATE: +3%"
  flavor: "目标对齐了，效率才有意义"
  in_starter_deck: false
  in_recruit_pool: true

- id: FUN_09
  name: 加班动员
  type: fun
  dept: NONE
  tier: 功能
  rarity: common
  unlock_level: 2
  ap: 2
  cost: "7 ±10%"
  base_output: 0
  effects:
    - "LINE_ALL: +20% ±10%"
    - "TRIGGER: NEXT_MONTH_LINE_ALL: -10%"
  flavor: "冲一波，但下个月别怪我"
  in_starter_deck: false
  in_recruit_pool: true

- id: FUN_10
  name: 品牌建设
  type: fun
  dept: NONE
  tier: 功能
  rarity: rare
  unlock_level: 3
  ap: 3
  cost: "15 ±15%"
  base_output: 0
  effects:
    - "BOTH: +20% ±15%"
    - "MONTH_STAR_RATE: +8%"
  flavor: "品牌即资产，长期主义的体现"
  in_starter_deck: false
  in_recruit_pool: true

- id: FUN_11
  name: 用户运营活动
  type: fun
  dept: NONE
  tier: 功能
  rarity: rare
  unlock_level: 3
  ap: 3
  cost: "14 ±15%"
  base_output: 0
  effects:
    - "ADJ_S: +50% ±15%"
    - "MONTH_BONUS: +¥10"
  flavor: "拉新促活，私域引流的标配"
  in_starter_deck: false
  in_recruit_pool: true

- id: FUN_12
  name: 技术债务清理
  type: fun
  dept: NONE
  tier: 功能
  rarity: rare
  unlock_level: 4
  ap: 3
  cost: "14 ±15%"
  base_output: 0
  effects:
    - "ADJ_R: +50% ±15%"
    - "TRIGGER: NEXT_MONTH_DEPT_R_LINE: +20%"
  flavor: "前人欠的债，后人还，但还完爽"
  in_starter_deck: false
  in_recruit_pool: true
```

---

## §9 服务卡（SRV_*）

> **设计原则**：占用格位但提供全局性效果（不依赖位置/邻接），主题"外部专业服务"

```yaml
- id: SRV_01
  name: 律师事务所
  type: srv
  dept: NONE
  tier: 基础
  rarity: common
  unlock_level: 1
  ap: 2
  cost: "8 ±10%"
  base_output: 0
  effects:
    - "MONTH_NO_MAINTAIN"
  flavor: "合同审查 + 风险规避，省钱的法宝"
  in_starter_deck: true
  in_recruit_pool: true

- id: SRV_02
  name: 税务筹划
  type: srv
  dept: NONE
  tier: 基础
  rarity: common
  unlock_level: 1
  ap: 2
  cost: "8 ±10%"
  base_output: 0
  effects:
    - "MONTH_STAR_RATE: +5%"
  flavor: "合法节税是企业必修课"
  in_starter_deck: false
  in_recruit_pool: true

- id: SRV_03
  name: 外部咨询
  type: srv
  dept: NONE
  tier: 进阶
  rarity: rare
  unlock_level: 2
  ap: 4
  cost: "19 ±15%"
  base_output: 0
  effects:
    - "LINE_XMULT: x1.3 ±15%"
  flavor: "Mck.ey 一份报告，半年战略不愁"
  in_starter_deck: false
  in_recruit_pool: true

- id: SRV_04
  name: 融资顾问
  type: srv
  dept: NONE
  tier: 进阶
  rarity: rare
  unlock_level: 2
  ap: 3
  cost: "15 ±15%"
  base_output: 0
  effects:
    - "MONTH_BONUS: +¥15 ±15%"
    - "MONTH_STAR_RATE: +3%"
  flavor: "对接 VC、修 BP，专业的人做专业的事"
  in_starter_deck: false
  in_recruit_pool: true

- id: SRV_05
  name: 管理咨询
  type: srv
  dept: NONE
  tier: 顶级
  rarity: elite
  unlock_level: 4
  ap: 5
  cost: "32 ±20%"
  base_output: 0
  effects:
    - "MONTH_AP: +5"
  flavor: "组织架构 + 流程再造的大手术"
  in_starter_deck: false
  in_recruit_pool: true

- id: SRV_06
  name: 战略顾问
  type: srv
  dept: NONE
  tier: 顶级
  rarity: elite
  unlock_level: 4
  ap: 5
  cost: "32 ±20%"
  base_output: 0
  effects:
    - "LINE_ALL: +30% ±20%"
  flavor: "看远一些，走稳一些"
  in_starter_deck: false
  in_recruit_pool: true

- id: SRV_07
  name: PR 公关
  type: srv
  dept: NONE
  tier: 进阶
  rarity: rare
  unlock_level: 3
  ap: 3
  cost: "15 ±15%"
  base_output: 0
  effects:
    - "MONTH_STAR_RATE: +10%"
  flavor: "口碑、热度、声誉，都是真金白银"
  in_starter_deck: false
  in_recruit_pool: true

- id: SRV_08
  name: HR 外包
  type: srv
  dept: NONE
  tier: 基础
  rarity: common
  unlock_level: 2
  ap: 2
  cost: "9 ±10%"
  base_output: 0
  effects:
    - "MONTH_NO_MAINTAIN"
    - "BOTH: +5% ±10%"
  flavor: "把杂活外包出去，专注主业"
  in_starter_deck: false
  in_recruit_pool: true

- id: SRV_09
  name: 投行顾问
  type: srv
  dept: NONE
  tier: 顶级
  rarity: epic
  unlock_level: 6
  ap: 5
  cost: "40 ±25%"
  base_output: 0
  effects:
    - "MONTH_BONUS: +¥30 ±25%"
    - "MONTH_STAR_RATE: +15%"
  flavor: "上市路上的必经合作伙伴"
  in_starter_deck: false
  in_recruit_pool: true

- id: SRV_10
  name: 法律团队
  type: srv
  dept: NONE
  tier: 进阶
  rarity: rare
  unlock_level: 3
  ap: 3
  cost: "16 ±15%"
  base_output: 0
  effects:
    - "MONTH_NO_MAINTAIN"
    - "LINE_ALL: +10% ±15%"
  flavor: "升级版律师，覆盖知识产权、并购"
  in_starter_deck: false
  in_recruit_pool: true
```

---

## §10 速查表（自动派生，不可作为权威源）

### 10.1 研发部速查

| ID | 卡名 | 职级 | 稀有度 | AP | ¥中位 | 基础¥中位 | 核心效果 |
|---|---|---|---|---|---|---|---|
| EMP_R_01 | 研发专员 | 专员 | common | 1 | 5 | 20 | → +10% |
| EMP_R_02 | 研发经理 | 经理 | common | 2 | 11 | 45 | → +25% |
| EMP_R_03 | 研发总监 | 总监 | rare | 4 | 22 | 85 | → +40%，P1 +20% |
| EMP_R_04 | 算法专家 | 专员 | rare | 2 | 15 | 35 | 右邻功能 x1.5 |
| EMP_R_05 | 全栈工程师 | 经理 | rare | 3 | 17 | 55 | ↔ +15% |
| EMP_R_06 | 架构师 | 总监 | rare | 4 | 25 | 75 | 同邻 +30% |
| EMP_R_07 | 技术 VP | VP | elite | 5 | 35 | 120 | 全研发 +25% |
| EMP_R_08 | 首席科学家 | VP | epic | 5 | 45 | 140 | P3 双向 +40% |
| EMP_R_09 | 极客实习生 | 专员 | elite | 2 | 10 | 38 | 左邻 R 时 x2 |
| EMP_FOUNDER_R | 创始人 · 科学家 | 创始人 | epic | 3 | 15 | 66 | 专属主角，AI-Driven研发 |

### 10.2 销售部速查

| ID | 卡名 | 职级 | 稀有度 | AP | ¥中位 | 基础¥中位 | 核心效果 |
|---|---|---|---|---|---|---|---|
| EMP_S_01 | 销售专员 | 专员 | common | 1 | 5 | 20 | ← +10% |
| EMP_S_02 | 销售经理 | 经理 | common | 2 | 11 | 45 | ← +20% |
| EMP_S_03 | 销售总监 | 总监 | rare | 4 | 22 | 85 | ← +35%，P5 x1.5 |
| EMP_S_04 | 大客户经理 | 经理 | rare | 3 | 17 | 55 | 左邻 R 时 x1.4 |
| EMP_S_05 | BD 专员 | 专员 | rare | 2 | 13 | 30 | ← +12%，+¥3 |
| EMP_S_06 | 电商运营 | 经理 | rare | 3 | 18 | 50 | 有功能 x1.3 |
| EMP_S_07 | 销售 VP | VP | elite | 5 | 35 | 120 | 全销售 +25% |
| EMP_S_08 | 销售之神 | VP | epic | 5 | 45 | 140 | P5 x2.5 |
| EMP_S_09 | 客户成功 | 经理 | rare | 3 | 17 | 50 | ← +18%，邻 +¥2 |
| EMP_FOUNDER_S | 创始人 · 销售冠军 | 创始人 | epic | 3 | 15 | 66 | 专属主角，Sales High |

### 10.3 运营部速查

| ID | 卡名 | 职级 | 稀有度 | AP | ¥中位 | 基础¥中位 | 核心效果 |
|---|---|---|---|---|---|---|---|
| EMP_O_01 | 运营专员 | 专员 | common | 1 | 5 | 22 | 同邻 +¥1 |
| EMP_O_02 | 运营经理 | 经理 | common | 2 | 11 | 48 | 同邻 +¥2，↔ +10% |
| EMP_O_03 | 运营总监 | 总监 | rare | 4 | 22 | 85 | P3 双向 +25% |
| EMP_O_04 | HR 经理 | 经理 | rare | 3 | 16 | 45 | 全 +8%，+¥2 |
| EMP_O_05 | 财务经理 | 经理 | rare | 3 | 18 | 40 | +¥5，↔ +8% |
| EMP_O_06 | 项目经理 PM | 经理 | rare | 3 | 17 | 50 | ↔ +20%，跨部门 x1.5 |
| EMP_O_07 | 运营 VP/COO | VP | elite | 5 | 38 | 115 | 全线 +15%，+¥10 |
| EMP_O_08 | 行政总管 | 总监 | rare | 4 | 20 | 70 | 免维持，↔ +10% |
| EMP_O_09 | 数据分析师 | 专员 | rare | 2 | 13 | 32 | ↔ +18%，邻功能 x1.4 |
| EMP_FOUNDER_O | 创始人 · 大厂 CXO | 创始人 | epic | 3 | 15 | 66 | 专属主角，精益管理 |

### 10.4 功能卡速查

| ID | 卡名 | 稀有度 | AP | ¥中位 | 核心效果 |
|---|---|---|---|---|---|
| FUN_01 | 市场调研 | common | 2 | 7 | ↔ +25% |
| FUN_02 | 产品冲刺 | common | 3 | 9 | 邻 R x2 |
| FUN_03 | 团队建设 | common | 2 | 8 | 全线 +¥15 |
| FUN_04 | 产品推广 | common | 3 | 9 | 邻 S x2 |
| FUN_05 | 数据分析 | common | 2 | 7 | ← +30% |
| FUN_06 | 流程优化 | common | 2 | 7 | → +30% |
| FUN_07 | 跨部门协作 | rare | 3 | 13 | 跨部门 ↔ +40% |
| FUN_08 | OKR 制定 | rare | 3 | 13 | 全 +15%，⭐ +3% |
| FUN_09 | 加班动员 | common | 2 | 7 | 全 +20%，下月 -10% |
| FUN_10 | 品牌建设 | rare | 3 | 15 | ↔ +20%，⭐ +8% |
| FUN_11 | 用户运营 | rare | 3 | 14 | 邻 S +50%，+¥10 |
| FUN_12 | 技术债务清理 | rare | 3 | 14 | 邻 R +50%，下月 R +20% |

### 10.5 服务卡速查

| ID | 卡名 | 稀有度 | AP | ¥中位 | 核心效果 |
|---|---|---|---|---|---|
| SRV_01 | 律师事务所 | common | 2 | 8 | 免维持费 |
| SRV_02 | 税务筹划 | common | 2 | 8 | ⭐ +5% |
| SRV_03 | 外部咨询 | rare | 4 | 19 | xMult x1.3 |
| SRV_04 | 融资顾问 | rare | 3 | 15 | +¥15，⭐ +3% |
| SRV_05 | 管理咨询 | elite | 5 | 32 | AP +5 |
| SRV_06 | 战略顾问 | elite | 5 | 32 | 全线 +30% |
| SRV_07 | PR 公关 | rare | 3 | 15 | ⭐ +10% |
| SRV_08 | HR 外包 | common | 2 | 9 | 免维持，↔ +5% |
| SRV_09 | 投行顾问 | epic | 5 | 40 | +¥30，⭐ +15% |
| SRV_10 | 法律团队 | rare | 3 | 16 | 免维持，全线 +10% |

---

## §11.0 创始人卡（开局必带）

开局玩家在 3 张创始人中选 1，对应卡片自动加入起手手牌；同时起始牌堆追加 1 张随机 common 同部门员工 + 1 张随机 rare/elite 同部门经理/总监。

```yaml
- id: EMP_FOUNDER_R
  name: 创始人 · 科学家
  dept: R, tier: 创始人, rarity: epic
  ap: 3, base_output: "66 ±10%", cost: "15 ±10%"
  effect_id: FOUNDER_AI_RD
  in_hand_buff: 月初抽牌 +1
  in_slot_buff: 月初抽牌 +3
  flavor: "“我们的目标是星辰大海与硬核科技！”"

- id: EMP_FOUNDER_S
  name: 创始人 · 销售冠军
  dept: S, tier: 创始人, rarity: epic
  ap: 3, base_output: "66 ±10%", cost: "15 ±10%"
  effect_id: FOUNDER_SALES_HIGH
  in_hand_buff: 全产线收入 ×1.2
  in_slot_buff: 全产线收入 ×1.8
  flavor: "“把这个 PPT 吹上天，今晚就签单！”"

- id: EMP_FOUNDER_O
  name: 创始人 · 大厂 CXO
  dept: O, tier: 创始人, rarity: epic
  ap: 3, base_output: "66 ±10%", cost: "15 ±10%"
  effect_id: FOUNDER_LEAN_MANAGEMENT
  in_hand_buff: 最大 AP +1
  in_slot_buff: 当月 AP +3 (额外)
  flavor: "“先对齐一下底层逻辑，打通闭环！”"
```

> 创始人卡 `inStarterDeck: false`、`inRecruitPool: false`，仅通过 `createInitialState({ profession })` 流程注入。
> "在手"和"在产线"的特殊 buff 由 `engine.js` 通过卡牌 ID 直接判断，不走效果 DSL。

---

## §11 起始牌组配置（阶段 1·天使轮）

> **总规模：25 张**（7 起手 + 1 创始人 + 15 起始牌堆 + 2 职业补充）
> **每月抽牌**：3 张（`GAME_CONFIG.drawPerMonth`，可被 BM/事件/创始人增减）
> **手牌上限**：10 张（`GAME_CONFIG.handLimit`）
> **理论数学**：单阶段 6-12 月轮转 + 董事会补充 + 冷却回流 ≈ 总曝光 40+ 张

### 11.1 起始手牌（7 张，固定）

```yaml
starter_hand:
  - id: EMP_R_01, count: 2      # 研发专员
  - id: EMP_S_01, count: 2      # 销售专员
  - id: EMP_O_01, count: 1      # 运营专员
  - id: EMP_R_02, count: 1      # 研发经理
  - id: FUN_01,   count: 1      # 市场调研（教学协同卡）
```

**设计意图**：
- 5 张专员/经理（三部门覆盖）→ 第 1 局产线 A 可用员工
- 市场调研放 P3 中枢位 → 第 1 局就让玩家体验"双向 +25%"协同爽点
- 起手仅 7 张是为了**逼玩家在第 1 月就开始抽牌 + 招聘**，避免一开局就有"完美起手"

### 11.2 起始牌堆（15 张）

```yaml
starter_deck:
  - id: EMP_R_01, count: 2      # 研发专员
  - id: EMP_S_01, count: 2      # 销售专员
  - id: EMP_O_01, count: 2      # 运营专员
  - id: EMP_R_02, count: 1      # 研发经理
  - id: EMP_S_02, count: 1      # 销售经理
  - id: EMP_O_02, count: 2      # 运营经理
  - id: FUN_02,   count: 1      # 产品冲刺
  - id: FUN_03,   count: 1      # 团队建设
  - id: FUN_04,   count: 1      # 产品推广
  - id: FUN_01,   count: 1      # 市场调研
  - id: SRV_02,   count: 1      # 税务筹划
```

### 11.3 总起始牌组统计

| 类型 | 数量 | 备注 |
|---|---|---|
| 员工卡（R/S/O 均衡）| 15 | 起始牌堆 + 起手手牌 |
| 创始人卡 | 1 | EPIC，固定在起手手牌 |
| 功能卡 | 5 | STARTER 中 |
| 服务卡 | 2 | STARTER 中 |
| 职业补充 | 2 | 1 张同部门 common + 1 张同部门 rare/elite |
| **总计** | **25** | |

### 11.4 部门分布检查

| 部门 | 卡数 |
|---|---|
| 研发 R | 6 张（4 专员 + 2 经理）|
| 销售 S | 6 张（4 专员 + 2 经理）|
| 运营 O | 6 张（4 专员 + 2 经理）|
| 通用 NONE | 7 张（5 功能 + 2 服务）|

均衡设计，玩家可选三种部门 build 入门。

### 11.5 数值波动应用

所有起始牌组的卡在**开局时一次性 roll** 各自数值。例如：
- 这局的"研发专员 #1"产出 22，"研发专员 #2"产出 17
- 玩家会发现"诶我这局研发专员都比较弱"或"销售经理 +25% 哇赚到"
- **每局都不同，刷新感拉满**

---

## §12 董事会招聘与采购规则

本游戏取消了月度招聘市场，所有新卡牌的采购和包的招募都在跨阶段的**董事会会议投资部 (Shop)** 中进行。

### 12.1 商品槽位分布

每次进入会议或刷新（消耗 ¥5）后，投资部展示 5 个槽位：
- **Slot A**：1 张史诗 (epic) 单卡，100% 出现。
- **Slot B**：1 张传奇 (legendary) 单卡，40% 概率出现。
- **Slot C-E**：各类卡包，概率出现。

### 12.2 卡包抽取规则

卡包购买后立即打开，展现 3 张卡牌，玩家选 1 张加入牌堆：
- **猎头礼包 (¥4)**：从 common 员工卡中 3 选 1。
- **精英礼包 (¥8)**：从 elite 员工卡中 3 选 1。
- **服务礼包 (¥5)**：从服务卡中 3 选 1。
- **功能礼包 (¥5)**：从功能卡中 3 选 1。
- **商业洞察 (¥7)**：从商业模式卡中 3 选 1 订阅。
- **神秘包 (¥10)**：跨稀有度，10% 概率产出传奇卡。

### 12.3 稀有度出卡概率与参数

不同稀有度的卡牌在 Shop 中的基础出率与资产估值、Burn 参数挂钩（见 RARITY_TABLE）：
- **普通 (common)**：Base Burn 1, Extra Burn 0, Asset Value 5
- **稀有 (rare)**：Base Burn 2, Extra Burn 1, Asset Value 15
- **精英 (elite)**：Base Burn 3, Extra Burn 1, Asset Value 30
- **史诗 (epic)**：Base Burn 4, Extra Burn 2, Asset Value 50
- **传奇 (legendary)**：Base Burn 7, Extra Burn 4, Asset Value 150

---

## §13 数值平衡原则

### 13.1 同 AP 性价比基准

每点 AP 应大致换取约 **20 ¥/月** 的基础产出（不含 buff）：

| AP | 期望基础产出 |
|---|---|
| 1 | 20 |
| 2 | 32-45 |
| 3 | 50-60 |
| 4 | 70-85 |
| 5 | 115-140 |
| 6 | 150-200 |

高 AP 卡产出非线性增长（5 AP > 5×1 AP），体现"质变"。

### 13.2 招聘成本（¥）与 AP 的关系

```
¥ 成本 ≈ AP × 5（普通）
         AP × 6-7（稀有）
         AP × 7-8（精英）
         AP × 9（史诗）
```

稀有度越高单位 AP 的成本越高，反映招募成本。

### 13.3 现金与留存利润规模

设计目标：
- 阶段 1：起手 ¥30 现金，没有留存利润。
- 阶段 2（种子轮）：注资 ¥25 现金，预期季度均利润约 ¥15。
- 阶段 5（C 轮）：注资 ¥200 现金，预期季度均利润约 ¥250。
- 阶段 9（行业第一）：注资 ¥2000 现金，估值达 80,000+ 赢得胜利。

### 13.4 卡牌平衡检查清单

每张卡填完数值后需要验证：

- [ ] 单卡"AP 性价比"：基础产出 / AP，应在合理区间
- [ ] 同 AP 不同卡互相比较，避免"显式更优"
- [ ] 高 AP 稀有/史诗卡确实"质变"，不只是"量变"
- [ ] 传奇卡（待补充）在自己 build 下能 carry，在错位 build 下平庸
- [ ] 数值波动后的最低值不应彻底毁掉一张卡（波动幅度可控）

---

## §14 传奇卡完整列表（10 张）

> **获取渠道**：投资部 Slot B（40% 概率，连续 3 关未刷出后 60% 保底）、神秘礼包（10% 概率）。
> `inStarterDeck: false`、`inRecruitPool: false`（不进普通招聘池）。

```yaml
# ---- 部门 CXO 传奇 (R/S/O 各 2 张) ----
- id: LEG_R_01, name: 诺贝尔奖得主, dept: R, tier: CXO
  ap: 5, cost: "60 ±30%", base_output: "180 ±30%"
  effects: ["SELF_IF_P3: BOTH: x2", "LINE_ALL: +20% ±30%", "MONTH_STAR_RATE: +10%"]
  flavor: "行业天花板，能让对手直接出局"

- id: LEG_S_01, name: 销冠之神, dept: S, tier: CXO
  ap: 5, cost: "55 ±30%", base_output: "170 ±30%"
  effects: ["SAME_DEPT_S_ADJ: +50%", "LINE_ALL_S_X: x1.5", "MONTH_BONUS: +¥50 ±30%"]
  flavor: "一年只服务一家公司"

- id: LEG_O_01, name: 六西格玛大师, dept: O, tier: CXO
  ap: 5, cost: "50 ±30%", base_output: "150 ±30%"
  effects: ["LINE_ALL: x1.4", "MONTH_NO_MAINTAIN", "SAME_DEPT_O_ADJ: +30%"]
  flavor: "所到之处皆为黑带"

- id: LEG_R_02, name: 图灵奖得主, dept: R, tier: CXO
  ap: 5, cost: "70 ±30%", base_output: "200 ±30%"
  effects: ["LINE_ALL_R: x2", "SELF_IF_P3: BOTH: x2"]
  flavor: "诺奖得主只是他的学生"

- id: LEG_S_02, name: 乔布斯式 CEO, dept: S, tier: CXO
  ap: 5, cost: "68 ±30%", base_output: "190 ±30%"
  effects: ["LINE_ALL: x1.5", "SELF_IF_P3: LINE_ALL: +50%"]
  flavor: "产品 + 营销 + 现实扭曲力场"

- id: LEG_O_02, name: 德鲁克再世, dept: O, tier: CXO
  ap: 4, cost: "60 ±30%", base_output: "150 ±30%"
  effects: ["MONTH_NO_MAINTAIN", "LINE_ALL: +¥30 ±30%"]
  flavor: "管理学之父在世"

# ---- 跨部门 / 服务 / 功能传奇 (4 张) ----
- id: LEG_M_01, name: 连续创业者, dept: NONE, tier: CXO
  ap: 5, cost: "65 ±30%", base_output: "170 ±30%"
  effects: ["LINE_ALL: x1.6", "IF_ALL_THREE_DEPT_IN_LINE: LINE_XMULT: x1.5"]
  flavor: "已经卖出过 3 家独角兽"

- id: SRV_LEG_01, name: 麦肯锡战略, type: srv
  ap: 5, cost: "55 ±30%", base_output: 0
  effects: ["LINE_XMULT: x2 ±30%", "MONTH_BONUS: +¥50"]
  flavor: "咨询界的最高荣誉"

- id: FUN_LEG_01, name: 黑天鹅基金, type: fun
  ap: 4, cost: "50 ±30%", base_output: 0
  effects: ["LINE_XMULT: x3", "MONTH_BONUS: +¥30"]
  flavor: "反脆弱才是真正的护城河"

- id: FUN_LEG_02, name: 专利墙战略, type: fun
  ap: 3, cost: "40 ±30%", base_output: 0
  effects: ["BOTH: +60% ±30%", "LINE_ALL_R: +30%"]
  flavor: "把每个 idea 都申请成专利"
```

---

## §15 商业模式 (Business Models, 37 张)

商业模式在董事会·**商学院**订阅，每月支付 `bmMonthlyCost`，提供全局 buff。三种 hook：

- `onMonthStart`：月初触发，影响抽牌、AP、维持费、手牌上限
- `onSettle`：结算乘区，加成部门/位置/相邻
- `onCharge`：一次性充能，每关用尽后失效（可由"反脆弱""All Hands"等重新充能）

### 15.1 onMonthStart 月初触发 (15 张)

| ID | 名称 | 稀有度 | ¥ 签约 | 月费 | 效果 |
|---|---|---|---|---|---|
| BM_01 | 全员 Owner | common | 7 | 2 | 月初抽牌 +1 |
| BM_02 | OKR 对齐 | common | 7 | 2 | 月初手牌 ≥6 时 AP +1 |
| BM_05 | 差异化定位 | common | 7 | 2 | 月初手牌上限 +2 |
| BM_14 | PMO | common | 7 | 2 | 月初抽牌 +1 |
| BM_15 | 抓大放小 | common | 7 | 2 | 月初手牌上限 +2 |
| BM_03 | 降本增效 | rare | 13 | 4 | 维持费 -20% |
| BM_04 | 精益创业 | rare | 13 | 4 | 每条产线 AP -1 (最低 1) |
| BM_16 | 007 | rare | 13 | 4 | 手牌 ≥6 时 AP +1 |
| BM_17 | Sprint 冲刺 | rare | 13 | 4 | 月初抽牌 +2 |
| BM_18 | 数据驱动 | rare | 13 | 4 | 维持费 -30% |
| BM_19 | 中台建设 | elite | 18 | 6 | 每条产线 AP -2 |
| BM_20 | 起立坐下 | elite | 18 | 6 | 月初抽牌 +2 |
| BM_21 | 砍价式管理 | elite | 18 | 6 | 维持费 -50% |
| BM_22 | 凡事 ROI | epic | 24 | 8 | 月初抽牌 +3 |
| BM_23 | 护城河信徒 | legendary | 30 | 14 | 月初手牌上限 +4 |

### 15.2 onSettle 结算乘区 (15 张)

| ID | 名称 | 稀有度 | ¥ 签约 | 月费 | 效果 |
|---|---|---|---|---|---|
| BM_06 | 批量涌现 | common | 7 | 2 | 同部门相邻 +10% |
| BM_08 | 工程师文化 | common | 7 | 2 | R 部门 +15% |
| BM_10 | 北极星指标 | common | 7 | 2 | P1 启动位 +10% |
| BM_24 | 销售文化 | common | 7 | 2 | S 部门 +15% |
| BM_25 | 运营驱动 | common | 7 | 2 | O 部门 +15% |
| BM_07 | 本地部署 Deapseak | rare | 13 | 4 | 服务卡 AP -1 |
| BM_09 | All-in 增长 | rare | 13 | 4 | P5 收割位 +20% |
| BM_26 | 飞轮效应 | rare | 13 | 4 | 同部门相邻 +20% |
| BM_27 | 产品经理至上 | rare | 13 | 4 | P1 启动位 +20% |
| BM_28 | 颠覆式创新 2.0 | elite | 18 | 6 | P5 收割位 +40% |
| BM_29 | 现金牛牛矩阵 | elite | 18 | 6 | 同部门相邻 +30% |
| BM_30 | 政委巡查 | elite | 18 | 6 | S 部门 +30% |
| BM_31 | 永远微笑制 | elite | 18 | 6 | O 部门 +30% |
| BM_32 | 20% 副业制 | epic | 24 | 8 | R 部门 +40% |
| BM_33 | 持有到老 | legendary | 30 | 14 | P1 启动位 +30% |

### 15.3 onCharge 一次性充能 (7 张)

| ID | 名称 | 稀有度 | ¥ 签约 | 月费 | 效果 |
|---|---|---|---|---|---|
| BM_12 | ESG 报告 | common | 7 | 2 | 关末战略预算 +10% |
| BM_34 | 券商进场 | common | 7 | 2 | 关末战略预算 +15% |
| BM_35 | PR 公关战 | common | 7 | 2 | 关末战略预算 +10% |
| BM_36 | 使命愿景价值观 | common | 7 | 2 | 关末战略预算 +10% |
| BM_13 | 反脆弱 | rare | 13 | 4 | 每关 1 次免维持费 |
| BM_37 | All Hands 大会 | rare | 13 | 4 | 每关 1 次免维持费 |
| BM_38 | 延链补链强链 | rare | 13 | 4 | 关末战略预算 +25% |
| BM_39 | PPT 战略顾问 | elite | 18 | 6 | 关末战略预算 +30% |
| BM_11 | 颠覆式创新 | epic | 24 | 8 | 每关 1 次免冷却复用产线 |
| BM_40 | 四宫格战略 | epic | 24 | 8 | 每关 1 次免冷却复用产线 |

> 槽位上限：默认 **4 个 BM**，可由董事访谈"行业并购"事件永久 +1。槽位满时新订阅需指定一个旧 BM 替换；旧 BM 也可在董事会免费退订。

---

## §16 卡包 / 升职 / 解雇 / 刷新定价

### 16.1 卡包定义 (`PACK_DEFINITIONS`)

| ID | 名称 | ¥ | 抽法 | 池子 |
|---|---|---|---|---|
| PACK_HEADHUNTER | 猎头礼包 | 4 | 3 选 1 | common 员工 |
| PACK_ELITE | 精英礼包 | 8 | 3 选 1 | elite 员工 |
| PACK_SERVICE | 服务礼包 | 5 | 3 选 1 | 服务卡 |
| PACK_FUNCTION | 功能礼包 | 5 | 3 选 1 | 功能卡 |
| PACK_INSIGHT | 商业洞察 | 7 | 3 选 1 | 商业模式 |
| PACK_MYSTERY | 神秘礼包 | 10 | 3 选 1 | 10% legendary / 30% epic / 60% rare |

> Slot C 永远是神秘礼包（必出），Slot D 60% / Slot E 40% 概率随机抽其它 5 类卡包。

### 16.2 升职路径 (`UPGRADE_PATHS`)

| 当前稀有度 | 升至 | ¥ | 产出加成 |
|---|---|---|---|
| common | rare | 10 | 基础产出 ×1.25 |
| rare | elite | 15 | 基础产出 ×1.25 |
| elite | epic | 20 | 基础产出 ×1.25 |
| epic / legendary | — | — | 不可继续升职 |

附加词缀路径：固定 ¥8，从 `AFFIX_POOL` 6 选 1（→ 右邻 +10% / ← 左邻 +10% / ↔ +5% / 自身 +8% / P5 +20% / 维持费 -1）。

### 16.3 解雇定价 (HR 部门)

| 当前阶段 ID | 单卡解雇 ¥ |
|---|---|
| ≤ 3 | 3 |
| 4–6 | 5 |
| ≥ 7 | 8 |

> 每场会议解雇上限 **5 张**。
> 滞涨救济（选 A）与现金告急救助则触发**免费解雇**（`dismissCardInBoardMeeting`），且总解雇全局 Burn 最高的卡。

### 16.4 投资部与商学院刷新

- 投资部刷新：¥5（重新滚出 Slot A/B 与 C-E 三个卡包槽）。
- 商学院刷新：¥4（重新滚出 3 个 BM 槽，已订阅的 BM 不会再出现在池中）。

---

## §17 董事访谈事件 (`BOARD_EVENTS`, 5 张)

进入董事会必先经过强制访谈事件，3 选 1（少数 2 选 1）：

| ID | 标题 | 选项摘要 |
|---|---|---|
| EV_BM_01 | 核心员工被挖 | A 留人 (−¥8) / B 放走 (+¥4) / C 反挖 (−¥12，下关获 R 传奇候选) |
| EV_BM_02 | 投资人施压 | A 妥协 (下关目标 +10%) / B 顶住 (−¥5) / C 反手画饼 (+¥3，下关首月手牌 -1) |
| EV_BM_03 | 行业大会 | 派 R/S/O 团队 → 下关招聘池新增 1 张对应部门 epic |
| EV_BM_04 | 黑天鹅 | A 顺势抄底 (50% +¥10 / 50% −¥5) / B 谨慎观望 (无效果) |
| EV_BM_05 | 行业并购 | A 吞并 (−¥15，BM 槽位上限 +1) / B 拒绝 (+¥3) / C 观望 |

---

## §18 未覆盖的扩展接口

- **第二/第三条产线启用后的特殊卡**（如"分公司经理"）
- **海外卡池**（阶段 7+ 国际化主题）
- **对手公司机制**（阶段 6+）
- **职业起始牌组扩展**（科学家/销售冠军/大厂 CXO 之外的第 4-N 种背景）

---

**版本历史**：
- v0.1：59 张卡结构初版，所有数值占位
- v0.2：装备化词条系统
- v0.3：全战略预算购卡
- v3.2：移除 💰 战略预算与月度招聘市场，招聘和采购转入董事会 Shop 并使用 ¥ 现金结算，卡牌附加内生 Base/Extra Burn 属性。
- v3.3（当前）：与代码全量同步——补齐 80 张卡 + 3 创始人 + 37 商业模式 + 10 传奇卡 + 5 董事访谈事件 + 升职 / 解雇 / 刷新定价。
