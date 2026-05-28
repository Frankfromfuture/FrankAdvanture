// CardTiltPreview — 战斗界面卡牌选中后的鼠标透视效果
//
// 技术路线：
//   - CSS perspective + rotateX/Y 做真 3D 透视变形（硬件加速）
//   - rAF + lerp 直接写 DOM style，避免 60fps React re-render
//   - 叠一层 radial-gradient div 模拟高光随光源移动
//   - 选中后：放大 + 金色描边 + drop-shadow + 可选牌提示

import React, { useRef, useEffect, useState } from 'react'
import { PixiCardStage } from './PixiCardStage.jsx'

const LERP_K    = 0.12   // 插值系数，越小越"飘"
const MAX_TILT  = 18     // 选中时最大倾斜角（度）
const IDLE_TILT = 8      // 未选中时最大倾斜角

export function CardTiltPreview({
  card,
  scale      = 2,
  fontTheme  = 'fp12',
  cardStyle  = 'namecard',
}) {
  const outerRef    = useRef()   // 监听鼠标事件
  const innerRef    = useRef()   // 接收 transform
  const shineRef    = useRef()   // 高光 overlay
  const glowRef     = useRef()   // 金色内框（选中）
  const selectedRef = useRef(false)

  const [selected, setSelected] = useState(false)

  // 同步 ref，让 rAF 闭包读到最新值
  useEffect(() => { selectedRef.current = selected }, [selected])

  useEffect(() => {
    const cur = { rx: 0, ry: 0, sx: 50, sy: 50 }
    const tgt = { rx: 0, ry: 0, sx: 50, sy: 50 }

    // ── 鼠标移动 → 更新目标倾斜 ──────────────────────────────────────
    const onMove = (e) => {
      const rect = outerRef.current?.getBoundingClientRect()
      if (!rect) return
      const cx = rect.left  + rect.width  / 2
      const cy = rect.top   + rect.height / 2
      const max = selectedRef.current ? MAX_TILT : IDLE_TILT
      tgt.rx = -(e.clientY - cy) / (rect.height / 2) * max
      tgt.ry =  (e.clientX - cx) / (rect.width  / 2) * max
      tgt.sx = (e.clientX - rect.left) / rect.width  * 100
      tgt.sy = (e.clientY - rect.top)  / rect.height * 100
    }
    const onLeave = () => { tgt.rx = 0; tgt.ry = 0; tgt.sx = 50; tgt.sy = 50 }

    const el = outerRef.current
    el?.addEventListener('mousemove', onMove)
    el?.addEventListener('mouseleave', onLeave)

    // ── rAF 循环：lerp → 直接写 style ───────────────────────────────
    let id = requestAnimationFrame(function loop() {
      cur.rx += (tgt.rx - cur.rx) * LERP_K
      cur.ry += (tgt.ry - cur.ry) * LERP_K
      cur.sx += (tgt.sx - cur.sx) * LERP_K
      cur.sy += (tgt.sy - cur.sy) * LERP_K

      const elev = selectedRef.current ? 1.08 : 1.0
      if (innerRef.current) {
        innerRef.current.style.transform =
          `scale(${elev}) rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg)`
      }

      // 高光跟着"光源"位置移动
      if (shineRef.current) {
        const a = selectedRef.current ? 0.20 : 0.11
        shineRef.current.style.background =
          `radial-gradient(ellipse 70% 60% at ${cur.sx.toFixed(1)}% ${cur.sy.toFixed(1)}%,` +
          ` rgba(255,255,255,${a}) 0%, transparent 70%)`
      }

      id = requestAnimationFrame(loop)
    })

    return () => {
      cancelAnimationFrame(id)
      el?.removeEventListener('mousemove', onMove)
      el?.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  const handleClick = () => setSelected(s => !s)

  // 圆角像素 = CORNER(4) × scale
  const cssRadius = `${Math.round(4 * scale)}px`

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {/* perspective 容器 */}
      <div
        ref={outerRef}
        onClick={handleClick}
        style={{
          perspective: '700px',
          cursor: 'pointer',
          userSelect: 'none',
          // drop-shadow 放外层，跟随整体（不随倾斜旋转）
          filter: selected
            ? 'drop-shadow(0 10px 28px rgba(240,192,64,0.55))'
            : 'drop-shadow(0 3px 10px rgba(0,0,0,0.55))',
          transition: 'filter 0.25s',
        }}
      >
        {/* 旋转层 */}
        <div
          ref={innerRef}
          style={{ transformStyle: 'preserve-3d', position: 'relative' }}
        >
          <PixiCardStage
            cards={[card]}
            scale={scale}
            fontTheme={fontTheme}
            cardStyle={cardStyle}
          />

          {/* 高光 overlay */}
          <div
            ref={shineRef}
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              borderRadius: cssRadius,
            }}
          />

          {/* 选中：金色内描边 */}
          {selected && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              borderRadius: cssRadius,
              boxShadow: `inset 0 0 0 ${Math.max(2, scale)}px rgba(240,192,64,0.9)`,
            }} />
          )}
        </div>
      </div>

      {/* 提示文字 */}
      <p style={{
        margin: 0,
        fontFamily: "'Zpix', sans-serif",
        fontSize: 12,
        color: selected ? '#f0c040' : '#7a5c30',
        opacity: selected ? 1 : 0.6,
        transition: 'color 0.2s, opacity 0.2s',
        letterSpacing: 1,
      }}>
        {selected ? '✦ 已选中 · 点击取消' : '点击选牌'}
      </p>
    </div>
  )
}
