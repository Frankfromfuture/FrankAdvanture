import React from 'react'
import { BUSINESS_MODELS } from './game/cards.js'

// 已订阅商业模式区。
const panel = {
  border: '1px solid #5a3b20', borderRadius: 6,
  background: '#1f1a14', padding: 12,
  fontFamily: 'monospace', color: '#f2e6c7', fontSize: 12,
  minHeight: 240,
}
const title = { margin: 0, marginBottom: 8, fontSize: 13, color: '#fff5d8', letterSpacing: 1 }
const subtitle = { opacity: 0.7, fontSize: 11 }
const item = {
  border: '1px solid #3a2818', borderRadius: 4, padding: '6px 8px',
  background: '#2a2118', marginBottom: 6,
}

const RARITY_TINT = {
  common: '#9a9a9a', rare: '#7ec4f5', elite: '#f5c478',
  epic: '#d89cf0', legendary: '#fff0a0',
}

const HOOK_LABEL = {
  onMonthStart: '月初',
  onMonthEnd: '月末',
  onProductionLine: '产线',
  passive: '常驻',
}

export function BMPanel({ state }) {
  const active = state.activeBusinessModels ?? []
  const cap = state.businessModelSlotCap ?? 4

  return (
    <div style={panel}>
      <h3 style={title}>📊 商业模式 <span style={subtitle}>· {active.length}/{cap}</span></h3>
      {active.length === 0 ? (
        <div style={subtitle}>未订阅 · 关间董事会可在「商学院」订阅</div>
      ) : (
        active.map((b) => {
          const bm = BUSINESS_MODELS.find((x) => x.id === b.id)
          if (!bm) return null
          return (
            <div key={b.id} style={item}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ color: RARITY_TINT[bm.rarity], fontWeight: 'bold' }}>{bm.name}</span>
                <span style={subtitle}>{HOOK_LABEL[bm.hook] ?? bm.hook}</span>
              </div>
              <div style={{ ...subtitle, marginTop: 2 }}>{bm.description}</div>
            </div>
          )
        })
      )}

      {/* PE 加成 / 通道 debuff 等 */}
      <Buffs state={state} />
    </div>
  )
}

function Buffs({ state }) {
  const peBuffs = state.peBuffs ?? []
  const rivalDebuff = state.rivalDebuff
  const runwayDiscount = state.runwayBurnDiscount
  const has = peBuffs.length > 0 || rivalDebuff || runwayDiscount
  if (!has) return null
  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #3a2818' }}>
      <div style={{ ...title, marginBottom: 4 }}>⚡ 临时增益</div>
      {peBuffs.map((b, i) => (
        <div key={i} style={{ ...subtitle, color: '#7ec4f5' }}>
          PE +{b.value} · 剩 {b.months} 月
        </div>
      ))}
      {runwayDiscount && (
        <div style={{ ...subtitle, color: '#2d9465' }}>
          运营成本 -{Math.round(runwayDiscount.discount * 100)}% · 剩 {runwayDiscount.months} 月
        </div>
      )}
      {rivalDebuff && (rivalDebuff.months > 0) && (
        <div style={{ ...subtitle, color: '#f5c478' }}>
          对手压制 · 剩 {rivalDebuff.months} 月
        </div>
      )}
    </div>
  )
}
