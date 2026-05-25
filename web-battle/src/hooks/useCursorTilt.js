import { useCallback, useRef, useEffect } from 'react'

/**
 * useCursorTilt — 鼠标指针反透视 + 光照跟随互动
 *
 * 用法（与 profession-card 一致的 wrap+target 结构）：
 *   const tilt = useCursorTilt({ amplitude: 18 })
 *   <div ref={tilt.wrapRef} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
 *     <div ref={tilt.targetRef} className="...">...</div>
 *   </div>
 *
 * 目标元素的 CSS 需引用：
 *   transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) translateZ(0);
 *   transform-style: preserve-3d;
 *   transition: transform 180ms cubic-bezier(0.1, 0.8, 0.2, 1);
 * 父元素需设置 perspective: 1000px。
 *
 * 光斑层（如有）：
 *   background: radial-gradient(circle 150px at var(--glare-x, 50%) var(--glare-y, 50%), ...);
 */
export function useCursorTilt({
  amplitude = 18,
  glare = true,
  enabled = true,
  varX = '--tilt-x',
  varY = '--tilt-y',
  glareXVar = '--glare-x',
  glareYVar = '--glare-y',
  // 视差层（如卡牌内人物/立绘）：反向 tilt，制造浮出感
  // parallax = true 启用，会写入 --person-tilt-x/y 与 --person-shift-x/y
  parallax = false,
  parallaxStrength = 1.28,   // 人物 tilt 相对 frame tilt 的反向倍率
  parallaxShift = 0.5,        // 人物位移（px / tilt deg）反向跟随
  parallaxTiltXVar = '--person-tilt-x',
  parallaxTiltYVar = '--person-tilt-y',
  parallaxShiftXVar = '--person-shift-x',
  parallaxShiftYVar = '--person-shift-y',
} = {}) {
  const wrapRef = useRef(null)
  const targetRef = useRef(null)
  const isHovered = useRef(false)
  const lastCoords = useRef({ clientX: 0, clientY: 0 })

  const updateStyles = useCallback((clientX, clientY) => {
    const wrap = wrapRef.current
    const target = targetRef.current || wrap
    if (!wrap || !target) return
    const rect = wrap.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const px = (clientX - rect.left) / rect.width
    const py = (clientY - rect.top) / rect.height
    const tiltY = (px - 0.5) * amplitude
    const tiltX = -(py - 0.5) * amplitude
    target.style.setProperty(varX, `${tiltX.toFixed(2)}deg`)
    target.style.setProperty(varY, `${tiltY.toFixed(2)}deg`)
    if (glare) {
      target.style.setProperty(glareXVar, `${(px * 100).toFixed(2)}%`)
      target.style.setProperty(glareYVar, `${(py * 100).toFixed(2)}%`)
    }
    if (parallax) {
      const pTiltX = -tiltX * parallaxStrength
      const pTiltY = -tiltY * parallaxStrength
      target.style.setProperty(parallaxTiltXVar, `${pTiltX.toFixed(2)}deg`)
      target.style.setProperty(parallaxTiltYVar, `${pTiltY.toFixed(2)}deg`)
      // Correct Y direction so both X and Y shift in the opposite direction of the mouse
      target.style.setProperty(parallaxShiftXVar, `${(-tiltY * parallaxShift).toFixed(2)}px`)
      target.style.setProperty(parallaxShiftYVar, `${(tiltX * parallaxShift * 0.84).toFixed(2)}px`)
    }
  }, [amplitude, glare, varX, varY, glareXVar, glareYVar, parallax, parallaxStrength, parallaxShift, parallaxTiltXVar, parallaxTiltYVar, parallaxShiftXVar, parallaxShiftYVar])

  const resetStyles = useCallback(() => {
    const target = targetRef.current || wrapRef.current
    if (!target) return
    target.style.setProperty(varX, '0deg')
    target.style.setProperty(varY, '0deg')
    if (glare) {
      target.style.setProperty(glareXVar, '50%')
      target.style.setProperty(glareYVar, '50%')
    }
    if (parallax) {
      target.style.setProperty(parallaxTiltXVar, '0deg')
      target.style.setProperty(parallaxTiltYVar, '0deg')
      target.style.setProperty(parallaxShiftXVar, '0px')
      target.style.setProperty(parallaxShiftYVar, '0px')
    }
  }, [glare, varX, varY, glareXVar, glareYVar, parallax, parallaxTiltXVar, parallaxTiltYVar, parallaxShiftXVar, parallaxShiftYVar])

  const onPointerMove = useCallback((event) => {
    isHovered.current = true
    lastCoords.current = { clientX: event.clientX, clientY: event.clientY }
    if (!enabled) return
    updateStyles(event.clientX, event.clientY)
  }, [enabled, updateStyles])

  const onPointerLeave = useCallback(() => {
    isHovered.current = false
    resetStyles()
  }, [resetStyles])

  // Sync state immediately when enabled changes
  useEffect(() => {
    if (enabled && isHovered.current) {
      updateStyles(lastCoords.current.clientX, lastCoords.current.clientY)
    } else if (!enabled) {
      resetStyles()
    }
  }, [enabled, updateStyles, resetStyles])

  return { wrapRef, targetRef, onPointerMove, onPointerLeave }
}
