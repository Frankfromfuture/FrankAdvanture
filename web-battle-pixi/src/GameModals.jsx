import React from 'react'

// 简易 DOM 模态层。视觉与 BasicInfoContainer 同色系；
// 后续可以换成 Pixi 实现，但现在 DOM 足够驱动逻辑闭环。

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, fontFamily: 'monospace',
}
const panelStyle = {
  background: '#2a2118', color: '#f2e6c7',
  border: '3px solid #5a3b20', borderRadius: 8,
  padding: 20, minWidth: 340, maxWidth: 560,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
}
const titleStyle = { margin: 0, marginBottom: 8, fontSize: 16, color: '#fff5d8' }
const rowStyle = { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 13 }
const dimStyle = { opacity: 0.6 }
const btnStyle = {
  background: '#3e3733', color: '#fff5d8', border: '1px solid #5a3b20',
  padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
}
const btnPrimary = { ...btnStyle, background: '#7c562d', borderColor: '#d7922e' }

// 月末结算
export function SettlementModal({ settlement, onClose }) {
  if (!settlement) return null
  const profit = settlement.income - settlement.maintenance
  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <h3 style={titleStyle}>📊 第 {settlement.month} 月结算</h3>
        <div style={rowStyle}><span style={dimStyle}>产线原始收入</span><span>¥{settlement.rawIncome}</span></div>
        <div style={rowStyle}><span style={dimStyle}>事件加成后</span><span>¥{settlement.income}</span></div>
        <div style={rowStyle}><span style={dimStyle}>月度运营成本</span><span style={{ color: '#e85040' }}>-¥{settlement.maintenance}</span></div>
        <div style={{ ...rowStyle, borderTop: '1px solid #5a3b20', marginTop: 6, paddingTop: 6, fontSize: 14 }}>
          <span>本月利润</span>
          <b style={{ color: profit >= 0 ? '#2d9465' : '#e85040' }}>{profit >= 0 ? '+' : ''}¥{profit}</b>
        </div>
        <div style={{ ...rowStyle, ...dimStyle, marginTop: 4 }}>
          <span>AP 使用 {settlement.usedAp} · 结转 {settlement.apCarry}</span>
        </div>
        {settlement.lineReports?.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <div style={dimStyle}>产线明细：</div>
            {settlement.lineReports.map((r) => (
              <div key={r.lineId} style={rowStyle}>
                <span>产线 {r.lineId}</span><span>¥{r.total}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 14, textAlign: 'right' }}>
          <button style={btnPrimary} onClick={onClose}>确认</button>
        </div>
      </div>
    </div>
  )
}

// Boss/Rival 奖励
export function RivalRewardModal({ rewardLog, cards, onClaim }) {
  if (!cards || cards.length === 0) return null
  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <h3 style={titleStyle}>📦 收购完成{rewardLog?.rivalName ? ` · ${rewardLog.rivalName}` : ''}</h3>
        <div style={{ fontSize: 13, marginBottom: 8 }}>以下 {cards.length} 张卡将加入牌堆：</div>
        <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.8 }}>
          {cards.map((c) => (
            <li key={c.uid}>
              <span style={dimStyle}>[{c.rarity}]</span> {c.name}
              <span style={{ ...dimStyle, marginLeft: 8 }}>AP{c.ap} · ¥{c.baseOutput}</span>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 14, textAlign: 'right' }}>
          <button style={btnPrimary} onClick={onClaim}>收下</button>
        </div>
      </div>
    </div>
  )
}

// 董事会 / 中场事件
export function IntermissionModal({ intermission, onChoose, onExit }) {
  if (!intermission) return null
  const { event, resolvedOptionId, resolvedMessage, isPromotion, grantedBudget } = intermission
  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <h3 style={titleStyle}>
          💼 {isPromotion ? '阶段晋升' : '季度董事会'}
          {grantedBudget > 0 && <span style={{ marginLeft: 8, color: '#2d9465', fontSize: 13 }}>+¥{grantedBudget}</span>}
        </h3>
        {event && (
          <>
            <div style={{ fontSize: 14, color: '#fff5d8', marginBottom: 4 }}>{event.name}</div>
            <div style={{ fontSize: 12, ...dimStyle, marginBottom: 10 }}>{event.description ?? event.flavor ?? ''}</div>
          </>
        )}
        {resolvedOptionId ? (
          <>
            <div style={{ fontSize: 13, marginBottom: 12, padding: 8, background: '#1f1a14', borderRadius: 4 }}>
              ✓ {resolvedMessage || '已选定'}
            </div>
            <div style={{ textAlign: 'right' }}>
              <button style={btnPrimary} onClick={onExit}>结束董事会</button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {(event?.options ?? []).map((opt) => (
              <button key={opt.id} style={{ ...btnStyle, textAlign: 'left' }} onClick={() => onChoose(opt.id)}>
                {opt.label}
                {opt.cost > 0 && <span style={{ color: '#e85040', marginLeft: 8 }}>· -¥{opt.cost}</span>}
                {opt.description && <div style={{ fontSize: 11, ...dimStyle, marginTop: 2 }}>{opt.description}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 高光时刻：3 选 1
export function HighlightPickModal({ candidates, onPick, onSkip }) {
  if (!candidates?.length) return null
  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <h3 style={titleStyle}>🎉 高光时刻 · 三选一加入牌堆</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
          {candidates.map((c, i) => (
            <button key={c.uid ?? i} style={{
              background: '#1f1a14', color: '#f2e6c7',
              border: '1px solid #5a3b20', borderRadius: 4,
              padding: 10, textAlign: 'left', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12,
            }} onClick={() => onPick(i)}>
              <div style={{ fontSize: 13, marginBottom: 4 }}>{c.name}</div>
              <div style={dimStyle}>[{c.rarity}] {c.dept} · {c.tier ?? '-'}</div>
              <div style={dimStyle}>AP{c.ap} · ¥{c.baseOutput}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <button style={btnStyle} onClick={onSkip}>跳过</button>
        </div>
      </div>
    </div>
  )
}

// 关卡终局
export function ResultModal({ result, onContinue }) {
  if (!result || result.boardMeeting || result.stagePromotion) return null
  // 已晋升的情况由 IntermissionModal 接管
  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <h3 style={titleStyle}>🏁 本关结束</h3>
        <div style={{ fontSize: 14 }}>{result.message ?? JSON.stringify(result)}</div>
        {onContinue && (
          <div style={{ marginTop: 14, textAlign: 'right' }}>
            <button style={btnPrimary} onClick={onContinue}>继续</button>
          </div>
        )}
      </div>
    </div>
  )
}
