import React from 'react'
import { COMPETITIVE_ACTIONS, RIVAL_WIN_THRESHOLD, RIVAL_BATTLE_MAX_MONTHS } from './game/rivals.js'

// 对手 / 战斗状态显示与行动选择。
// - 预告期（upcomingRival）: 提示框
// - 对决期（battle.active）: 份额条 + 月数 + 4 选 1 行动

const sec = {
  border: '1px solid #5a3b20', borderRadius: 6, padding: 10,
  background: '#1f1a14', marginBottom: 8, color: '#f2e6c7',
  fontFamily: 'monospace', fontSize: 12,
}
const warn = { ...sec, borderColor: '#e09040', background: '#352620' }
const fight = { ...sec, borderColor: '#e85040', background: '#3a1a14' }
const btn = {
  background: '#3e3733', color: '#fff5d8', border: '1px solid #5a3b20',
  padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
  borderRadius: 3,
}
const btnActive = { ...btn, background: '#7c562d', borderColor: '#d7922e' }

export function RivalPanel({ state, onSetAction }) {
  const upcoming = state.upcomingRival
  const battle = state.battle

  if (!upcoming && !battle?.active) return null

  if (battle?.active) {
    const player = battle.playerShare ?? 50
    const rival = battle.rivalShare ?? 50
    const monthsLeft = Math.max(0, RIVAL_BATTLE_MAX_MONTHS + (battle.maxMonthsBonus ?? 0) - (battle.monthsElapsed ?? 0))
    const pending = battle.pendingAction
    return (
      <div style={fight}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <b>⚔ 对决期 · {battle.rivalName ?? battle.archetypeId}</b>
          <span style={{ opacity: 0.7 }}>剩余 {monthsLeft} 月 · 胜利阈值 {RIVAL_WIN_THRESHOLD}%</span>
        </div>
        <ShareBar player={player} rival={rival} />
        <div style={{ marginTop: 8, opacity: 0.7 }}>本月竞争行动（结算前可选 1）：</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {COMPETITIVE_ACTIONS.map((a) => (
            <button
              key={a.id}
              style={pending === a.id ? btnActive : btn}
              disabled={!!pending}
              onClick={() => onSetAction(a.id)}
              title={a.description}>
              {a.name}
              {a.cashCost > 0 && <span style={{ marginLeft: 4, color: '#e85040' }}>-¥{a.cashCost}</span>}
              {a.cashAsPercentProfit && <span style={{ marginLeft: 4, color: '#e85040' }}>-8%利润</span>}
              {a.apCost > 0 && <span style={{ marginLeft: 4, color: '#7ec4f5' }}>-{a.apCost}AP</span>}
            </button>
          ))}
        </div>
        {pending && <div style={{ marginTop: 4, color: '#2d9465' }}>✓ 已选 {COMPETITIVE_ACTIONS.find((a) => a.id === pending)?.name}</div>}
      </div>
    )
  }

  // 预告期
  return (
    <div style={warn}>
      <b>⚠ 对手预告 · {upcoming.name ?? upcoming.archetypeId}</b>
      <span style={{ marginLeft: 8, opacity: 0.7 }}>
        {upcoming.tier && `[${upcoming.tier}] `}
        预估月度收入 ¥{upcoming.estimatedMonthlyIncome ?? '-'}
      </span>
      {upcoming.weaknessHint && (
        <div style={{ marginTop: 4, opacity: 0.85 }}>弱点提示：{upcoming.weaknessHint}</div>
      )}
    </div>
  )
}

function ShareBar({ player, rival }) {
  const total = player + rival || 100
  const pPct = (player / total) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 90 }}>我方 <b>{player}%</b></span>
      <div style={{ flex: 1, height: 12, background: '#2a1a14', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0,
          width: `${pPct}%`, background: 'linear-gradient(90deg, #2d9465, #7ec4f5)',
        }} />
      </div>
      <span style={{ width: 90, textAlign: 'right' }}><b>{rival}%</b> 对手</span>
    </div>
  )
}
