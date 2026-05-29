import React from 'react'

// 季度/月度事件信息区。来源：state.event（每季滚动）+ state.majorEvent（年度大事件）
const panel = {
  border: '1px solid #5a3b20', borderRadius: 6,
  background: '#1f1a14', padding: 12,
  fontFamily: 'monospace', color: '#f2e6c7', fontSize: 12,
  minHeight: 240,
}
const title = { margin: 0, marginBottom: 6, fontSize: 13, color: '#fff5d8', letterSpacing: 1 }
const subtitle = { opacity: 0.7, fontSize: 11, marginBottom: 8 }
const sec = { marginTop: 10, paddingTop: 8, borderTop: '1px dashed #3a2818' }
const li = { fontSize: 11, opacity: 0.85, lineHeight: 1.6 }

const TONE_COLOR = {
  '增益': '#2d9465', '减益': '#e85040', '中性': '#9a8868', '混合': '#d7922e',
}

export function EventPanel({ state }) {
  const event = state.event
  const major = state.majorEvent
  const upcoming = state.upcomingMajorEvent
  const monthsLeft = state.majorEventCountdown

  return (
    <div style={panel}>
      <h3 style={title}>📅 季度事件</h3>
      {event ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ color: TONE_COLOR[event.tone] ?? '#fff5d8', fontWeight: 'bold' }}>{event.name}</span>
            <span style={{ ...subtitle, marginBottom: 0 }}>· {event.tone ?? '中性'}</span>
          </div>
          {event.description && <div style={subtitle}>{event.description}</div>}
          {event.effectLines?.length > 0 && (
            <ul style={{ paddingLeft: 16, margin: 0 }}>
              {event.effectLines.map((l, i) => <li key={i} style={li}>{l}</li>)}
            </ul>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8, fontSize: 11, opacity: 0.75 }}>
            {event.cashDelta != null && event.cashDelta !== 0 && (
              <span style={{ color: event.cashDelta > 0 ? '#2d9465' : '#e85040' }}>
                现金 {event.cashDelta > 0 ? '+' : ''}{event.cashDelta}
              </span>
            )}
            {event.incomeMultiplier && event.incomeMultiplier !== 1 && (
              <span>收入 ×{event.incomeMultiplier}</span>
            )}
            {event.maintenanceMultiplier && event.maintenanceMultiplier !== 1 && (
              <span>维持 ×{event.maintenanceMultiplier}</span>
            )}
            {event.apDelta != null && event.apDelta !== 0 && (
              <span>AP {event.apDelta > 0 ? '+' : ''}{event.apDelta}</span>
            )}
          </div>
        </>
      ) : (
        <div style={subtitle}>本季无特殊事件</div>
      )}

      {/* 年度大事件 */}
      {(major || upcoming) && (
        <div style={sec}>
          <div style={{ ...title, marginBottom: 4 }}>⚠ 年度大事件</div>
          {major ? (
            <>
              <div style={{ color: '#f5c478', marginBottom: 2 }}>
                {major.name} <span style={{ ...subtitle, marginBottom: 0 }}>· 剩余 {major.remainingMonths} 月</span>
              </div>
              {major.description && <div style={subtitle}>{major.description}</div>}
            </>
          ) : upcoming ? (
            <>
              <div style={{ color: '#e09040', marginBottom: 2 }}>
                {upcoming.name} <span style={{ ...subtitle, marginBottom: 0 }}>· {monthsLeft} 月后</span>
              </div>
              {upcoming.description && <div style={subtitle}>{upcoming.description}</div>}
            </>
          ) : null}
        </div>
      )}

      {/* 阶段进度 */}
      <div style={sec}>
        <div style={{ ...title, marginBottom: 4 }}>📈 阶段进度</div>
        <div style={li}>
          {state.stage?.name ?? '-'} · 目标 ¥{state.stage?.threshold ?? 0}
        </div>
        <div style={li}>
          估值 ¥{state.valuation} / ¥{state.stage?.threshold ?? 0}
        </div>
        <ProgressBar value={state.valuation} max={state.stage?.threshold ?? 1} />
      </div>
    </div>
  )
}

function ProgressBar({ value, max }) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, max)) * 100))
  return (
    <div style={{ marginTop: 6, height: 8, background: '#2a1a14', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: 'linear-gradient(90deg, #d7922e, #f5c478)',
      }} />
    </div>
  )
}
