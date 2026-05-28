// BasicInfoContainerStage — foundational Pixi UI container prototype
//
// This is the first reusable UI surface for business model cards, top HUD
// modules, battlefield info panels, and compact status readouts.

import React, { useEffect, useRef } from 'react'
import { Application, Container, Graphics, BitmapText } from 'pixi.js'
import { ensurePixelFontReady } from './pixelFont.js'

const DW = 640
const DH = 230
const SCALE = 2

const C = {
  stage: 0x17130f,
  table: 0x2a2118,
  cream: 0xf2e6c7,
  creamTop: 0xfff5d8,
  creamInset: 0xd8c397,
  creamLow: 0xc9ad7c,
  lavender: 0xb9b1c4,
  lavenderLow: 0x8d829b,
  taupeBorder: 0x6b5e55,
  taupeDark: 0x3e3733,
  ink: 0x3a2818,
  softInk: 0x795b38,
  border: 0x5a3b20,
  borderDark: 0x24160b,
  shadow: 0x0a0603,
  gold: 0xd7922e,
  green: 0x2d9465,
  red: 0xb64d48,
  blue: 0x3b6f9e,
}

function text(parent, value, x, y, size = 12, fill = C.ink, anchor = [0, 0]) {
  const t = new BitmapText({
    text: value,
    style: { fontFamily: 'FP12s', fontSize: size, fill },
  })
  t.anchor.set(anchor[0], anchor[1])
  t.x = Math.round(x)
  t.y = Math.round(y)
  parent.addChild(t)
  return t
}

export function createBasicInfoContainer({
  x = 0,
  y = 0,
  w = 180,
  h = 84,
  title = '基础信息',
  subtitle = '',
  accent = C.gold,
  active = false,
  tone = 'light',
} = {}) {
  const c = new Container()
  c.x = x
  c.y = y

  const depth = 7
  const radius = 7
  const palette = tone === 'dark'
    ? {
        face: C.lavender,
        lower: C.lavenderLow,
        border: C.taupeBorder,
        borderDark: C.taupeDark,
        innerHi: 0xe6deef,
        innerStroke: 0xcfc6da,
        shade: 0x493f46,
      }
    : {
        face: C.cream,
        lower: C.creamLow,
        border: C.border,
        borderDark: C.borderDark,
        innerHi: 0xfff1ca,
        innerStroke: 0xfff1ca,
        shade: 0x7c562d,
      }

  const cast = new Graphics()
  cast.roundRect(depth + 3, depth + 5, w, h, radius).fill({ color: C.shadow, alpha: 0.42 })
  c.addChild(cast)

  const side = new Graphics()
  side.roundRect(depth, depth, w, h, radius).fill(palette.borderDark)
  c.addChild(side)

  const lower = new Graphics()
  lower.roundRect(0, depth, w, h, radius).fill(palette.lower)
  lower.roundRect(0, depth, w, h, radius).stroke({ width: 2, color: palette.borderDark })
  c.addChild(lower)

  const frame = new Graphics()
  frame.roundRect(0, 0, w, h, radius).fill(palette.border)
  c.addChild(frame)

  const face = new Graphics()
  face.roundRect(4, 4, w - 8, h - 8, radius - 2).fill(palette.face)
  c.addChild(face)

  const topLight = new Graphics()
  topLight.roundRect(8, 6, w - 16, 3, 2).fill({ color: palette.innerHi, alpha: 0.32 })
  c.addChild(topLight)

  const innerShade = new Graphics()
  innerShade.roundRect(7, h - 18, w - 14, 10, 4).fill({ color: palette.shade, alpha: 0.08 })
  innerShade.rect(5, 24, 3, h - 32).fill({ color: palette.shade, alpha: 0.06 })
  c.addChild(innerShade)

  const topStroke = new Graphics()
  topStroke.roundRect(0, 0, w, h, radius).stroke({ width: 3, color: palette.borderDark })
  topStroke.roundRect(3, 3, w - 6, h - 6, radius - 2).stroke({ width: 1, color: palette.innerStroke, alpha: 0.8 })
  c.addChild(topStroke)

  if (active) {
    const glow = new Graphics()
    glow.roundRect(-3, -3, w + 6, h + 6, radius + 2).stroke({ width: 2, color: accent, alpha: 0.48 })
    c.addChild(glow)
    c._glow = glow
  }

  text(c, title, 14, 24, 12, C.ink)
  if (subtitle) text(c, subtitle, 14, 41, 6, C.softInk)

  c._tick = (tick) => {
    if (c._glow) c._glow.alpha = 0.36 + Math.sin(tick * 0.065) * 0.14
  }

  return c
}

function makeMetricBlock(label, value, color, tone = 'light') {
  const c = createBasicInfoContainer({
    w: 110,
    h: 62,
    title: value,
    subtitle: label,
    accent: color,
    tone,
  })
  return c
}

function makeBusinessModelPanel() {
  const c = createBasicInfoContainer({
    x: 34,
    y: 42,
    w: 198,
    h: 118,
    title: 'SaaS 引擎',
    subtitle: '商业模式 · 订阅中',
    accent: C.blue,
    active: true,
  })

  text(c, '月费', 18, 68, 6, C.softInk)
  text(c, '12', 58, 64, 12, C.red)
  text(c, '估值加成', 100, 68, 6, C.softInk)
  text(c, '+80', 154, 64, 12, C.green)

  const chips = [
    ['留存', C.green],
    ['现金流', C.gold],
    ['护城河', C.blue],
  ]
  chips.forEach(([label, color], i) => {
    text(c, label, 39 + i * 52, 94, 6, color, [0.5, 0])
  })

  return c
}

function makeTopUiStrip() {
  const c = new Container()
  c.x = 258
  c.y = 38

  const cash = makeMetricBlock('可花现金', '¥124', C.green)
  cash.x = 0
  cash.y = 0
  c.addChild(cash)

  const valuation = makeMetricBlock('估值进度', 'V 480', C.gold)
  valuation.x = 124
  valuation.y = 0
  c.addChild(valuation)

  const ap = makeMetricBlock('行动力', 'AP 4/8', C.blue, 'dark')
  ap.x = 248
  ap.y = 0
  c.addChild(ap)

  return c
}

function makeBattleInfoPanel() {
  const c = createBasicInfoContainer({
    x: 258,
    y: 118,
    w: 356,
    h: 82,
    title: '本月战场信息',
    subtitle: '产线输出、市场压力、现金风险可放入同类容器',
    accent: C.gold,
    tone: 'dark',
  })

  const rows = [
    ['产线 A', '¥120', C.green],
    ['产线 B', '待布置', C.blue],
    ['市场压力', '+160', C.red],
  ]

  rows.forEach(([label, value, color], i) => {
    const x = 18 + i * 110
    text(c, label, x + 8, 61, 6, C.softInk)
    text(c, value, x + 86, 59, 6, color, [1, 0])
  })

  return c
}

function makeStageBg() {
  const g = new Graphics()
  g.rect(0, 0, DW, DH).fill(C.stage)
  g.roundRect(18, 22, DW - 36, DH - 44, 10).fill(C.table)
  g.roundRect(18, 22, DW - 36, DH - 44, 10).stroke({ width: 2, color: 0x44311f })
  g.roundRect(28, 32, DW - 56, 16, 8).fill({ color: 0xffdf9a, alpha: 0.06 })
  return g
}

export function BasicInfoContainerStage() {
  const hostRef = useRef(null)
  const appRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    appRef.current = app

    ;(async () => {
      await app.init({
        width: DW * SCALE,
        height: DH * SCALE,
        background: C.stage,
        antialias: false,
        roundPixels: true,
        resolution: 1,
      })
      if (cancelled) {
        app.destroy(true)
        return
      }

      host.appendChild(app.canvas)
      const root = app.stage
      root.scale.set(SCALE)

      await ensurePixelFontReady()
      if (cancelled) return

      root.addChild(makeStageBg())
      text(root, '基础信息容器', 34, 16, 12, 0xf4dfb8)
      text(root, '白色/深色 tone · 粗框 · 顶部光照 · 微圆角厚度', 158, 18, 6, 0x9d8060)

      const panels = [
        makeBusinessModelPanel(),
        makeTopUiStrip(),
        makeBattleInfoPanel(),
      ]
      panels.forEach(panel => root.addChild(panel))

      let tick = 0
      app.ticker.add(() => {
        tick += 1
        panels.forEach(panel => {
          panel._tick?.(tick)
          for (const child of panel.children ?? []) child._tick?.(tick)
        })
      })
    })()

    return () => {
      cancelled = true
      const a = appRef.current
      if (a) {
        try { a.destroy(true, { children: true, texture: false }) } catch {}
        appRef.current = null
      }
    }
  }, [])

  return <div ref={hostRef} style={{ display: 'inline-block' }} />
}
