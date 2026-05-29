import React from 'react'
import { PixiCardStage } from './PixiCardStage.jsx'
import { CardTiltPreview } from './CardTiltPreview.jsx'
import { BasicInfoContainerStage } from './BasicInfoContainerStage.jsx'
import { ButtonComponentsStage } from './ButtonComponentsStage.jsx'
import { BattleComponentsStage } from './BattleComponentsStage.jsx'

// EMP_R_08 · 平移自 web-battle/src/game/cards.js
const CARD = {
  id: 'EMP_R_08',
  name: '首席科学家',
  type: 'emp',
  dept: 'R',
  tier: 'VP',
  rarity: 'epic',
  unlockLevel: 6,
  ap: 5,
  costSpec: '45 ±25%',
  baseOutputSpec: '140 ±25%',
  cost: 45,
  output: 140,
  effects: ['SELF_IF_P3: BOTH: +40%', 'MONTH_STAR_RATE: +5%'],
  effect: 'SELF_IF_P3: BOTH +40% · MONTH_STAR_RATE +5%',
  flavor: '顶着 PhD 学位的明星，估值看脸的关键',
  inStarterDeck: false,
  inRecruitPool: true,
  portrait: '/assets/card-portraits/research-legendary.png',
}

const SCALES = [0.5, 1, 5/3, 2]
const ROWS = [
  { label: '标准样式', cardStyle: 'namecard' },
]

// 像素风分割线（Pixi canvas 渲染）
function PixelDivider({ label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', maxWidth: 800,
      margin: '12px 0 8px',
    }}>
      <div style={{ flex: 1, height: 1, background: '#2a1e10' }} />
      <span style={{
        fontFamily: "'Zpix', monospace",
        fontSize: 11, letterSpacing: 2,
        color: '#6a5028', opacity: 0.65,
        WebkitFontSmoothing: 'none',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: '#2a1e10' }} />
    </div>
  )
}

export function App() {
  return (
    <>
      {/* ── 卡面对比 ── */}
      <h1>CardView · FP12</h1>
      <div className="compare-grid">
        <div className="row-label" />
        {SCALES.map(s => (
          <p key={s} className="col-label">{s === 5/3 ? '5/3×' : `${s}×`}</p>
        ))}
        {ROWS.map(({ label, cardStyle }) => (
          <React.Fragment key={cardStyle}>
            <p className="row-label">{label}</p>
            {SCALES.map(s => (
              <div key={s} className="stage-wrap">
                <PixiCardStage cards={[CARD]} scale={s} fontTheme="fp12" cardStyle={cardStyle} />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* ── 选牌透视行（仅 5/3× 和 2×） ── */}
      {(() => {
        const TILT_SCALES = SCALES.filter(s => s >= 5/3)
        return (
          <div className="compare-grid" style={{ marginTop: 20 }}>
            <div className="row-label" />
            {TILT_SCALES.map(s => (
              <p key={s} className="col-label">{s === 5/3 ? '5/3×' : `${s}×`}</p>
            ))}
            <p className="row-label">选牌透视</p>
            {TILT_SCALES.map(s => (
              <CardTiltPreview key={s} card={CARD} scale={s} fontTheme="fp12" cardStyle="namecard" />
            ))}
          </div>
        )
      })()}

      <p className="note">FP12 · 静态对比 / 鼠标移动透视 / 点击选中</p>

      {/* ── 基础组件 ── */}
      <PixelDivider label="基础组件" />

      <div className="stage-wrap">
        <BasicInfoContainerStage />
      </div>

      <p className="note">
        基础信息容器 · 用于商业模式、顶部 UI、战场信息等展示
      </p>

      {/* ── 按钮组件 ── */}
      <PixelDivider label="按钮组件" />

      <div className="stage-wrap">
        <ButtonComponentsStage />
      </div>

      <p className="note" style={{ marginBottom: 36 }}>
        普通按钮 / CTA 按钮 · hover 光斑扫过 · 点击凹陷
      </p>

      {/* ── 战斗组件 ── */}
      <PixelDivider label="战斗组件" />

      <div className="stage-wrap">
        <BattleComponentsStage />
      </div>

      <p className="note" style={{ marginBottom: 36 }}>
        战斗背景 / 数字弹跳火焰 / 产线牌桌
      </p>

      {/* ── 引擎骨架入口 ── */}
      <PixelDivider label="完整 Battle" />
      <a href="?battle" style={{
        display: 'inline-block', margin: '12px auto 36px',
        padding: '8px 16px', background: '#7c562d', color: '#fff5d8',
        border: '2px solid #d7922e', borderRadius: 4,
        fontFamily: "'Zpix', monospace", fontSize: 13, letterSpacing: 1,
        textDecoration: 'none',
      }}>▶ 进入完整 Battle 页面</a>
    </>
  )
}
