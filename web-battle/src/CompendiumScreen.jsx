import React, { useState, useMemo } from 'react'
import { CardView } from './CardView.jsx'
import {
  BOARD_EVENTS,
  BUSINESS_MODELS,
  CARD_TEMPLATES,
  EVENTS,
  RARITY_LABELS,
} from './game/cards.js'

/**
 * Dev Mode 是否可用——正式发布前改为 false 即可彻底隐藏开关按钮
 */
const IS_DEV_MODE_AVAILABLE = true

const TABS = [
  { id: 'emp', label: '员工卡', subtitle: 'R/S/O 三部门' },
  { id: 'srv', label: '服务卡', subtitle: '律师/咨询/PR' },
  { id: 'fun', label: '功能卡', subtitle: '产品/团队/流程' },
  { id: 'leg', label: '传奇卡', subtitle: 'CXO 级' },
  { id: 'bm', label: '商业模式', subtitle: '全局 buff' },
  { id: 'event', label: '月度事件', subtitle: '局内随机' },
  { id: 'board', label: '董事访谈', subtitle: '关间事件' },
]

const EFFECT_TEMPLATES = [
  { id: 'RIGHT', template: 'RIGHT: +10%', label: '→ 右邻 +%' },
  { id: 'LEFT', template: 'LEFT: +10%', label: '← 左邻 +%' },
  { id: 'BOTH', template: 'BOTH: +10%', label: '↔ 双向 +%' },
  { id: 'SELF', template: 'SELF: x1.5', label: '自身 ×' },
  { id: 'SAME_DEPT_ADJ', template: 'SAME_DEPT_ADJ: +20%', label: '同部门相邻 +%' },
  { id: 'ADJ_R', template: 'ADJ_R: +30%', label: '邻 R 部门 +%' },
  { id: 'ADJ_S', template: 'ADJ_S: +30%', label: '邻 S 部门 +%' },
  { id: 'LINE_ALL_PCT', template: 'LINE_ALL: +10%', label: '全线 +%' },
  { id: 'LINE_ALL_MULT', template: 'LINE_ALL: x1.4', label: '全线 ×' },
  { id: 'LINE_ALL_R', template: 'LINE_ALL_R: +25%', label: '全线 R +%' },
  { id: 'LINE_ALL_S', template: 'LINE_ALL_S: +25%', label: '全线 S +%' },
  { id: 'LINE_XMULT', template: 'LINE_XMULT: x1.5', label: '全线乘数 ×' },
  { id: 'MONTH_BONUS', template: 'MONTH_BONUS: +¥10', label: '月底奖金 +¥' },
  { id: 'MONTH_STAR_RATE', template: 'MONTH_STAR_RATE: +5%', label: '评级率 +%' },
  { id: 'MONTH_NO_MAINTAIN', template: 'MONTH_NO_MAINTAIN', label: '免维持费' },
  { id: 'MONTH_AP', template: 'MONTH_AP: +5', label: 'AP 加成' },
  { id: 'SELF_IF_P1', template: 'SELF_IF_P1: x1.5', label: 'P1 时自身 ×' },
  { id: 'SELF_IF_P3_BOTH', template: 'SELF_IF_P3: BOTH: +30%', label: 'P3 时双向 +%' },
  { id: 'SELF_IF_P3_LINE', template: 'SELF_IF_P3: LINE_ALL: +30%', label: 'P3 时全线 +%' },
  { id: 'SELF_IF_P5', template: 'SELF_IF_P5: SELF: x2', label: 'P5 时自身 ×' },
  { id: 'SELF_IF_LEFT_R', template: 'SELF_IF_LEFT_DEPT_R: SELF: x2', label: '左邻 R 时自身 ×' },
  { id: 'SELF_IF_LINE_HAS_FUN', template: 'SELF_IF_LINE_HAS_FUN: SELF: x2', label: '线上有功能时 ×' },
  { id: 'SELF_IF_RIGHT_FUN', template: 'SELF_IF_RIGHT_FUN: x1.5', label: '右邻功能时 ×' },
  { id: 'SELF_IF_ADJ_FUN', template: 'SELF_IF_ADJ_FUN: +25%', label: '邻位功能时 +%' },
  { id: 'IF_ALL_THREE_DEPT', template: 'IF_ALL_THREE_DEPT_IN_LINE: LINE_XMULT: x1.5', label: '三部门齐全时 ×' },
  { id: 'TRIGGER_DIFF_DEPT', template: 'TRIGGER: LEFT_DEPT != RIGHT_DEPT: BOTH: +40%', label: '左右异部门时 ↔ +%' },
]

const BM_HOOKS = [
  { id: 'onMonthStart', label: '月初触发' },
  { id: 'onSettle', label: '结算乘区' },
  { id: 'onCharge', label: '一次性 charge' },
]

const RARITIES = ['common', 'rare', 'elite', 'epic', 'legendary']
const DEPTS = ['R', 'S', 'O', 'NONE']
const TIERS = ['专员', '经理', '总监', 'VP', 'CXO', '顶级', '进阶', '基础', '功能']
const EVENT_TONES = ['增益', '风险', '机会', '中性']

export default function CompendiumScreen({ onClose }) {
  const [activeTab, setActiveTab] = useState('emp')
  const [devMode, setDevMode] = useState(true)
  const [editing, setEditing] = useState(null) // { type, item }
  const [, setDirty] = useState(0)
  const forceUpdate = () => setDirty((d) => d + 1)

  // 按 tab 过滤数据
  const items = useMemo(() => {
    switch (activeTab) {
      case 'emp':
        return CARD_TEMPLATES.filter((c) => c.type === 'emp' && c.rarity !== 'legendary')
      case 'srv':
        return CARD_TEMPLATES.filter((c) => c.type === 'srv' && c.rarity !== 'legendary')
      case 'fun':
        return CARD_TEMPLATES.filter((c) => c.type === 'fun' && c.rarity !== 'legendary')
      case 'leg':
        return CARD_TEMPLATES.filter((c) => c.rarity === 'legendary')
      case 'bm':
        return BUSINESS_MODELS
      case 'event':
        return EVENTS
      case 'board':
        return BOARD_EVENTS
      default:
        return []
    }
  }, [activeTab])

  function handleEdit(type, item) {
    setEditing({ type, item })
  }

  async function handleSave(type, item) {
    try {
      await persistCompendiumItem(type, item)
      setEditing(null)
      forceUpdate()
    } catch (error) {
      alert(`写回 cards.js 失败: ${error.message}`)
    }
  }

  function handleCancelEdit() {
    setEditing(null)
  }

  return (
    <main className="compendium-shell">
      <div className="compendium-bg" aria-hidden="true" />

      <header className="compendium-topbar">
        <div className="compendium-title">
          <span>FRANK'S ADVANTURE</span>
          <strong>图鉴 · COMPENDIUM</strong>
          <em>{items.length} 项</em>
        </div>
        <div className="compendium-controls">
          {IS_DEV_MODE_AVAILABLE && (
            <label className={`dev-toggle ${devMode ? 'on' : ''}`}>
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => setDevMode(e.target.checked)}
              />
              <span>✎ 编辑模式</span>
            </label>
          )}
          <button className="compendium-close" onClick={onClose}>返回 ▸</button>
        </div>
      </header>

      {devMode && (
        <div className="dev-banner">
          ✎ 编辑模式 · 保存后默认写回 src/game/cards.js · 本次会话同步生效
        </div>
      )}

      <div className="compendium-layout">
        <aside className="compendium-tabs">
          {TABS.map((tab) => {
            const count = countOf(tab.id)
            return (
              <button
                key={tab.id}
                className={`compendium-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <strong>{tab.label}</strong>
                <span>{tab.subtitle}</span>
                <em>{count}</em>
              </button>
            )
          })}
        </aside>

        <section className="compendium-content">
          {(activeTab === 'emp' || activeTab === 'srv' || activeTab === 'fun' || activeTab === 'leg') && (
            <div className="compendium-grid card-grid">
              {items.map((card) => (
                <CompendiumCard
                  key={card.id}
                  card={card}
                  devMode={devMode}
                  onEdit={() => handleEdit('card', card)}
                />
              ))}
            </div>
          )}
          {activeTab === 'bm' && (
            <div className="compendium-grid bm-grid">
              {items.map((bm) => (
                <CompendiumBM
                  key={bm.id}
                  bm={bm}
                  devMode={devMode}
                  onEdit={() => handleEdit('bm', bm)}
                />
              ))}
            </div>
          )}
          {activeTab === 'event' && (
            <div className="compendium-grid event-grid">
              {items.map((ev) => (
                <CompendiumEvent
                  key={ev.id}
                  event={ev}
                  devMode={devMode}
                  onEdit={() => handleEdit('event', ev)}
                />
              ))}
            </div>
          )}
          {activeTab === 'board' && (
            <div className="compendium-grid event-grid">
              {items.map((ev) => (
                <CompendiumBoardEvent
                  key={ev.id}
                  event={ev}
                  devMode={devMode}
                  onEdit={() => handleEdit('board', ev)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {editing && editing.type === 'card' && (
        <CardEditModal card={editing.item} onSave={handleSave} onCancel={handleCancelEdit} />
      )}
      {editing && editing.type === 'bm' && (
        <BmEditModal bm={editing.item} onSave={handleSave} onCancel={handleCancelEdit} />
      )}
      {editing && editing.type === 'event' && (
        <EventEditModal event={editing.item} onSave={handleSave} onCancel={handleCancelEdit} />
      )}
      {editing && editing.type === 'board' && (
        <BoardEventEditModal event={editing.item} onSave={handleSave} onCancel={handleCancelEdit} />
      )}
    </main>
  )
}

function countOf(tabId) {
  switch (tabId) {
    case 'emp': return CARD_TEMPLATES.filter((c) => c.type === 'emp' && c.rarity !== 'legendary').length
    case 'srv': return CARD_TEMPLATES.filter((c) => c.type === 'srv' && c.rarity !== 'legendary').length
    case 'fun': return CARD_TEMPLATES.filter((c) => c.type === 'fun' && c.rarity !== 'legendary').length
    case 'leg': return CARD_TEMPLATES.filter((c) => c.rarity === 'legendary').length
    case 'bm': return BUSINESS_MODELS.length
    case 'event': return EVENTS.length
    case 'board': return BOARD_EVENTS.length
    default: return 0
  }
}

async function persistCompendiumItem(type, item) {
  const response = await fetch('/__dev/write-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, item }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok) {
    throw new Error(result.error || `HTTP ${response.status}`)
  }
}

// ============================================================================
// 卡片渲染（图鉴版，纯展示）
// ============================================================================

function CompendiumCard({ card, devMode, onEdit }) {
  return (
    <div className={`compendium-card rarity-${card.rarity} dept-${card.dept.toLowerCase()}`}>
      <CardView card={createCompendiumDisplayCard(card)} mode="compendium" />
      {devMode && (
        <button className="compendium-edit-btn" onClick={onEdit} title="编辑">✎</button>
      )}
    </div>
  )
}

function createCompendiumDisplayCard(card) {
  return {
    ...card,
    uid: `compendium-${card.id}`,
    cost: Number.parseInt(card.costSpec, 10) || 0,
    baseOutput: Number.parseInt(card.baseOutputSpec, 10) || 0,
    baseCostMedian: Number.parseInt(card.costSpec, 10) || 0,
    baseOutputMedian: Number.parseInt(card.baseOutputSpec, 10) || 0,
    outputDelta: 'neutral',
    costDelta: 'neutral',
    effects: card.effects || [],
    affixes: [],
    affixEffects: [],
    coolingRemaining: 0,
    location: 'compendium',
  }
}

function CompendiumBM({ bm, devMode, onEdit }) {
  const hookLabel = BM_HOOKS.find((h) => h.id === bm.hook)?.label ?? bm.hook
  return (
    <div
      className={`compendium-bm rarity-${bm.rarity} hook-${bm.hook}`}
      data-bm-tip={bm.flavor}
    >
      <img className="compendium-bm-image" src={businessModeImageSrc(bm)} alt="" aria-hidden="true" />
      {devMode && (
        <button className="compendium-edit-btn" onClick={onEdit} title="编辑">✎</button>
      )}
      <div className="cc-bm-top">
        <strong>{bm.name}</strong>
        <span>{RARITY_LABELS[bm.rarity] ?? bm.rarity}</span>
      </div>
      <em className="cc-bm-hook">{hookLabel}</em>
      <p className="cc-bm-desc">{bm.description}</p>
      <span className="cc-bm-cost">💰{bm.cost} · 解锁 关{bm.unlockLevel}</span>
      <p className="cc-bm-flavor">{bm.flavor || '—'}</p>
      <span className="cc-id">{bm.id}</span>
    </div>
  )
}

function businessModeImageSrc(bm) {
  return bm?.id ? `/assets/business-modes/${bm.id}.png?v=bm-square-1-40` : ''
}

function CompendiumEvent({ event, devMode, onEdit }) {
  return (
    <div className={`compendium-event tone-${event.tone || '中性'}`}>
      {devMode && (
        <button className="compendium-edit-btn" onClick={onEdit} title="编辑">✎</button>
      )}
      <div className="cc-event-top">
        <strong>{event.name}</strong>
        <span>{event.tone}</span>
      </div>
      <p className="cc-event-desc">{event.description}</p>
      <ul className="cc-event-effects">
        {(event.effectLines || []).map((line, i) => <li key={i}>{line}</li>)}
      </ul>
      <span className="cc-id">{event.id}</span>
    </div>
  )
}

function CompendiumBoardEvent({ event, devMode, onEdit }) {
  return (
    <div className="compendium-board-event">
      {devMode && (
        <button className="compendium-edit-btn" onClick={onEdit} title="编辑">✎</button>
      )}
      <div className="cc-event-top">
        <strong>{event.title}</strong>
        <span>关间</span>
      </div>
      <p className="cc-event-desc">{event.flavor}</p>
      <ul className="cc-event-effects">
        {(event.options || []).map((opt, i) => (
          <li key={i}>
            <b>{opt.label}</b> {opt.cost ? ` (-💰${opt.cost})` : ''} — {opt.result || (opt.effect?.type ?? '—')}
          </li>
        ))}
      </ul>
      <span className="cc-id">{event.id}</span>
    </div>
  )
}

// ============================================================================
// 编辑 Modal · 卡片
// ============================================================================

function CardEditModal({ card, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    name: card.name,
    dept: card.dept,
    rarity: card.rarity,
    tier: card.tier,
    ap: card.ap,
    costSpec: card.costSpec,
    baseOutputSpec: card.baseOutputSpec,
    unlockLevel: card.unlockLevel,
    effects: [...card.effects],
    flavor: card.flavor || '',
  })

  function save() {
    Object.assign(card, draft, {
      ap: parseInt(draft.ap) || 1,
      unlockLevel: parseInt(draft.unlockLevel) || 1,
      effects: draft.effects.filter((e) => e.trim()),
    })
    onSave('card', card)
  }

  return (
    <div className="edit-backdrop" onMouseDown={onCancel}>
      <section className="edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <strong>编辑卡片 · {card.id}</strong>
          <span>保存后写回 src/game/cards.js</span>
        </header>

        <div className="edit-grid">
          <Field label="名称" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <SelectField label="部门" value={draft.dept} options={DEPTS} onChange={(v) => setDraft({ ...draft, dept: v })} />
          <SelectField label="稀有度" value={draft.rarity} options={RARITIES} onChange={(v) => setDraft({ ...draft, rarity: v })} />
          <SelectField label="职级" value={draft.tier} options={TIERS} onChange={(v) => setDraft({ ...draft, tier: v })} />
          <Field label="AP" type="number" value={draft.ap} onChange={(v) => setDraft({ ...draft, ap: v })} />
          <Field label="解锁关卡" type="number" value={draft.unlockLevel} onChange={(v) => setDraft({ ...draft, unlockLevel: v })} />
          <Field label="cost (招聘价, 含 ±%)" value={draft.costSpec} placeholder="如 20 ±20%" onChange={(v) => setDraft({ ...draft, costSpec: v })} />
          <Field label="baseOutput (基础产出, 含 ±%)" value={draft.baseOutputSpec} placeholder="如 50 ±20%" onChange={(v) => setDraft({ ...draft, baseOutputSpec: v })} />
        </div>

        <EffectsEditor effects={draft.effects} onChange={(effects) => setDraft({ ...draft, effects })} />

        <Field label="人物介绍 / Flavor Text" value={draft.flavor} onChange={(v) => setDraft({ ...draft, flavor: v })} multiline />

        <div className="edit-actions">
          <button className="edit-cancel" onClick={onCancel}>取消</button>
          <button className="edit-save" onClick={save}>保存</button>
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// 编辑 Modal · 商业模式
// ============================================================================

function BmEditModal({ bm, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    name: bm.name,
    hook: bm.hook,
    rarity: bm.rarity,
    unlockLevel: bm.unlockLevel,
    cost: bm.cost,
    description: bm.description,
    flavor: bm.flavor || '',
    payloadJson: JSON.stringify(bm.payload, null, 2),
  })

  function save() {
    let payload
    try {
      payload = JSON.parse(draft.payloadJson)
    } catch (e) {
      alert('Payload JSON 无效: ' + e.message)
      return
    }
    Object.assign(bm, {
      name: draft.name,
      hook: draft.hook,
      rarity: draft.rarity,
      unlockLevel: parseInt(draft.unlockLevel) || 1,
      cost: parseInt(draft.cost) || 1,
      description: draft.description,
      flavor: draft.flavor,
      payload,
    })
    onSave('bm', bm)
  }

  return (
    <div className="edit-backdrop" onMouseDown={onCancel}>
      <section className="edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <strong>编辑商业模式 · {bm.id}</strong>
          <span>payload 决定钩子行为，编辑时谨慎</span>
        </header>

        <div className="edit-grid">
          <Field label="名称" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <SelectField label="钩子类型" value={draft.hook} options={BM_HOOKS.map((h) => h.id)} onChange={(v) => setDraft({ ...draft, hook: v })} />
          <SelectField label="稀有度" value={draft.rarity} options={RARITIES} onChange={(v) => setDraft({ ...draft, rarity: v })} />
          <Field label="解锁关卡" type="number" value={draft.unlockLevel} onChange={(v) => setDraft({ ...draft, unlockLevel: v })} />
          <Field label="💰 价格" type="number" value={draft.cost} onChange={(v) => setDraft({ ...draft, cost: v })} />
          <Field label="描述（图鉴显示）" value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
        </div>

        <div className="field-block">
          <label>Payload JSON</label>
          <textarea
            className="json-editor"
            value={draft.payloadJson}
            onChange={(e) => setDraft({ ...draft, payloadJson: e.target.value })}
            rows={6}
          />
          <p className="field-hint">
            常见 type: <code>drawBonus</code> / <code>apIfHandRich</code> / <code>maintenanceDiscount</code> /
            <code> sameDeptAdjBonus</code> / <code>deptBonus</code> / <code>p1Bonus</code> / <code>p5Bonus</code>
          </p>
        </div>

        <Field label="Flavor Text" value={draft.flavor} onChange={(v) => setDraft({ ...draft, flavor: v })} multiline />

        <div className="edit-actions">
          <button className="edit-cancel" onClick={onCancel}>取消</button>
          <button className="edit-save" onClick={save}>保存</button>
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// 编辑 Modal · 月度事件
// ============================================================================

function EventEditModal({ event, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    name: event.name,
    tone: event.tone || '中性',
    description: event.description,
    effectLines: [...(event.effectLines || [])],
    cashDelta: event.cashDelta ?? 0,
    recruitExtra: event.recruitExtra ?? 0,
    incomeMultiplier: event.incomeMultiplier ?? 1,
    maintenanceMultiplier: event.maintenanceMultiplier ?? 1,
    apDelta: event.apDelta ?? 0,
  })

  function save() {
    Object.assign(event, {
      name: draft.name,
      tone: draft.tone,
      description: draft.description,
      effectLines: draft.effectLines.filter((l) => l.trim()),
      cashDelta: parseFloat(draft.cashDelta) || 0,
      recruitExtra: parseFloat(draft.recruitExtra) || 0,
      incomeMultiplier: parseFloat(draft.incomeMultiplier) || 1,
      maintenanceMultiplier: parseFloat(draft.maintenanceMultiplier) || 1,
      apDelta: parseFloat(draft.apDelta) || 0,
    })
    onSave('event', event)
  }

  return (
    <div className="edit-backdrop" onMouseDown={onCancel}>
      <section className="edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <strong>编辑月度事件 · {event.id}</strong>
          <span>每月 Phase 2 随机翻牌时可能触发</span>
        </header>

        <div className="edit-grid">
          <Field label="名称" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <SelectField label="基调" value={draft.tone} options={EVENT_TONES} onChange={(v) => setDraft({ ...draft, tone: v })} />
          <Field label="¥ 立即变化" type="number" value={draft.cashDelta} onChange={(v) => setDraft({ ...draft, cashDelta: v })} />
          <Field label="招聘市场 +N" type="number" value={draft.recruitExtra} onChange={(v) => setDraft({ ...draft, recruitExtra: v })} />
          <Field label="收入乘数 (1=不变)" value={draft.incomeMultiplier} onChange={(v) => setDraft({ ...draft, incomeMultiplier: v })} />
          <Field label="维持费乘数 (1=不变)" value={draft.maintenanceMultiplier} onChange={(v) => setDraft({ ...draft, maintenanceMultiplier: v })} />
          <Field label="AP 变化" type="number" value={draft.apDelta} onChange={(v) => setDraft({ ...draft, apDelta: v })} />
        </div>

        <Field label="描述" value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} multiline />

        <div className="field-block">
          <label>效果说明文案（每行一条）</label>
          {draft.effectLines.map((line, i) => (
            <div key={i} className="effect-row">
              <input
                value={line}
                onChange={(e) => {
                  const next = [...draft.effectLines]
                  next[i] = e.target.value
                  setDraft({ ...draft, effectLines: next })
                }}
              />
              <button onClick={() => setDraft({ ...draft, effectLines: draft.effectLines.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
          <button className="add-effect-btn" onClick={() => setDraft({ ...draft, effectLines: [...draft.effectLines, ''] })}>+ 加一条</button>
        </div>

        <div className="edit-actions">
          <button className="edit-cancel" onClick={onCancel}>取消</button>
          <button className="edit-save" onClick={save}>保存</button>
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// 编辑 Modal · 董事访谈事件
// ============================================================================

function BoardEventEditModal({ event, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    title: event.title,
    flavor: event.flavor,
    options: event.options.map((o) => ({ ...o, _optionJson: JSON.stringify(o.effect, null, 2) })),
  })

  function save() {
    const next = draft.options.map((o) => {
      let effect = o.effect
      if (o._optionJson) {
        try {
          effect = JSON.parse(o._optionJson)
        } catch (e) {
          alert(`选项 ${o.id} 的 effect JSON 无效: ${e.message}`)
          throw e
        }
      }
      return {
        id: o.id,
        label: o.label,
        cost: o.cost ? parseFloat(o.cost) : undefined,
        effect,
        result: o.result,
      }
    })
    Object.assign(event, { title: draft.title, flavor: draft.flavor, options: next })
    onSave('board', event)
  }

  function updateOption(idx, key, value) {
    const next = [...draft.options]
    next[idx] = { ...next[idx], [key]: value }
    setDraft({ ...draft, options: next })
  }

  return (
    <div className="edit-backdrop" onMouseDown={onCancel}>
      <section className="edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <strong>编辑董事访谈 · {event.id}</strong>
          <span>关间会议入场弹出</span>
        </header>

        <Field label="标题" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
        <Field label="情境描述 (flavor)" value={draft.flavor} onChange={(v) => setDraft({ ...draft, flavor: v })} multiline />

        <div className="field-block">
          <label>选项 ({draft.options.length})</label>
          {draft.options.map((opt, i) => (
            <div key={i} className="board-option-block">
              <div className="edit-grid">
                <Field label={`选项 ${opt.id} · 标签`} value={opt.label} onChange={(v) => updateOption(i, 'label', v)} />
                <Field label="cost (可空)" value={opt.cost ?? ''} onChange={(v) => updateOption(i, 'cost', v)} />
                <Field label="结果文案 (toast)" value={opt.result || ''} onChange={(v) => updateOption(i, 'result', v)} />
              </div>
              <div className="field-block">
                <label>effect JSON</label>
                <textarea
                  className="json-editor"
                  rows={3}
                  value={opt._optionJson}
                  onChange={(e) => updateOption(i, '_optionJson', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="edit-actions">
          <button className="edit-cancel" onClick={onCancel}>取消</button>
          <button className="edit-save" onClick={save}>保存</button>
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// effects 编辑器（卡片专用）
// ============================================================================

function EffectsEditor({ effects, onChange }) {
  const [pickedTemplate, setPickedTemplate] = useState('')

  function updateAt(idx, value) {
    const next = [...effects]
    next[idx] = value
    onChange(next)
  }

  function removeAt(idx) {
    onChange(effects.filter((_, i) => i !== idx))
  }

  function addTemplate() {
    if (!pickedTemplate) return
    const tpl = EFFECT_TEMPLATES.find((t) => t.id === pickedTemplate)
    if (tpl) {
      onChange([...effects, tpl.template])
    }
    setPickedTemplate('')
  }

  return (
    <div className="field-block effects-editor">
      <label>效果 effects ({effects.length})</label>
      {effects.map((e, i) => (
        <div key={i} className="effect-row">
          <input
            value={e}
            onChange={(ev) => updateAt(i, ev.target.value)}
          />
          <button onClick={() => removeAt(i)} title="删除">×</button>
        </div>
      ))}
      <div className="effect-template-picker">
        <select value={pickedTemplate} onChange={(e) => setPickedTemplate(e.target.value)}>
          <option value="">从常用 effect 模板选择...</option>
          {EFFECT_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>{t.label} → {t.template}</option>
          ))}
        </select>
        <button onClick={addTemplate} disabled={!pickedTemplate}>+ 添加</button>
      </div>
      <p className="field-hint">
        提示: 数值后可加 <code>±X%</code> 表示开卡 roll 波动 (如 <code>RIGHT: +25% ±15%</code>)
      </p>
    </div>
  )
}

// ============================================================================
// 表单原子组件
// ============================================================================

function Field({ label, value, onChange, placeholder, type = 'text', multiline = false }) {
  return (
    <div className="field-block">
      <label>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="field-block">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
