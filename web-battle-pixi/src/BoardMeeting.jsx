import React, { useState } from 'react'
import { BUSINESS_MODELS } from './game/cards.js'

// 董事会会议全屏面板：事件 / 商店 / 商学院 / 已订阅 / HR / 退出
// 仍是 DOM 实现（与 GameModals 同色系）；逻辑闭环优先，Pixi 化是后续工作

const wrap = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
  zIndex: 1000, fontFamily: 'monospace', color: '#f2e6c7',
  display: 'flex', flexDirection: 'column', overflowY: 'auto',
}
const inner = {
  margin: '24px auto', padding: 16, width: 'min(1080px, 95vw)',
  background: '#2a2118', border: '3px solid #5a3b20', borderRadius: 8,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
}
const sec = {
  border: '1px solid #5a3b20', borderRadius: 6, padding: 12,
  background: '#1f1a14', marginBottom: 12,
}
const secTitle = { margin: 0, marginBottom: 8, fontSize: 14, color: '#fff5d8' }
const subtle = { opacity: 0.6, fontSize: 11 }
const btn = {
  background: '#3e3733', color: '#fff5d8', border: '1px solid #5a3b20',
  padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
  borderRadius: 3,
}
const btnPrimary = { ...btn, background: '#7c562d', borderColor: '#d7922e' }
const btnSm = { ...btn, padding: '2px 6px', fontSize: 11 }
const cardCell = {
  border: '1px solid #5a3b20', borderRadius: 4, padding: 6,
  background: '#2a2118', fontSize: 12, lineHeight: 1.5,
}
const grid = { display: 'grid', gap: 8 }

const RARITY_TINT = {
  common: '#9a9a9a', rare: '#7ec4f5', elite: '#f5c478',
  epic: '#d89cf0', legendary: '#fff0a0',
}

export function BoardMeeting({
  state, onChoose, onShopEpic, onPack, onPackPick, onSchool,
  onFire, onUpgrade, onUnsubscribe, onDismiss, onExit,
}) {
  const im = state.intermissionState
  if (!im) return null
  const cash = state.cash

  return (
    <div style={wrap}>
      <div style={inner}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#fff5d8' }}>
            💼 {im.isPromotion ? `晋升至 ${im.nextStageId} 阶段` : '季度董事会'}
            {im.grantedBudget > 0 && <span style={{ marginLeft: 12, color: '#2d9465', fontSize: 14 }}>+¥{im.grantedBudget}</span>}
          </h2>
          <div style={{ fontSize: 13 }}>现金 <b>¥{cash}</b></div>
        </header>

        <EventSection im={im} onChoose={onChoose} />
        <ShopSection im={im} cash={cash} onShopEpic={onShopEpic} onPack={onPack} onPackPick={onPackPick} />
        <SchoolSection im={im} cash={cash} activeBMs={state.activeBusinessModels} slotCap={state.businessModelSlotCap} onSchool={onSchool} />
        <ActiveBMSection bms={state.activeBusinessModels} onUnsubscribe={onUnsubscribe} />
        <HRSection state={state} im={im} onFire={onFire} onUpgrade={onUpgrade} onDismiss={onDismiss} />

        <footer style={{ marginTop: 16, textAlign: 'right' }}>
          <button style={btnPrimary} onClick={onExit}>结束董事会，进入下一阶段</button>
        </footer>
      </div>
    </div>
  )
}

function EventSection({ im, onChoose }) {
  const { event, resolvedOptionId, resolvedMessage } = im
  if (!event) return null
  return (
    <section style={sec}>
      <h3 style={secTitle}>📋 议题：{event.name}</h3>
      <div style={{ ...subtle, marginBottom: 8 }}>{event.description ?? event.flavor ?? ''}</div>
      {resolvedOptionId ? (
        <div style={{ fontSize: 12, padding: 6, background: '#2a2118', borderRadius: 4 }}>✓ {resolvedMessage || '已选定'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(event.options ?? []).map((opt) => (
            <button key={opt.id} style={{ ...btn, textAlign: 'left', padding: '6px 10px' }} onClick={() => onChoose(opt.id)}>
              {opt.label}
              {opt.cost > 0 && <span style={{ color: '#e85040', marginLeft: 8 }}>-¥{opt.cost}</span>}
              {opt.description && <div style={{ ...subtle, marginTop: 2 }}>{opt.description}</div>}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function ShopSection({ im, cash, onShopEpic, onPack, onPackPick }) {
  const { shopRoll, purchased } = im
  if (!shopRoll) return null
  return (
    <section style={sec}>
      <h3 style={secTitle}>🛍 商店</h3>
      <div style={{ ...grid, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {/* Epic 卡槽 */}
        <div style={cardCell}>
          <div style={{ ...subtle, marginBottom: 4 }}>精英员工</div>
          {shopRoll.epicCard ? (
            <>
              <div style={{ color: RARITY_TINT[shopRoll.epicCard.rarity] }}>{shopRoll.epicCard.name}</div>
              <div style={subtle}>{shopRoll.epicCard.dept} · {shopRoll.epicCard.tier} · AP{shopRoll.epicCard.ap}</div>
              <div style={{ marginTop: 6 }}>
                {purchased.epic ? (
                  <span style={{ color: '#2d9465', fontSize: 11 }}>✓ 已购买</span>
                ) : (
                  <button style={btnSm} disabled={cash < shopRoll.epicCost} onClick={() => onShopEpic('epic')}>
                    购买 ¥{shopRoll.epicCost}
                  </button>
                )}
              </div>
            </>
          ) : <div style={subtle}>本期无</div>}
        </div>

        {/* 卡包 0/1 */}
        {shopRoll.packs.map((p, i) => {
          const bought = purchased.packs[i]
          return (
            <div key={i} style={cardCell}>
              <div style={{ ...subtle, marginBottom: 4 }}>卡包 #{i + 1}</div>
              <div>{p.packDef.name}</div>
              <div style={subtle}>{p.packDef.description ?? `${p.packDef.poolType} / ${p.contents.length} 抽 ${p.packDef.pickN ?? 1}`}</div>
              <div style={{ marginTop: 6 }}>
                {!bought ? (
                  <button style={btnSm} disabled={cash < p.cost} onClick={() => onPack(i)}>购买 ¥{p.cost}</button>
                ) : bought.pickIndex !== null ? (
                  <span style={{ color: '#2d9465', fontSize: 11 }}>✓ 已挑选</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {p.contents.map((it, j) => (
                      <button key={j} style={{ ...btnSm, textAlign: 'left' }} onClick={() => onPackPick(i, j)}>
                        {it.isBusinessModel ? `📊 ${it.bmName}` : `${it.name} [${it.rarity}]`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SchoolSection({ im, cash, activeBMs, slotCap, onSchool }) {
  const { schoolRoll, schoolPurchased } = im
  if (!schoolRoll) return null
  const slotFull = activeBMs.length >= slotCap
  const [replaceIdx, setReplaceIdx] = useState(null)

  return (
    <section style={sec}>
      <h3 style={secTitle}>🎓 商学院 <span style={subtle}>· 每期可订阅 1</span></h3>
      {slotFull && !schoolPurchased && (
        <div style={{ ...subtle, marginBottom: 6, color: '#f5c478' }}>
          槽位已满（{activeBMs.length}/{slotCap}），订阅需先选择要替换的位置：
          <span style={{ marginLeft: 6 }}>
            {activeBMs.map((b, i) => (
              <button key={b.id} style={{ ...btnSm, marginRight: 4, ...(replaceIdx === i ? { background: '#7c562d' } : {}) }}
                onClick={() => setReplaceIdx(i)}>
                #{i + 1} {BUSINESS_MODELS.find((x) => x.id === b.id)?.name ?? b.id}
              </button>
            ))}
          </span>
        </div>
      )}
      <div style={{ ...grid, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {schoolRoll.map((bmId, i) => {
          if (!bmId) return <div key={i} style={{ ...cardCell, opacity: 0.4 }}>—</div>
          const bm = BUSINESS_MODELS.find((b) => b.id === bmId)
          if (!bm) return null
          const disabled = schoolPurchased || cash < bm.cost || (slotFull && replaceIdx === null)
          return (
            <div key={i} style={cardCell}>
              <div style={{ color: RARITY_TINT[bm.rarity] }}>{bm.name}</div>
              <div style={subtle}>{bm.hook} · {bm.rarity}</div>
              <div style={{ fontSize: 11, margin: '4px 0' }}>{bm.description}</div>
              <button style={btnSm} disabled={disabled}
                onClick={() => onSchool(i, slotFull ? replaceIdx : null)}>
                {schoolPurchased ? '本期已订阅' : `订阅 ¥${bm.cost}`}
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function ActiveBMSection({ bms, onUnsubscribe }) {
  if (!bms?.length) return null
  return (
    <section style={sec}>
      <h3 style={secTitle}>📊 已订阅商业模式（{bms.length}）</h3>
      <div style={{ ...grid, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {bms.map((b) => {
          const bm = BUSINESS_MODELS.find((x) => x.id === b.id)
          return (
            <div key={b.id} style={cardCell}>
              <div style={{ color: RARITY_TINT[bm?.rarity] }}>{bm?.name ?? b.id}</div>
              <div style={subtle}>{bm?.description}</div>
              <button style={{ ...btnSm, marginTop: 4 }} onClick={() => onUnsubscribe(b.id)}>退订</button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function HRSection({ state, im, onFire, onUpgrade, onDismiss }) {
  const all = [
    ...state.hand.map((c) => ({ ...c, _pile: 'hand' })),
    ...state.drawPile.map((c) => ({ ...c, _pile: 'deck' })),
    ...state.coolingPile.map((c) => ({ ...c, _pile: 'cool' })),
    ...state.lines.flatMap((l) => (l.slots ?? []).filter(Boolean).map((c) => ({ ...c, _pile: `line${l.id}` }))),
  ]
  return (
    <section style={sec}>
      <h3 style={secTitle}>
        🧑‍💼 人事调整
        <span style={subtle}> · 升职 {im.hrActionsCount}/1 · 输送 {im.fireActionsCount}/5</span>
      </h3>
      <div style={{ ...subtle, marginBottom: 6 }}>
        每期会议升职 1 次（25% 输出 + 职级升），输送上限 5（消耗 ¥{state.stage.id <= 3 ? 3 : state.stage.id <= 6 ? 5 : 8}/张）
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto', display: 'grid', gap: 4, gridTemplateColumns: '1fr 1fr' }}>
        {all.map((c) => {
          const acted = im.cardActionLog[c.uid]
          return (
            <div key={c.uid} style={{ ...cardCell, opacity: acted ? 0.4 : 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: RARITY_TINT[c.rarity] }}>{c.name}</span>
                <span style={subtle}> · {c._pile} · {c.dept ?? c.type} · AP{c.ap}{c.tier ? ` · ${c.tier}` : ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {c.type === 'emp' && !acted && (
                  <button style={btnSm} onClick={() => onUpgrade(c.uid)}>升职</button>
                )}
                {!acted && (
                  <button style={btnSm} onClick={() => onFire(c.uid)}>输送</button>
                )}
                {acted && <span style={{ fontSize: 11, color: '#9a9a9a' }}>{acted === 'fired' ? '已输送' : '已升职'}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
