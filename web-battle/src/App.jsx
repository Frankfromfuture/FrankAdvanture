import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CompendiumScreen from './CompendiumScreen.jsx'
import { PackBox3D } from './PackBox3D.jsx'
import { ServiceFunSvg, hasServiceFunSvg } from './ServiceFunSvg.jsx'
import { ExecutiveSvgPortrait } from './人物/ExecutiveSvgPortrait.jsx'
import { PixelPersonPortrait } from './人物/PixelPersonPortrait.jsx'
import {
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Coins,
  Factory,
  FlaskConical,
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
import {
  AFFIX_POOL,
  BUSINESS_MODELS,
  CARD_TEMPLATES,
  DEPT_META,
  PACK_DEFINITIONS,
  RARITY_LABELS,
  UPGRADE_PATHS,
  STAGES,
  getCardBurn,
  getCardExtraBurn,
  getBMMonthlyCost,
  getCardAssetValue,
  getBMAssetValue,
} from './game/cards.js'
import {
  GAME_CONFIG,
  dismissRecruitReveal,
  clearPlanningLine,
  computeBattlePreview,
  createInitialState,
  discardFromHand,
  enterIntermission,
  exitIntermission,
  fireCard,
  getActiveLine,
  getEffectiveApLimit,
  getLineAp,
  openPack,
  placeCardInSlot,
  purchaseBusinessModel,
  purchaseShopItem,
  resolveEvent,
  resolveMonth,
  returnSlotToHand,
  rollSchool,
  rollShop,
  upgradeCard,
  applyWithdrawal,
  dismissCardInBoardMeeting,
  applyStagnationAdvice,
  unsubscribeBusinessModel,
  computeValuation,
  computeQuarterlyAvgProfit,
  getAllCards,
} from './game/engine.js'

const TUTORIAL_STEPS = [
  {
    title: '欢迎入职，新 CEO',
    body: '顶部那一排数字别慌——累计 ¥ 是你向投资人交差的「KPI」，现金 ¥ 是「公司还能撑几个月」，AP 是「你今天还有多少精力开会」。董事会全靠这几个数字判断你能不能续命。',
    focus: 'top',
    targetSelector: '.top-hud',
    placement: 'bottom',
  },
  {
    title: '把人塞进产线 (5 格生产位)',
    body: 'P1 启动位 = 第一个干活的猛男，自动 +20%。P3 中枢位 = 中间的「救火队长」，左右邻都被她带飞。P5 收割位 = 谁贡献够多谁拿荣誉，吃 ×1.5。\n对，公司就是这么不公平。',
    focus: 'line',
    targetSelector: '.line-board.active .slot-row',
    placement: 'top',
  },
  {
    title: 'HR 部今天只给你 3 张简历',
    body: '右边每月放 3 个候选人，只能签 1 个。先看 AP（薪资）、产出（产值），再瞄一眼右上角那个红红绿绿的 roll（面试当天他运气如何）。\n剩下两个？HR 会说「保持联系」。',
    focus: 'market',
    targetSelector: '.recruit-market',
    placement: 'left',
  },
  {
    title: '按那个「▶」开始爆分',
    body: '产线旁那个三角形按钮就是月底结算。点下去 P1 → P5 依次触发，数字一个个炸出来——那个声音叫做「升职加薪 BGM」。\nAP 别超限，超了说明你又要熬夜了。',
    focus: 'settle',
    targetSelector: '.line-board.active .line-action-button.start',
    placement: 'top',
  },
]

// ============================================================
// Layout Editor — context + localStorage helpers
// ============================================================
const LAYOUT_STORAGE_KEY = 'frank-battle-layout-v1'
const TEXT_STORAGE_KEY   = 'frank-battle-texts-v1'
function _loadLayout() {
  try { return JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) ?? 'null') ?? {} }
  catch { return {} }
}
function _loadTexts() {
  try { return JSON.parse(localStorage.getItem(TEXT_STORAGE_KEY) ?? 'null') ?? {} }
  catch { return {} }
}
const GAME_STATE_STORAGE_KEY = 'frank-battle-state-v1'

function _loadGameState() {
  try {
    const raw = localStorage.getItem(GAME_STATE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && parsed.version === 1 && parsed.state) {
      return parsed.state
    }
  } catch (e) {
    console.error("Failed to load game state:", e)
  }
  return null
}

function _saveGameState(state) {
  try {
    if (state) {
      localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify({ version: 1, state }))
    }
  } catch (e) {
    console.error("Failed to save game state:", e)
  }
}

const LayoutEditCtx = React.createContext({
  editMode: false,
  overrides: {},
  update: () => {},
  textOverrides: {},
  updateText: () => {},
})

function App() {
  const [screen, setScreen] = useState('menu')
  const [compendiumReturn, setCompendiumReturn] = useState('menu')
  const [game, setGame] = useState(() => {
    const loaded = _loadGameState()
    if (loaded) {
      // Robustness: ensure active line has 'planning' status if not ended/intermission
      if (!loaded.result && !loaded.intermissionState) {
        const activeLine = loaded.lines?.find(l => l.id === loaded.activeLineId)
        if (activeLine && activeLine.status !== 'planning') {
          console.warn("Auto-correcting active line status to 'planning'")
          loaded.lines = loaded.lines.map(line =>
            line.id === loaded.activeLineId ? { ...line, status: 'planning' } : line
          )
        }
      }
      return loaded
    }
    return createInitialState()
  })
  
  useEffect(() => {
    _saveGameState(game)
  }, [game])

  useEffect(() => {
    if (!game.result && !game.intermissionState) {
      const activeLine = game.lines?.find(l => l.id === game.activeLineId)
      if (activeLine && activeLine.status !== 'planning') {
        console.warn("Auto-correcting active line status in useEffect...")
        setGame(prev => {
          const curActive = prev.lines?.find(l => l.id === prev.activeLineId)
          if (curActive && curActive.status !== 'planning') {
            return {
              ...prev,
              lines: prev.lines.map(line =>
                line.id === prev.activeLineId ? { ...line, status: 'planning' } : line
              )
            }
          }
          return prev
        })
      }
    }
  }, [game.activeLineId, game.lines, game.result, game.intermissionState])

  const [tutorialStep, setTutorialStep] = useState(0)
  const [tutorialDone, setTutorialDone] = useState(() => {
    try {
      return localStorage.getItem('frank-battle-tutorial-done') === 'true'
    } catch {
      return false
    }
  })

  function handleTutorialDone() {
    setTutorialDone(true)
    try {
      localStorage.setItem('frank-battle-tutorial-done', 'true')
    } catch (e) {
      console.error(e)
    }
  }
  const [hint, setHint] = useState('')
  const [drawer, setDrawer] = useState(null)
  const [enteringHandUids, setEnteringHandUids] = useState(() => new Set())
  const [settlementFx, setSettlementFx] = useState(null)
  const [isSettling, setIsSettling] = useState(false)
  const [draggingCardUid, setDraggingCardUid] = useState(null)
  const [comboOpen, setComboOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const [layoutEditMode, setLayoutEditMode] = useState(false)
  const [layoutOverrides, setLayoutOverrides] = useState(_loadLayout)
  const [textOverrides, setTextOverrides] = useState(_loadTexts)

  function updateLayoutOv(id, next) {
    setLayoutOverrides(prev => ({ ...prev, [id]: next }))
  }
  function updateText(id, value) {
    setTextOverrides(prev => ({ ...prev, [id]: value }))
  }
  function saveLayout() {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutOverrides))
    localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(textOverrides))
    setLayoutEditMode(false)
  }
  function resetLayout() {
    setLayoutOverrides({})
    setTextOverrides({})
    localStorage.removeItem(LAYOUT_STORAGE_KEY)
    localStorage.removeItem(TEXT_STORAGE_KEY)
  }
  function openLayoutEdit() {
    setSettingsOpen(false)
    setLayoutEditMode(true)
  }

  const hintTimerRef = useRef(null)
  const handEntryTimerRef = useRef(null)
  const settlementFxTimerRef = useRef(null)

  const activeLine = getActiveLine(game)
  const selectedCard = game.hand.find((card) => card.uid === game.selectedCardUid)
  const preview = useMemo(() => computeBattlePreview(game), [game])
  const activeLineAp = getLineAp(activeLine?.slots ?? [])
  const apLimit = getEffectiveApLimit(game)

  useEffect(() => () => {
    window.clearTimeout(hintTimerRef.current)
    window.clearTimeout(handEntryTimerRef.current)
    window.clearTimeout(settlementFxTimerRef.current)
  }, [])

  useEffect(() => {
    function handleGlobalButtonSound(event) {
      const button = event.target?.closest?.('button, [role="button"]')
      if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return
      playUiSfx(button.dataset.sfx || 'click')
    }
    window.addEventListener('pointerup', handleGlobalButtonSound)
    return () => window.removeEventListener('pointerup', handleGlobalButtonSound)
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
      playUiSfx('error')
      showHint(result.message)
      return
    }
    if (options.sfx && !options.fx) playUiSfx(options.sfx)
    if (options.fx) {
      const settlement = result.state.lastSettlement
      const nextSettlementFx = buildSettlementFx(settlement)
      playSettlementAudio(nextSettlementFx)
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
      commit(returnSlotToHand(game, line.id, slotIndex), { sfx: 'card' })
      return
    }
    if (!selectedCard) {
      showHint('先选择一张手牌')
      return
    }
    commit(placeCardInSlot(game, selectedCard.uid, slotIndex), { sfx: 'place' })
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
    commit(placeCardInSlot(game, cardUid, slotIndex), { sfx: 'place' })
    setDraggingCardUid(null)
  }

  function handleSettle() {
    if (isSettling) return
    commit(resolveMonth(game), { fx: true, animateNewHand: true })
  }



  function handleDismissReveal() {
    commit(dismissRecruitReveal(game), { sfx: 'open' })
  }

  function handleDiscard(cardUid) {
    commit(discardFromHand(game, cardUid), { sfx: 'card' })
  }

  function restart() {
    localStorage.removeItem(GAME_STATE_STORAGE_KEY)
    setGame(createInitialState())
    setHint('')
    setDrawer(null)
    setEnteringHandUids(new Set())
    setSettlementFx(null)
    setIsSettling(false)
    setDraggingCardUid(null)
    setComboOpen(false)
    setSettingsOpen(false)
    setCreditsOpen(false)
    setTutorialStep(0)
    setTutorialDone(false)
    window.clearTimeout(settlementFxTimerRef.current)
  }

  function startNewGame() {
    playUiSfx('transition')
    restart()
    setScreen('battle')
  }

  function forcePassLevel() {
    const currentStageIndex = STAGES.findIndex(s => s.id === game.stage.id)
    const nextStage = STAGES[currentStageIndex + 1]
    if (!nextStage) {
      showHint("已经是最高阶段了")
      setSettingsOpen(false)
      return
    }
    setGame((current) => ({
      ...current,
      valuation: nextStage.threshold,
      result: nextStage.id === 9
        ? {
            passed: true,
            gameWon: true,
            reason: '终极胜利',
            bestMonth: current.lastSettlement?.income ?? 0,
          }
        : {
            passed: true,
            stagePromotion: true,
            nextStage: nextStage,
            reason: '估值达标',
            bestMonth: current.lastSettlement?.income ?? 0,
          },
      log: [`强制达成阶段晋升: ${nextStage.name}`, ...current.log].slice(0, 7),
    }))
    setSettingsOpen(false)
  }

  function returnMain() {
    playUiSfx('transition')
    setSettingsOpen(false)
    setComboOpen(false)
    setDrawer(null)
    setScreen('menu')
  }

  // ===== 关间「董事会会议」handler =====

  function handleEnterIntermission() {
    setSettingsOpen(false)
    commit(enterIntermission(game), { sfx: 'transition' })
  }

  function handleQuickEnterBoardMeeting() {
    playUiSfx('transition')
    setSettingsOpen(false)
    setGame((current) => {
      const currentStageIndex = STAGES.findIndex(s => s.id === current.stage.id)
      const nextStage = STAGES[currentStageIndex + 1]
      if (!nextStage) return current

      const passedState = {
        ...current,
        valuation: nextStage.threshold,
        result: {
          passed: true,
          stagePromotion: true,
          nextStage: nextStage,
          reason: '直接过关',
          bestMonth: current.lastSettlement?.income ?? 0,
        },
        log: [`直接过关 → 董事会`, ...current.log].slice(0, 7),
      }
      const next = enterIntermission(passedState)
      return next.ok ? next.state : passedState
    })
  }

  function handleClearArchive() {
    localStorage.removeItem(GAME_STATE_STORAGE_KEY)
    restart()
    setScreen('menu')
  }

  function handleResolveEvent(optionId) {
    commit(resolveEvent(game, optionId), { sfx: 'choice' })
  }

  function handleShopBuy(slotKey) {
    commit(purchaseShopItem(game, slotKey), { sfx: 'buy' })
  }

  function handleShopRoll() {
    commit(rollShop(game), { sfx: 'roll' })
  }

  function handlePack(packSlotIdx, pickIndex) {
    commit(openPack(game, packSlotIdx, pickIndex), { sfx: pickIndex == null ? 'buy' : 'open' })
  }

  function handleUpgrade(cardUid, mode, affixId) {
    commit(upgradeCard(game, cardUid, mode, affixId), { sfx: 'upgrade' })
  }

  function handleFire(cardUid) {
    commit(dismissCardInBoardMeeting(game, cardUid), { sfx: 'fire' })
  }

  function handleBmBuy(schoolSlotIdx, replaceIdx) {
    commit(purchaseBusinessModel(game, schoolSlotIdx, replaceIdx), { sfx: 'upgrade' })
  }

  function handleSchoolRoll() {
    commit(rollSchool(game), { sfx: 'roll' })
  }

  function handleExitIntermission() {
    commit(exitIntermission(game), { sfx: 'transition' })
  }

  function handleWithdrawal(ratio) {
    commit(applyWithdrawal(game, ratio), { sfx: 'buy' })
  }

  function handleBmUnsubscribe(id) {
    commit(unsubscribeBusinessModel(game, id), { sfx: 'fire' })
  }

  function handleStagnationAdvice(choice) {
    commit(applyStagnationAdvice(game, choice), { sfx: 'choice' })
  }

  function handleOpenCompendium() {
    setSettingsOpen(false)
    setCompendiumReturn('battle')
    setScreen('compendium')
  }

  if (screen === 'menu') {
    return (
      <main className="main-menu-shell">
        <div className="main-menu-bg" aria-hidden="true" />
        <div className="main-menu-light" aria-hidden="true" />
        <img className="main-menu-logo" src="/assets/menu/FR.svg" alt="FRANK'S ADVANTURE" />
        <section className="main-menu-panel">
          <div className="main-menu-actions">
            <MenuTiltButton onClick={() => {
              if (localStorage.getItem(GAME_STATE_STORAGE_KEY) === null) {
                showHint("没有找到存档，请开始新游戏")
              } else {
                setScreen('battle')
              }
            }}>继续上一局</MenuTiltButton>
            <MenuTiltButton onClick={startNewGame}>开始新游戏</MenuTiltButton>
            <MenuTiltButton onClick={() => { setCompendiumReturn('menu'); setScreen('compendium') }}>图鉴</MenuTiltButton>
            <MenuTiltButton onClick={() => setSettingsOpen(true)}>设置</MenuTiltButton>
            <MenuTiltButton onClick={() => setCreditsOpen(true)}>制作组</MenuTiltButton>
            <MenuTiltButton onClick={() => showHint('浏览器版本请直接关闭页面')}>退出</MenuTiltButton>
          </div>
        </section>
        {settingsOpen && (
          <SettingsOverlay
            onClose={() => setSettingsOpen(false)}
            onRestart={startNewGame}
            onClearArchive={handleClearArchive}
            onOpenCompendium={() => {
              setSettingsOpen(false)
              setCompendiumReturn('menu')
              setScreen('compendium')
            }}
          />
        )}
        {creditsOpen && <CreditsOverlay onClose={() => setCreditsOpen(false)} />}
        {hint && <div className="toast">{hint}</div>}
      </main>
    )
  }

  if (screen === 'compendium') {
    return <CompendiumScreen onClose={() => setScreen(compendiumReturn)} />
  }

  return (
    <LayoutEditCtx.Provider value={{ editMode: layoutEditMode, overrides: layoutOverrides, update: updateLayoutOv, textOverrides, updateText }}>
    <main className="battle-shell">
      <div className="battle-photo-bg" aria-hidden="true" />
      <div className="battle-crt-overlay" aria-hidden="true" />

      <TopHud
        game={game}
        preview={preview}
        activeLineAp={activeLineAp}
        apLimit={apLimit}
        onCombo={() => setComboOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      <section className="battle-grid">
        <aside className="battle-panel ceo-panel">
          <EditableBlock id="ceo-bizmodels" label="商业模式">
            <ActiveBusinessModelsPanel
              activeBusinessModels={game.activeBusinessModels}
              slotCap={game.businessModelSlotCap}
            />
          </EditableBlock>
          <EditableBlock id="ceo-log" label="操作日志">
            <LogList items={game.log} />
          </EditableBlock>
        </aside>

        <section className="arena-panel">
          {settlementFx?.totalFx && (
            <div className="settlement-center-fx" style={{ '--fx-delay': `${settlementFx.totalFx.delay}ms` }}>
              <span>总产能</span>
              <strong>+¥{settlementFx.totalFx.gain}</strong>
            </div>
          )}
          <div className="arena-floor">
            <div className="floor-grid" />

            <EditableBlock id="lineBoard-A" label="产线 A">
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
            </EditableBlock>
            <EditableBlock id="lineBoard-B" label="产线 B">
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
            </EditableBlock>
          </div>
        </section>

        <aside className="battle-panel event-panel">
          <EditableBlock id="event-heading" label="事件标题">
            <PanelHeading icon={ClipboardList} title="本月事件" sub={game.event.tone} tone={game.event.tone} textId="event-heading" />
          </EditableBlock>
          <EditableBlock id="event-card" label="事件卡片">
            <div className={`event-card tone-${game.event.tone}`}>
              <strong>{game.event.name}</strong>
              <p>{game.event.description}</p>
              {game.event.effectLines.map((line) => <span key={line}>{line}</span>)}
            </div>
          </EditableBlock>
          <EditableBlock id="event-preview" label="预估收益">
            <div className="preview-card hud-item">
              <span><EditableText id="event-preview-label">本月预估</EditableText></span>
              <strong>¥{preview.eventIncome}</strong>
              <em>月 burn -¥{preview.maintenance} / 净利润 {preview.netCash >= 0 ? '+' : ''}{preview.netCash}</em>
              <div className="hud-hover-tooltip preview-tooltip">
                <div className="tooltip-title">收支分解</div>
                <div>产线预估收入: ¥{preview.eventIncome}</div>
                <div>预估 Monthly Burn: ¥{preview.maintenance}</div>
                <div className="tooltip-divider" />
                <div>预估净增留存利润: {preview.netCash >= 0 ? `+¥${preview.netCash}` : `-¥${Math.abs(preview.netCash)}`}</div>
              </div>
            </div>
          </EditableBlock>
        </aside>
      </section>

      <footer className="hand-dock">
        <EditableBlock id="hand-fan" label="手牌区">
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
        </EditableBlock>

        <EditableBlock id="hand-meta" label="牌堆信息">
          <div className="hand-meta">
            <DeckButton icon={Layers3} label="牌堆" count={game.drawPile.length} onClick={() => setDrawer('deck')} />
            <DeckButton icon={Archive} label="冷却" count={game.coolingPile.length} onClick={() => setDrawer('cooling')} />
            <HandCount discardRequired={game.discardRequired} handCount={game.hand.length} />
          </div>
        </EditableBlock>
      </footer>

      {hint && <div className="toast">{hint}</div>}
      {!tutorialDone && game.stage.id === 1 && game.month === 1 && !game.result && !game.intermissionState && (
        <TutorialOverlay
          step={tutorialStep}
          onNext={() => {
            if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
              handleTutorialDone()
              return
            }
            setTutorialStep((current) => current + 1)
          }}
          onSkip={handleTutorialDone}
        />
      )}
      {game.revealedRecruitCard && (
        <RecruitPackReveal card={game.revealedRecruitCard} onClose={handleDismissReveal} />
      )}
      {comboOpen && <ComboRulesOverlay onClose={() => setComboOpen(false)} />}
      {settingsOpen && (
        <SettingsOverlay
          onClose={() => setSettingsOpen(false)}
          onRestart={restart}
          onClearArchive={handleClearArchive}
          onPass={forcePassLevel}
          onMain={returnMain}
          canEnterBoardMeeting={!game.intermissionState && game.stage.id < 9}
          onEnterBoardMeeting={handleQuickEnterBoardMeeting}
          onOpenCompendium={handleOpenCompendium}
          onEditLayout={openLayoutEdit}
        />
      )}
      {game.stagnationAdvisorTriggered && (
        <StagnationAdvisor
          onSelect={handleStagnationAdvice}
          onClose={() => setGame(prev => ({ ...prev, stagnationAdvisorTriggered: false }))}
        />
      )}
      {game.result && !game.intermissionState && (
        <ResultOverlay
          game={game}
          onRestart={restart}
          onEnterIntermission={handleEnterIntermission}
        />
      )}
      {drawer && <PileDrawer title={drawer === 'deck' ? '牌堆' : '冷却池'} cards={drawer === 'deck' ? game.drawPile : game.coolingPile} onClose={() => setDrawer(null)} />}

      {game.intermissionState && (
        <BoardMeetingHub
          game={game}
          onResolveEvent={handleResolveEvent}
          onShopBuy={handleShopBuy}
          onShopRoll={handleShopRoll}
          onPack={handlePack}
          onUpgrade={handleUpgrade}
          onFire={handleFire}
          onBmBuy={handleBmBuy}
          onSchoolRoll={handleSchoolRoll}
          onWithdrawal={handleWithdrawal}
          onBmUnsubscribe={handleBmUnsubscribe}
          onExit={handleExitIntermission}
        />
      )}

      {layoutEditMode && (
        <LayoutEditorBar
          onSave={saveLayout}
          onReset={resetLayout}
          onExit={() => setLayoutEditMode(false)}
        />
      )}
    </main>
    </LayoutEditCtx.Provider>
  )
}

function TopHud({ game, preview, activeLineAp, apLimit, onCombo, onSettings }) {
  const currentStageIndex = STAGES.findIndex(s => s.id === game.stage.id)
  const nextStage = STAGES[currentStageIndex + 1]

  const dateStr = `${game.year}.${String(game.month).padStart(2, '0')}`;

  // Valuation breakdown
  const avgProfit = computeQuarterlyAvgProfit(game.profitHistory)
  const peValue = Math.max(0, avgProfit * 20)
  
  const allCards = getAllCards(game)
  let cardAssetSum = 0
  for (const card of allCards) {
    cardAssetSum += getCardAssetValue(card)
  }
  let bmAssetSum = 0
  if (game.activeBusinessModels) {
    for (const slot of game.activeBusinessModels) {
      const bm = BUSINESS_MODELS.find((b) => b.id === slot.id)
      if (bm) {
        bmAssetSum += getBMAssetValue(bm)
      }
    }
  }
  const assetValue = cardAssetSum * 0.5 + bmAssetSum * 0.5
  const treasuryValue = Math.max(0, game.cash) * 0.3
  const totalV = game.valuation

  const minV = game.stage.threshold;
  const maxV = nextStage ? nextStage.threshold : game.stage.threshold;
  const range = maxV - minV;
  const pct = range > 0 ? Math.min(100, Math.max(0, ((totalV - minV) / range) * 100)) : 100;

  // Cash warn
  const isCashWarn = game.cash < preview.maintenance * 1.5;

  // AP breakdown
  const serviceBonus = apLimit - game.apAvailable;

  return (
    <header className="top-hud">
      <EditableBlock id="hud-brand" label="品牌标题">
        <div className="brand-mark">
          <div>
            <strong><EditableText id="hud-brand-title">{`${game.stage.theme}期（${game.stage.name}）`}</EditableText></strong>
          </div>
        </div>
      </EditableBlock>
      <div className="hud-stats-group">
        <EditableBlock id="hud-month" label="HUD · 月份">
          <div className="hud-item hud-month">
            <img className="hud-icon-img" src="/assets/ui-icons/month.png" alt="" aria-hidden="true" />
            <span>日期</span>
            <strong>{dateStr}</strong>
            <div className="hud-hover-tooltip">
              <div className="tooltip-title">经营时间</div>
              <div>已经营: {game.elapsedMonths} 个月</div>
              <div>当前融资阶段: {game.stage.name}</div>
              <div>阶段主题: {game.stage.theme}</div>
            </div>
          </div>
        </EditableBlock>
        
        <EditableBlock id="hud-valuation" label="HUD · 估值">
          <div className="hud-item hud-valuation-progress">
            <img className="hud-icon-img" src="/assets/ui-icons/cumulative-cash.png" alt="" aria-hidden="true" />
            <span>估值</span>
            <div className="valuation-progress-container">
              <strong>V {totalV}{nextStage ? ` / ${maxV}` : ''}</strong>
              <div className="stage-progress-track">
                <div className="stage-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="hud-hover-tooltip">
              <div className="tooltip-title">估值分析 (V = PE + 资产 + 现金溢价)</div>
              <div>PE 估值: ¥{peValue} (3月均利润 ¥{avgProfit.toFixed(1)} × 20)</div>
              <div>资产折现: ¥{assetValue.toFixed(1)} (员工卡 ¥{cardAssetSum} + BM ¥{bmAssetSum} 各折半)</div>
              <div>现金溢价: ¥{treasuryValue.toFixed(1)} (现金 ¥{game.cash} × 0.3)</div>
              <div className="tooltip-divider" />
              <div>下一阶段: {nextStage ? `${nextStage.name} (门槛 V ${maxV})` : '已达最高阶段'}</div>
            </div>
          </div>
        </EditableBlock>

        <EditableBlock id="hud-cash" label="HUD · 现金">
          <div className={`hud-item hud-cash ${isCashWarn ? 'warn' : ''}`}>
            <img className="hud-icon-img" src="/assets/ui-icons/cash.png" alt="" aria-hidden="true" />
            <span>现金</span>
            <strong>¥{game.cash}</strong>
            <div className="hud-hover-tooltip">
              <div className="tooltip-title">现金与利润</div>
              <div>现金余额: ¥{game.cash} (唯一可支配)</div>
              <div>留存利润: ¥{game.retainedEarnings} (不可直接花，董事会可提取)</div>
              <div className="tooltip-divider" />
              <div>下月预估 Monthly Burn: ¥{preview.maintenance}</div>
              <div>下月预估净利润: {preview.netCash >= 0 ? `+¥${preview.netCash}` : `-¥${Math.abs(preview.netCash)}`}</div>
            </div>
          </div>
        </EditableBlock>

        <EditableBlock id="hud-ap" label="HUD · AP">
          <div className="hud-item hud-ap">
            <img className="hud-icon-img" src="/assets/ui-icons/ap.png" alt="" aria-hidden="true" />
            <span>行动力</span>
            <strong>{activeLineAp}/{apLimit}</strong>
            <div className="hud-hover-tooltip">
              <div className="tooltip-title">行动力 (AP) 组成</div>
              <div>已分配: {activeLineAp} / {apLimit} AP</div>
              <div className="tooltip-divider" />
              <div>基础 AP: {GAME_CONFIG.baseAp} AP</div>
              <div>跨月保留: +{game.apCarry} AP</div>
              <div>事件调整: {game.event.apDelta >= 0 ? `+${game.event.apDelta}` : `${game.event.apDelta}`} AP</div>
              {serviceBonus !== 0 && (
                <div>产线服务卡加成: {serviceBonus >= 0 ? `+${serviceBonus}` : `${serviceBonus}`} AP</div>
              )}
              {game.apAvailable - GAME_CONFIG.baseAp - game.apCarry - (game.event.apDelta ?? 0) > 0 && (
                <div>商业模式加成: +{game.apAvailable - GAME_CONFIG.baseAp - game.apCarry - (game.event.apDelta ?? 0)} AP</div>
              )}
            </div>
          </div>
        </EditableBlock>
      </div>
      <EditableBlock id="hud-actions" label="操作按钮">
        <div className="hud-actions">
          <button className="top-icon-button" onClick={onCombo} aria-label="Combo 规则" data-tip="Combo 规则">
            <img src="/assets/ui-icons/combo-rules.png" alt="" aria-hidden="true" />
          </button>
          <button className="top-icon-button" onClick={onSettings} aria-label="设置" data-tip="设置">
            <img src="/assets/ui-icons/settings.png" alt="" aria-hidden="true" />
          </button>
        </div>
      </EditableBlock>
    </header>
  )
}

function PanelHeading({ icon: Icon, title, sub, tone = '', textId }) {
  return (
    <div className={`panel-heading ${tone ? `tone-${tone}` : ''}`}>
      <Icon size={18} />
      <div>
        <strong>{textId ? <EditableText id={`${textId}-title`}>{title}</EditableText> : title}</strong>
        <span>{textId ? <EditableText id={`${textId}-sub`}>{sub}</EditableText> : sub}</span>
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

// 把 getBoundingClientRect 的视觉坐标换算成 .app-scaler 内的设计画布坐标
function rectInDesignCanvas(target) {
  const r = target.getBoundingClientRect()
  const scaler = document.querySelector('.app-scaler')
  if (!scaler) return { x: r.left, y: r.top, w: r.width, h: r.height }
  const sRect = scaler.getBoundingClientRect()
  const sx = sRect.width / scaler.offsetWidth
  const sy = sRect.height / scaler.offsetHeight
  if (!sx || !sy) return { x: r.left, y: r.top, w: r.width, h: r.height }
  return {
    x: (r.left - sRect.left) / sx,
    y: (r.top - sRect.top) / sy,
    w: r.width / sx,
    h: r.height / sy,
  }
}

// 把鼠标 clientX/Y（视觉坐标）换算成设计画布坐标
function clientToDesign(clientX, clientY) {
  const scaler = document.querySelector('.app-scaler')
  if (!scaler) return { x: clientX, y: clientY }
  const sRect = scaler.getBoundingClientRect()
  const sx = sRect.width / scaler.offsetWidth
  const sy = sRect.height / scaler.offsetHeight
  if (!sx || !sy) return { x: clientX, y: clientY }
  return {
    x: (clientX - sRect.left) / sx,
    y: (clientY - sRect.top) / sy,
  }
}

// 设计画布尺寸 (与 main.jsx 同步)
const DESIGN_CANVAS_W = 1920
const DESIGN_CANVAS_H = 1080

function TutorialOverlay({ step, onNext, onSkip }) {
  const item = TUTORIAL_STEPS[step] ?? TUTORIAL_STEPS[0]
  const isLast = step >= TUTORIAL_STEPS.length - 1
  const [rect, setRect] = useState(null)
  const cardRef = useRef(null)

  // 测量目标 DOM 元素位置（每帧轮询 + window resize，避免错过元素挂载时机）
  useEffect(() => {
    let raf = 0
    let active = true
    function measure() {
      if (!active) return
      const target = document.querySelector(item.targetSelector)
      if (target) {
        setRect(rectInDesignCanvas(target))
      } else {
        setRect(null)
      }
      raf = window.requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => {
      active = false
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [item.targetSelector])

  // 根据 placement 计算卡片浮现位置 + 箭头朝向
  const placement = item.placement || 'bottom'
  const CARD_W = 440
  const CARD_GAP = 24
  let cardX = 0
  let cardY = 0
  let arrowAxis = 'top'
  if (rect) {
    const cx = rect.x + rect.w / 2
    const cy = rect.y + rect.h / 2
    if (placement === 'bottom') {
      cardX = cx - CARD_W / 2
      cardY = rect.y + rect.h + CARD_GAP
      arrowAxis = 'top'
    } else if (placement === 'top') {
      cardX = cx - CARD_W / 2
      cardY = rect.y - CARD_GAP // CSS 用 transform translate(0,-100%) 把卡片放到上方
      arrowAxis = 'bottom'
    } else if (placement === 'left') {
      cardX = rect.x - CARD_W - CARD_GAP
      cardY = cy
      arrowAxis = 'right'
    } else if (placement === 'right') {
      cardX = rect.x + rect.w + CARD_GAP
      cardY = cy
      arrowAxis = 'left'
    }
    // 防止溢出屏幕 (设计画布坐标，1920×1080)
    const margin = 16
    cardX = Math.max(margin, Math.min(cardX, DESIGN_CANVAS_W - CARD_W - margin))
  } else {
    // 找不到目标 → 居中显示 (设计画布中央)
    cardX = DESIGN_CANVAS_W / 2 - CARD_W / 2
    cardY = DESIGN_CANVAS_H / 2
    arrowAxis = 'none'
  }

  // 焦点圈跟随目标 rect（加 12px padding 让圈比元素大一圈）
  const focusStyle = rect
    ? {
        '--focus-cx': `${rect.x + rect.w / 2}px`,
        '--focus-cy': `${rect.y + rect.h / 2}px`,
        '--focus-w': `${rect.w + 24}px`,
        '--focus-h': `${rect.h + 24}px`,
      }
    : { '--focus-cx': '50%', '--focus-cy': '50%', '--focus-w': '160px', '--focus-h': '160px' }

  return (
    <div className={`tutorial-overlay placement-${placement}`} style={focusStyle}>
      {/* 镂空高亮目标的描边 */}
      {rect && (
        <div
          className="tutorial-focus-ring"
          style={{
            left: rect.x - 6,
            top: rect.y - 6,
            width: rect.w + 12,
            height: rect.h + 12,
          }}
          aria-hidden="true"
        />
      )}
      <section
        ref={cardRef}
        className={`tutorial-card arrow-${arrowAxis}`}
        style={{
          left: `${cardX}px`,
          top: `${cardY}px`,
          width: `${CARD_W}px`,
        }}
      >
        <span>CEO BOOTCAMP · {step + 1}/{TUTORIAL_STEPS.length}</span>
        <strong>{item.title}</strong>
        <p>{item.body}</p>
        <div className="tutorial-actions">
          <button className="tutorial-skip" onClick={onSkip}>跳过 (反正你迟早会重开)</button>
          <button className="tutorial-next" onClick={onNext}>{isLast ? '入职报到 ▸' : '下一条 ▸'}</button>
        </div>
        <i className="tutorial-arrow" aria-hidden="true" />
      </section>
    </div>
  )
}

function ActiveBusinessModelsPanel({ activeBusinessModels, slotCap }) {
  const slots = Array.from({ length: slotCap }, (_, i) => activeBusinessModels[i] || null)
  return (
    <section className="active-bm-panel">
      <div className="active-bm-heading">
        <strong>商业模式</strong>
        <span>{activeBusinessModels.length}/{slotCap}</span>
      </div>
      <div className="active-bm-list">
        {slots.map((slot, i) => {
          if (!slot) {
            return <div key={i} className="active-bm-empty"><span>空槽位</span></div>
          }
          const bm = BUSINESS_MODELS.find((b) => b.id === slot.id)
          if (!bm) return null
          return (
            <div
              key={i}
              className={`active-bm-card rarity-${bm.rarity} hook-${bm.hook}`}
              data-bm-tip={`${bm.name}\n${bm.description}${bm.flavor ? `\n${bm.flavor}` : ''}`}
            >
              <img className="active-bm-image" src={businessModeImageSrc(bm)} alt="" aria-hidden="true" />
              <span className="active-bm-film" aria-hidden="true" />
              <div className="active-bm-card-top">
                <strong>{bm.name}</strong>
              </div>
            </div>
          )
        })}
      </div>
    </section>
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
      <EditableBlock id={`line-${line.id}-rail`} label={`产线 ${line.id} · 轨道栏`}>
        <div className="line-rail">
          <Factory size={17} />
          <strong>产线 {line.id}</strong>
          <span>{statusLabel}</span>
          <em>¥{report?.total ?? 0}</em>
        </div>
      </EditableBlock>
      <EditableBlock id={`line-${line.id}-slots`} label={`产线 ${line.id} · 卡槽排`}>
        <div className={`slot-row ${fxReport?.multFx ? 'has-mult-fx' : ''}`}>
          {line.slots.map((card, index) => {
            const slotOutput = report?.slotResults[index]?.output
            const canPlaceSelected = canPlaceCard(line, index, selectedCard)
            const canDropDragged = canPlaceCard(line, index, draggingCard)
            return (
              <div className="line-slot-cell" key={`${line.id}-${index}`}>
                <button
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
                </button>
                {fxReport?.slotResults[index]?.output > 0 && (
                  <span
                    className="slot-fx-number"
                    style={{
                      '--fx-delay': `${fxReport.slotResults[index].fxDelay}ms`,
                      '--fx-scale': fxReport.slotResults[index].fxScale,
                    }}
                  >
                    <span>+¥{fxReport.slotResults[index].output}</span>
                  </span>
                )}
              </div>
            )
          })}
          {fxReport?.multFx && (
            <div className="line-mult-fx" style={{ '--fx-delay': `${fxReport.multFx.delay}ms` }}>
              <span>倍率</span>
              <strong>x{fxReport.multFx.value}</strong>
            </div>
          )}
          {isActive && (
            <EditableBlock id={`line-${line.id}-actions`} label={`产线 ${line.id} · 操作按钮`}>
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
            </EditableBlock>
          )}
        </div>
      </EditableBlock>
    </section>
  )
}

function buildSettlementFx(settlement) {
  const reports = settlement?.lineReports ?? []
  const allOutputs = reports.flatMap((report) => report.slotResults.map((slot) => slot.output ?? 0))
  const maxOutput = Math.max(1, ...allOutputs)
  const slotStep = 430
  const slotDuration = 1320
  let order = 0
  const fxReports = reports.map((report) => ({
    ...report,
    slotResults: report.slotResults.map((slot) => {
      if (!slot.card || slot.output <= 0) return { ...slot, fxDelay: 0 }
      const fxDelay = order * slotStep
      const fxScale = (0.82 + Math.min(1.75, Math.sqrt(slot.output / maxOutput) * 1.15)).toFixed(2)
      order += 1
      return { ...slot, fxDelay, fxScale }
    }),
  }))
  let multiplierOrder = order
  const reportsWithMultiplier = fxReports.map((report) => {
    const hasOutput = report.slotResults.some((slot) => slot.card && slot.output > 0)
    if (!hasOutput) return report
    const rawSlotSum = Math.max(1, report.slotResults.reduce((sum, slot) => sum + (slot.output ?? 0), 0))
    const multiplier = Math.max(report.lineMultiplier ?? 1, report.total / rawSlotSum)
    const multFx = {
      delay: multiplierOrder * slotStep + 120,
      value: formatFxMultiplier(multiplier),
    }
    multiplierOrder += 1
    return { ...report, multFx }
  })
  const slotEndDelay = multiplierOrder > 0 ? (multiplierOrder - 1) * slotStep + slotDuration : 0
  const gain = settlement?.income ?? 0
  return {
    id: Date.now(),
    reports: reportsWithMultiplier,
    totalFx: {
      delay: slotEndDelay + 120,
      gain,
    },
    duration: slotEndDelay + 1800,
  }
}

function formatFxMultiplier(value) {
  if (!Number.isFinite(value)) return '1'
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

// ============================================================================
// 音量设置 (module 级，localStorage 持久化)
// ============================================================================
const AUDIO_VOLUME = { master: 0.7, sfx: 0.6 }

try {
  const stored = JSON.parse(window.localStorage.getItem('fa-audio-volume') || 'null')
  if (stored && typeof stored === 'object') {
    if (typeof stored.master === 'number') AUDIO_VOLUME.master = Math.max(0, Math.min(1, stored.master))
    if (typeof stored.sfx === 'number') AUDIO_VOLUME.sfx = Math.max(0, Math.min(1, stored.sfx))
  }
} catch {}

export function setAudioVolume(next) {
  if (typeof next.master === 'number') AUDIO_VOLUME.master = Math.max(0, Math.min(1, next.master))
  if (typeof next.sfx === 'number') AUDIO_VOLUME.sfx = Math.max(0, Math.min(1, next.sfx))
  try {
    window.localStorage.setItem('fa-audio-volume', JSON.stringify(AUDIO_VOLUME))
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('fa-audio-volume-change'))
  } catch {}
}

function getEffectiveSfxGain() {
  return AUDIO_VOLUME.master * AUDIO_VOLUME.sfx
}

function playSettlementAudio(fx) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return
  const sfxLevel = getEffectiveSfxGain()
  if (sfxLevel <= 0.001) return  // 静音直接跳过
  const ctx = new AudioContextClass()
  const notes = [261.63, 293.66, 329.63, 392.0, 523.25]
  const now = ctx.currentTime
  notes.forEach((freq, index) => {
    const start = now + index * 0.18
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.055 * sfxLevel, start + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.18)
  })
  const boom = ctx.createOscillator()
  const boomGain = ctx.createGain()
  const boomStart = now + Math.max(0.65, (fx?.reports?.length ?? 1) * 0.12)
  boom.type = 'sawtooth'
  boom.frequency.setValueAtTime(110, boomStart)
  boom.frequency.exponentialRampToValueAtTime(55, boomStart + 0.28)
  boomGain.gain.setValueAtTime(0.0001, boomStart)
  boomGain.gain.exponentialRampToValueAtTime(0.09 * sfxLevel, boomStart + 0.02)
  boomGain.gain.exponentialRampToValueAtTime(0.0001, boomStart + 0.36)
  boom.connect(boomGain).connect(ctx.destination)
  boom.start(boomStart)
  boom.stop(boomStart + 0.38)
  window.setTimeout(() => ctx.close(), 1800)
}

/** 设置面板试听用：短促一声 */
function playVolumeBlip() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return
  const sfxLevel = getEffectiveSfxGain()
  if (sfxLevel <= 0.001) return
  const ctx = new AudioContextClass()
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(523.25, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.08 * sfxLevel, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.2)
  window.setTimeout(() => ctx.close(), 400)
}

function playUiSfx(type = 'click') {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return
  const sfxLevel = getEffectiveSfxGain()
  if (sfxLevel <= 0.001) return

  const presets = {
    click: { wave: 'square', notes: [740], length: 0.045, gain: 0.025 },
    card: { wave: 'triangle', notes: [420, 360], length: 0.06, gap: 0.045, gain: 0.032 },
    place: { wave: 'triangle', notes: [360, 520], length: 0.07, gap: 0.05, gain: 0.04 },
    buy: { wave: 'square', notes: [523, 659, 784], length: 0.06, gap: 0.055, gain: 0.035 },
    open: { wave: 'sawtooth', notes: [392, 587, 880], length: 0.075, gap: 0.05, gain: 0.035 },
    roll: { wave: 'square', notes: [330, 440, 330, 554], length: 0.04, gap: 0.035, gain: 0.026 },
    choice: { wave: 'triangle', notes: [494, 740], length: 0.08, gap: 0.06, gain: 0.035 },
    upgrade: { wave: 'square', notes: [523, 659, 784, 1047], length: 0.065, gap: 0.055, gain: 0.04 },
    transition: { wave: 'triangle', notes: [220, 330, 440], length: 0.12, gap: 0.075, gain: 0.035 },
    fire: { wave: 'sawtooth', notes: [220, 146], length: 0.11, gap: 0.06, gain: 0.035 },
    error: { wave: 'sawtooth', notes: [170, 130], length: 0.09, gap: 0.05, gain: 0.035 },
  }
  const preset = presets[type] ?? presets.click
  const ctx = new AudioContextClass()
  const now = ctx.currentTime
  const total = preset.notes.length * (preset.gap ?? 0.05) + preset.length + 0.05

  preset.notes.forEach((freq, index) => {
    const start = now + index * (preset.gap ?? 0.05)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = preset.wave
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(preset.gain * sfxLevel, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + preset.length)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + preset.length + 0.02)
  })

  window.setTimeout(() => ctx.close(), Math.ceil(total * 1000) + 80)
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
  const [handHint, setHandHint] = useState(null)
  const handHintTimerRef = useRef(null)
  const pendingHandHintRef = useRef(null)
  const dept = DEPT_META[card.dept] ?? DEPT_META.NONE
  const rarityLabel = RARITY_LABELS[card.rarity] ?? card.rarity
  const DepartmentIcon = getCardDepartmentIcon(card)
  const hasOutputOverride = card.type === 'emp' && Number.isFinite(outputOverride)
  const isActionCard = card.type === 'fun' || card.type === 'srv'
  const primary = hasOutputOverride ? `¥${outputOverride}` : card.type === 'emp' ? `¥${card.baseOutput}` : getActionPrimaryParts(card.effects[0])
  const outputChanged = hasOutputOverride && outputOverride !== card.baseOutput
  const effects = [...card.effects, ...card.affixEffects].filter((effect) => !effect.startsWith('COST') && !effect.startsWith('BASE_OUTPUT'))
  const shortEffectText = effects.slice(0, 2).map(summarizeEffectShort).join(' · ') || '基础行动'
  const fullEffectText = effects.map(summarizeEffect).join(' / ') || '基础行动'
  const neighborDirection = getNeighborDirection(effects)
  const Component = onClick ? 'button' : 'div'
  const canTilt = (mode === 'hand' && selected) || mode === 'reveal'
  const usesFloatingHint = mode === 'hand' || mode === 'slot'

  useEffect(() => {
    return () => window.clearTimeout(handHintTimerRef.current)
  }, [])

  function handlePointerMove(event) {
    updateFloatingHint(event)
    if (!canTilt) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    const tiltY = (0.5 - x) * 11
    const tiltX = (y - 0.5) * 8
    event.currentTarget.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--portrait-tilt-x', `${tiltX.toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--portrait-tilt-y', `${tiltY.toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--person-tilt-x', `${(-tiltX * 1.28).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--person-tilt-y', `${(-tiltY * 1.28).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--person-shift-x', `${(-tiltY * 0.5).toFixed(2)}px`)
    event.currentTarget.style.setProperty('--person-shift-y', `${(-tiltX * 0.42).toFixed(2)}px`)
    event.currentTarget.style.setProperty('--glare-x', `${Math.round(x * 100)}%`)
    event.currentTarget.style.setProperty('--glare-y', `${Math.round(y * 100)}%`)
  }

  function handlePointerLeave(event) {
    hideFloatingHint()
    if (!canTilt) return
    event.currentTarget.style.setProperty('--tilt-x', '0deg')
    event.currentTarget.style.setProperty('--tilt-y', '0deg')
    event.currentTarget.style.setProperty('--portrait-tilt-x', '0deg')
    event.currentTarget.style.setProperty('--portrait-tilt-y', '0deg')
    event.currentTarget.style.setProperty('--person-tilt-x', '0deg')
    event.currentTarget.style.setProperty('--person-tilt-y', '0deg')
    event.currentTarget.style.setProperty('--person-shift-x', '0px')
    event.currentTarget.style.setProperty('--person-shift-y', '0px')
    event.currentTarget.style.setProperty('--glare-x', '50%')
    event.currentTarget.style.setProperty('--glare-y', '18%')
  }

  function updateFloatingHint(event) {
    if (!usesFloatingHint) return
    // 提示框使用 position:fixed（在 body 上 portal），直接用视口坐标
    const cx = event.clientX
    const cy = event.clientY
    const offset = 14       // 紧贴指针，视口像素
    const hintW = 220       // 提示框估算宽度（视口像素）
    const hintH = 72        // 提示框估算高度
    const nearRight  = cx + offset + hintW > window.innerWidth
    const nearBottom = cy + offset + hintH > window.innerHeight
    // left/top 始终指向指针旁的锚点；CSS class 再用 translate(-100%) 翻转到另一侧
    const nextHint = {
      left: cx + (nearRight ? -offset : offset),
      top:  cy + (nearBottom ? -offset : offset),
      x: nearRight  ? 'left'  : 'right',
      y: nearBottom ? 'top'   : 'bottom',
    }
    pendingHandHintRef.current = nextHint
    if (handHint) {
      setHandHint(nextHint)   // 已显示时实时跟随
      return
    }
    if (handHintTimerRef.current) return
    handHintTimerRef.current = window.setTimeout(() => {
      setHandHint(pendingHandHintRef.current)
      handHintTimerRef.current = null
    }, 500)   // 0.5 秒后出现
  }

  function hideFloatingHint() {
    if (!usesFloatingHint) return
    window.clearTimeout(handHintTimerRef.current)
    handHintTimerRef.current = null
    pendingHandHintRef.current = null
    setHandHint(null)
  }

  return (
    <>
      <span className={`card-stage ${mode} ${selected ? 'selected' : ''} ${entering ? 'entering' : ''}`} style={style} data-effect-hint={fullEffectText}>
        <span className="card-stage-shadow" aria-hidden="true" />
        <Component
          className={`card-view ${mode} ${selected ? 'selected' : ''} ${entering ? 'entering' : ''} ${dragging ? 'dragging' : ''} ${neighborDirection ? `neighbor-${neighborDirection}` : ''} rarity-${card.rarity} type-${card.type} dept-${card.dept.toLowerCase()}`}
          data-card-id={card.id}
          draggable={draggable}
          onClick={onClick}
          onPointerEnter={updateFloatingHint}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title={usesFloatingHint ? undefined : `${card.name} · ${fullEffectText}`}
          aria-label={`${card.name} · ${fullEffectText}`}
          type={onClick ? 'button' : undefined}
        >
          {neighborDirection && (
            <span className={`neighbor-cue ${neighborDirection}`} aria-hidden="true">
              {(neighborDirection === 'left' || neighborDirection === 'both') && <i className="left" />}
              {(neighborDirection === 'right' || neighborDirection === 'both') && <i className="right" />}
            </span>
          )}
          <span className="card-top">
            <i className="card-title-chip">
              <DepartmentIcon className="card-dept-icon" size={12} aria-hidden="true" />
              <span>{card.name}</span>
            </i>
            <em>{rarityLabel}</em>
            <b><Zap className="card-ap-icon" size={12} />{card.ap}</b>
          </span>
          <span className="card-portrait" aria-hidden="true">
            {card.type === 'emp' && <ExecutiveSvgPortrait card={card} />}
            {(card.type === 'srv' || card.type === 'fun') && hasServiceFunSvg(card.id) && (
              <span className="srvfun-svg-wrap"><ServiceFunSvg cardId={card.id} /></span>
            )}
          </span>
          <span className={`card-output delta-${card.outputDelta} ${card.type === 'emp' ? 'exec-number' : 'action-primary'} ${outputChanged ? 'changed' : ''}`}>
            {isActionCard ? (
              <>
                <span className="action-primary-label">{primary.label}</span>
                {primary.value && <span className="action-primary-value exec-number">{primary.value}</span>}
              </>
            ) : primary}
          </span>
          {!isActionCard && <span className="card-effects">{shortEffectText}</span>}
          {card.affixes.length > 0 && (
            <span className="affix-row">
              {card.affixes.slice(0, 2).map((affix) => <i key={affix.id}>★{affix.name}</i>)}
            </span>
          )}
          <span className="card-flavor">"{card.flavor}"</span>
        </Component>
      </span>
      {usesFloatingHint && handHint && createPortal(
        <div
          className={`card-effect-floating-hint x-${handHint.x} y-${handHint.y}`}
          style={{ left: handHint.left, top: handHint.top }}
        >
          {fullEffectText}
        </div>,
        document.body,
      )}
    </>
  )
}

function getCardDepartmentIcon(card) {
  if (card.type === 'fun') return Sparkles
  if (card.type === 'srv') return BriefcaseBusiness
  if (card.dept === 'R') return FlaskConical
  if (card.dept === 'S') return HandCoins
  if (card.dept === 'O') return ClipboardList
  return Factory
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

function getActionPrimaryParts(effect = '') {
  const label = summarizeEffect(effect)
  const value = summarizeEffectValue(String(effect).replace('TRIGGER: ', '').trim())
  if (!value) return { label, value: '' }

  return {
    label: label
      .replace(value, '')
      .replace(/\s*(倍率|加强|产能)\s*$/g, '$1')
      .replace(/\s+/g, ' ')
      .trim(),
    value,
  }
}

function summarizeEffect(effect = '') {
  const normalized = String(effect).replace('TRIGGER: ', '').trim()
  const value = summarizeEffectValue(normalized)
  const strengthen = value ? `加强 ${value}` : '加强'

  if (normalized.includes('MONTH_NO_MAINTAIN')) return '本月免维持费'
  if (normalized.includes('MONTH_BONUS')) return value ? `本月产能 ${value}` : '本月产能增加'
  if (normalized.includes('MONTH_STAR_RATE')) return value ? `叙事率 ${value}` : '叙事率提高'
  if (normalized.includes('LINE_XMULT')) return value ? `全线倍率 ${value}` : '全线倍率提高'
  if (normalized.includes('LINE_ALL_R')) return value ? `全线研发员工${effectValueVerb(value)}` : '全线研发员工加强'
  if (normalized.includes('LINE_ALL_S')) return value ? `全线销售员工${effectValueVerb(value)}` : '全线销售员工加强'
  if (normalized.includes('LINE_ALL_O')) return value ? `全线运营员工${effectValueVerb(value)}` : '全线运营员工加强'
  if (normalized.includes('LINE_ALL')) return value ? `全线员工${effectValueVerb(value)}` : '全线员工加强'
  if (normalized.includes('RIGHT:')) return `右邻员工${effectValueVerb(value) || strengthen}`
  if (normalized.includes('LEFT:')) return `左邻员工${effectValueVerb(value) || strengthen}`
  if (normalized.includes('BOTH:')) return `两侧员工${effectValueVerb(value) || strengthen}`
  if (normalized.includes('ADJ_R')) return value ? `相邻研发员工${effectValueVerb(value)}` : '相邻研发员工加强'
  if (normalized.includes('ADJ_S')) return value ? `相邻销售员工${effectValueVerb(value)}` : '相邻销售员工加强'
  if (normalized.includes('SAME_DEPT')) return value ? `同部门员工${effectValueVerb(value)}` : '同部门员工加强'
  if (normalized.includes('SELF_IF_P1')) return value ? `在启动位时自身${effectValueVerb(value)}` : '启动位自身加强'
  if (normalized.includes('SELF_IF_P3')) return value ? `在中位时自身${effectValueVerb(value)}` : '中位自身加强'
  if (normalized.includes('SELF_IF_P5')) return value ? `在收割位时自身${effectValueVerb(value)}` : '收割位自身加强'
  if (normalized.includes('SELF_IF_LEFT_DEPT_R')) return value ? `左邻为研发时自身${effectValueVerb(value)}` : '左邻为研发时自身加强'
  if (normalized.includes('SELF_IF_ADJ_FUN')) return value ? `相邻功能牌时自身${effectValueVerb(value)}` : '相邻功能牌时自身加强'
  if (normalized.includes('SELF_IF_LINE_HAS_FUN')) return value ? `产线有功能牌时自身${effectValueVerb(value)}` : '产线有功能牌时自身加强'
  if (normalized.includes('SELF:')) return value ? `自身${effectValueVerb(value)}` : '自身加强'
  return normalized.replace(/_/g, ' ')
}

function summarizeEffectShort(effect = '') {
  const normalized = String(effect).replace('TRIGGER: ', '').trim()
  const value = summarizeEffectValue(normalized)
  if (normalized.includes('MONTH_NO_MAINTAIN')) return '免维持'
  if (normalized.includes('MONTH_BONUS')) return value ? `本月${value}` : '本月加产'
  if (normalized.includes('MONTH_STAR_RATE')) return value ? `叙事${value}` : '叙事率'
  if (normalized.includes('LINE_XMULT')) return value ? `全线${value}` : '全线倍率'
  if (normalized.includes('LINE_ALL_R')) return value ? `研发${value}` : '研发加强'
  if (normalized.includes('LINE_ALL_S')) return value ? `销售${value}` : '销售加强'
  if (normalized.includes('LINE_ALL_O')) return value ? `运营${value}` : '运营加强'
  if (normalized.includes('LINE_ALL')) return value ? `全线${value}` : '全线加强'
  if (normalized.includes('RIGHT:')) return value ? `右邻${value}` : '右邻加强'
  if (normalized.includes('LEFT:')) return value ? `左邻${value}` : '左邻加强'
  if (normalized.includes('BOTH:')) return value ? `两侧${value}` : '两侧加强'
  if (normalized.includes('ADJ_R')) return value ? `邻研发${value}` : '邻研发'
  if (normalized.includes('ADJ_S')) return value ? `邻销售${value}` : '邻销售'
  if (normalized.includes('SAME_DEPT')) return value ? `同部门${value}` : '同部门'
  if (normalized.includes('SELF_IF_P1')) return value ? `启动${value}` : '启动位'
  if (normalized.includes('SELF_IF_P3')) return value ? `中位${value}` : '中位'
  if (normalized.includes('SELF_IF_P5')) return value ? `收割${value}` : '收割位'
  if (normalized.includes('SELF_IF_LEFT_DEPT_R')) return value ? `左研发${value}` : '左研发'
  if (normalized.includes('SELF_IF_ADJ_FUN')) return value ? `邻功能${value}` : '邻功能'
  if (normalized.includes('SELF_IF_LINE_HAS_FUN')) return value ? `有功能${value}` : '有功能'
  if (normalized.includes('SELF:')) return value ? `自身${value}` : '自身加强'
  return summarizeEffect(normalized)
}

function summarizeEffectValue(effect = '') {
  const multiplier = effect.match(/x\d+(?:\.\d+)?/)
  if (multiplier) return multiplier[0]
  const yen = effect.match(/[+-]¥\d+(?:\.\d+)?/)
  if (yen) return yen[0]
  const percent = effect.match(/[+-]\d+(?:\.\d+)?%/)
  if (percent) return percent[0]
  return ''
}

function effectValueVerb(value = '') {
  if (!value) return ''
  if (value.startsWith('x')) return `倍率 ${value}`
  if (value.includes('¥')) return `产能 ${value}`
  return `加强 ${value}`
}

function PackMarket({ packs, budget, used, onOpen, textId }) {
  const visiblePackCount = used ? 0 : packs.length
  return (
    <section className="recruit-market pack-market">
      <div className="active-bm-heading pack-market-heading">
        <strong>{textId ? <EditableText id={`${textId}-title`}>招聘卡包</EditableText> : '招聘卡包'}</strong>
        <span>({visiblePackCount}/3)</span>
      </div>
      <div className="pack-list">
        {!used && packs.map((pack) => {
          const canAfford = budget >= pack.cost
          return (
            <button
              key={pack.uid}
              className="pack-card"
              style={{ '--pack-color': pack.color }}
              disabled={!canAfford}
              onClick={() => onOpen(pack.uid)}
            >
              <span className="pack-shine" aria-hidden="true" />
              <PackBox3D variant={pack.svgVariant} />
              <strong className="pack-name">{pack.name}</strong>
              <span className="pack-price">{canAfford ? `💰${pack.cost}` : '💰不足'}</span>
            </button>
          )
        })}
        {used && (
          <div className="candidate-empty">
            <strong>本月招聘已完成</strong>
            <span>下月刷新 5 选 3 新卡包</span>
          </div>
        )}
      </div>
    </section>
  )
}

function RecruitPackReveal({ card, onClose }) {
  const [phase, setPhase] = useState('opening') // opening → revealed
  useEffect(() => {
    const t = window.setTimeout(() => setPhase('revealed'), 640)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className={`recruit-reveal-overlay ${phase}`} onClick={onClose}>
      <div className="recruit-reveal-sparkles" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className={`spark spark-${i}`} />
        ))}
      </div>
      <div className="recruit-reveal-glow" aria-hidden="true" />
      <div
        className={`recruit-reveal-card-wrap ${phase}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reveal-banner">挖 到 啦</div>
        <CardView card={card} mode="reveal" />
        <button className="reveal-confirm" onClick={onClose}>收入牌堆 ▸</button>
      </div>
    </div>
  )
}

function DeckButton({ label, count, onClick }) {
  const isCooling = label === '冷却'
  const metaLabel = isCooling ? '休息' : '待命'
  return (
    <button className="deck-button" onClick={onClick} data-tip={isCooling ? '休息员工' : '员工册'} aria-label={isCooling ? '休息员工' : '员工册'}>
      <span className="meta-word-icon" aria-hidden="true">{metaLabel}</span>
      <span className="meta-copy">
        <strong>{count}</strong>
      </span>
    </button>
  )
}

function HandCount({ discardRequired, handCount }) {
  return (
    <div className={`hand-title ${discardRequired > 0 ? 'discard-alert' : ''}`} data-tip="待命员工" aria-label="待命员工">
      {discardRequired > 0 ? (
        <span className="meta-word-icon discard-badge" aria-hidden="true">需弃牌 {discardRequired}</span>
      ) : (
        <span className="meta-word-icon" aria-hidden="true">工作中</span>
      )}
      <span className="meta-copy">
        <strong>{handCount}/{GAME_CONFIG.handLimit}</strong>
      </span>
    </div>
  )
}

function ComboRulesOverlay({ onClose }) {
  const rules = CARD_TEMPLATES
    .map((card) => ({
      id: card.id,
      name: card.name,
      type: card.type,
      rarity: card.rarity,
      rules: card.effects.filter(isComboRule),
    }))
    .filter((card) => card.rules.length > 0)

  return (
    <div className="modal-backdrop retro-backdrop" onMouseDown={onClose}>
      <section className="retro-panel combo-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="retro-title">
          <strong>Combo 规则</strong>
          <button onClick={onClose}>返回</button>
        </div>
        <div className="combo-rules-list">
          {rules.map((card) => (
            <article key={card.id} className={`combo-rule rarity-${card.rarity}`}>
              <span>{card.type === 'emp' ? '员工' : card.type === 'fun' ? '功能' : '服务'}</span>
              <strong>{card.name}</strong>
              <p>{card.rules.map(summarizeEffect).join(' / ')}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function SettingsOverlay({ onClose, onRestart, onClearArchive, onPass, onMain, onEnterBoardMeeting, canEnterBoardMeeting, onOpenCompendium, onEditLayout }) {
  const [master, setMaster] = useState(() => AUDIO_VOLUME.master)
  const [sfx, setSfx] = useState(() => AUDIO_VOLUME.sfx)
  const blipTimerRef = useRef(null)

  function handleMasterChange(value) {
    setMaster(value)
    setAudioVolume({ master: value })
    queueBlip()
  }
  function handleSfxChange(value) {
    setSfx(value)
    setAudioVolume({ sfx: value })
    queueBlip()
  }
  function queueBlip() {
    window.clearTimeout(blipTimerRef.current)
    blipTimerRef.current = window.setTimeout(() => playVolumeBlip(), 80)
  }

  return (
    <div className="modal-backdrop retro-backdrop" onMouseDown={onClose}>
      <section className="retro-panel settings-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="retro-title">
          <strong>设置</strong>
        </div>
        <div className="settings-volume">
          <VolumeSlider label="音量" value={master} onChange={handleMasterChange} />
          <VolumeSlider label="音效" value={sfx} onChange={handleSfxChange} />
        </div>
        <button onClick={onClose}>返回</button>
        {onEditLayout && <button className="settings-edit-layout-btn" onClick={onEditLayout}>✎ 编辑布局</button>}
        {onOpenCompendium && <button onClick={onOpenCompendium}>图鉴</button>}
        {onRestart && <button onClick={onRestart}>重新开始</button>}
        {onClearArchive && <button onClick={onClearArchive}>清除存档并重开</button>}
        {onPass && <button onClick={onPass}>直接过关 → 结算画面</button>}
        {canEnterBoardMeeting && (
          <button onClick={onEnterBoardMeeting}>直接进入董事会会议</button>
        )}
        {onMain && <button onClick={onMain}>返回主界面</button>}
      </section>
    </div>
  )
}

function VolumeSlider({ label, value, onChange }) {
  const pct = Math.round(value * 100)
  return (
    <label className="volume-slider">
      <span className="volume-slider-label">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
      <span className="volume-slider-value">{pct}</span>
    </label>
  )
}

function StagnationAdvisor({ onSelect, onClose }) {
  return (
    <div className="modal-backdrop retro-backdrop" onMouseDown={onClose}>
      <section className="retro-panel stagnation-advisor-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="retro-title">
          <strong>滞涨顾问建议</strong>
        </div>
        <p className="stagnation-intro">
          老板，公司已连续 6 个月估值未能创新高。为打破焦灼状态，请从以下三个战略建议中选择一个执行：
        </p>
        <div className="advisor-options">
          <button className="advisor-opt-btn" onClick={() => onSelect('A')}>
            <strong>A. 精简团队</strong>
            <span>免费解雇月 burn 最高的一张卡牌</span>
          </button>
          <button className="advisor-opt-btn" onClick={() => onSelect('B')}>
            <strong>B. 注资援助</strong>
            <span>获得紧急资金注资 +¥50</span>
          </button>
          <button className="advisor-opt-btn" onClick={() => onSelect('C')}>
            <strong>C. 战略冲刺</strong>
            <span>下个月所有生产线产出提升 30% (×1.3)</span>
          </button>
        </div>
        <button className="advisor-close-btn" onClick={onClose}>暂不理会</button>
      </section>
    </div>
  )
}

// ============================================================
// EditableBlock — drag + resize + scale wrapper for battle layout editor
// ============================================================
function EditableBlock({ id, label, children }) {
  const { editMode, overrides, update } = React.useContext(LayoutEditCtx)
  const ov = overrides[id] ?? {}
  const elRef = React.useRef(null)

  const elemScale = ov.scale ?? 1

  // Build override style (applied even outside edit mode for saved state)
  const style = {}
  const hasMoved = ov.dx != null || ov.dy != null
  const hasScale  = ov.scale != null && ov.scale !== 1
  if (hasMoved || hasScale) {
    style.transform = `translate(${ov.dx ?? 0}px, ${ov.dy ?? 0}px) scale(${elemScale})`
    style.transformOrigin = 'top left'
  }
  if (ov.w != null) style.width = `${ov.w}px`
  if (ov.h != null) style.height = `${ov.h}px`
  if (editMode) {
    style.position = 'relative'
    style.zIndex = 100
    style.overflow = 'visible'
  }

  function startPointerDrag(type, event) {
    if (!editMode) return
    event.preventDefault()
    event.stopPropagation()
    const appScale = parseFloat(
      document.documentElement.style.getPropertyValue('--app-scale') || '1'
    ) || 1
    const rect = elRef.current.getBoundingClientRect()
    const naturalW = rect.width / appScale
    const naturalH = rect.height / appScale
    const startOv = {
      dx: ov.dx ?? 0,
      dy: ov.dy ?? 0,
      w: ov.w ?? naturalW,
      h: ov.h ?? naturalH,
      scale: elemScale,
    }
    const drag = { type, startCX: event.clientX, startCY: event.clientY, startOv, appScale }

    function onMove(e) {
      const ddx = (e.clientX - drag.startCX) / drag.appScale
      const ddy = (e.clientY - drag.startCY) / drag.appScale
      const s = drag.startOv
      const next = { ...s }
      if (drag.type === 'move') {
        next.dx = s.dx + ddx
        next.dy = s.dy + ddy
      } else {
        if (drag.type.includes('e')) next.w = Math.max(80, s.w + ddx)
        if (drag.type.includes('s')) next.h = Math.max(40, s.h + ddy)
        if (drag.type.includes('w')) { next.dx = s.dx + ddx; next.w = Math.max(80, s.w - ddx) }
        if (drag.type.includes('n')) { next.dy = s.dy + ddy; next.h = Math.max(40, s.h - ddy) }
      }
      update(id, next)
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function adjustScale(delta) {
    const next = Math.max(0.1, Math.min(5, parseFloat((elemScale + delta).toFixed(2))))
    update(id, { ...ov, scale: next })
  }

  if (!editMode) {
    const hasOverride = hasMoved || hasScale || ov.w != null || ov.h != null
    if (!hasOverride) return <>{children}</>
    return (
      <div ref={elRef} style={{ height: '100%', minHeight: 0, ...style }}>
        {children}
      </div>
    )
  }

  const HANDLES = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
  return (
    <div ref={elRef} className="edit-block" style={style}>
      {/* Move bar */}
      <div className="edit-move-bar">
        <div className="edit-move-grip" onPointerDown={(e) => startPointerDrag('move', e)}>
          <span className="edit-move-icon">✥</span>
          <span className="edit-move-label">{label}</span>
        </div>
        <div className="edit-scale-ctrl" onPointerDown={e => e.stopPropagation()}>
          <button className="edit-scale-btn" onClick={() => adjustScale(-0.05)}>−</button>
          <span className="edit-scale-value">{elemScale.toFixed(2)}×</span>
          <button className="edit-scale-btn" onClick={() => adjustScale(+0.05)}>+</button>
        </div>
        <span className="edit-reset-btn" onPointerDown={(e) => {
          e.stopPropagation()
          const next = { ...ov }
          delete next.dx; delete next.dy; delete next.w; delete next.h; delete next.scale
          update(id, next)
        }}>↺</span>
      </div>
      {/* 8 resize handles */}
      {HANDLES.map(dir => (
        <div
          key={dir}
          className={`edit-handle edit-h-${dir}`}
          onPointerDown={(e) => startPointerDrag(dir, e)}
        />
      ))}
      {children}
    </div>
  )
}

// ============================================================
// EditableText — inline text editor for layout edit mode
// ============================================================
function EditableText({ id, children }) {
  const { editMode, textOverrides, updateText } = React.useContext(LayoutEditCtx)
  const stored = textOverrides[id]
  const display = stored ?? children
  if (!editMode) return <>{display}</>
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      className="editable-text-field"
      onBlur={e => {
        const val = e.currentTarget.textContent
        updateText(id, val !== '' ? val : children)
      }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
      onPointerDown={e => e.stopPropagation()}
    >
      {display}
    </span>
  )
}

// ============================================================
// LayoutEditorBar — floating toolbar shown in edit mode
// ============================================================
function LayoutEditorBar({ onSave, onReset, onExit }) {
  return (
    <div className="layout-editor-bar">
      <span className="layout-editor-title">✎ 布局编辑模式</span>
      <span className="layout-editor-hint">金条拖动位置 · 边角调整大小 · [−/+] 矢量缩放 · 点击文字直接编辑</span>
      <div className="layout-editor-actions">
        <button className="layout-btn layout-btn-save" onClick={onSave}>💾 保存布局</button>
        <button className="layout-btn layout-btn-reset" onClick={onReset}>↺ 重置默认</button>
        <button className="layout-btn layout-btn-exit" onClick={onExit}>✕ 退出编辑</button>
      </div>
    </div>
  )
}

function MenuTiltButton({ onClick, children }) {
  function handleMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    // 反向倾斜：鼠标向右 → 卡左仰；上 → 后仰
    const tiltY = (x - 0.5) * 14    // rotateY 沿 X 轴
    const tiltX = (0.5 - y) * 9     // rotateX 沿 Y 轴
    event.currentTarget.style.setProperty('--btn-tilt-x', `${tiltX.toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--btn-tilt-y', `${tiltY.toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--btn-glare-x', `${Math.round(x * 100)}%`)
    event.currentTarget.style.setProperty('--btn-glare-y', `${Math.round(y * 100)}%`)
  }
  function handleLeave(event) {
    event.currentTarget.style.setProperty('--btn-tilt-x', '0deg')
    event.currentTarget.style.setProperty('--btn-tilt-y', '0deg')
    event.currentTarget.style.setProperty('--btn-glare-x', '50%')
    event.currentTarget.style.setProperty('--btn-glare-y', '25%')
  }
  return (
    <button
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {children}
    </button>
  )
}

const CREDITS_SECTIONS = [
  { kind: 'logo', lines: ['A FRANK FAN', 'PRODUCTION'] },
  { kind: 'spacer' },
  { kind: 'title', lines: ['制 作 组', '— STAFF ROLL —'] },
  { kind: 'spacer' },

  { kind: 'role', heading: '总 监 制', rows: [['Executive Producer', 'Frank Fan']] },
  { kind: 'role', heading: '执 行 制 作', rows: [['Producer', 'Frank Fan']] },
  { kind: 'spacer' },

  { kind: 'role', heading: '游戏设计 · GAME DESIGN', rows: [
    ['主策划 · Lead Design', 'Frank Fan'],
    ['系统策划 · Systems', 'Frank Fan'],
    ['数值策划 · Balance', 'Frank Fan'],
    ['关卡设计 · Level', 'Frank Fan'],
    ['剧情编剧 · Narrative', 'Frank Fan'],
  ]},
  { kind: 'spacer' },

  { kind: 'role', heading: '美术 · ART', rows: [
    ['美术总监 · Art Director', 'Frank Fan'],
    ['角色像素 · Character Pixel', 'Frank Fan'],
    ['UI 设计 · UI Design', 'Frank Fan'],
    ['图标绘制 · Iconography', 'Frank Fan'],
    ['特效设计 · VFX', 'Frank Fan'],
  ]},
  { kind: 'spacer' },

  { kind: 'role', heading: '音频 · AUDIO', rows: [
    ['音乐总监 · Music Director', 'Frank Fan'],
    ['作曲 · Composer', 'Frank Fan'],
    ['音效 · Sound Design', 'Frank Fan'],
    ['混音 · Mixing', 'Frank Fan'],
  ]},
  { kind: 'spacer' },

  { kind: 'role', heading: '程序 · ENGINEERING', rows: [
    ['主程序 · Lead Engineer', 'Frank Fan'],
    ['战斗系统 · Battle System', 'Frank Fan'],
    ['UI 工程 · UI Engineering', 'Frank Fan'],
    ['工具链 · Tooling', 'Frank Fan'],
    ['AI 协作 · AI Pair', 'Codex / Claude'],
  ]},
  { kind: 'spacer' },

  { kind: 'role', heading: '测试 · QA', rows: [
    ['首席测试 · Lead QA', '你'],
    ['压力测试 · Stress Test', '你'],
    ['平衡测试 · Playtest', '你'],
    ['Bug Hunter', '你'],
  ]},
  { kind: 'spacer' },

  { kind: 'role', heading: '发行 · PUBLISHING', rows: [
    ['发行 · Publisher', '也许是你'],
    ['市场推广 · Marketing', '也许是你'],
    ['社区运营 · Community', '也许是你'],
    ['商务合作 · Business Dev', '也许是你'],
  ]},
  { kind: 'spacer' },

  { kind: 'title', lines: ['— 特 别 鸣 谢 —', 'SPECIAL THANKS'] },
  { kind: 'list', items: [
    'Vite · React · Phaser',
    'TakWolf / Fusion Pixel 字体',
    'Balatro · Slay the Spire · 炉石',
    '所有还在熬夜的独立游戏作者',
  ]},
  { kind: 'spacer' },

  { kind: 'title', lines: ['— 谨以此局献给 —'] },
  { kind: 'list', items: [
    '每一位还在加班的 CEO',
    '每一位刚被裁的员工',
    '每一位「下一关再说」的赌徒',
  ]},
  { kind: 'spacer' },
  { kind: 'spacer' },

  { kind: 'finale', rows: [
    ['主角 · PROTAGONIST', 'Frank'],
    ['玩家 · PLAYER', '你'],
    ['未来 · FUTURE', '也许是你'],
  ]},

  { kind: 'spacer' },
  { kind: 'fin', text: '— FIN —' },
]

function CreditsOverlay({ onClose }) {
  const reelRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const [manualY, setManualY] = useState(null)
  const dragRef = useRef({ active: false, startClientY: 0, baseY: 0 })

  function handleReelMouseDown(event) {
    event.stopPropagation()
    if (!paused) {
      // 点击：暂停滚动，捕获当前 Y
      const reel = reelRef.current
      let y = 0
      if (reel) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(reel).transform)
        y = matrix.m42
      }
      setManualY(y)
      setPaused(true)
      dragRef.current = { active: true, startClientY: event.clientY, baseY: y }
    } else {
      dragRef.current = { active: true, startClientY: event.clientY, baseY: manualY ?? 0 }
    }
  }

  function handleMouseMove(event) {
    if (!dragRef.current.active) return
    const dy = event.clientY - dragRef.current.startClientY
    setManualY(dragRef.current.baseY + dy)
  }

  function handleMouseUp() {
    dragRef.current.active = false
  }

  const reelStyle = paused && manualY != null
    ? { animation: 'none', transform: `translate(-50%, ${manualY}px)` }
    : undefined

  return (
    <div
      className="credits-cinema"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="credits-scanlines" aria-hidden="true" />
      <div className="credits-vignette" aria-hidden="true" />
      <div
        ref={reelRef}
        className={`credits-reel ${paused ? 'reel-paused' : ''}`}
        style={reelStyle}
        onMouseDown={handleReelMouseDown}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="credits-film-logo">
          <img src="/assets/menu/FR.svg" alt="FRANK'S ADVANTURE" />
        </div>
        {CREDITS_SECTIONS.map((section, idx) => (
          <CreditsBlock key={idx} section={section} />
        ))}
      </div>
      <div className="credits-hint">
        {paused ? '按住拖动 · 点 ✕ 退出' : '点字幕暂停 · 按住可拖动'}
      </div>
      <button className="credits-skip" onClick={onClose}>跳过 ▸</button>
    </div>
  )
}

function CreditsBlock({ section }) {
  switch (section.kind) {
    case 'logo':
      return (
        <div className="credits-logo">
          {section.lines.map((line, i) => <strong key={i}>{line}</strong>)}
        </div>
      )
    case 'title':
      return (
        <div className="credits-title">
          {section.lines.map((line, i) => <h2 key={i}>{line}</h2>)}
        </div>
      )
    case 'role':
      return (
        <div className="credits-role">
          <h3>{section.heading}</h3>
          <dl>
            {section.rows.map(([k, v], i) => (
              <React.Fragment key={i}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )
    case 'list':
      return (
        <ul className="credits-list">
          {section.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )
    case 'finale':
      return (
        <div className="credits-finale">
          {section.rows.map(([k, v], i) => (
            <div key={i} className={`credits-finale-row ${v === '你' ? 'is-you' : v === '也许是你' ? 'is-maybe' : ''}`}>
              <span>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      )
    case 'fin':
      return <div className="credits-fin">{section.text}</div>
    case 'spacer':
    default:
      return <div className="credits-spacer" />
  }
}

function isComboRule(effect = '') {
  return /LEFT|RIGHT|BOTH|ADJ|SAME_DEPT|LINE_ALL|LINE_XMULT|SELF_IF|IF_ALL|x\d|[+]\d+%/.test(effect)
}

function ResultOverlay({ game, onRestart, onEnterIntermission }) {
  const result = game.result
  if (!result) return null

  const isGameWon = result.gameWon
  const nextStage = result.nextStage

  return (
    <div className="modal-backdrop retro-backdrop">
      <section className={`result-panel ${isGameWon ? 'passed' : 'promoted'}`}>
        <span>{isGameWon ? '终极胜利' : '阶段达成'}</span>
        <h1>{isGameWon ? '行业第一' : `${game.stage.name} → ${nextStage?.name}`}</h1>
        <div className="result-stats">
          <Metric label="当前估值" value={`¥${game.valuation}`} />
          {!isGameWon && nextStage && <Metric label="下阶段门槛" value={`¥${nextStage.threshold}`} />}
          <Metric label="经营月数" value={`${game.elapsedMonths} 月`} />
        </div>

        <div className="result-actions">
          {!isGameWon && onEnterIntermission && (
            <button className="command-button primary" onClick={onEnterIntermission}>
              <Sparkles size={18} />
              进入董事会会议
            </button>
          )}
          <button className={`command-button ${!isGameWon ? 'quiet' : 'primary'}`} onClick={onRestart}>
            <RotateCcw size={18} />
            {isGameWon ? '再玩一局' : '重新开始'}
          </button>
        </div>
      </section>
    </div>
  )
}

function buildRunReport(game) {
  const lineReports = game.lastSettlement?.lineReports ?? []
  const cards = lineReports.flatMap((report) => report.slotResults.map((slot) => slot.card).filter(Boolean))
  const deptCounts = cards.reduce((counts, card) => {
    counts[card.dept] = (counts[card.dept] ?? 0) + 1
    return counts
  }, {})
  const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const buildStyle = topDept === 'R' ? '研发推进' : topDept === 'S' ? '销售爆发' : topDept === 'O' ? '运营控费' : '混合试错'
  const defeatedByEvent = game.result?.defeatedByEvent || game.event?.name || '半年结算'
  const advice = game.cash <= 0
    ? '现金被打穿了。下局优先保留免维持费、月度现金和低 AP 员工。'
    : game.cumulativeIncome < game.level.target
      ? '分数不够。试着把高产出员工放到 P5，并让 P3 同时强化左右两侧。'
      : 'Boss 条件没满足。进入第 6 月前先检查本关事件的硬性要求。'
  return {
    bestMonth: game.result?.bestMonth ?? game.lastSettlement?.income ?? 0,
    defeatedByEvent,
    buildStyle,
    advice,
  }
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

// ============================================================================
// 关间「董事会会议」UI (详见 BOARD_MEETING_DESIGN.md §8)
// ============================================================================

function BoardMeetingHub({
  game,
  onResolveEvent,
  onShopBuy,
  onShopRoll,
  onPack,
  onUpgrade,
  onFire,
  onBmBuy,
  onSchoolRoll,
  onWithdrawal,
  onBmUnsubscribe,
  onExit,
}) {
  const [activeStation, setActiveStation] = useState(null)
  const [hrCardUid, setHrCardUid] = useState(null)
  const [pendingReplaceIdx, setPendingReplaceIdx] = useState(null)
  const [pendingBmSchoolIdx, setPendingBmSchoolIdx] = useState(null)
  const [confirmExit, setConfirmExit] = useState(false)

  const im = game.intermissionState
  if (!im) return null

  const currentStageIndex = STAGES.findIndex(s => s.id === game.stage.id)
  const nextStage = STAGES[currentStageIndex + 1]
  const isEventPhase = im.phase === 'event'

  return (
    <div className="bm-overlay">
      <section className="bm-panel">
        <header className="bm-panel-header">
          <div className="bm-cash-chip">
            <span aria-hidden="true">¥</span>
            <strong>{game.cash}</strong>
          </div>
          <div className="bm-panel-title">
            <span>BOARD MEETING</span>
            <strong>董事会会议</strong>
            <em>{game.stage.name} ▸ {nextStage ? nextStage.name : '最高阶段'}</em>
          </div>
          <button
            className="bm-next-button"
            disabled={isEventPhase}
            onClick={() => setConfirmExit(true)}
            title={isEventPhase ? '请先完成董事访谈' : '进入下一阶段'}
          >
            进入下一阶段 ▸
          </button>
        </header>

        {im.resolvedMessage && (
          <div className="bm-toast-strip">▶ {im.resolvedMessage}</div>
        )}

        <main className="bm-panel-body">
          {isEventPhase ? (
            <BoardEventModal
              event={im.event}
              budget={game.cash}
              onSelect={(optId) => onResolveEvent(optId)}
            />
          ) : activeStation ? (
            <div className="bm-drawer-wrap">
              <button className="bm-back-btn" onClick={() => setActiveStation(null)}>◂ 返回站点</button>
              {activeStation === 'shop' && (
                <ShopDrawer
                  shopRoll={im.shopRoll}
                  purchased={im.purchased}
                  budget={game.cash}
                  nextLevelId={nextStage ? nextStage.id : 9}
                  onBuy={onShopBuy}
                  onPack={onPack}
                  onRoll={onShopRoll}
                />
              )}
              {activeStation === 'hr' && (
                <HrDrawer
                  game={game}
                  hrCardUid={hrCardUid}
                  setHrCardUid={setHrCardUid}
                  onUpgrade={onUpgrade}
                  onFire={onFire}
                />
              )}
              {activeStation === 'school' && (
                <SchoolDrawer
                  game={game}
                  schoolRoll={im.schoolRoll}
                  pendingReplaceIdx={pendingReplaceIdx}
                  setPendingReplaceIdx={setPendingReplaceIdx}
                  pendingBmSchoolIdx={pendingBmSchoolIdx}
                  setPendingBmSchoolIdx={setPendingBmSchoolIdx}
                  onBmBuy={onBmBuy}
                  onBmUnsubscribe={onBmUnsubscribe}
                  onRoll={onSchoolRoll}
                />
              )}
              {activeStation === 'log' && (
                <LogDrawer logTrail={im.logTrail} />
              )}
            </div>
          ) : (
            <div className="bm-menu-and-finance">
              <FinanceStation game={game} im={im} onWithdrawal={onWithdrawal} />
              
              <div className="bm-stations-grid">
                <StationCard
                  color="azure"
                  icon="💼"
                  title="投资部"
                  tag="SHOP"
                  description="epic / 传奇单卡 · 6 类卡包"
                  onClick={() => setActiveStation('shop')}
                />
                <StationCard
                  color="rose"
                  icon="📋"
                  title="人事部"
                  tag="HR"
                  description={`升职 / 免费解雇 · 本场操作 ${im.hrActionsCount}`}
                  onClick={() => setActiveStation('hr')}
                />
                <StationCard
                  color="violet"
                  icon="🎓"
                  title="商学院"
                  tag="SCHOOL"
                  description={`已学 ${game.activeBusinessModels.length}/${game.businessModelSlotCap} 商业模式`}
                  onClick={() => setActiveStation('school')}
                />
                <StationCard
                  color="amber"
                  icon="📰"
                  title="董事访谈"
                  tag="RECORDS"
                  description="本场会议日志"
                  onClick={() => setActiveStation('log')}
                />
              </div>
            </div>
          )}
        </main>
      </section>

      {confirmExit && (
        <ConfirmExitModal
          budget={game.cash}
          activeBMs={game.activeBusinessModels.length}
          nextStageName={nextStage ? nextStage.name : '终极阶段'}
          onConfirm={() => { setConfirmExit(false); onExit() }}
          onCancel={() => setConfirmExit(false)}
        />
      )}
    </div>
  )
}

function FinanceStation({ game, im, onWithdrawal }) {
  const [withdrawRatio, setWithdrawRatio] = useState(0.3)
  const previewExtracted = Math.floor(game.retainedEarnings * withdrawRatio)
  
  return (
    <div className="finance-station">
      <div className="finance-title">🏢 财务部 (Finance Department)</div>
      {im.withdrawn ? (
        <div className="finance-withdrawn">
          <span>已完成本阶段资金提取：</span>
          <strong>+¥{im.extractedAmount}</strong>
          <em>({Math.round((im.withdrawalRatio || 0) * 100)}% 留存利润)</em>
        </div>
      ) : (
        <div className="finance-active">
          <div className="finance-retained">
            <span>当前留存利润:</span>
            <strong>¥{game.retainedEarnings}</strong>
          </div>
          <div className="finance-controls">
            <label>提取比例:</label>
            <div className="ratio-buttons">
              {[0, 0.3, 0.6, 1.0].map((r) => (
                <button
                  key={r}
                  className={`ratio-btn ${withdrawRatio === r ? 'selected' : ''}`}
                  onClick={() => setWithdrawRatio(r)}
                >
                  {r * 100}%
                </button>
              ))}
            </div>
            <div className="finance-preview">
              <span>预计提取:</span>
              <strong>+¥{previewExtracted}</strong>
            </div>
            <button
              className="finance-confirm-btn"
              disabled={game.retainedEarnings <= 0}
              onClick={() => onWithdrawal(withdrawRatio)}
            >
              确认提取并注入现金
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function BoardEventModal({ event, budget, onSelect }) {
  return (
    <div className="bm-event-overlay">
      <section className="bm-event-modal">
        <header>
          <span className="event-tag">📰 董事访谈</span>
          <strong>{event.title}</strong>
        </header>
        <p className="event-flavor">{event.flavor}</p>
        <div className="event-options">
          {event.options.map((opt) => {
            const disabled = opt.cost && budget < opt.cost
            return (
              <button
                key={opt.id}
                className={`event-option ${disabled ? 'disabled' : ''}`}
                disabled={disabled}
                onClick={() => onSelect(opt.id)}
              >
                <strong>{opt.label}</strong>
                <span>{disabled ? '¥ 不足' : describeEventEffect(opt)}</span>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function describeEventEffect(opt) {
  switch (opt.effect?.type) {
    case 'noop': return '无副作用'
    case 'removeBudgetBonus': return `失去一员大将，+¥${opt.effect.value}`
    case 'recruitLegendary': return `下关获得 1 张 ${opt.effect.dept} 传奇`
    case 'increaseNextTarget': return `下阶段目标增加`
    case 'budgetGainNextMonthPenalty': return `+¥${opt.effect.budget}, 首月手牌 -1`
    case 'unlockEpic': return `下阶段招聘池 +1 ${opt.effect.dept} epic`
    case 'gamble': return `50/50: +¥${opt.effect.win} / -¥${Math.abs(opt.effect.lose)}`
    case 'increaseBmSlot': return '永久 +1 商业模式槽位'
    case 'budgetGain': return `+¥${opt.effect.value}`
    default: return '—'
  }
}

function StationCard({ icon, title, tag, description, color, onClick }) {
  return (
    <button className={`bm-station tone-${color}`} onClick={onClick}>
      <span className="bm-station-tag">{tag}</span>
      <span className="bm-station-icon" aria-hidden="true">{icon}</span>
      <strong className="bm-station-title">{title}</strong>
      <em className="bm-station-desc">{description}</em>
      <span className="bm-station-arrow" aria-hidden="true">▸</span>
    </button>
  )
}

function ShopDrawer({ shopRoll, purchased, budget, nextLevelId, onBuy, onPack, onRoll, onClose }) {
  return (
    <section className="bm-drawer shop-drawer">
      <header>
        <strong>💼 投资部 · Shop</strong>
        <div className="drawer-actions">
          <button className="bm-roll-btn" disabled={budget < 5} onClick={onRoll}>刷新 (−¥5)</button>
          <button className="bm-close-btn" onClick={onClose}>×</button>
        </div>
      </header>

      <div className="shop-grid">
        {/* Slot A: epic */}
        <div className="shop-slot">
          <div className="shop-slot-tag">A · EPIC</div>
          {shopRoll.epicCard ? (
            purchased.epic ? (
              <div className="shop-sold">✓ 已购入</div>
            ) : (
              <>
                <CardView card={shopRoll.epicCard} mode="drawer" />
                <button
                  className="shop-buy-btn"
                  disabled={budget < shopRoll.epicCost}
                  onClick={() => onBuy('epic')}
                >买入 −¥{shopRoll.epicCost}</button>
              </>
            )
          ) : (
            <div className="shop-empty">—</div>
          )}
        </div>

        {/* Slot B: legendary */}
        <div className="shop-slot legendary">
          <div className="shop-slot-tag">B · LEGENDARY ✨</div>
          {shopRoll.legendaryCard ? (
            purchased.legendary ? (
              <div className="shop-sold">✓ 已购入</div>
            ) : (
              <>
                <CardView card={shopRoll.legendaryCard} mode="drawer" />
                <button
                  className="shop-buy-btn legendary"
                  disabled={budget < shopRoll.legendaryCost}
                  onClick={() => onBuy('legendary')}
                >买入 −¥{shopRoll.legendaryCost}</button>
              </>
            )
          ) : (
            <div className="shop-empty">暂无传奇卡可挖角</div>
          )}
        </div>

        {/* Pack slots */}
        {shopRoll.packs.map((entry, idx) => {
          const state = purchased.packs[idx]
          return (
            <div key={idx} className="shop-slot pack">
              <div className="shop-slot-tag">{['C', 'D', 'E'][idx]} · {entry.packDef.name}</div>
              <div className="pack-icon" aria-hidden="true">{entry.packDef.icon}</div>
              <div className="pack-desc">{entry.packDef.description}</div>
              {!state && (
                <button
                  className="shop-buy-btn"
                  disabled={budget < entry.cost}
                  onClick={() => onPack(idx)}
                >买入 −¥{entry.cost}</button>
              )}
              {state?.opened && state.pickIndex === null && (
                <div className="pack-picks">
                  <div className="pack-picks-hint">选 1：</div>
                  <div className="pack-picks-row">
                    {entry.contents.map((item, pickIdx) => (
                      <button
                        key={pickIdx}
                        className="pack-pick"
                        onClick={() => onPack(idx, pickIdx)}
                      >
                        {item.isBusinessModel
                          ? <BmCardMini bm={{ name: item.bmName, description: item.bmDescription, rarity: item.bmRarity }} />
                          : <CardView card={createDisplayCard(item)} mode="market" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {state?.pickIndex !== null && state?.pickIndex !== undefined && (
                <div className="shop-sold">✓ 已挑选</div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function HrDrawer({ game, hrCardUid, setHrCardUid, onUpgrade, onFire, onClose }) {
  const im = game.intermissionState
  const allCards = [...game.hand, ...game.drawPile, ...game.coolingPile]
  const selectedCard = allCards.find((c) => c.uid === hrCardUid)
  const fireCost = 0 // Dismiss is free now
  const upgradePath = selectedCard ? UPGRADE_PATHS[selectedCard.rarity] : null
  const [affixChoice, setAffixChoice] = useState(null)

  // 升职词缀池：固定从全 6 个里挑前 3 个（避免每次重渲打乱）
  const randomAffixes = useMemo(() => {
    if (!selectedCard) return []
    const idx = (selectedCard.uid?.length ?? 0) % AFFIX_POOL.length
    return [
      AFFIX_POOL[idx],
      AFFIX_POOL[(idx + 2) % AFFIX_POOL.length],
      AFFIX_POOL[(idx + 4) % AFFIX_POOL.length],
    ]
  }, [selectedCard?.uid])

  return (
    <section className="bm-drawer hr-drawer">
      <header>
        <strong>📋 人事部 · HR Office</strong>
        <div className="drawer-actions">
          <span className="hr-stat">解雇员工限额 {im.fireActionsCount}/5</span>
          <button className="bm-close-btn" onClick={onClose}>×</button>
        </div>
      </header>

      <div className="hr-layout">
        <div className="hr-card-list">
          <div className="hr-list-hint">选一张员工卡操作（已操作过的灰色）</div>
          <div className="hr-list-grid">
            {allCards.filter((c) => c.type === 'emp').map((card) => {
              const acted = im.cardActionLog[card.uid]
              return (
                <button
                  key={card.uid}
                  className={`hr-card-pick ${hrCardUid === card.uid ? 'selected' : ''} ${acted ? `acted ${acted}` : ''}`}
                  disabled={!!acted}
                  onClick={() => { setHrCardUid(card.uid); setAffixChoice(null) }}
                >
                  <CardView card={card} mode="drawer" />
                  {acted && <div className="acted-label">{acted === 'upgraded' ? '已升职' : '已解雇'}</div>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="hr-action-panel">
          {!selectedCard ? (
            <p className="hr-hint">← 从左侧选一张员工卡</p>
          ) : (
            <>
              <h4>对 <em>{selectedCard.name}</em> 执行：</h4>

              {upgradePath ? (
                <button
                  className="hr-action-btn upgrade-rarity"
                  disabled={game.cash < upgradePath.cost}
                  onClick={() => { onUpgrade(selectedCard.uid, 'rarity'); setHrCardUid(null) }}
                >
                  ① 升稀有度 {selectedCard.rarity} → {upgradePath.next} （−¥{upgradePath.cost}）
                </button>
              ) : (
                <button className="hr-action-btn disabled" disabled>① 已达稀有度上限</button>
              )}

              <div className="hr-action-section">
                <span className="hr-section-label">② 附加词缀（3 选 1，−¥8）</span>
                <div className="hr-affix-row">
                  {randomAffixes.map((aff) => (
                    <button
                      key={aff.id}
                      className={`hr-affix-pick ${affixChoice === aff.id ? 'selected' : ''}`}
                      disabled={game.cash < 8}
                      onClick={() => setAffixChoice(aff.id)}
                    >
                      {aff.label}
                    </button>
                  ))}
                </div>
                <button
                  className="hr-action-btn confirm-affix"
                  disabled={!affixChoice || game.cash < 8}
                  onClick={() => { onUpgrade(selectedCard.uid, 'affix', affixChoice); setHrCardUid(null); setAffixChoice(null) }}
                >
                  确认词缀
                </button>
              </div>

              <button
                className="hr-action-btn fire"
                disabled={im.fireActionsCount >= 5}
                onClick={() => { onFire(selectedCard.uid); setHrCardUid(null) }}
              >
                ✗ “向社会输送人才”（免费解雇）
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function SchoolDrawer({
  game,
  schoolRoll,
  pendingReplaceIdx,
  setPendingReplaceIdx,
  pendingBmSchoolIdx,
  setPendingBmSchoolIdx,
  onBmBuy,
  onBmUnsubscribe,
  onRoll,
  onClose,
}) {
  const activeBMs = game.activeBusinessModels
  const slotCap = game.businessModelSlotCap
  const isFull = activeBMs.length >= slotCap

  function attemptBuy(schoolIdx) {
    if (!isFull) {
      onBmBuy(schoolIdx)
      return
    }
    setPendingBmSchoolIdx(schoolIdx)
    setPendingReplaceIdx(null)
  }

  function confirmReplace() {
    if (pendingBmSchoolIdx === null || pendingReplaceIdx === null) return
    onBmBuy(pendingBmSchoolIdx, pendingReplaceIdx)
    setPendingBmSchoolIdx(null)
    setPendingReplaceIdx(null)
  }

  return (
    <section className="bm-drawer school-drawer">
      <header>
        <strong>🎓 商学院 · Business School</strong>
        <div className="drawer-actions">
          <span className="school-stat">{activeBMs.length} / {slotCap} 槽位</span>
          <button className="bm-roll-btn" disabled={game.cash < 4} onClick={onRoll}>刷新 (−¥4)</button>
          <button className="bm-close-btn" onClick={onClose}>×</button>
        </div>
      </header>

      <div className="school-section">
        <h4>已习得 (可选择退订)</h4>
        <div className="bm-slot-row">
          {Array.from({ length: slotCap }).map((_, i) => {
            const slot = activeBMs[i]
            const bm = slot ? BUSINESS_MODELS.find((b) => b.id === slot.id) : null
            const replaceMode = pendingBmSchoolIdx !== null && i < activeBMs.length
            return (
              <div key={i} className="bm-slot-container">
                <div
                  className={`bm-slot ${slot ? 'filled' : 'empty'} ${replaceMode ? 'replaceable' : ''} ${pendingReplaceIdx === i ? 'selected' : ''}`}
                  onClick={() => replaceMode && setPendingReplaceIdx(i)}
                >
                  {bm ? <BmCardMini bm={bm} charged={slot.charged} /> : <div className="bm-empty-text">空</div>}
                </div>
                {bm && (
                  <div className="bm-slot-actions">
                    <div className="bm-slot-cost">月费: ¥{getBMMonthlyCost(bm)}</div>
                    <button className="bm-unsubscribe-btn" onClick={() => onBmUnsubscribe(bm.id)}>退订</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {pendingBmSchoolIdx !== null && (
          <div className="replace-cta">
            <span>选择要替换的槽位 → 然后点击确认</span>
            <button
              className="bm-confirm-btn"
              disabled={pendingReplaceIdx === null}
              onClick={confirmReplace}
            >确认替换</button>
            <button className="bm-cancel-btn" onClick={() => { setPendingBmSchoolIdx(null); setPendingReplaceIdx(null) }}>取消</button>
          </div>
        )}
      </div>

      <div className="school-section">
        <h4>本期开课</h4>
        <div className="bm-pick-row">
          {schoolRoll.map((bmId, idx) => {
            if (!bmId) return <div key={idx} className="bm-pick-empty">—</div>
            const bm = BUSINESS_MODELS.find((b) => b.id === bmId)
            if (!bm) return null
            return (
              <div key={idx} className="bm-pick">
                <BmCardMini bm={bm} />
                <button
                  className="bm-buy-btn"
                  disabled={game.cash < bm.cost}
                  onClick={() => attemptBuy(idx)}
                >订阅 −¥{bm.cost}</button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function BmCardMini({ bm, charged }) {
  const monthlyCost = getBMMonthlyCost(bm);
  return (
    <div className={`bm-card rarity-${bm.rarity}`} data-bm-tip={bm.flavor}>
      {businessModeImageSrc(bm) && (
        <img className="bm-card-image" src={businessModeImageSrc(bm)} alt="" aria-hidden="true" />
      )}
      <div className="bm-card-top">
        <strong>{bm.name}</strong>
        <span>{RARITY_LABELS[bm.rarity] ?? bm.rarity}</span>
      </div>
      <p className="bm-card-desc">{bm.description}</p>
      <div className="bm-card-burn-label">月费: ¥{monthlyCost} / 资产: +¥{getBMAssetValue(bm)}</div>
      {bm.hook && (
        <span className={`bm-hook-tag hook-${bm.hook}`}>
          {bm.hook === 'onMonthStart' ? '月初' : bm.hook === 'onSettle' ? '结算' : '充能'}
        </span>
      )}
      {bm.hook === 'onCharge' && charged !== undefined && (
        <span className="bm-charge-mark">{charged ? '⚡ 已充能' : '○ 已消耗'}</span>
      )}
    </div>
  )
}

function businessModeImageSrc(bm) {
  return bm?.id ? `/assets/business-modes/${bm.id}.png?v=bm-square-1-40` : ''
}

function LogDrawer({ logTrail, onClose }) {
  return (
    <section className="bm-drawer log-drawer">
      <header>
        <strong>📰 董事访谈 · 日志</strong>
        <div className="drawer-actions">
          <button className="bm-close-btn" onClick={onClose}>×</button>
        </div>
      </header>
      <div className="bm-log-list">
        {logTrail.map((line, i) => (
          <div key={i} className={i === 0 ? 'bm-log-newest' : ''}>{line}</div>
        ))}
      </div>
    </section>
  )
}

function ConfirmExitModal({ budget, activeBMs, nextStageName, onConfirm, onCancel }) {
  return (
    <div className="bm-confirm-overlay" onMouseDown={onCancel}>
      <section className="bm-confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <strong>进入下一阶段？</strong>
        <p>当前 ¥ 现金 <em>{budget}</em> 将全部带入下一阶段。</p>
        <p>已激活商业模式 <em>{activeBMs}</em> 个，进入 {nextStageName} 阶段。</p>
        <div className="bm-confirm-actions">
          <button className="bm-cancel-btn" onClick={onCancel}>取消</button>
          <button className="bm-confirm-btn primary" onClick={onConfirm}>确认进入</button>
        </div>
      </section>
    </div>
  )
}

// 用于在卡包预览中把模板渲染成可见的 CardView (模板 → 假实例)
function createDisplayCard(template) {
  return {
    ...template,
    uid: `display-${template.id}`,
    cost: 1,
    baseOutput: 0,
    baseCostMedian: 1,
    baseOutputMedian: 0,
    outputDelta: 'neutral',
    costDelta: 'neutral',
    effects: template.effects || [],
    affixes: [],
    affixEffects: [],
    coolingRemaining: 0,
    location: 'display',
  }
}

export default App
