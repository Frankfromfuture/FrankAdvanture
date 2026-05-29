// Pixi 弹层工具：viewport 大小的 Pixi Application + 居中面板 + 按钮 / 文本助手
// 每个弹层用一个独立 Application，position: fixed 覆盖全屏。

import React, { useEffect, useRef } from 'react'
import { Application, Container, Graphics, BitmapText } from 'pixi.js'
import { ensurePixelFontReady } from './pixelFont.js'
import { C } from './BasicInfoContainerStage.jsx'

// 颜色调色板（继承 BasicInfoContainer）
export const M = {
  backdrop: 0x000000,
  panel: C.cream,
  panelLower: C.creamLow,
  border: C.border,
  borderDark: C.borderDark,
  ink: C.ink,
  softInk: C.softInk,
  gold: C.gold,
  green: C.green,
  red: C.red,
  blue: C.blue,
  highlight: 0xfff1ca,
}

// 居中面板（cream 色 + 双层边框 + 阴影）
export function drawPanel(parent, x, y, w, h) {
  const radius = 8
  const cast = new Graphics()
  cast.roundRect(x + 6, y + 8, w, h, radius).fill({ color: 0x0a0603, alpha: 0.55 })
  parent.addChild(cast)

  const lower = new Graphics()
  lower.roundRect(x, y + 6, w, h, radius).fill(M.panelLower)
  lower.roundRect(x, y + 6, w, h, radius).stroke({ width: 2, color: M.borderDark })
  parent.addChild(lower)

  const frame = new Graphics()
  frame.roundRect(x, y, w, h, radius).fill(M.border)
  parent.addChild(frame)

  const face = new Graphics()
  face.roundRect(x + 4, y + 4, w - 8, h - 8, radius - 2).fill(M.panel)
  parent.addChild(face)

  const topStroke = new Graphics()
  topStroke.roundRect(x, y, w, h, radius).stroke({ width: 3, color: M.borderDark })
  topStroke.roundRect(x + 3, y + 3, w - 6, h - 6, radius - 2).stroke({ width: 1, color: M.highlight, alpha: 0.7 })
  parent.addChild(topStroke)
}

export function addText(parent, text, x, y, opts = {}) {
  const t = new BitmapText({
    text: String(text),
    style: {
      fontFamily: opts.font ?? 'FP12s',
      fontSize: opts.size ?? 12,
      fill: opts.color ?? M.ink,
    },
  })
  if (opts.anchor) t.anchor.set(opts.anchor[0], opts.anchor[1])
  t.x = Math.round(x)
  t.y = Math.round(y)
  parent.addChild(t)
  return t
}

// 按钮：底色 + 文字 + hover 高亮 + click 回调
export function addButton(parent, { x, y, w, h, label, onClick, primary = false, disabled = false }) {
  const c = new Container()
  c.x = x
  c.y = y
  parent.addChild(c)

  const colorBg = primary ? 0x7c562d : 0x3e3733
  const colorBorder = primary ? M.gold : M.borderDark
  const alphaBase = disabled ? 0.4 : 1

  const g = new Graphics()
  g.roundRect(0, 0, w, h, 4).fill({ color: colorBg, alpha: alphaBase })
  g.roundRect(0, 0, w, h, 4).stroke({ width: 1, color: colorBorder, alpha: alphaBase })
  c.addChild(g)

  const t = new BitmapText({
    text: label,
    style: { fontFamily: 'FP12s', fontSize: 12, fill: primary ? M.highlight : 0xfff5d8 },
  })
  t.anchor.set(0.5)
  t.x = w / 2
  t.y = h / 2
  t.alpha = alphaBase
  c.addChild(t)

  if (!disabled) {
    c.eventMode = 'static'
    c.cursor = 'pointer'
    c.on('pointerover', () => {
      g.clear()
      g.roundRect(0, 0, w, h, 4).fill(primary ? 0x9a6e3a : 0x4e4640)
      g.roundRect(0, 0, w, h, 4).stroke({ width: 1, color: colorBorder })
    })
    c.on('pointerout', () => {
      g.clear()
      g.roundRect(0, 0, w, h, 4).fill(colorBg)
      g.roundRect(0, 0, w, h, 4).stroke({ width: 1, color: colorBorder })
    })
    c.on('pointertap', onClick)
  }
  return c
}

/**
 * Pixi 弹层基础 Hook：
 *   const ref = usePixiModal({ onRender(scene, viewport) {...}, deps: [a,b] })
 *   return <div ref={ref} style={fixedOverlayStyle} />
 *
 * scene 是 stage 的子 Container；onRender 在每次依赖变化时被调用并清空重画。
 */
export function usePixiModal({ onRender, deps = [] }) {
  const hostRef = useRef(null)
  const appRef = useRef(null)
  const sceneRef = useRef(null)
  const readyRef = useRef(false)
  const onRenderRef = useRef(onRender)
  onRenderRef.current = onRender

  // 初始化
  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    appRef.current = app

    ;(async () => {
      const w = window.innerWidth
      const h = window.innerHeight
      await app.init({
        width: w, height: h,
        background: '#000000',
        backgroundAlpha: 0.6,
        antialias: false,
        roundPixels: true,
        resolution: window.devicePixelRatio || 1,
      })
      if (cancelled) { app.destroy(true, { children: true, texture: true }); return }
      app.canvas.style.position = 'fixed'
      app.canvas.style.inset = '0'
      app.canvas.style.width = '100vw'
      app.canvas.style.height = '100vh'
      app.canvas.style.zIndex = '1000'
      host.appendChild(app.canvas)
      const scene = new Container()
      app.stage.addChild(scene)
      sceneRef.current = scene

      await ensurePixelFontReady()
      readyRef.current = true
      doRender()

      const onResize = () => {
        app.renderer.resize(window.innerWidth, window.innerHeight)
        doRender()
      }
      window.addEventListener('resize', onResize)
      app._cleanupResize = () => window.removeEventListener('resize', onResize)
    })()

    return () => {
      cancelled = true
      const a = appRef.current
      if (a) {
        try { a._cleanupResize?.(); a.destroy(true, { children: true, texture: false }) } catch {}
        appRef.current = null
      }
      sceneRef.current = null
      readyRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 依赖变化时重渲
  useEffect(() => {
    if (readyRef.current) doRender()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  function doRender() {
    const scene = sceneRef.current
    const app = appRef.current
    if (!scene || !app) return
    scene.removeChildren()
    onRenderRef.current?.(scene, { width: app.renderer.width / (window.devicePixelRatio || 1), height: app.renderer.height / (window.devicePixelRatio || 1) })
  }

  return hostRef
}

export const overlayDiv = { position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }
