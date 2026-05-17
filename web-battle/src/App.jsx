import React, { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  BriefcaseBusiness,
  CalendarClock,
  Cpu,
  FlaskConical,
  Handshake,
  HelpCircle,
  Layers3,
  Map,
  Play,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import PhaserBattleFX from './PhaserBattleFX.jsx'

// ============================================================
// v3.0 卡库 (20 张标称: 12 员工 + 4 功能 + 4 服务). 成本字段为 AP, ¥ 不再被卡扣.
// ============================================================
const baseCards = [
  { id: 'rd-spec-1',    type: 'employee', name: '产品专员',  dept: '研发', rank: '专员', basePower: 10, cost: 1, rarity: '普通', trait: '产品',     color: 'rd' },
  { id: 'rd-spec-2',    type: 'employee', name: '技术专员',  dept: '研发', rank: '专员', basePower: 10, cost: 1, rarity: '普通', trait: '技术',     color: 'rd' },
  { id: 'rd-manager',   type: 'employee', name: '研发经理',  dept: '研发', rank: '经理', basePower: 20, cost: 2, rarity: '普通', trait: '交付',     color: 'rd' },
  { id: 'rd-director',  type: 'employee', name: '技术总监',  dept: '研发', rank: '总监', basePower: 35, cost: 3, rarity: '普通', trait: '壁垒',     color: 'rd' },
  { id: 'sales-spec-1', type: 'employee', name: '渠道专员',  dept: '销售', rank: '专员', basePower: 10, cost: 1, rarity: '普通', trait: '渠道',     color: 'sales' },
  { id: 'sales-spec-2', type: 'employee', name: '客户专员',  dept: '销售', rank: '专员', basePower: 10, cost: 1, rarity: '普通', trait: '客户',     color: 'sales' },
  { id: 'sales-manager',type: 'employee', name: '销售经理',  dept: '销售', rank: '经理', basePower: 20, cost: 2, rarity: '普通', trait: '收入',     color: 'sales' },
  { id: 'sales-director',type:'employee', name: '商务总监',  dept: '销售', rank: '总监', basePower: 35, cost: 3, rarity: '普通', trait: '融资叙事', color: 'sales' },
  { id: 'admin-spec-1', type: 'employee', name: '财务专员',  dept: '行政', rank: '专员', basePower: 10, cost: 1, rarity: '普通', trait: '财务',     color: 'admin' },
  { id: 'admin-spec-2', type: 'employee', name: 'HR 专员',   dept: '行政', rank: '专员', basePower: 10, cost: 1, rarity: '普通', trait: 'HR',       color: 'admin' },
  { id: 'admin-manager',type: 'employee', name: '组织经理',  dept: '行政', rank: '经理', basePower: 20, cost: 2, rarity: '普通', trait: '流程',     color: 'admin' },
  { id: 'admin-director',type:'employee', name: '行政总监',  dept: '行政', rank: '总监', basePower: 35, cost: 3, rarity: '普通', trait: '法务',     color: 'admin' },
  { id: 'func-sprint',  type: 'function', name: '产品冲刺',  basePower: 0, cost: 1, rarity: '功能', trait: '研发 +50%',  color: 'function', effectId: 'rd_boost',     description: '本周研发牌执行力 +50%' },
  { id: 'func-research',type: 'function', name: '市场调研',  basePower: 0, cost: 1, rarity: '功能', trait: '销售 +50%',  color: 'function', effectId: 'sales_boost',  description: '本周销售牌执行力 +50%；下周多抽 1 张牌' },
  { id: 'func-promo',   type: 'function', name: '产品推广',  basePower: 0, cost: 1, rarity: '功能', trait: '销售 +20',   color: 'function', effectId: 'promotion',    description: '销售牌 +20；若同时打出研发牌，倍率 +1' },
  { id: 'func-team',    type: 'function', name: '团队建设',  basePower: 0, cost: 1, rarity: '功能', trait: '行政 +20',   color: 'function', effectId: 'team_building',description: '行政牌 +20；下周 Burn Rate -1' },
  { id: 'svc-legal',    type: 'service',  name: '律师服务',  basePower: 0, cost: 1, rarity: '服务', trait: '合规护航',   color: 'service',  effectId: 'legal',        description: '消除一次合规负面效果；行政组合倍率 +1' },
  { id: 'svc-tax',      type: 'service',  name: '税筹服务',  basePower: 0, cost: 1, rarity: '服务', trait: 'Burn -2',    color: 'service',  effectId: 'tax',          description: '本周 Burn Rate -2，最低为 0' },
  { id: 'svc-consulting',type:'service',  name: '外部咨询',  basePower: 0, cost: 2, rarity: '服务', trait: '最终 x1.5',  color: 'service',  effectId: 'consulting',   description: '本周最终得分 x1.5' },
  { id: 'svc-fundraising',type:'service', name: '融资顾问',  basePower: 0, cost: 2, rarity: '服务', trait: '资金 +3',    color: 'service',  effectId: 'fundraising',  description: '若本周打出销售+行政，额外获得 ¥3' },
]

// ============================================================
// v3.0 常量
// ============================================================
const MAX_AP = 5              // 每周行动点数上限
const INITIAL_HAND = 5        // 第 1 周抽牌数
const WEEKLY_DRAW = 3         // 第 2 周起每周抽牌数
const REST_DELAY_MS = 1400
const TARGET_SCORE = 220
const WEEKLY_BURN = 2         // A 轮基础 Burn Rate
const INITIAL_MONEY = 20
const QUARTER_WEEKS = 12
const POWER_VARIANCE = 0.2    // ±20% 执行力随机区间

// ============================================================
// 玩家属性 (Archetype) 配置
// ============================================================
const archetypes = [
  {
    id: 'scientist',
    name: '科学家',
    icon: FlaskConical,
    tagline: '技术驱动型 CEO',
    description: '研发部 +2 张, 研发卡执行力 roll 偏向 +0~+20%.',
    favoredDept: '研发',
    bonusCards: ['rd-spec-1', 'rd-manager'],  // 复制 1 专员 + 1 经理
  },
  {
    id: 'sales',
    name: '销售冠军',
    icon: TrendingUp,
    tagline: '销售驱动型 CEO',
    description: '销售部 +2 张, 销售卡执行力 roll 偏向 +0~+20%.',
    favoredDept: '销售',
    bonusCards: ['sales-spec-1', 'sales-manager'],
  },
  {
    id: 'manager',
    name: '管理大师',
    icon: Users,
    tagline: '组织能力型 CEO',
    description: '行政部 +2 张, 行政卡执行力 roll 偏向 +0~+20%.',
    favoredDept: '行政',
    bonusCards: ['admin-spec-1', 'admin-manager'],
  },
]

const comboGuides = [
  ['个人推进', '任意 1 张员工，获得该员工执行力。', '员工执行力', 'x1'],
  ['项目小组', '2 张同部门员工，代表稳定小组推进。', '总执行力', 'x1.5'],
  ['PMF 验证', '研发 + 销售，代表产品与市场闭环。', '总执行力', 'x2'],
  ['融资路演', '销售 + 行政，得分 x1.5，并获得资金。', '总执行力', 'x1.5'],
  ['公司战役', '研发 + 销售 + 行政，代表全公司协同。', '总执行力', 'x3'],
  ['战略加速', '任意员工 + 外部咨询，本周最终得分 x1.5。', '最终得分', 'x1.5'],
]

const eventOptions = ['新产品开发', '新市场进入', '业务转型', '投资人路演', '产品发布']

const systemSlots = [
  { icon: Handshake, title: '咨询包', value: '空槽', hint: 'xMult 通道' },
  { icon: Cpu, title: 'IT 系统', value: '空槽', hint: '+执行力 (M3 解锁)' },
  { icon: BriefcaseBusiness, title: '办公室', value: '空槽', hint: '+组织能力' },
  { icon: ShieldCheck, title: 'CEO 特质', value: '由属性决定', hint: '规则重写 (M4)' },
]

// ============================================================
// 主组件
// ============================================================
function App() {
  // 起手属性选择前: archetype = null → 显示选择界面
  const [archetype, setArchetype] = useState(null)
  const [runState, setRunState] = useState(null)

  const [hand, setHand] = useState([])
  const [drawPile, setDrawPile] = useState([])
  const [restPile, setRestPile] = useState([])
  const [selected, setSelected] = useState([])
  const [playedCards, setPlayedCards] = useState([])
  const [score, setScore] = useState(0)
  const [money, setMoney] = useState(INITIAL_MONEY)
  const [ap, setAp] = useState(MAX_AP)
  const [week, setWeek] = useState(1)
  const [eventName, setEventName] = useState('')
  const [modal, setModal] = useState(null)
  const [floaters, setFloaters] = useState([])
  const [log, setLog] = useState([])
  const [fxEvent, setFxEvent] = useState(null)
  const [resolving, setResolving] = useState(false)

  const selectedCards = useMemo(
    () => hand.filter((card) => selected.includes(card.id)),
    [hand, selected],
  )

  const preview = useMemo(() => calculateScore(selectedCards), [selectedCards])
  const remainingAp = Math.max(ap - preview.cost, 0)

  function handleArchetypeChoice(choice) {
    const run = createRun(choice)
    setArchetype(choice)
    setRunState(run)
    setHand(run.hand)
    setDrawPile(run.drawPile)
    setRestPile([])
    setSelected([])
    setEventName(run.eventName)
    setLog([
      `选择属性: ${choice.name} — ${choice.tagline}`,
      `A 轮 Q1: ${run.eventName} 启动, 12 周内达成 ${TARGET_SCORE} 分.`,
    ])
  }

  function toggleCard(id) {
    const clicked = hand.find((card) => card.id === id)
    if (!clicked) return
    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id)
      }
      const projectedCost = selectedCost(current, hand) + clicked.cost
      if (projectedCost > ap) {
        pushLog(`AP 不足: 需要 ${projectedCost}/${ap}.`)
        return current
      }
      return [...current, id]
    })
  }

  function pushLog(message) {
    setLog((current) => [message, ...current].slice(0, 6))
  }

  function handlePlayHand() {
    if (resolving) return
    if (selectedCards.length === 0) {
      pushLog('请先选择牌再执行本周行动.')
      return
    }
    if (preview.cost > ap) {
      pushLog(`AP 不足, 需 ${preview.cost} / 剩 ${ap}.`)
      return
    }

    const gain = preview.total
    const cost = preview.cost
    const nextMoney = money + preview.moneyDelta - WEEKLY_BURN
    const nextScore = score + gain
    const nextWeek = Math.min(week + 1, QUARTER_WEEKS)

    // 出过的牌 + 未保留的手牌 → restPile (M1 暂不做"保留 1 张" UI, 直接全部进弃牌)
    const selectedIds = new Set(selectedCards.map((card) => card.id))
    const remainingInHand = hand.filter((card) => !selectedIds.has(card.id))

    // 下周抽 3 张新牌补充
    const refill = drawCards(WEEKLY_DRAW, drawPile, restPile)

    setPlayedCards(selectedCards)
    setHand(refill.drawn)   // 新手牌只来自新抽 (未保留)
    setDrawPile(refill.drawPile)
    setRestPile([...selectedCards, ...remainingInHand, ...refill.restPile])
    setSelected([])
    setScore(nextScore)
    setMoney(nextMoney)
    setWeek(nextWeek)
    setAp(MAX_AP)  // 每周 AP 重置
    setResolving(true)

    setFloaters([
      { id: Date.now(), text: `+${gain}`, x: 43 + Math.random() * 8, y: 25 + Math.random() * 4 },
      { id: Date.now() + 1, text: `x${preview.displayMult}`, x: 54 + Math.random() * 8, y: 22 + Math.random() * 4 },
    ])
    setFxEvent({ id: Date.now(), cards: selectedCards, gain, mult: preview.mult })
    pushLog(
      `第 ${week} 周: ${preview.comboName} +${gain} 分, 消耗 ${cost} AP, Burn ¥${WEEKLY_BURN}.`
    )

    if (nextScore >= TARGET_SCORE) {
      pushLog(`✓ A 轮 Q1 通关! 累计 ${nextScore} 分.`)
    } else if (nextWeek >= QUARTER_WEEKS) {
      pushLog(`✗ 12 周到期未达标 (${nextScore}/${TARGET_SCORE}).`)
    } else if (nextMoney <= 0) {
      pushLog(`✗ 资金归零, 季度失败.`)
    }

    window.setTimeout(() => {
      setPlayedCards([])
      setResolving(false)
    }, REST_DELAY_MS)
  }

  function handleInterface(action) {
    const handlers = {
      recruit: '接口预留: 人才流入 / 招聘抽牌.',
      endWeek: '接口预留: 手动跳过本周.',
      details: '打开商业事件详情.',
      guide: '打开牌型说明.',
      settings: '接口预留: 设置、音量、存档.',
      map: '接口预留: 年度路线图 / 季度节点.',
    }
    pushLog(handlers[action])
    if (action === 'details') setModal('event')
    if (action === 'guide') setModal('guide')
  }

  function handleRestart() {
    setArchetype(null)
    setRunState(null)
    setHand([])
    setDrawPile([])
    setRestPile([])
    setSelected([])
    setScore(0)
    setMoney(INITIAL_MONEY)
    setAp(MAX_AP)
    setWeek(1)
    setEventName('')
    setLog([])
    setPlayedCards([])
    setFxEvent(null)
  }

  // 起手未选属性 → 显示属性选择面板
  if (!archetype) {
    return <ArchetypeSelect onSelect={handleArchetypeChoice} />
  }

  return (
    <main className="battle-shell">
      <div className="battle-bg" />
      <TopHud
        week={week}
        score={score}
        money={money}
        ap={ap}
        maxAp={MAX_AP}
        eventName={eventName}
        archetypeName={archetype.name}
        onGuide={() => handleInterface('guide')}
        onRestart={handleRestart}
      />

      <section className="battle-layout">
        <aside className="side-panel frank-panel">
          <PanelTitle icon={Sparkles} title="CEO Frank" action={archetype.name} />
          <Avatar role="frank" />
          <div className="stat-grid">
            <Stat label="资金" value={`¥${money}`} />
            <Stat label="行动力" value={`${ap}/${MAX_AP} AP`} />
            <Stat label="手牌" value={hand.length} />
            <Stat label="周/12" value={week} />
          </div>
          <div className="trait-card">
            <span>玩家属性</span>
            <strong>{archetype.name}</strong>
            <small>{archetype.tagline} · {archetype.favoredDept} 卡偏向高值</small>
          </div>
        </aside>

        <section className="arena">
          <div className="table-3d">
            <PhaserBattleFX fxEvent={fxEvent} />
            <div className="budget-chip"><b className="ap-icon" aria-hidden="true" /> 剩余 AP: {remainingAp}/{MAX_AP}</div>
            <div className="played-zone">
              {playedCards.length === 0 ? (
                <div className="drop-hint">战斗区</div>
              ) : playedCards.map((card, index) => (
                <EmployeeCardView key={card.id} card={card} selected compact style={{ '--i': index }} />
              ))}
            </div>

            {floaters.map((floater) => (
              <span
                key={floater.id}
                className="score-floater"
                style={{ left: `${floater.x}%`, top: `${floater.y}%` }}
              >
                {floater.text}
              </span>
            ))}
          </div>
        </section>

        <aside className="side-panel asset-panel">
          <PanelTitle icon={BriefcaseBusiness} title="组织资产槽" action="四通道分离" />
          <div className="asset-slot-list">
            {systemSlots.map((slot) => (
              <SystemSlot key={slot.title} {...slot} />
            ))}
          </div>
          <div className="log-list">
            {log.map((item, idx) => <div key={`${idx}-${item}`}>{item}</div>)}
          </div>
        </aside>
      </section>

      <footer className="hand-dock">
        <div className="hand-header">
          <div>
            <span className="section-label">本周手牌</span>
            <strong>{selected.length} 张已选 · {preview.cost}/{ap} AP</strong>
          </div>
          <div className="preview-pill">
            <span>预估</span>
            <strong>{preview.total}</strong>
            <small>{preview.comboName} · {preview.base} x {preview.displayMult}</small>
          </div>
        </div>

        <div className="hand-table">
          <CardPile
            type="rest"
            icon={Archive}
            title="弃牌堆"
            count={restPile.length}
            cards={restPile}
            hint="本周打过 / 弃掉"
          />
          <div className="hand-row">
            {hand.map((card) => (
              <EmployeeCardView
                key={card.id}
                card={card}
                selected={selected.includes(card.id)}
                onClick={() => toggleCard(card.id)}
              />
            ))}
          </div>
          <CardPile
            type="draw"
            icon={Layers3}
            title="待命区"
            count={drawPile.length}
            cards={drawPile}
            hint="从上抓取"
          />
        </div>

        <div className="action-bar">
          <ActionButton primary icon={Play} label={resolving ? '结算中' : '执行本周行动'} onClick={handlePlayHand} disabled={resolving} />
          <ActionButton icon={UserPlus} label="人才流入" onClick={() => handleInterface('recruit')} />
          <ActionButton icon={CalendarClock} label="结束本周" onClick={() => handleInterface('endWeek')} />
          <ActionButton icon={HelpCircle} label="事件详情" onClick={() => handleInterface('details')} />
          <ActionButton icon={BriefcaseBusiness} label="牌型说明" onClick={() => handleInterface('guide')} />
          <ActionButton icon={Map} label="地图" onClick={() => handleInterface('map')} />
          <ActionButton icon={Settings} label="设置" onClick={() => handleInterface('settings')} />
        </div>
      </footer>

      {modal && (
        <Modal title={modal === 'guide' ? '牌型说明' : '商业事件详情'} onClose={() => setModal(null)}>
          {modal === 'guide' ? <ComboGuide /> : <EventDetails eventName={eventName} />}
        </Modal>
      )}
    </main>
  )
}

// ============================================================
// 起手属性选择面板
// ============================================================
function ArchetypeSelect({ onSelect }) {
  return (
    <main className="battle-shell archetype-shell">
      <div className="battle-bg" />
      <header className="archetype-header">
        <strong>Frank's Adventure</strong>
        <h1>选择创始 CEO 背景</h1>
        <p>不同的起手属性会改变你的牌库结构与员工执行力随机偏向. 选择决定整局风格.</p>
      </header>
      <div className="archetype-grid">
        {archetypes.map((arc) => (
          <button key={arc.id} className="archetype-card" onClick={() => onSelect(arc)}>
            <arc.icon size={40} />
            <strong>{arc.name}</strong>
            <em>{arc.tagline}</em>
            <p>{arc.description}</p>
            <span className="archetype-badge">{arc.favoredDept} +2 张 · 偏向高值</span>
          </button>
        ))}
      </div>
      <footer className="archetype-footer">
        起始资金 ¥{INITIAL_MONEY} · 每周 {MAX_AP} AP · 12 周达标 {TARGET_SCORE} 分
      </footer>
    </main>
  )
}

// ============================================================
// 牌库构造 + 执行力随机
// ============================================================
function rollPower(basePower, favored) {
  // favored = true → 随机区间在 [base, base*1.2] (向上偏)
  // favored = false → 随机区间在 [base*0.8, base*1.2] (中性)
  if (basePower === 0) return 0
  const lower = favored ? 0 : -POWER_VARIANCE
  const upper = POWER_VARIANCE
  const factor = 1 + lower + Math.random() * (upper - lower)
  return Math.max(1, Math.round(basePower * factor))
}

function createRun(archetype) {
  // 1. 基础 20 张牌 + 属性 bonus 2 张
  const deckSpec = [...baseCards]
  archetype.bonusCards.forEach((cardId, idx) => {
    const template = baseCards.find((c) => c.id === cardId)
    if (template) {
      deckSpec.push({
        ...template,
        id: `${cardId}-bonus-${idx}`,
        name: `${template.name}*`,  // 标记为属性赠送
      })
    }
  })

  // 2. 给每张员工 roll 一次本局执行力 (± POWER_VARIANCE, 偏向 dept 偏上半)
  const deck = deckSpec.map((card) => {
    if (card.type !== 'employee') {
      return { ...card, power: card.basePower }
    }
    const favored = card.dept === archetype.favoredDept
    return {
      ...card,
      power: rollPower(card.basePower, favored),
    }
  })

  // 3. 洗牌, 抽前 INITIAL_HAND 张
  const shuffledDeck = shuffle(deck)
  const hand = shuffledDeck.slice(0, INITIAL_HAND)
  const drawPile = shuffledDeck.slice(INITIAL_HAND)

  return {
    deck,
    drawPile,
    eventName: randomItem(eventOptions),
    hand,
    archetype,
  }
}

function drawCards(count, currentDrawPile, currentRestPile) {
  let drawPile = [...currentDrawPile]
  let restPile = [...currentRestPile]
  const drawn = []

  while (drawn.length < count && (drawPile.length > 0 || restPile.length > 0)) {
    if (drawPile.length === 0) {
      drawPile = shuffle(restPile)
      restPile = []
    }
    drawn.push(drawPile[0])
    drawPile = drawPile.slice(1)
  }

  return { drawn, drawPile, restPile }
}

function selectedCost(selectedIds, hand) {
  const selectedSet = new Set(selectedIds)
  return hand.reduce((sum, card) => selectedSet.has(card.id) ? sum + card.cost : sum, 0)
}

function shuffle(items) {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }
  return shuffled
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)]
}

// ============================================================
// 分数计算 (v2.5 已实现, 这里维持; M2/M3 拆通道)
// ============================================================
function calculateScore(selectedCards) {
  const employeeCards = selectedCards.filter((card) => card.type === 'employee')
  const effectIds = new Set(selectedCards.map((card) => card.effectId).filter(Boolean))
  const depts = new Set(employeeCards.map((card) => card.dept))
  let base = 0
  let mult = 1
  let xMult = 1
  let moneyDelta = 0
  let cost = selectedCards.reduce((sum, card) => sum + card.cost, 0)
  let comboName = employeeCards.length ? '个人推进' : '公司行动'

  employeeCards.forEach((card) => {
    let power = card.power
    if (card.dept === '研发' && effectIds.has('rd_boost')) power *= 1.5
    if (card.dept === '销售' && effectIds.has('sales_boost')) power *= 1.5
    if (card.dept === '销售' && effectIds.has('promotion')) power += 20
    if (card.dept === '行政' && effectIds.has('team_building')) power += 20
    base += power
  })

  if (employeeCards.length === 2) {
    if (depts.size === 1) {
      mult = 1.5
      comboName = `${employeeCards[0].dept}小组`
      if (employeeCards[0].dept === '销售') moneyDelta += 1
    } else if (depts.has('研发') && depts.has('销售')) {
      mult = 2
      comboName = 'PMF 验证'
    } else if (depts.has('销售') && depts.has('行政')) {
      mult = 1.5
      moneyDelta += 2
      comboName = '融资路演'
    } else if (depts.has('研发') && depts.has('行政')) {
      mult = 1.5
      comboName = '流程建设'
    }
  }

  if (employeeCards.length >= 3 && depts.has('研发') && depts.has('销售') && depts.has('行政')) {
    mult = 3
    comboName = '公司战役'
  }

  if (effectIds.has('promotion') && depts.has('研发') && depts.has('销售')) {
    mult += 1
    comboName = '渠道放量'
  }

  if (effectIds.has('legal') && depts.has('行政')) {
    mult += 1
    comboName = '合规护航'
  }

  if (effectIds.has('consulting') && employeeCards.length > 0) {
    xMult = 1.5
    comboName = '战略加速'
  }

  if (effectIds.has('fundraising') && depts.has('销售') && depts.has('行政')) {
    moneyDelta += 3
    comboName = '融资推进'
  }

  const total = Math.round(base * mult * xMult)
  return {
    base: Math.round(base),
    cost,
    comboName,
    displayMult: (mult * xMult).toFixed(1),
    moneyDelta,
    mult,
    total,
    xMult,
  }
}

// ============================================================
// UI 子组件
// ============================================================
function TopHud({ week, score, money, ap, maxAp, eventName, archetypeName, onGuide, onRestart }) {
  return (
    <header className="top-hud">
      <div className="brand-block">
        <strong>Frank's Adventure</strong>
        <span>A 轮 · Q1 · {archetypeName}</span>
      </div>
      <div className="hud-center">
        <div>
          <span>当前事件</span>
          <strong>{eventName}</strong>
        </div>
        <div>
          <span>周数</span>
          <strong>{week}/{QUARTER_WEEKS}</strong>
        </div>
        <div>
          <span>资金</span>
          <strong>¥{money}</strong>
        </div>
        <div>
          <span>AP</span>
          <strong>{ap}/{maxAp}</strong>
        </div>
        <div>
          <span>季度目标</span>
          <strong>{score}/{TARGET_SCORE}</strong>
        </div>
      </div>
      <div className="hud-actions">
        <button className="guide-button" onClick={onGuide}>
          <HelpCircle size={18} />
          牌型说明
        </button>
        <button className="guide-button" onClick={onRestart}>
          重开
        </button>
      </div>
    </header>
  )
}

function EmployeeCardView({ card, selected, onClick, compact = false, style }) {
  const isEmployee = card.type === 'employee'
  const traitParts = !isEmployee && card.trait ? card.trait.split(/\s+/) : []
  const hasSplitTrait = traitParts.length >= 2
  return (
    <button
      className={`employee-card ${card.color} ${card.type} ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`}
      onClick={onClick}
      style={style}
    >
      <span className="rank-badge"><b className="ap-icon" aria-hidden="true" />{card.cost}</span>
      <span className="dept">{isEmployee ? card.dept : card.rarity}</span>
      {isEmployee ? (
        <strong className="power">{card.power}</strong>
      ) : hasSplitTrait ? (
        <strong className="power power-split">
          <span className="trait-label">{traitParts[0]}</span>
          <span className="trait-value">{traitParts.slice(1).join(' ')}</span>
        </strong>
      ) : (
        <strong className="power power-single">{card.trait}</strong>
      )}
      <em>{card.name}</em>
      <span className="chips">{isEmployee ? card.rank : ''}</span>
    </button>
  )
}

function CardPile({ type, icon: Icon, title, count, cards, hint }) {
  return (
    <div className={`card-pile ${type}-pile`}>
      <div className="pile-stack" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <span
            key={item}
            className={`pile-card ${cards[item]?.color ?? 'empty'}`}
            style={{ '--stack': item }}
          />
        ))}
      </div>
      <div className="pile-copy">
        <span><Icon size={14} />{title}</span>
        <strong>{count}</strong>
        <small>{hint}</small>
      </div>
    </div>
  )
}

function Avatar({ role }) {
  return (
    <div className={`avatar-25d ${role}`}>
      <div className="avatar-shadow" />
      <div className="avatar-body">
        <div className="avatar-head"><span /></div>
        <div className="avatar-jacket"><i /></div>
        <div className="avatar-tablet" />
      </div>
    </div>
  )
}

function PanelTitle({ icon: Icon, title, action }) {
  return (
    <div className="panel-title">
      <Icon size={18} />
      <div>
        <strong>{title}</strong>
        <span>{action}</span>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SystemSlot({ icon: Icon, title, value, hint }) {
  return (
    <button className="system-slot">
      <Icon size={18} />
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </button>
  )
}

function ActionButton({ icon: Icon, label, primary, onClick, disabled = false }) {
  return (
    <button className={`action-button ${primary ? 'primary' : ''}`} onClick={onClick} disabled={disabled}>
      <Icon size={17} />
      {label}
    </button>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-title">
          <h2>{title}</h2>
          <button onClick={onClose}>关闭</button>
        </div>
        {children}
      </section>
    </div>
  )
}

function ComboGuide() {
  return (
    <div className="combo-table">
      {comboGuides.map(([name, description, chips, mult]) => (
        <div className="combo-row" key={name}>
          <strong>{name}</strong>
          <span>{description}</span>
          <em>{chips}</em>
          <b>{mult}</b>
        </div>
      ))}
    </div>
  )
}

function EventDetails({ eventName }) {
  return (
    <div className="event-detail">
      <p>{eventName} 是本季度随机商业事件. 12 周内累积执行力达标即可通关, 期间事件会持续给部门或牌型施加风险.</p>
      <div>
        <strong>接口预留</strong>
        <span>季度事件 debuff、Boss、商店、奖励三选一 (M2-M4 实装).</span>
      </div>
    </div>
  )
}

export default App
