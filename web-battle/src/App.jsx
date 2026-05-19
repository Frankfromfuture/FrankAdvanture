import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Coins,
  Factory,
  HandCoins,
  Layers3,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  UserPlus,
  Zap,
} from 'lucide-react'
import DaylightBoardroomBg from './DaylightBoardroomBg.jsx'
import { DEPT_META, RARITY_LABELS } from './game/cards.js'
import {
  GAME_CONFIG,
  buyRecruit,
  clearPlanningLine,
  computeBattlePreview,
  createInitialState,
  discardFromHand,
  getActiveLine,
  getEffectiveApLimit,
  getLineAp,
  placeCardInSlot,
  resolveMonth,
  returnSlotToHand,
} from './game/engine.js'

function App() {
  const [game, setGame] = useState(() => createInitialState())
  const [hint, setHint] = useState('')
  const [drawer, setDrawer] = useState(null)
  const [enteringHandUids, setEnteringHandUids] = useState(() => new Set())
  const [settlementFx, setSettlementFx] = useState(null)
  const [isSettling, setIsSettling] = useState(false)
  const [draggingCardUid, setDraggingCardUid] = useState(null)
  const hintTimerRef = useRef(null)
  const handEntryTimerRef = useRef(null)
  const settlementFxTimerRef = useRef(null)

  const activeLine = getActiveLine(game)
  const selectedCard = game.hand.find((card) => card.uid === game.selectedCardUid)
  const preview = useMemo(() => computeBattlePreview(game), [game])
  const activeLineAp = getLineAp(activeLine?.slots ?? [])
  const apLimit = getEffectiveApLimit(game)
  const progress = Math.min(100, Math.round((game.cumulativeIncome / game.level.target) * 100))

  useEffect(() => () => {
    window.clearTimeout(hintTimerRef.current)
    window.clearTimeout(handEntryTimerRef.current)
    window.clearTimeout(settlementFxTimerRef.current)
  }, [])

  function showHint(message) {
    setHint(message)
    window.clearTimeout(hintTimerRef.current)
    hintTimerRef.current = window.setTimeout(() => setHint(''), 2200)
  }

  function animateNewHand(previousState, nextState) {
    const previousHandUids = new Set(previousState.hand.map((card) => card.uid))
    const newHandUids = nextState.hand
      .map((card) => card.uid)
      .filter((uid) => !previousHandUids.has(uid))
    if (newHandUids.length === 0) return
    setEnteringHandUids(new Set(newHandUids))
    window.clearTimeout(handEntryTimerRef.current)
    handEntryTimerRef.current = window.setTimeout(() => {
      setEnteringHandUids(new Set())
    }, 920 + (newHandUids.length - 1) * 120)
  }

  function commit(result, options = {}) {
    if (!result.ok) {
      showHint(result.message)
      return
    }
    if (options.fx) {
      const settlement = result.state.lastSettlement
      const nextSettlementFx = buildSettlementFx(settlement)
      setSettlementFx(nextSettlementFx)
      setIsSettling(true)
      window.clearTimeout(settlementFxTimerRef.current)
      settlementFxTimerRef.current = window.setTimeout(() => {
        setSettlementFx(null)
        setIsSettling(false)
        if (options.animateNewHand) animateNewHand(game, result.state)
        setGame(result.state)
      }, nextSettlementFx.duration)
      return
    }
    if (options.animateNewHand) animateNewHand(game, result.state)
    setGame(result.state)
  }

  function handleSlotClick(line, slotIndex) {
    if (isSettling) return
    if (line.status !== 'planning') return
    if (line.slots[slotIndex]) {
      commit(returnSlotToHand(game, line.id, slotIndex))
      return
    }
    if (!selectedCard) {
      showHint('先选择一张手牌')
      return
    }
    commit(placeCardInSlot(game, selectedCard.uid, slotIndex))
  }

  function canPlaceCardInSlot(line, slotIndex, card) {
    if (isSettling || !card) return false
    if (line.id !== game.activeLineId || line.status !== 'planning') return false
    if (line.slots[slotIndex]) return false
    const projectedSlots = line.slots.map((slot, index) => (index === slotIndex ? card : slot))
    return getLineAp(projectedSlots) <= getEffectiveApLimit(game, projectedSlots)
  }

  function handleCardDrop(cardUid, slotIndex) {
    if (isSettling || !cardUid) return
    commit(placeCardInSlot(game, cardUid, slotIndex))
    setDraggingCardUid(null)
  }

  function handleSettle() {
    if (isSettling) return
    commit(resolveMonth(game), { fx: true, animateNewHand: true })
  }

  function handleRecruit(cardUid) {
    commit(buyRecruit(game, cardUid))
  }

  function handleDiscard(cardUid) {
    commit(discardFromHand(game, cardUid))
  }

  function restart() {
    setGame(createInitialState())
    setHint('')
    setDrawer(null)
    setEnteringHandUids(new Set())
    setSettlementFx(null)
    setIsSettling(false)
    setDraggingCardUid(null)
    window.clearTimeout(settlementFxTimerRef.current)
  }

  return (
    <main className="battle-shell">
      <DaylightBoardroomBg />
      <div className="battle-vignette" />

      <TopHud
        game={game}
        progress={progress}
        activeLineAp={activeLineAp}
        apLimit={apLimit}
        onRestart={restart}
        onDeck={() => setDrawer('deck')}
        onCooling={() => setDrawer('cooling')}
      />

      <section className="battle-grid">
        <aside className="battle-panel ceo-panel">
          <PanelHeading icon={Sparkles} title="CEO Frank" sub="Year 1 / A Round" />
          <div className="ceo-stage">
            <div className="ceo-avatar" aria-hidden="true">
              <span className="pixel-hair" />
              <span className="pixel-face" />
              <span className="pixel-suit" />
              <span className="pixel-tablet" />
            </div>
            <div className="speech-bubble">
              <strong>{game.event.name}</strong>
              <span>{game.event.description}</span>
            </div>
          </div>
          <LogList items={game.log} />
        </aside>

        <section className="arena-panel">
          <div className="arena-floor">
            <div className="floor-grid" />

            <LineBoard
              line={game.lines[0]}
              activeLineId={game.activeLineId}
              report={preview.reports.find((item) => item.lineId === 'A')}
              fxReport={settlementFx?.reports.find((item) => item.lineId === 'A')}
              onSlotClick={handleSlotClick}
              onSettle={handleSettle}
              onClear={() => commit(clearPlanningLine(game))}
              selectedCard={selectedCard}
              draggingCard={game.hand.find((card) => card.uid === draggingCardUid)}
              canPlaceCard={canPlaceCardInSlot}
              onCardDrop={handleCardDrop}
              disabled={isSettling}
            />
            <LineBoard
              line={game.lines[1]}
              activeLineId={game.activeLineId}
              report={preview.reports.find((item) => item.lineId === 'B')}
              fxReport={settlementFx?.reports.find((item) => item.lineId === 'B')}
              onSlotClick={handleSlotClick}
              onSettle={handleSettle}
              onClear={() => commit(clearPlanningLine(game))}
              selectedCard={selectedCard}
              draggingCard={game.hand.find((card) => card.uid === draggingCardUid)}
              canPlaceCard={canPlaceCardInSlot}
              onCardDrop={handleCardDrop}
              disabled={isSettling}
            />
          </div>
        </section>

        <aside className="battle-panel event-panel">
          <PanelHeading icon={ClipboardList} title="本月事件" sub={game.event.tone} tone={game.event.tone} />
          <div className={`event-card tone-${game.event.tone}`}>
            <strong>{game.event.name}</strong>
            <p>{game.event.description}</p>
            {game.event.effectLines.map((line) => <span key={line}>{line}</span>)}
          </div>
          <div className="preview-card">
            <span>本月预估</span>
            <strong>¥{preview.eventIncome}</strong>
            <em>维持费 -¥{preview.maintenance} / 净现金 {preview.netCash >= 0 ? '+' : ''}{preview.netCash}</em>
          </div>
          <RecruitMarket candidates={game.recruitMarket} budget={game.strategicBudget} onRecruit={handleRecruit} />
        </aside>
      </section>

      <footer className="hand-dock">
        <div className="hand-fan">
          {game.hand.map((card, index) => (
            <CardView
              key={card.uid}
              card={card}
              entering={enteringHandUids.has(card.uid)}
              selected={game.selectedCardUid === card.uid}
              dragging={draggingCardUid === card.uid}
              mode="hand"
              draggable={game.discardRequired === 0 && !isSettling}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', card.uid)
                setDraggingCardUid(card.uid)
              }}
              onDragEnd={() => setDraggingCardUid(null)}
              style={{
                ...getHandCardStyle(index, game.hand.length),
                '--enter-delay': `${Math.max(0, [...enteringHandUids].indexOf(card.uid)) * 70}ms`,
              }}
              onClick={() => {
                if (game.discardRequired > 0) {
                  handleDiscard(card.uid)
                  return
                }
                setGame((current) => ({
                  ...current,
                  selectedCardUid: current.selectedCardUid === card.uid ? null : card.uid,
                }))
              }}
            />
          ))}
        </div>

        <div className="hand-meta">
          <DeckButton icon={Layers3} label="牌堆" count={game.drawPile.length} onClick={() => setDrawer('deck')} />
          <DeckButton icon={Archive} label="冷却" count={game.coolingPile.length} onClick={() => setDrawer('cooling')} />
          <HandCount discardRequired={game.discardRequired} handCount={game.hand.length} />
        </div>
      </footer>

      {hint && <div className="toast">{hint}</div>}
      {game.result && <ResultOverlay game={game} onRestart={restart} />}
      {drawer && <PileDrawer title={drawer === 'deck' ? '牌堆' : '冷却池'} cards={drawer === 'deck' ? game.drawPile : game.coolingPile} onClose={() => setDrawer(null)} />}
    </main>
  )
}

function TopHud({ game, progress, activeLineAp, apLimit, onRestart, onDeck, onCooling }) {
  return (
    <header className="top-hud">
      <div className="brand-mark">
        <div>
          <strong>FRANK'S ADVENTURE</strong>
          <small>{game.level.milestone} · {game.level.theme}</small>
        </div>
      </div>
      <div className="hud-strip">
        <HudItem iconSrc="/assets/ui-icons/month.png" label="月份" value={`${game.month}/${GAME_CONFIG.monthsPerStage}`} />
        <HudItem iconSrc="/assets/ui-icons/cumulative-cash.png" label="累计 ¥" value={`${game.cumulativeIncome}/${game.level.target}`} />
        <HudItem iconSrc="/assets/ui-icons/cash.png" label="现金" value={`¥${game.cash}`} />
        <HudItem iconSrc="/assets/ui-icons/strategy-budget.png" label="战略预算" value={`💰${game.strategicBudget}`} />
        <HudItem iconSrc="/assets/ui-icons/ap.png" label="AP" value={`${activeLineAp}/${apLimit}`} />
      </div>
      <div className="hud-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="hud-actions">
        <button onClick={onDeck} aria-label="牌堆"><Layers3 size={19} /></button>
        <button onClick={onCooling} aria-label="冷却池"><Archive size={19} /></button>
        <button onClick={onRestart} aria-label="重新开局"><RefreshCw size={19} /></button>
      </div>
    </header>
  )
}

function HudItem({ iconSrc, label, value }) {
  return (
    <div className="hud-item">
      <img className="hud-icon-img" src={iconSrc} alt="" aria-hidden="true" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PanelHeading({ icon: Icon, title, sub, tone = '' }) {
  return (
    <div className={`panel-heading ${tone ? `tone-${tone}` : ''}`}>
      <Icon size={18} />
      <div>
        <strong>{title}</strong>
        <span>{sub}</span>
      </div>
    </div>
  )
}

function Metric({ label, value, tone = '' }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function LogList({ items }) {
  return (
    <div className="log-list">
      {items.map((item, index) => (
        <span
          key={`${item}-${items.length - index}`}
          className={index === 0 ? 'newest' : ''}
          style={{
            '--type-chars': Math.max(8, item.length),
          }}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function LineBoard({
  line,
  activeLineId,
  report,
  fxReport,
  selectedCard,
  draggingCard,
  canPlaceCard,
  onSlotClick,
  onCardDrop,
  onSettle,
  onClear,
  disabled,
}) {
  const isActive = line.id === activeLineId && line.status === 'planning'
  const statusLabel = getLineStatus(line, isActive)
  return (
    <section className={`line-board ${isActive ? 'active' : ''} ${line.status}`}>
      <div className="line-rail">
        <Factory size={17} />
        <strong>产线 {line.id}</strong>
        <span>{statusLabel}</span>
        <em>¥{report?.total ?? 0}</em>
      </div>
      <div className="slot-row">
        {line.slots.map((card, index) => {
          const slotOutput = report?.slotResults[index]?.output
          const canPlaceSelected = canPlaceCard(line, index, selectedCard)
          const canDropDragged = canPlaceCard(line, index, draggingCard)
          return (
            <button
              key={`${line.id}-${index}`}
              className={`line-slot pos-${index + 1} ${card ? 'filled' : ''} ${canPlaceSelected ? 'can-place' : ''} ${canDropDragged ? 'drop-ready' : ''}`}
              onClick={() => onSlotClick(line, index)}
              onDragOver={(event) => {
                if (!canDropDragged) return
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
              }}
              onDrop={(event) => {
                event.preventDefault()
                const cardUid = event.dataTransfer.getData('text/plain')
                if (canDropDragged) onCardDrop(cardUid, index)
              }}
            >
              <span className="slot-label">P{index + 1}</span>
              {canPlaceSelected && <span className="placement-arrow" aria-hidden="true" />}
              {card ? <CardView card={card} mode="slot" outputOverride={slotOutput} /> : <i>{slotRole(index)}</i>}
              {slotOutput > 0 && <b>¥{slotOutput}</b>}
              {fxReport?.slotResults[index]?.output > 0 && (
                <span
                  className="slot-fx-number"
                  style={{ '--fx-delay': `${fxReport.slotResults[index].fxDelay}ms` }}
                >
                  +¥{fxReport.slotResults[index].output}
                </span>
              )}
            </button>
          )
        })}
        {isActive && (
          <div className="line-actions" aria-label="产线操作">
            <button
              className="line-action-button start"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation()
                onSettle()
              }}
              data-tip="启动工作"
              aria-label="启动工作"
              title="启动工作"
            >
              <Play size={22} />
            </button>
            <button
              className="line-action-button clear"
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation()
                onClear()
              }}
              data-tip="清空工位"
              aria-label="清空工位"
              title="清空工位"
            >
              <Trash2 size={21} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

function buildSettlementFx(settlement) {
  const reports = settlement?.lineReports ?? []
  const slotStep = 240
  const slotDuration = 1250
  let order = 0
  const fxReports = reports.map((report) => ({
    ...report,
    slotResults: report.slotResults.map((slot) => {
      if (!slot.card || slot.output <= 0) return { ...slot, fxDelay: 0 }
      const fxDelay = order * slotStep
      order += 1
      return { ...slot, fxDelay }
    }),
  }))
  const slotEndDelay = order > 0 ? (order - 1) * slotStep + slotDuration : 0
  return {
    id: Date.now(),
    reports: fxReports,
    duration: slotEndDelay + 900,
  }
}

function getLineStatus(line, isActive) {
  if (isActive) return '可布置'
  if (line.status === 'working') return `生产中 · ${line.workingMonthsLeft} 月`
  return '待轮转'
}

function slotRole(index) {
  if (index === 0) return '启动'
  if (index === 2) return '中枢'
  if (index === 4) return '收割'
  return '工位'
}

function getHandCardStyle(index, count) {
  const center = (count - 1) / 2
  const offset = index - center
  const maxOffset = Math.max(1, center)
  const ratio = offset / maxOffset
  const lift = Math.round((1 - Math.abs(ratio)) * 16)
  const depth = Math.round((index + 1) * 3 + (1 - Math.abs(ratio)) * 8)
  const rotate = ratio * 6
  const yaw = -4 + ratio * 0.8
  const spread = Math.round(offset * 18)
  const enterSway = Math.round(ratio * -150)
  const stackBias = index

  return {
    '--fan-x': `${spread}px`,
    '--fan-rotate': `${rotate.toFixed(2)}deg`,
    '--fan-yaw': `${yaw.toFixed(2)}deg`,
    '--fan-lift': `${-lift}px`,
    '--fan-depth': `${depth}px`,
    '--enter-sway': `${enterSway}px`,
    '--fan-hover-rotate': `${(rotate * 0.36).toFixed(2)}deg`,
    '--fan-hover-yaw': `${(yaw * 0.72).toFixed(2)}deg`,
    '--fan-hover-x': `${spread + Math.round(ratio * 5)}px`,
    '--fan-hover-lift': `${-(lift + 10)}px`,
    '--fan-hover-depth': `${depth + 16}px`,
    zIndex: Math.round(100 + stackBias * 4 + (1 - Math.abs(ratio)) * 8),
  }
}

function CardView({
  card,
  selected = false,
  entering = false,
  dragging = false,
  mode = 'hand',
  outputOverride,
  draggable = false,
  onClick,
  onDragStart,
  onDragEnd,
  style,
}) {
  const dept = DEPT_META[card.dept] ?? DEPT_META.NONE
  const rarityLabel = RARITY_LABELS[card.rarity] ?? card.rarity
  const typeLabel = card.type === 'emp' ? dept.short : card.type === 'fun' ? '功能' : '服务'
  const hasOutputOverride = card.type === 'emp' && Number.isFinite(outputOverride)
  const primary = hasOutputOverride ? `¥${outputOverride}` : card.type === 'emp' ? `¥${card.baseOutput}` : summarizeEffect(card.effects[0])
  const outputChanged = hasOutputOverride && outputOverride !== card.baseOutput
  const effects = [...card.effects, ...card.affixEffects].filter((effect) => !effect.startsWith('COST') && !effect.startsWith('BASE_OUTPUT'))
  const neighborDirection = getNeighborDirection(effects)
  const Component = onClick ? 'button' : 'div'

  return (
    <span className={`card-stage ${mode} ${selected ? 'selected' : ''} ${entering ? 'entering' : ''}`} style={style}>
      <span className="card-stage-shadow" aria-hidden="true" />
      <Component
        className={`card-view ${mode} ${selected ? 'selected' : ''} ${entering ? 'entering' : ''} ${dragging ? 'dragging' : ''} ${neighborDirection ? `neighbor-${neighborDirection}` : ''} rarity-${card.rarity} type-${card.type} dept-${card.dept.toLowerCase()}`}
        draggable={draggable}
        onClick={onClick}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={`${card.name} · ${effects.join(' / ')}`}
        type={onClick ? 'button' : undefined}
      >
        {neighborDirection && (
          <span className={`neighbor-cue ${neighborDirection}`} aria-hidden="true">
            {(neighborDirection === 'left' || neighborDirection === 'both') && <i className="left" />}
            {(neighborDirection === 'right' || neighborDirection === 'both') && <i className="right" />}
          </span>
        )}
        <span className="card-top">
          <i>{typeLabel}</i>
          <em>{rarityLabel}</em>
          <b><Zap className="card-ap-icon" size={12} />{card.ap}</b>
        </span>
        <span className="card-portrait" aria-hidden="true">
          <span className="portrait-glow" />
          <span className={`portrait-person ${dept.color}`}>
            <i />
            <b />
            <em />
          </span>
        </span>
        <strong className="card-name">{card.name}</strong>
        <span className={`card-output delta-${card.outputDelta} ${card.type === 'emp' ? 'exec-number' : ''} ${outputChanged ? 'changed' : ''}`}>
          {primary}
        </span>
        <span className="card-effects">{effects.slice(0, 2).map(summarizeEffect).join(' · ') || '基础行动'}</span>
        {card.affixes.length > 0 && (
          <span className="affix-row">
            {card.affixes.slice(0, 2).map((affix) => <i key={affix.id}>★{affix.name}</i>)}
          </span>
        )}
        <span className="card-flavor">"{card.flavor}"</span>
      </Component>
    </span>
  )
}

function getNeighborDirection(effects) {
  const normalized = effects.join(' ')
  const hasBoth = /\bBOTH\s*:/.test(normalized)
  const hasLeft = /\bLEFT\s*:/.test(normalized)
  const hasRight = /\bRIGHT\s*:/.test(normalized)
  if (hasBoth || (hasLeft && hasRight)) return 'both'
  if (hasLeft) return 'left'
  if (hasRight) return 'right'
  return ''
}

function summarizeEffect(effect = '') {
  return effect
    .replace('TRIGGER: ', '')
    .replace('MONTH_NO_MAINTAIN', '免维持费')
    .replace('MONTH_BONUS:', '月度')
    .replace('LINE_XMULT:', '全线')
    .replace('LINE_ALL:', '全线')
    .replace('RIGHT:', '右邻')
    .replace('LEFT:', '左邻')
    .replace('BOTH:', '双邻')
    .replace('ADJ_R:', '邻研发')
    .replace('ADJ_S:', '邻销售')
    .replace('SAME_DEPT_ADJ:', '同部门')
    .replace('SELF_IF_P1:', 'P1')
    .replace('SELF_IF_P3:', 'P3')
    .replace('SELF_IF_P5:', 'P5')
    .replace('MONTH_STAR_RATE:', '叙事')
    .trim()
}

function RecruitMarket({ candidates, budget, onRecruit }) {
  return (
    <section className="recruit-market">
      <div className="market-title">
        <UserPlus size={17} />
        <strong>招聘市场</strong>
        <span>💰{budget}</span>
      </div>
      <div className="candidate-list">
        {candidates.map((card) => (
          <button key={card.uid} className={`candidate rarity-${card.rarity}`} onClick={() => onRecruit(card.uid)}>
            <CardView card={card} mode="market" />
            <span className="price-tag">💰{card.cost}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function DeckButton({ label, count, onClick }) {
  const isCooling = label === '冷却'
  return (
    <button className="deck-button" onClick={onClick} data-tip={isCooling ? '休息员工' : '员工册'} aria-label={isCooling ? '休息员工' : '员工册'}>
      <img className="meta-image-icon" src={isCooling ? '/assets/ui-icons/cooling-staff.png' : '/assets/ui-icons/card-deck.png'} alt="" aria-hidden="true" />
      <span className="meta-copy">
        <strong>{count}</strong>
      </span>
    </button>
  )
}

function HandCount({ discardRequired, handCount }) {
  return (
    <div className="hand-title" data-tip="待命员工" aria-label="待命员工">
      <img className="meta-image-icon" src="/assets/ui-icons/hand-staff.png" alt="" aria-hidden="true" />
      <span className="meta-copy">
        <strong>{handCount}/{GAME_CONFIG.handLimit}</strong>
      </span>
    </div>
  )
}

function ResultOverlay({ game, onRestart }) {
  const result = game.result
  return (
    <div className="modal-backdrop">
      <section className={`result-panel ${result.passed ? 'passed' : 'failed'}`}>
        <span>{result.passed ? '通关' : '失败'}</span>
        <h1>{game.level.milestone}</h1>
        <div className="result-stats">
          <Metric label="累计 ¥" value={game.cumulativeIncome} />
          <Metric label="目标 ¥" value={game.level.target} />
          <Metric label="评级" value={result.rating} />
          <Metric label="原因" value={result.reason} />
        </div>
        <button className="command-button primary" onClick={onRestart}>
          <RotateCcw size={18} />
          重开本关
        </button>
      </section>
    </div>
  )
}

function PileDrawer({ title, cards, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="pile-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-title">
          <strong>{title}</strong>
          <button onClick={onClose}>关闭</button>
        </div>
        <div className="drawer-grid">
          {cards.map((card) => <CardView key={card.uid} card={card} mode="drawer" />)}
          {cards.length === 0 && <p>暂无卡牌</p>}
        </div>
      </section>
    </div>
  )
}

export default App
