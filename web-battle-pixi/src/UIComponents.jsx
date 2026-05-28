// UIComponents — 像素风格 HTML UI 组件库
//
// 包含：
//   PixelButton  — 四种语义变体（primary / secondary / danger / success）+ disabled
//   HintBubble   — hover 悬浮提示（像素描边 + 箭头）
//   PixelDialog  — 对话框 / 窗体（标题栏 + 内容 + 关闭按钮 + 像素描边）
//
// 所有样式通过内联 style 注入，无需额外 CSS 文件。
// 字体使用 Zpix（通过 index.html @font-face 加载）。

import React, { useState, useRef, useEffect } from 'react'

// ─── 共用 CSS 常量 ────────────────────────────────────────────────────────────
const BASE_FONT = "'Zpix', monospace"
const BASE_FONT_SIZE = 12
const PIXEL_RADIUS = 3

// ─── PixelButton ─────────────────────────────────────────────────────────────
const BUTTON_VARIANTS = {
  primary:   { bg: '#c87020', shadow: '#7a4010', hover: '#e08030', text: '#fff8e0', border: '#000' },
  secondary: { bg: '#4a3828', shadow: '#2a1e14', hover: '#5a4838', text: '#d0c0a0', border: '#000' },
  danger:    { bg: '#b83030', shadow: '#6a1a1a', hover: '#d84040', text: '#ffe0e0', border: '#000' },
  success:   { bg: '#2a7830', shadow: '#164018', hover: '#3a9840', text: '#c0ffc8', border: '#000' },
}

export function PixelButton({
  children,
  variant  = 'primary',
  disabled = false,
  onClick,
  style    = {},
}) {
  const [pressed, setPressed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const v = BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary

  const bg     = disabled ? '#2a2218' : hovered ? v.hover : v.bg
  const shadow = disabled ? '#1a1410' : v.shadow
  const color  = disabled ? '#6a5838' : v.text
  const translateY = pressed && !disabled ? 2 : 0

  return (
    <button
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => { setPressed(false); !disabled && onClick?.() }}
      style={{
        fontFamily: BASE_FONT,
        fontSize: BASE_FONT_SIZE,
        letterSpacing: 1,
        color,
        background: bg,
        border: `1px solid ${v.border}`,
        borderRadius: PIXEL_RADIUS,
        padding: '4px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: pressed || disabled ? 'none' : `0 3px 0 ${shadow}`,
        transform: `translateY(${translateY}px)`,
        transition: 'background 0.08s',
        userSelect: 'none',
        outline: 'none',
        WebkitFontSmoothing: 'none',
        MozOsxFontSmoothing: 'none',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ─── HintBubble ──────────────────────────────────────────────────────────────
// 包裹任意子元素，hover 时在上方显示提示泡
export function HintBubble({ children, hint, style = {} }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, w: 0 })
  const wrapRef = useRef()

  const show = () => {
    const r = wrapRef.current?.getBoundingClientRect()
    setPos({ w: r?.width ?? 0 })
    setVisible(true)
  }

  return (
    <span
      ref={wrapRef}
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      {children}

      {visible && (
        <span style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 6,
          background: '#1e1810',
          color: '#e0d0a0',
          border: '1px solid #6a5030',
          borderRadius: PIXEL_RADIUS,
          fontFamily: BASE_FONT,
          fontSize: BASE_FONT_SIZE,
          padding: '4px 8px',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          boxShadow: '2px 2px 0 #000, -1px -1px 0 #0004',
          pointerEvents: 'none',
          WebkitFontSmoothing: 'none',
        }}>
          {hint}
          {/* 小三角箭头 */}
          <span style={{
            position: 'absolute',
            bottom: -5,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid #6a5030',
          }} />
          <span style={{
            position: 'absolute',
            bottom: -3,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '4px solid #1e1810',
          }} />
        </span>
      )}
    </span>
  )
}

// ─── PixelDialog ─────────────────────────────────────────────────────────────
export function PixelDialog({
  title    = '提示',
  children,
  onClose,
  variant  = 'base',   // 'base' | 'danger' | 'success' | 'warning'
  style    = {},
}) {
  const TITLE_COLORS = {
    base:    { bar: '#3a2c1c', text: '#f0c080', accent: '#7a5030' },
    danger:  { bar: '#3a1c1c', text: '#ffa0a0', accent: '#9a3030' },
    success: { bar: '#1c3a1c', text: '#a0ffb0', accent: '#2a8030' },
    warning: { bar: '#3a3010', text: '#ffe080', accent: '#8a7020' },
  }
  const tc = TITLE_COLORS[variant] ?? TITLE_COLORS.base

  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      background: '#151008',
      border: `1px solid ${tc.accent}`,
      borderRadius: PIXEL_RADIUS + 1,
      boxShadow: `0 0 0 1px #000, 3px 5px 0 #000a`,
      fontFamily: BASE_FONT,
      fontSize: BASE_FONT_SIZE,
      minWidth: 200,
      overflow: 'hidden',
      ...style,
    }}>
      {/* 标题栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: tc.bar,
        borderBottom: `1px solid ${tc.accent}`,
        padding: '4px 8px',
      }}>
        <span style={{
          color: tc.text,
          letterSpacing: 1,
          WebkitFontSmoothing: 'none',
        }}>
          {title}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              fontFamily: BASE_FONT,
              fontSize: BASE_FONT_SIZE,
              background: 'transparent',
              border: '1px solid #5a3a2a',
              borderRadius: 2,
              color: '#9a7050',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1.2,
              WebkitFontSmoothing: 'none',
              outline: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#3a2010'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ×
          </button>
        )}
      </div>

      {/* 内容区 */}
      <div style={{
        padding: '10px 12px',
        color: '#c8b888',
        lineHeight: 1.7,
        WebkitFontSmoothing: 'none',
        MozOsxFontSmoothing: 'none',
      }}>
        {children}
      </div>
    </div>
  )
}

// ─── 组件展示台（App 中引用） ─────────────────────────────────────────────────
export function UIComponentsShowcase() {
  const [dialog1Open, setDialog1Open] = useState(true)
  const [dialog2Open, setDialog2Open] = useState(true)
  const [dialog3Open, setDialog3Open] = useState(true)
  const [clickLog, setClickLog] = useState('—')

  const log = (msg) => setClickLog(msg)

  return (
    <div style={{
      fontFamily: BASE_FONT,
      fontSize: BASE_FONT_SIZE,
      color: '#c0a878',
      WebkitFontSmoothing: 'none',
    }}>

      {/* ── 按钮区 ── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: '0 0 10px', opacity: 0.5, letterSpacing: 1 }}>按钮 · Buttons</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>

          <HintBubble hint="主要操作，消耗行动点">
            <PixelButton variant="primary" onClick={() => log('攻击！')}>攻击</PixelButton>
          </HintBubble>

          <HintBubble hint="结束本回合，敌方行动">
            <PixelButton variant="secondary" onClick={() => log('结束回合')}>结束回合</PixelButton>
          </HintBubble>

          <HintBubble hint="危险操作，无法撤销">
            <PixelButton variant="danger" onClick={() => log('放弃！')}>放弃</PixelButton>
          </HintBubble>

          <HintBubble hint="确认后生效">
            <PixelButton variant="success" onClick={() => log('确认')}>确认</PixelButton>
          </HintBubble>

          <HintBubble hint="当前不可用">
            <PixelButton variant="primary" disabled>已禁用</PixelButton>
          </HintBubble>
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 10, opacity: 0.4 }}>
          最近点击：<span style={{ color: '#f0c060' }}>{clickLog}</span>
        </p>
      </div>

      {/* ── 窗体区 ── */}
      <div>
        <p style={{ margin: '0 0 10px', opacity: 0.5, letterSpacing: 1 }}>窗体 · Dialogs</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {dialog1Open
            ? <PixelDialog title="技能说明" onClose={() => setDialog1Open(false)}>
                <div style={{ maxWidth: 200 }}>
                  <p style={{ margin: '0 0 6px', color: '#f0c060' }}>被动 · 突破</p>
                  <p style={{ margin: 0 }}>每月触发 1 次，相邻<br/>R&amp;D 产值 +30%</p>
                  <div style={{ margin: '8px 0 0', display: 'flex', gap: 6 }}>
                    <PixelButton variant="primary" style={{ fontSize: 10, padding: '3px 8px' }}
                      onClick={() => setDialog1Open(false)}>施放</PixelButton>
                    <PixelButton variant="secondary" style={{ fontSize: 10, padding: '3px 8px' }}
                      onClick={() => setDialog1Open(false)}>取消</PixelButton>
                  </div>
                </div>
              </PixelDialog>
            : <PixelButton variant="secondary" style={{ fontSize: 10 }}
                onClick={() => setDialog1Open(true)}>重开「技能说明」</PixelButton>
          }

          {dialog2Open
            ? <PixelDialog title="警告" variant="warning" onClose={() => setDialog2Open(false)}>
                <div style={{ maxWidth: 180 }}>
                  <p style={{ margin: '0 0 8px' }}>行动点不足，<br/>无法施放该技能。</p>
                  <PixelButton variant="secondary" style={{ fontSize: 10, padding: '3px 8px' }}
                    onClick={() => setDialog2Open(false)}>知道了</PixelButton>
                </div>
              </PixelDialog>
            : <PixelButton variant="secondary" style={{ fontSize: 10 }}
                onClick={() => setDialog2Open(true)}>重开「警告」</PixelButton>
          }

          {dialog3Open
            ? <PixelDialog title="胜利！" variant="success" onClose={() => setDialog3Open(false)}>
                <div style={{ maxWidth: 200 }}>
                  <p style={{ margin: '0 0 4px', color: '#a0ffb0', fontSize: 14, letterSpacing: 2 }}>✦ 回合胜利</p>
                  <p style={{ margin: '0 0 8px' }}>董事会血量归零，<br/>获得奖励卡牌 ×2</p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <PixelButton variant="success" style={{ fontSize: 10, padding: '3px 8px' }}>查看奖励</PixelButton>
                    <PixelButton variant="secondary" style={{ fontSize: 10, padding: '3px 8px' }}
                      onClick={() => setDialog3Open(false)}>关闭</PixelButton>
                  </div>
                </div>
              </PixelDialog>
            : <PixelButton variant="secondary" style={{ fontSize: 10 }}
                onClick={() => setDialog3Open(true)}>重开「胜利」</PixelButton>
          }
        </div>
      </div>
    </div>
  )
}
