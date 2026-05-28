// BattleScene — Pixi battlefield layout prototype
//
// Prototype goals:
//   - symbolic boxes and color blocks only; no final card art required
//   - 2.5D battlefield with raised rounded panels, thick pseudo-3D edges
//   - active board feeling: glow, pulse, scan lines, hover lift, chained beams
//   - FP12 only: 2x body text, 1x hint text

import React, { useEffect, useRef } from 'react'
import { Application, Container, Graphics, BitmapText } from 'pixi.js'
import { ensurePixelFontReady } from './pixelFont.js'

const DW = 640
const DH = 370
const SCALE = 2

const C = {
  bg0: 0x131722,
  bg1: 0x1a2030,
  grid: 0x293249,
  grid2: 0x35405a,
  ink: 0xf6f1dc,
  muted: 0xa5a98f,
  dim: 0x677083,
  black: 0x05070b,
  shadow: 0x080b12,
  panel: 0x22283a,
  panelTop: 0x30384e,
  panelFront: 0x121726,
  panelSide: 0x191f31,
  rail: 0x45516b,
  teal: 0x37d6b2,
  tealDark: 0x0f7d72,
  gold: 0xffc85a,
  goldDark: 0x8c5b16,
  orange: 0xff8f45,
  red: 0xff5c75,
  blue: 0x62a8ff,
  purple: 0xb58cff,
  green: 0x7bea8a,
}

const DEPT = {
  R: C.purple,
  S: C.orange,
  O: C.teal,
  F: C.gold,
}

const handCards = [
  { name: '市场经理', dept: 'S', value: 32, ap: 3, color: C.orange },
  { name: '首席科学家', dept: 'R', value: 92, ap: 3, color: C.purple },
  { name: '运营助理', dept: 'O', value: 18, ap: 1, color: C.teal },
  { name: '功能卡', dept: 'F', value: 0, ap: 2, color: C.gold },
  { name: '技术 VP', dept: 'R', value: 145, ap: 5, color: C.blue },
]

const lineA = [
  { dept: 'R', value: 25, label: 'R&D' },
  { dept: 'S', value: 44, label: '获客' },
  { dept: 'O', value: 31, label: '交付' },
  { dept: 'F', value: 20, label: '提效' },
]

const lineB = [
  { dept: 'S', value: 16, label: '销售' },
  null,
  { dept: 'R', value: 58, label: '突破' },
  null,
]

function addText(parent, text, x, y, size = 12, fill = C.ink, anchor = [0, 0]) {
  const t = new BitmapText({
    text,
    style: { fontFamily: 'FP12s', fontSize: size, fill },
  })
  t.anchor.set(anchor[0], anchor[1])
  t.x = Math.round(x)
  t.y = Math.round(y)
  parent.addChild(t)
  return t
}

function roundedPrism({
  x = 0,
  y = 0,
  w,
  h,
  depth = 8,
  radius = 6,
  top = C.panelTop,
  front = C.panelFront,
  side = C.panelSide,
  stroke = C.rail,
  glow = 0,
  glowAlpha = 0,
}) {
  const c = new Container()
  c.x = x
  c.y = y

  const shadow = new Graphics()
  shadow.roundRect(depth + 4, depth + 5, w, h, radius).fill({ color: C.black, alpha: 0.35 })
  c.addChild(shadow)

  const right = new Graphics()
  right.roundRect(depth, depth, w, h, radius).fill(side)
  c.addChild(right)

  const lower = new Graphics()
  lower.roundRect(0, depth, w, h, radius).fill(front)
  c.addChild(lower)

  const face = new Graphics()
  face.roundRect(0, 0, w, h, radius).fill(top)
  face.roundRect(0, 0, w, h, radius).stroke({ width: 1, color: stroke, alpha: 0.95 })
  c.addChild(face)

  const shine = new Graphics()
  shine.roundRect(3, 2, w - 6, 2, 1).fill({ color: 0xffffff, alpha: 0.12 })
  c.addChild(shine)

  if (glow) {
    const g = new Graphics()
    g.roundRect(-3, -3, w + 6, h + 6, radius + 2).stroke({ width: 2, color: glow, alpha: glowAlpha })
    c.addChild(g)
    c._glow = g
  }

  return c
}

function makeFloor() {
  const c = new Container()
  const bg = new Graphics()
  bg.rect(0, 0, DW, DH).fill(C.bg0)
  bg.roundRect(16, 24, DW - 32, DH - 46, 14).fill(C.bg1)
  bg.roundRect(16, 24, DW - 32, DH - 46, 14).stroke({ width: 1, color: 0x2c354c })
  c.addChild(bg)

  const grid = new Graphics()
  const y0 = 74
  const y1 = 330
  for (let x = -160; x < DW + 220; x += 30) {
    grid.moveTo(x, y0).lineTo(x + 230, y1).stroke({ width: 1, color: C.grid, alpha: 0.42 })
    grid.moveTo(x + 230, y0).lineTo(x, y1).stroke({ width: 1, color: C.grid2, alpha: 0.22 })
  }
  for (let y = 88; y < 326; y += 30) {
    grid.moveTo(38, y).lineTo(DW - 44, y - 34).stroke({ width: 1, color: C.grid, alpha: 0.15 })
  }
  c.addChild(grid)

  const glow = new Graphics()
  glow.ellipse(DW / 2, 218, 250, 70).fill({ color: C.teal, alpha: 0.07 })
  glow.ellipse(518, 114, 122, 40).fill({ color: C.gold, alpha: 0.07 })
  c.addChild(glow)
  return c
}

function makeHud() {
  const c = roundedPrism({
    x: 18, y: 10, w: DW - 36, h: 30, depth: 5, radius: 8,
    top: 0x202638, front: 0x0d1220, side: 0x151b2a, stroke: 0x3c4761,
  })
  addText(c, '2026.05', 16, 8, 12, C.muted)
  addText(c, 'V 480 / 1000', 104, 8, 12, C.gold)
  addText(c, 'Cash 124', 286, 8, 12, C.green)
  addText(c, 'AP', 468, 8, 12, C.orange)

  const bar = new Graphics()
  bar.roundRect(198, 11, 72, 7, 3).fill(0x111827)
  bar.roundRect(198, 11, 38, 7, 3).fill(C.gold)
  c.addChild(bar)

  for (let i = 0; i < 8; i++) {
    const dot = new Graphics()
    dot.roundRect(498 + i * 13, 9, 8, 11, 3).fill(i < 4 ? C.orange : 0x3b4257)
    dot.roundRect(498 + i * 13, 9, 8, 11, 3).stroke({ width: 1, color: i < 4 ? 0xffc38a : 0x4b5368 })
    c.addChild(dot)
  }
  return c
}

function makeSidePanel() {
  const c = roundedPrism({
    x: 480, y: 62, w: 124, h: 190, depth: 9, radius: 10,
    top: 0x242b3d, front: 0x101624, side: 0x171d2d, stroke: 0x46516b,
    glow: C.gold, glowAlpha: 0.3,
  })
  addText(c, '市场压力', 14, 12, 12, C.gold)
  addText(c, '本月目标', 14, 32, 6, C.muted)
  addText(c, 'V +160', 14, 44, 12, C.ink)

  const meter = new Graphics()
  meter.roundRect(14, 66, 96, 16, 5).fill(0x121827)
  meter.roundRect(14, 66, 64, 16, 5).fill(C.red)
  meter.roundRect(14, 66, 96, 16, 5).stroke({ width: 1, color: 0x576079 })
  c.addChild(meter)
  addText(c, '竞争者推进', 18, 70, 6, C.ink)

  const events = [
    ['融资窗口', C.blue, 0.88],
    ['现金告急', C.red, 0.56],
    ['舆论热度', C.teal, 0.72],
  ]
  events.forEach(([label, color, pct], i) => {
    const y = 100 + i * 29
    const row = roundedPrism({
      x: 14, y, w: 96, h: 20, depth: 4, radius: 5,
      top: 0x30364a, front: 0x151a28, side: 0x1b2130, stroke: 0x4b556f,
    })
    row.scale.y = 1
    const fill = new Graphics()
    fill.roundRect(5, 13, Math.round(82 * pct), 3, 2).fill(color)
    row.addChild(fill)
    addText(row, label, 8, 5, 6, color)
    c.addChild(row)
  })

  return c
}

function makeCommandPanel() {
  const c = roundedPrism({
    x: 28, y: 70, w: 116, h: 160, depth: 9, radius: 10,
    top: 0x242b3d, front: 0x101624, side: 0x171d2d, stroke: 0x46516b,
    glow: C.teal, glowAlpha: 0.22,
  })
  addText(c, 'CEO 指挥台', 14, 12, 12, C.teal)
  addText(c, '协同槽', 14, 34, 6, C.muted)

  const nodes = [
    [32, 66, C.purple, 'R'],
    [78, 66, C.orange, 'S'],
    [54, 112, C.teal, 'O'],
  ]
  nodes.forEach(([x, y, color, label]) => {
    const n = roundedPrism({
      x: x - 18, y: y - 16, w: 36, h: 30, depth: 5, radius: 8,
      top: 0x30364a, front: 0x121827, side: 0x1b2232, stroke: color,
      glow: color, glowAlpha: 0.35,
    })
    addText(n, label, 18, 7, 12, color, [0.5, 0])
    c.addChild(n)
  })

  const line = new Graphics()
  line.moveTo(32, 66).lineTo(78, 66).lineTo(54, 112).lineTo(32, 66)
    .stroke({ width: 2, color: C.teal, alpha: 0.35 })
  c.addChildAt(line, 4)
  addText(c, '+30% 连锁', 16, 138, 6, C.gold)
  return c
}

function makeSlot(card, i, isActive = false) {
  const c = roundedPrism({
    w: 58, h: 60, depth: 7, radius: 8,
    top: card ? 0x2b3248 : 0x202638,
    front: 0x111726,
    side: 0x171d2d,
    stroke: card ? (DEPT[card.dept] ?? C.rail) : 0x4a536b,
    glow: isActive ? C.gold : card ? (DEPT[card.dept] ?? C.teal) : C.blue,
    glowAlpha: isActive ? 0.62 : card ? 0.22 : 0.13,
  })
  c.eventMode = 'static'
  c.cursor = 'pointer'

  if (card) {
    const color = DEPT[card.dept] ?? C.teal
    const art = new Graphics()
    art.roundRect(7, 9, 44, 22, 6).fill({ color, alpha: 0.2 })
    art.roundRect(7, 9, 44, 22, 6).stroke({ width: 1, color, alpha: 0.72 })
    c.addChild(art)
    addText(c, card.label, 29, 15, 6, color, [0.5, 0])
    addText(c, `Y ${card.value}`, 29, 39, 12, C.ink, [0.5, 0])
  } else {
    const ph = new Graphics()
    ph.roundRect(9, 11, 40, 27, 7).stroke({ width: 1, color: 0x59627b, alpha: 0.75 })
    ph.roundRect(15, 20, 28, 3, 2).fill({ color: 0x59627b, alpha: 0.55 })
    ph.roundRect(20, 28, 18, 3, 2).fill({ color: 0x59627b, alpha: 0.35 })
    c.addChild(ph)
    addText(c, `P${i + 1}`, 29, 42, 6, C.dim, [0.5, 0])
  }

  let hover = false
  c.on('pointerover', () => { hover = true })
  c.on('pointerout', () => { hover = false })
  c._tick = (t) => {
    const target = hover ? -6 : 0
    c.y += (target - c.y) * 0.18
    if (c._glow) c._glow.alpha = 0.45 + Math.sin(t * 0.07 + i) * 0.18
  }
  return c
}

function makeLane({ x, y, title, cards, accent, activeIndex = 0, tilt = -5 }) {
  const c = new Container()
  c.x = x
  c.y = y
  c.rotation = tilt * Math.PI / 180

  const base = roundedPrism({
    w: 312, h: 90, depth: 14, radius: 14,
    top: 0x2a3146, front: 0x111725, side: 0x171e2e, stroke: accent,
    glow: accent, glowAlpha: 0.2,
  })
  c.addChild(base)

  const rail = new Graphics()
  rail.roundRect(18, 12, 276, 7, 4).fill(0x111827)
  rail.roundRect(18, 12, 84, 7, 4).fill(accent)
  base.addChild(rail)
  addText(base, title, 20, 24, 12, accent)
  addText(base, '链式产线', 238, 26, 6, C.muted)

  cards.forEach((card, i) => {
    const sl = makeSlot(card, i, i === activeIndex)
    sl.x = 20 + i * 70
    sl.y = 50
    c.addChild(sl)
  })

  const flow = new Graphics()
  flow.moveTo(50, 80).lineTo(262, 80).stroke({ width: 2, color: accent, alpha: 0.45 })
  c.addChild(flow)

  c._tick = (t) => {
    if (base._glow) base._glow.alpha = 0.18 + Math.sin(t * 0.035) * 0.08
    for (const child of c.children) child._tick?.(t)
  }
  return c
}

function makeHand() {
  const c = new Container()
  const shelf = roundedPrism({
    x: 104, y: 286, w: 420, h: 62, depth: 10, radius: 14,
    top: 0x242b3d, front: 0x101624, side: 0x171d2d, stroke: 0x46516b,
  })
  c.addChild(shelf)
  addText(shelf, '手牌区 · CardView namecard 1.5x', 18, 10, 6, C.muted)

  handCards.forEach((card, i) => {
    const cardC = roundedPrism({
      x: 28 + i * 72,
      y: 24 + Math.abs(i - 2) * 3,
      w: 56,
      h: 76,
      depth: 7,
      radius: 8,
      top: 0x2c3347,
      front: 0x121827,
      side: 0x1a2132,
      stroke: card.color,
      glow: i === 1 ? C.gold : card.color,
      glowAlpha: i === 1 ? 0.5 : 0.18,
    })
    cardC.pivot.set(28, 68)
    cardC.rotation = (i - 2) * 0.08
    cardC.eventMode = 'static'
    cardC.cursor = 'pointer'

    const band = new Graphics()
    band.roundRect(6, 7, 44, 5, 3).fill(card.color)
    cardC.addChild(band)
    const portrait = new Graphics()
    portrait.roundRect(8, 19, 40, 28, 7).fill({ color: card.color, alpha: 0.18 })
    portrait.roundRect(8, 19, 40, 28, 7).stroke({ width: 1, color: card.color, alpha: 0.6 })
    cardC.addChild(portrait)
    addText(cardC, card.dept, 28, 26, 12, card.color, [0.5, 0])
    addText(cardC, card.name, 28, 51, 6, C.ink, [0.5, 0])
    addText(cardC, `Y${card.value} AP${card.ap}`, 28, 63, 6, C.gold, [0.5, 0])

    let hover = false
    cardC.on('pointerover', () => { hover = true })
    cardC.on('pointerout', () => { hover = false })
    cardC._tick = () => {
      const target = hover ? -16 : 0
      cardC.y += (24 + Math.abs(i - 2) * 3 + target - cardC.y) * 0.18
      cardC.scale.set(1 + (hover ? 0.08 : 0))
    }
    shelf.addChild(cardC)
  })

  c._tick = () => {
    for (const child of shelf.children) child._tick?.()
  }
  return c
}

function makeActionButton() {
  const c = roundedPrism({
    x: 538, y: 295, w: 72, h: 42, depth: 8, radius: 10,
    top: C.gold, front: C.goldDark, side: 0x6c4511, stroke: 0xffe099,
    glow: C.gold, glowAlpha: 0.55,
  })
  c.eventMode = 'static'
  c.cursor = 'pointer'
  addText(c, '开始', 36, 7, 12, 0x1a1620, [0.5, 0])
  addText(c, '结算', 36, 22, 12, 0x1a1620, [0.5, 0])

  let down = false
  c.on('pointerdown', () => { down = true })
  c.on('pointerup', () => { down = false })
  c.on('pointerupoutside', () => { down = false })
  c._tick = (t) => {
    c.y += ((down ? 300 : 295) - c.y) * 0.35
    if (c._glow) c._glow.alpha = 0.46 + Math.sin(t * 0.07) * 0.16
  }
  return c
}

function makeActivityLayer() {
  const c = new Container()
  const scan = new Graphics()
  scan.roundRect(160, 150, 310, 3, 2).fill({ color: C.teal, alpha: 0.7 })
  c.addChild(scan)

  const beam = new Graphics()
  c.addChild(beam)

  c._tick = (t) => {
    scan.x = Math.sin(t * 0.032) * 22
    scan.alpha = 0.18 + Math.abs(Math.sin(t * 0.035)) * 0.28
    beam.clear()
    const a = 0.25 + Math.abs(Math.sin(t * 0.05)) * 0.35
    beam.moveTo(176, 166).lineTo(304, 122).lineTo(438, 170)
      .stroke({ width: 3, color: C.gold, alpha: a })
    beam.moveTo(198, 232).lineTo(318, 184).lineTo(452, 226)
      .stroke({ width: 2, color: C.teal, alpha: a * 0.8 })
  }
  return c
}

export function BattleScene() {
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
        background: C.bg0,
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

      root.addChild(makeFloor())
      root.addChild(makeHud())
      root.addChild(makeCommandPanel())
      root.addChild(makeSidePanel())

      const activity = makeActivityLayer()
      root.addChild(activity)

      const laneA = makeLane({
        x: 170, y: 102, title: '产线 A · 生产中', cards: lineA,
        accent: C.teal, activeIndex: 2, tilt: -6,
      })
      root.addChild(laneA)

      const laneB = makeLane({
        x: 180, y: 194, title: '产线 B · 可布置', cards: lineB,
        accent: C.gold, activeIndex: 0, tilt: 5,
      })
      root.addChild(laneB)

      const hand = makeHand()
      root.addChild(hand)

      const button = makeActionButton()
      root.addChild(button)

      addText(root, '提示：点击/悬停只是原型反馈，元素均为最终美术占位', 28, 356, 6, C.dim)

      let t = 0
      app.ticker.add(() => {
        t += 1
        activity._tick?.(t)
        laneA._tick?.(t)
        laneB._tick?.(t)
        hand._tick?.(t)
        button._tick?.(t)
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
