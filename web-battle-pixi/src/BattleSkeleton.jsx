import React, { useState, useEffect } from 'react'
import {
  createInitialState, resolveMonth, autoDeployActiveLine,
  placeCardInSlot, returnSlotToHand, clearPlanningLine,
  playFunctionCard, discardFromHand,
  enterIntermission, resolveEvent, exitIntermission,
  claimRivalReward,
  purchaseShopItem, openPack, purchaseBusinessModel,
  fireCard, upgradeCard, unsubscribeBusinessModel, dismissCardInBoardMeeting,
  pickHighlightCard, dismissHighlightCard, setCompetitiveAction,
} from './game/engine.js'
import { LineBoardPixi } from './LineBoardPixi.jsx'
import { HandBoardPixi } from './HandBoardPixi.jsx'
import { TopHud } from './TopHud.jsx'
import { EventPanel } from './EventPanel.jsx'
import { BMPanel } from './BMPanel.jsx'
import {
  PixiSettlementModal as SettlementModal,
  PixiRivalRewardModal as RivalRewardModal,
  PixiResultModal as ResultModal,
  PixiHighlightPickModal as HighlightPickModal,
} from './PixiGameModals.jsx'
import { BoardMeeting } from './BoardMeeting.jsx'
import { RivalPanel } from './RivalPanel.jsx'

export function BattleSkeleton() {
  const [state, setState] = useState(() => createInitialState({ profession: 'scientist' }))
  const [selectedUid, setSelectedUid] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [settlementOpen, setSettlementOpen] = useState(false)

  // 手牌区根据视口宽度自适应
  const [handWidth, setHandWidth] = useState(() => Math.min(1200, window.innerWidth - 40))
  useEffect(() => {
    const onResize = () => setHandWidth(Math.min(1200, window.innerWidth - 40))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const apply = (result) => {
    if (!result || !result.ok) { setLastError(result?.message ?? '操作失败'); return false }
    setLastError(null)
    setState(result.state)
    return true
  }

  const nextMonth = () => {
    const deployed = autoDeployActiveLine(state)
    if (!deployed.ok) { setLastError(deployed.message); return }
    const next = resolveMonth(deployed.state)
    if (!next.ok) { setLastError(next.message); return }
    setSelectedUid(null)
    setLastError(null)
    setState(next.state)
    setSettlementOpen(true)
  }

  const reset = () => {
    setState(createInitialState({ profession: 'scientist' }))
    setSelectedUid(null)
    setLastError(null)
    setSettlementOpen(false)
  }

  const handleSelectCard = (uid) => {
    if (state.discardRequired > 0 && uid) { apply(discardFromHand(state, uid)); return }
    setSelectedUid(uid)
  }
  const handlePlace = (uid, slotIndex) => {
    if (apply(placeCardInSlot(state, uid, slotIndex))) setSelectedUid(null)
  }
  const handleReturn = (lineId, slotIndex) => apply(returnSlotToHand(state, lineId, slotIndex))
  const handleClear = () => apply(clearPlanningLine(state))
  const handlePlayFun = () => {
    const card = state.hand.find((c) => c.uid === selectedUid)
    if (!card || card.type !== 'fun') return
    const optionId = card.actionOptions?.[0]?.id
    if (apply(playFunctionCard(state, selectedUid, optionId))) setSelectedUid(null)
  }
  const handleEnterIntermission = () => apply(enterIntermission(state))
  const handleResolveEvent = (optionId) => apply(resolveEvent(state, optionId))
  const handleExitIntermission = () => apply(exitIntermission(state))
  const handleClaimReward = () => apply(claimRivalReward(state))
  const handleShopEpic = (slotKey) => apply(purchaseShopItem(state, slotKey))
  const handlePack = (i) => apply(openPack(state, i))
  const handlePackPick = (i, j) => apply(openPack(state, i, j))
  const handleSchool = (i, replaceIdx) => apply(purchaseBusinessModel(state, i, replaceIdx))
  const handleFire = (uid) => apply(fireCard(state, uid))
  const handleUpgrade = (uid) => apply(upgradeCard(state, uid, 'tier'))
  const handleUnsubscribe = (id) => apply(unsubscribeBusinessModel(state, id))
  const handleDismiss = (uid) => apply(dismissCardInBoardMeeting(state, uid))
  const handlePickHighlight = (i) => apply(pickHighlightCard(state, i))
  const handleSkipHighlight = () => apply(dismissHighlightCard(state))
  const handleSetAction = (id) => apply(setCompetitiveAction(state, id))

  const selectedCard = state.hand.find((c) => c.uid === selectedUid)
  const isFunSelected = selectedCard?.type === 'fun'
  const showResultActionable = state.result?.boardMeeting || state.result?.stagePromotion

  return (
    <div style={{ padding: 12, fontFamily: 'monospace', color: '#e8d8b8' }}>
      {/* 顶部 HUD */}
      <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
        <TopHud state={state} />
      </div>

      {/* 工具栏 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={nextMonth} disabled={!!state.result || state.discardRequired > 0} style={btnPrimary}>下一月（结算）</button>
        <button onClick={handleClear} disabled={state.discardRequired > 0} style={btn}>清空产线</button>
        {isFunSelected && <button onClick={handlePlayFun} style={btn}>▶ 打出 {selectedCard.name}</button>}
        {showResultActionable && !state.intermissionState && (
          <button onClick={handleEnterIntermission} style={{ ...btnPrimary, background: '#9a6e3a' }}>💼 进入董事会</button>
        )}
        <button onClick={reset} style={btn}>重置</button>
        {lastError && <span style={{ color: '#e85040', fontSize: 12 }}>⚠ {lastError}</span>}
      </div>

      {/* 主三栏：事件 | 产线 | BM */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '240px auto 240px',
        gap: 12,
        justifyContent: 'center',
        alignItems: 'start',
        marginBottom: 12,
      }}>
        <EventPanel state={state} />
        <div>
          <RivalPanel state={state} onSetAction={handleSetAction} />
          <LineBoardPixi
            state={state}
            selectedUid={selectedUid}
            onPlaceSlot={handlePlace}
            onReturnSlot={handleReturn}
          />
        </div>
        <BMPanel state={state} />
      </div>

      {/* 手牌区 · 整宽 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <HandBoardPixi
          state={state}
          selectedUid={selectedUid}
          onSelectCard={handleSelectCard}
          width={handWidth}
        />
      </div>

      {/* 模态层 */}
      {settlementOpen && (
        <SettlementModal settlement={state.lastSettlement} onClose={() => setSettlementOpen(false)} />
      )}
      {!settlementOpen && state.highlightPending && (
        <HighlightPickModal candidates={state.highlightPending} onPick={handlePickHighlight} onSkip={handleSkipHighlight} />
      )}
      {!settlementOpen && !state.highlightPending && state.rivalRewardPending && (
        <RivalRewardModal rewardLog={state.rivalRewardLog} cards={state.rivalRewardPending} onClaim={handleClaimReward} />
      )}
      {!settlementOpen && state.intermissionState && (
        <BoardMeeting
          state={state}
          onChoose={handleResolveEvent}
          onShopEpic={handleShopEpic}
          onPack={handlePack}
          onPackPick={handlePackPick}
          onSchool={handleSchool}
          onFire={handleFire}
          onUpgrade={handleUpgrade}
          onUnsubscribe={handleUnsubscribe}
          onDismiss={handleDismiss}
          onExit={handleExitIntermission}
        />
      )}
      {!settlementOpen && state.result && !showResultActionable && (
        <ResultModal result={state.result} onContinue={reset} />
      )}
    </div>
  )
}

const btn = {
  background: '#3e3733', color: '#fff5d8', border: '1px solid #5a3b20',
  padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
  borderRadius: 3,
}
const btnPrimary = { ...btn, background: '#7c562d', borderColor: '#d7922e' }
