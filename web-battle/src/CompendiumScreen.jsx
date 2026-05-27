import React, { useState, useMemo } from 'react'
import { CardView } from './CardView.jsx'
import { useFloatingTooltip } from './hooks/useFloatingTooltip.jsx'
import {
  BOARD_EVENTS,
  BUSINESS_MODELS,
  CARD_TEMPLATES,
  EVENTS,
  RARITY_LABELS,
  RARITY_TABLE,
  RARITY_RANDOM_SPEC,
  RANDOM_FUNCTION_POOL,
  DEPT_L1_EFFECTS,
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
  { id: 'event', label: '季度新闻', subtitle: '宏观风向' },
  { id: 'board', label: '董事访谈', subtitle: '关间事件' },
  { id: 'combo', label: 'Combo 规则', subtitle: '5 个产线组合' },
  { id: 'rarity', label: '稀有度参数', subtitle: 'Burn/资产/Roll' },
  { id: 'random', label: '随机功能池', subtitle: 'lv1-4 词条' },
]

// v4: 5 个产线 Combo 的定义与说明
const V4_COMBO_DEFS = [
  { id: 'pair', name: '双子 (Pair)', rarity: 'common',
    trigger: '相邻 2 个槽位都是同部门「专员」级别',
    effect: '该 2 张卡 +30% 产出',
    note: '低门槛 combo，适合开局靠数量起手' },
  { id: 'chain', name: '升阶链 (Promotion Chain)', rarity: 'rare',
    trigger: '同部门「专员 → 经理 → 总监」按 tier 递增排列在连续 3 槽',
    effect: '整条产线 ×1.5',
    note: '体现"团队梯队"的商业逻辑，奖励有节奏的招聘' },
  { id: 'fullRoster', name: '满编 (Full Roster)', rarity: 'elite',
    trigger: '一条产线 5 张卡全部是同部门（且非 NONE）',
    effect: '整线 ×2 + 触发对应部门 5 张流派质变 buff',
    note: '"All in 一个部门"的终极爆发，但 burn 也会非常高' },
  { id: 'rainbow', name: '三色管理 (Rainbow Trio)', rarity: 'epic',
    trigger: '一条产线含 3 张相同 tier、不同部门 (R/S/O)',
    effect: '整线 +40% + 下月免费抽 1 张',
    note: '奖励"高管管理团队"的均衡布局' },
  { id: 'execMeeting', name: '高管会议 (Exec Meeting)', rarity: 'legendary',
    trigger: '3 张同 tier 必须是 VP 或 CXO 级且不同部门',
    effect: '整线 ×1.8 + 下月 AP +3',
    note: '需要大量传奇/史诗卡，但对应回报也最猛' },
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

const CompendiumTooltipCtx = React.createContext(null)

export default function CompendiumScreen({ onClose }) {
  const [activeTab, setActiveTab] = useState('emp')
  const [devMode, setDevMode] = useState(true)
  const [editing, setEditing] = useState(null) // { type, item }
  const [, setDirty] = useState(0)
  const forceUpdate = () => setDirty((d) => d + 1)
  const compTooltip = useFloatingTooltip({ delay: 150 })

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
      case 'combo':
        return V4_COMBO_DEFS
      case 'rarity':
        return Object.entries(RARITY_TABLE).map(([key, val]) => ({ id: key, ...val, spec: RARITY_RANDOM_SPEC[key] }))
      case 'random':
        return Object.entries(RANDOM_FUNCTION_POOL).flatMap(([lv, fns]) =>
          fns.map(fn => ({ ...fn, lv }))
        )
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
    <CompendiumTooltipCtx.Provider value={compTooltip}>
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
          {activeTab === 'combo' && (
            <ComboReferencePanel combos={items} />
          )}
          {activeTab === 'rarity' && (
            <RarityReferencePanel rows={items} devMode={devMode} onEdit={(r) => handleEdit('rarity', r)} />
          )}
          {activeTab === 'random' && (
            <RandomFunctionPanel items={items} devMode={devMode} onEdit={(fn) => handleEdit('random', fn)} />
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
      {editing && editing.type === 'rarity' && (
        <RarityEditModal row={editing.item} onSave={handleSave} onCancel={handleCancelEdit} />
      )}
      {editing && editing.type === 'random' && (
        <RandomFunctionEditModal fn={editing.item} onSave={handleSave} onCancel={handleCancelEdit} />
      )}
      {compTooltip.renderTooltip()}
    </main>
    </CompendiumTooltipCtx.Provider>
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
    case 'combo': return V4_COMBO_DEFS.length
    case 'rarity': return Object.keys(RARITY_TABLE).length
    case 'random': return Object.values(RANDOM_FUNCTION_POOL).reduce((s, arr) => s + arr.length, 0)
    default: return 0
  }
}

async function persistCompendiumItem(type, item) {
  // v4: 稀有度 / 随机功能池属于 object-export 常量，本会话内存生效
  // 但不会自动写回 cards.js（需手动编辑文件以做永久保存）
  if (type === 'rarity' || type === 'random') {
    console.info(`[Compendium] ${type} 已在内存中更新（本会话生效）。如需永久保存，请手动编辑 src/game/cards.js 的 RARITY_TABLE / RANDOM_FUNCTION_POOL 常量。`)
    return
  }
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
  const tooltipCtx = React.useContext(CompendiumTooltipCtx)
  return (
    <div
      className={`compendium-bm rarity-${bm.rarity} hook-${bm.hook}`}
      onPointerEnter={(e) => tooltipCtx.showTooltip(
        <div>
          <div className="tooltip-title">{bm.name}</div>
          <div>{bm.description}</div>
          {bm.flavor && (
            <>
              <div className="tooltip-divider" />
              <div style={{ fontStyle: 'italic', color: '#fff4bd', opacity: 0.8 }}>"{bm.flavor}"</div>
            </>
          )}
        </div>,
        e
      )}
      onPointerMove={tooltipCtx.updateTooltip}
      onPointerLeave={tooltipCtx.hideTooltip}
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
      <span className="cc-bm-cost">¥{bm.cost} · 解锁 关{bm.unlockLevel}</span>
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
            <b>{opt.label}</b> {opt.cost ? ` (-¥${opt.cost})` : ''} — {opt.result || (opt.effect?.type ?? '—')}
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
          <Field label="¥ 价格" type="number" value={draft.cost} onChange={(v) => setDraft({ ...draft, cost: v })} />
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
// 编辑 Modal · 季度新闻
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
          <strong>编辑季度新闻 · {event.id}</strong>
          <span>每季度刷新，影响本季度经营</span>
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

// ============================================================================
// v4: Combo 规则参考面板（read-only，5 个 combo 定义）
// ============================================================================
function ComboReferencePanel({ combos }) {
  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h2 style={{ marginBottom: 4 }}>5 个产线 Combo · 规则与定义</h2>
      <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 24 }}>
        Combo 在 computeLineOutput 中自动检测，无需手动触发。所有效果叠加在 lineMultiplier 上，与流派质变、槽位区位 buff 共同生效。详见 engine.js detectCombos。
      </p>
      <div style={{ display: 'grid', gap: 14 }}>
        {combos.map((c) => (
          <article key={c.id} className={`combo-rule rarity-${c.rarity}`} style={{ padding: 16, border: '1px solid #444', borderRadius: 8, background: '#1a1d29' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <strong style={{ fontSize: 18, color: '#fff' }}>{c.name}</strong>
              <span style={{ fontSize: 12, opacity: 0.7 }}>稀有度示意: {c.rarity}</span>
            </div>
            <div style={{ fontSize: 14, marginBottom: 6, color: '#f4f4f5' }}><b style={{ color: '#60a5fa' }}>触发条件：</b>{c.trigger}</div>
            <div style={{ fontSize: 14, marginBottom: 6, color: '#f4f4f5' }}><b style={{ color: '#4ade80' }}>效果：</b>{c.effect}</div>
            <div style={{ fontSize: 13, opacity: 0.7, fontStyle: 'italic', color: '#94a3b8' }}>— {c.note}</div>
          </article>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// v4: 稀有度参数面板（可编辑 RARITY_TABLE 与 RARITY_RANDOM_SPEC）
// ============================================================================
function RarityReferencePanel({ rows, devMode, onEdit }) {
  return (
    <div style={{ padding: 16, overflowX: 'auto' }}>
      <h2 style={{ marginBottom: 4 }}>稀有度参数表</h2>
      <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 16 }}>
        左半部分（Burn/资产）控制经济成本与估值贡献；右半部分（Roll 配置）控制员工卡开包时抽随机功能的数量与 lv 范围。
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#2a2f3d', color: '#fff' }}>
            <th style={cellStyle}>稀有度</th>
            <th style={cellStyle}>Base Burn</th>
            <th style={cellStyle}>Extra Burn</th>
            <th style={cellStyle}>卡牌资产</th>
            <th style={cellStyle}>BM 月费</th>
            <th style={cellStyle}>BM 资产</th>
            <th style={cellStyle}>随机功能数</th>
            <th style={cellStyle}>2 个几率</th>
            <th style={cellStyle}>可抽 lv</th>
            {devMode && <th style={cellStyle}></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderBottom: '1px solid #333' }}>
              <td style={cellStyle}><b className={`rarity-${r.id}`}>{RARITY_LABELS[r.id] ?? r.id}</b></td>
              <td style={cellStyle}>{r.baseBurn}</td>
              <td style={cellStyle}>{r.extraBurn}</td>
              <td style={cellStyle}>{r.assetValue}</td>
              <td style={cellStyle}>{r.bmMonthlyCost}</td>
              <td style={cellStyle}>{r.bmAssetValue}</td>
              <td style={cellStyle}>{r.spec?.fnCount ?? 0}</td>
              <td style={cellStyle}>{Math.round((r.spec?.secondFnChance ?? 0) * 100)}%</td>
              <td style={cellStyle}>{(r.spec?.lvRange ?? []).join(', ') || '—'}</td>
              {devMode && (
                <td style={cellStyle}>
                  <button className="compendium-edit-btn" onClick={() => onEdit(r)} title="编辑">✎</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const cellStyle = { padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid #2a2f3d' }

function RarityEditModal({ row, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    baseBurn: row.baseBurn, extraBurn: row.extraBurn, assetValue: row.assetValue,
    bmMonthlyCost: row.bmMonthlyCost, bmAssetValue: row.bmAssetValue,
    fnCount: row.spec?.fnCount ?? 0,
    secondFnChance: row.spec?.secondFnChance ?? 0,
    lvRange: (row.spec?.lvRange ?? []).join(','),
  })

  function save() {
    // Mutate live constants
    const target = RARITY_TABLE[row.id]
    target.baseBurn = parseInt(draft.baseBurn) || 0
    target.extraBurn = parseInt(draft.extraBurn) || 0
    target.assetValue = parseInt(draft.assetValue) || 0
    target.bmMonthlyCost = parseInt(draft.bmMonthlyCost) || 0
    target.bmAssetValue = parseInt(draft.bmAssetValue) || 0
    const spec = RARITY_RANDOM_SPEC[row.id]
    if (spec) {
      spec.fnCount = parseInt(draft.fnCount) || 0
      spec.secondFnChance = parseFloat(draft.secondFnChance) || 0
      spec.lvRange = draft.lvRange.split(',').map(s => s.trim()).filter(Boolean)
    }
    onSave('rarity', { id: row.id, ...target, spec })
  }

  return (
    <div className="edit-backdrop" onMouseDown={onCancel}>
      <section className="edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <strong>编辑稀有度参数 · {RARITY_LABELS[row.id]}</strong>
          <span>影响所有该稀有度的卡牌与商业模式</span>
        </header>
        <div className="edit-grid">
          <Field label="Base Burn (每月)" type="number" value={draft.baseBurn} onChange={(v) => setDraft({ ...draft, baseBurn: v })} />
          <Field label="Extra Burn (上线当月)" type="number" value={draft.extraBurn} onChange={(v) => setDraft({ ...draft, extraBurn: v })} />
          <Field label="卡牌资产值 (V 贡献 ×0.5×2)" type="number" value={draft.assetValue} onChange={(v) => setDraft({ ...draft, assetValue: v })} />
          <Field label="BM 月费" type="number" value={draft.bmMonthlyCost} onChange={(v) => setDraft({ ...draft, bmMonthlyCost: v })} />
          <Field label="BM 资产值" type="number" value={draft.bmAssetValue} onChange={(v) => setDraft({ ...draft, bmAssetValue: v })} />
          <Field label="随机功能 N 个" type="number" value={draft.fnCount} onChange={(v) => setDraft({ ...draft, fnCount: v })} />
          <Field label="额外 1 个几率 (0-1)" value={draft.secondFnChance} onChange={(v) => setDraft({ ...draft, secondFnChance: v })} />
          <Field label="可抽 lv (逗号分隔)" value={draft.lvRange} placeholder="lv1,lv2" onChange={(v) => setDraft({ ...draft, lvRange: v })} />
        </div>
        <p className="field-hint">注：v4 资产路径 = (cardAssetSum + bmAssetSum) × 2 计入 V。Burn 控制玩家经济压力。</p>
        <div className="edit-actions">
          <button className="edit-cancel" onClick={onCancel}>取消</button>
          <button className="edit-save" onClick={save}>保存</button>
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// v4: 随机功能池面板（可编辑 RANDOM_FUNCTION_POOL）
// ============================================================================
function RandomFunctionPanel({ items, devMode, onEdit }) {
  const grouped = items.reduce((acc, fn) => {
    if (!acc[fn.lv]) acc[fn.lv] = []
    acc[fn.lv].push(fn)
    return acc
  }, {})
  const lvOrder = ['lv1', 'lv2', 'lv3', 'lv4']
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 4 }}>随机功能池（按 lv 分级）</h2>
      <p style={{ opacity: 0.7, fontSize: 13, marginBottom: 16 }}>
        员工卡（rare 及以上）开包时按稀有度抽 N 个随机功能。lv 越高效果越强，但通常只对 epic/legendary 开放。
      </p>
      {lvOrder.map(lv => grouped[lv] && (
        <section key={lv} style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 8, color: '#c084fc' }}>
            {lv.toUpperCase()} · {lv === 'lv1' ? '微小' : lv === 'lv2' ? '小' : lv === 'lv3' ? '中' : '大'}
            <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.6 }}>{grouped[lv].length} 个</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {grouped[lv].map(fn => (
              <div key={fn.id} style={{ padding: 12, border: '1px solid #444', borderRadius: 6, background: '#1a1d29', position: 'relative' }}>
                <div style={{ fontWeight: 'bold', color: '#f4f4f5', marginBottom: 4 }}>{fn.name}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>{fn.id}</div>
                {(fn.effects || []).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#4ade80' }}>• {e}</div>
                ))}
                {devMode && (
                  <button className="compendium-edit-btn" onClick={() => onEdit(fn)} title="编辑">✎</button>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function RandomFunctionEditModal({ fn, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    name: fn.name,
    effects: [...(fn.effects || [])],
    lv: fn.lv,
  })

  function save() {
    // Find and mutate the entry in RANDOM_FUNCTION_POOL
    const oldLvArr = RANDOM_FUNCTION_POOL[fn.lv]
    const target = oldLvArr?.find(f => f.id === fn.id)
    if (!target) return
    target.name = draft.name
    target.effects = draft.effects.filter(e => e.trim())
    // If lv changed, move
    if (draft.lv !== fn.lv) {
      const idx = oldLvArr.indexOf(target)
      if (idx >= 0) oldLvArr.splice(idx, 1)
      if (!RANDOM_FUNCTION_POOL[draft.lv]) RANDOM_FUNCTION_POOL[draft.lv] = []
      RANDOM_FUNCTION_POOL[draft.lv].push(target)
    }
    onSave('random', { ...target, lv: draft.lv })
  }

  return (
    <div className="edit-backdrop" onMouseDown={onCancel}>
      <section className="edit-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <strong>编辑随机功能 · {fn.id}</strong>
          <span>影响所有员工卡开包时可能抽到的功能</span>
        </header>
        <div className="edit-grid">
          <Field label="名称" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <SelectField label="等级 (lv)" value={draft.lv} options={['lv1', 'lv2', 'lv3', 'lv4']} onChange={(v) => setDraft({ ...draft, lv: v })} />
        </div>
        <EffectsEditor effects={draft.effects} onChange={(effects) => setDraft({ ...draft, effects })} />
        <p className="field-hint">提示：lv1 微小 / lv2 小 / lv3 中 / lv4 大。共抽 lv 由稀有度配置决定。</p>
        <div className="edit-actions">
          <button className="edit-cancel" onClick={onCancel}>取消</button>
          <button className="edit-save" onClick={save}>保存</button>
        </div>
      </section>
    </div>
  )
}
