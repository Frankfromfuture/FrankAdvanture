# 牌组设计文档 · 全卡表 + 装备化词条

> **配套文档**：[GAME_DESIGN_FOUNDATION.md](./GAME_DESIGN_FOUNDATION.md)
> **版本**：v0.3 全战略预算购卡 + wage 移除
> **状态**:结构完成 + 中位数梗概，最终精确数值待平衡

---

## §1 使用说明

### 1.1 文档结构

- **§2 设计原则**
- **§3 数值波动与稀有度系统**：核心规则
- **§4 词条库**：精英/史诗专属
- **§5-§9 卡牌主数据库**：每张卡 YAML block，**数据权威源**
- **§10 速查表**：Markdown 表格视图（**非权威**）
- **§11 起始牌组配置**：关卡 1 精算配置
- **§12 招聘市场规则**
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
cost: "5 ±10%"           # 战略预算价波动
```

中位数是设计师可调的锚点值，波动率由稀有度决定。

### 1.4 v0.3 关键变化（与 v0.2 对比）

| 字段 | v0.2 | v0.3 |
|---|---|---|
| 货币 | 招聘 ¥ + 商店 💰 | **全部用 💰 战略预算** |
| wage 字段 | 保留但暂不启用 | **彻底删除** |
| 战略预算发放 | 关卡末一次性 | **关卡开始时一次，全关可用** |
| ¥ 用途 | 招聘 + 维持 + 通关 | **维持 + 通关 + 极少数奖励** |

---

## §2 设计原则

### 2.1 装备化卡牌（核心创新）

**每张卡每次开出时数值随机波动**。同名卡每次不同，每张卡都是"具体的人"。

- 主题：现实招到的不是抽象岗位，是具体的张三李四
- 心理：每次招聘有"刷装备"的期待
- 平衡：低稀有度的卡如果 roll 出高数值，依然有竞争力

### 2.2 四稀有度阶梯

| 稀有度 | 中文 | 数值波动 | 词条 | 入池关卡 |
|---|---|---|---|---|
| common | 普通 | ±10% | 无 | 1+ |
| rare | 稀有 | ±15% | 无 | 2+ |
| elite | 精英 | ±20% | 30% 触发 1 个小词条 | 4+ |
| epic | 史诗 | ±25% | 必定 1 大词条 + 30% 额外小词条 | 6+ |

### 2.3 货币体系（v0.3 简化版）

```
💰 战略预算
  ├─ 关卡开始时一次性发放（基础 + 上关利润比例）
  ├─ 用于：招聘市场（每月）+ 关卡末商店
  └─ 关卡结束清零，不结转

¥ 现金
  ├─ 来源：产线产出
  ├─ 用于：维持费 + 关卡通关条件
  └─ 累计 ¥ 收入达标 → 通关
```

**没有 wage 字段**。玩家不需要担心"养员工"的工资，只需考虑：
- 招聘时一次性投入 💰
- 上产线时消耗 AP
- 每月固定维持费（扣 ¥）

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
2. **招聘市场刷新**：刷新时 roll，玩家购买后保持该数值
3. **商店刷新**：购买前显示完整数值，玩家决定要不要

**关键**：卡的数值**一旦 roll 出就不再变化**。玩家可以"刷装备"心态对比新旧卡。

### 3.3 词条触发规则

- **common / rare**：100% 无词条
- **elite**：70% 无词条 / 30% 有 1 个小词条
- **epic**：100% 至少 1 个大词条 / 30% 额外 1 个小词条

词条**从所属池子均匀随机**，开卡时与数值同时 roll。

### 3.4 显示规范

招聘市场和手牌显示示例：

```
┌─────────────────────────┐
│   研发专员 [普通]        │
│   AP: 1  招聘💰: 5      │
│   基础产出: ¥22         │
│   → 右邻 +11%           │
└─────────────────────────┘

┌─────────────────────────┐
│  ★技术 VP★ [史诗]       │
│   AP: 5  招聘💰: 35     │
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

| ID | 卡名 | 职级 | 稀有度 | AP | 💰中位 | 基础¥中位 | 核心效果 |
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

### 10.2 销售部速查

| ID | 卡名 | 职级 | 稀有度 | AP | 💰中位 | 基础¥中位 | 核心效果 |
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

### 10.3 运营部速查

| ID | 卡名 | 职级 | 稀有度 | AP | 💰中位 | 基础¥中位 | 核心效果 |
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

### 10.4 功能卡速查

| ID | 卡名 | 稀有度 | AP | 💰中位 | 核心效果 |
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

| ID | 卡名 | 稀有度 | AP | 💰中位 | 核心效果 |
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

## §11 起始牌组配置（关卡 1）

> **总规模：25 张**（起始手牌 10 + 起始牌堆 15）
> **理论数学**：6 局轮转 + 招聘市场补充 + 冷却回流 ≈ 总曝光 40+ 张

### 11.1 起始手牌（10 张，固定）

```yaml
starter_hand:
  - id: EMP_R_01, count: 2      # 研发专员
  - id: EMP_S_01, count: 2      # 销售专员
  - id: EMP_O_01, count: 2      # 运营专员
  - id: EMP_R_02, count: 1      # 研发经理
  - id: EMP_S_02, count: 1      # 销售经理
  - id: FUN_01,   count: 1      # 市场调研（教学协同卡）
  - id: SRV_01,   count: 1      # 律师事务所（应急卡）
```

**设计意图**：
- 6 张专员（三部门覆盖）+ 2 张经理 → 第 1 局产线 A 可用 5 张员工
- 市场调研放 P3 中枢位 → 第 1 局就让玩家体验"双向 +25%"协同爽点
- 律师卡 → 第 1 局可应对维持费压力，引入"服务卡"概念

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

| 类型 | 数量 | 比例 |
|---|---|---|
| 员工卡（R/S/O 均衡）| 18 | 72% |
| 功能卡 | 5 | 20% |
| 服务卡 | 2 | 8% |
| **总计** | **25** | 100% |

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

## §12 招聘市场规则

### 12.1 刷新机制

每月 Phase 3 招聘市场刷新：

| 关卡 | 刷新数 | 备注 |
|---|---|---|
| 1-3 | 3 张 | 基础 |
| 4-7 | 4 张 | 中期 |
| 8-10 | 5 张 | 后期 |

刷新规则：
- 从当前关卡可入池的卡（`unlock_level ≤ 当前关卡`）随机抽
- 按稀有度概率抽取（见 §12.2）
- 每张刷出时 **roll 数值**（如稀有度允许，roll 词条）
- **传奇卡不出现在招聘市场**，仅在【董事会会议·投资部】Slot B 刷出（40% 概率），详见 [BOARD_MEETING_DESIGN.md §3](./BOARD_MEETING_DESIGN.md#3-模块-1投资部shop)

### 12.2 稀有度出现概率（每关卡递增）

| 关卡 | common | rare | elite | epic |
|---|---|---|---|---|
| 1 | 100% | 0% | 0% | 0% |
| 2 | 75% | 25% | 0% | 0% |
| 3 | 65% | 35% | 0% | 0% |
| 4 | 55% | 35% | 10% | 0% |
| 5 | 45% | 40% | 15% | 0% |
| 6 | 40% | 40% | 15% | 5% |
| 7 | 35% | 40% | 20% | 5% |
| 8 | 30% | 40% | 22% | 8% |
| 9 | 25% | 38% | 27% | 10% |
| 10 | 20% | 35% | 32% | 13% |

### 12.3 购买流程

1. 玩家在招聘市场点击卡片查看完整属性（数值 + 词条）
2. 点击"招聘"按钮，扣 💰 战略预算
3. 卡 **直接进入牌堆**（不进手牌）
4. 下次抽牌时可能抽到
5. 不进入抽牌池 = 自然惩罚牌堆膨胀

### 12.4 与商店的区别（v0.3 关键定位）

| 渠道 | 时机 | 货币 | 卡池 |
|---|---|---|---|
| **招聘市场** | 每月（局内）| 💰 | common / rare / elite |
| **关卡末商店** | 关卡结束 | 💰 | epic / legendary + 永久升级 + 解锁 |

招聘市场 = **日常人才市场**  
商店 = **猎头公司 + 战略升级**

### 12.5 接口预留

- "锁定" 功能：保留某张卡到下月刷新（待定）
- "刷新券"：消耗 💰 重新 roll 招聘市场（待定）
- "猎头委托"：消耗大额 💰 从全卡池抽（待定）

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

### 13.2 招聘成本（💰）与 AP 的关系

```
💰 成本 ≈ AP × 5（普通）
         AP × 6-7（稀有）
         AP × 7-8（精英）
         AP × 9（史诗）
```

稀有度越高单位 AP 的成本越高，反映"猎头费用"。

### 13.3 战略预算总量梗概

> 详见基石文档 §B.4.1（数值待平衡）

设计目标：
- 关卡 1 预算 ≈ 50-60 💰，够买 4-6 张 common
- 关卡 5 预算 ≈ 200 💰，够买 1-2 张 epic + 部分 elite
- 关卡 10 预算 ≈ 1000+ 💰

**预算节奏建议**：玩家平均一关花 70% 在招聘市场（每月小买）+ 30% 在关卡末商店（大投资）。

### 13.4 卡牌平衡检查清单

每张卡填完数值后需要验证：

- [ ] 单卡"AP 性价比"：基础产出 / AP，应在合理区间
- [ ] 同 AP 不同卡互相比较，避免"显式更优"
- [ ] 高 AP 稀有/史诗卡确实"质变"，不只是"量变"
- [ ] 传奇卡（待补充）在自己 build 下能 carry，在错位 build 下平庸
- [ ] 数值波动后的最低值不应彻底毁掉一张卡（波动幅度可控）

---

## §14 未覆盖的扩展接口

- **传奇卡 LEG_***：待在商店设计中单独定义（见基石文档 §B.4 商店物品池）
- **第二/第三条产线启用后的特殊卡**（如"分公司经理"）
- **海外卡池**（关卡 8+ 国际化主题）
- **对手公司机制**（关卡 6+）
- **卡牌升级/进化**（如"研发专员 → 研发专员+"）
- **职业起始牌组变体**（科学家/销售冠军/管理大师）

---

**版本历史**：
- v0.1：59 张卡结构初版，所有数值占位
- v0.2：装备化词条系统（四稀有度 + 数值波动 + 词条池）
- v0.3（当前）：全战略预算购卡，wage 字段移除，招聘市场与商店明确分工
