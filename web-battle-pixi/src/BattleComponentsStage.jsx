// BattleComponentsStage — battlefield background, number burst, and production line prototypes

import React, { useEffect, useRef } from 'react'
import { Application, Container, Graphics, BitmapText } from 'pixi.js'
import { ensurePixelFontReady } from './pixelFont.js'

const DW = 640
const DH = 520
const SCALE = 2

const C = {
  bg: 0x17130f,
  panel: 0x241b14,
  ink: 0x2a1b10,
  cream: 0xf2e6c7,
  muted: 0x9d8060,
  gold: 0xd7922e,
  black: 0x050403,
}

const STAGE_PALETTES = {
  1: { colorA: 0xc9bfb1, colorB: 0xece7df },
  2: { colorA: 0xa7c0a8, colorB: 0xece8e1 },
  3: { colorA: 0xa0b2c6, colorB: 0xe8edf3 },
  4: { colorA: 0xb8a6d9, colorB: 0xebe6f3 },
  5: { colorA: 0x94cbd3, colorB: 0xe6f1f3 },
  6: { colorA: 0x8a9597, colorB: 0xe5e8e8 },
  7: { colorA: 0xe0cca5, colorB: 0xf5eedf },
  8: { colorA: 0x9ba3d7, colorB: 0xe9eaf5 },
  9: { colorA: 0x2d2f34, colorB: 0xf5c63c },
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

function makeStageBg() {
  const g = new Graphics()
  g.rect(0, 0, DW, DH).fill(C.bg)
  g.roundRect(18, 22, DW - 36, DH - 44, 10).fill(C.panel)
  g.roundRect(18, 22, DW - 36, DH - 44, 10).stroke({ width: 2, color: 0x44311f })
  return g
}

function makePanel(x, y, w, h, title, subtitle) {
  const c = new Container()
  c.x = x
  c.y = y
  c.addChild(new Graphics().roundRect(7, 8, w, h, 8).fill({ color: 0x000000, alpha: 0.36 }))
  c.addChild(new Graphics().roundRect(4, 5, w, h, 8).fill(0x2a1a0d))
  c.addChild(new Graphics().roundRect(0, 0, w, h, 8).fill(0x5a3b20))
  c.addChild(new Graphics().roundRect(4, 4, w - 8, h - 8, 6).fill(C.cream))
  c.addChild(new Graphics().roundRect(0, 0, w, h, 8).stroke({ width: 3, color: 0x2a1a0d }))
  text(c, title, 14, 12, 12, C.ink)
  text(c, subtitle, 14, 29, 6, C.muted)
  return c
}

function makeDriftingBattleBackground() {
  const c = makePanel(30, 50, 276, 144, '战斗场景背景', '复制 web-battle 漂移棋盘背景')
  const area = new Container()
  area.x = 14
  area.y = 46
  c.addChild(area)

  const mask = new Graphics()
  mask.roundRect(0, 0, 248, 82, 6).fill(0xffffff)
  area.addChild(mask)

  const grid = new Graphics()
  grid.mask = mask
  area.addChild(grid)

  area.addChild(new Graphics().roundRect(0, 0, 248, 82, 6).stroke({ width: 2, color: 0x8b7252 }))
  text(c, 'SIZE 48 / SPEED 7px/s / direction right-up', 18, 134, 6, C.muted)

  const SIZE = 48
  const SPEED = 7
  const period = SIZE * 2
  const palette = STAGE_PALETTES[1]

  c._tick = (dt) => {
    const ox = (SPEED * dt) % period
    let oy = (-SPEED * dt) % period
    if (oy < 0) oy += period

    grid.clear()
    grid.rect(0, 0, 248, 82).fill(palette.colorB)
    for (let r = -2; r < Math.ceil(82 / SIZE) + 4; r++) {
      for (let col = -2; col < Math.ceil(248 / SIZE) + 4; col++) {
        const x = col * SIZE + ox
        const y = r * SIZE + oy
        const dark = ((col + r) & 1) === 0
        grid.rect(x, y, SIZE, SIZE).fill(dark ? palette.colorA : palette.colorB)
      }
    }
  }

  return c
}

function makeFlameNumber() {
  const c = makePanel(334, 50, 276, 144, '数字弹跳火焰', '弹跳放大 / 背后闪烁 / 火焰跳动')
  const fx = new Container()
  fx.x = 138
  fx.y = 88
  c.addChild(fx)

  const glow = new Graphics()
  const flame = new Graphics()
  const particles = Array.from({ length: 11 }, () => new Graphics())
  fx.addChild(glow, flame, ...particles)

  const num = text(fx, '686', 0, -6, 36, 0xffffff, [0.5, 0.5])
  const sh = text(fx, '686', 3, -2, 36, 0x164d88, [0.5, 0.5])
  fx.addChildAt(sh, fx.getChildIndex(num))

  c._tick = (time) => {
    const bounce = 1 + Math.abs(Math.sin(time * 4.2)) * 0.16
    fx.scale.set(bounce)
    fx.y = 88 - Math.abs(Math.sin(time * 4.2)) * 8

    glow.clear()
    const glowA = 0.25 + Math.abs(Math.sin(time * 9)) * 0.22
    glow.ellipse(0, 0, 80, 54).fill({ color: 0x5eefff, alpha: glowA })
    glow.ellipse(0, 8, 68, 38).fill({ color: 0x2b74ff, alpha: 0.36 })

    flame.clear()
    const flick = Math.round(Math.sin(time * 20) * 3)
    flame.rect(-36, -55 + flick, 16, 22).fill(0xffffff)
    flame.rect(-14, -63 - flick, 14, 30).fill(0xffffff)
    flame.rect(10, -57 + flick, 16, 25).fill(0xffffff)
    flame.rect(-24, -45, 46, 14).fill(0xcfffff)
    flame.rect(-42, -33, 84, 9).fill({ color: 0x6defff, alpha: 0.85 })

    particles.forEach((p, i) => {
      p.clear()
      const phase = (time * (1.8 + i * 0.07) + i * 0.19) % 1
      const x = -42 + i * 8 + Math.sin(time * 8 + i) * 5
      const y = -28 - phase * 44
      const alpha = 1 - phase
      const size = 3 + (i % 3)
      const color = i % 3 === 0 ? 0xffffff : i % 3 === 1 ? 0xffeb60 : 0xff8030
      p.rect(x, y, size, size).fill({ color, alpha })
    })
  }
  return c
}

// ─── Production-line square button — identical UI to ButtonComponentsStage ────
function makeStackButton({ x, y, size = 52, label, cta = false, onPress }) {
  // Same palettes as ButtonComponentsStage
  const p = cta
    ? { fill: 0x6d6bb1, hover: 0x7a78c4, down: 0x565493, edge: 0x353265, text: 0xf5f2ff, shine: 0xd8d6ff }
    : { fill: 0xc99234, hover: 0xdca344, down: 0x9d6822, edge: 0x5a3418, text: 0x2a1707, shine: 0xffe1a0 }

  const w = size, h = size

  const root = new Container()
  root.x = x
  root.y = y
  root.eventMode = 'static'
  root.cursor = 'pointer'

  const body = new Container()
  root.addChild(body)

  const shadow    = new Graphics()
  const side      = new Graphics()
  const face      = new Graphics()
  const shineMask = new Graphics()
  const shine     = new Graphics()
  const rim       = new Graphics()

  body.addChild(shadow, side, face, shineMask, shine, rim)
  shine.mask = shineMask

  const lbl = text(body, label, Math.round(w / 2), Math.round(h / 2 - 7), 12, p.text, [0.5, 0])

  let hover = false, down = false, sweep = 1

  function draw() {
    const fill   = down ? p.down : hover ? p.hover : p.fill
    const depth  = down ? 3 : 7
    const pressY = down ? 4 : 0

    body.y = pressY

    shadow.clear()
    shadow.roundRect(8, 10, w, h, 7).fill({ color: 0x000000, alpha: down ? 0.24 : 0.46 })

    side.clear()
    side.roundRect(6, depth, w, h, 7).fill({ color: 0x000000, alpha: down ? 0.42 : 0.62 })

    face.clear()
    face.roundRect(0, 0, w, h, 7).fill(fill)
    face.roundRect(0, 0, w, h, 7).stroke({ width: 4, color: p.edge })

    shineMask.clear()
    shineMask.roundRect(4, 4, w - 8, h - 8, 5).fill(0xffffff)

    rim.clear()
    rim.roundRect(4, 4, w - 8, h - 8, 5).stroke({ width: 1, color: 0xffffff, alpha: down ? 0.08 : 0.22 })

    lbl.y = Math.round(h / 2 - 7) + (down ? 1 : 0)
  }

  function drawShine() {
    shine.clear()
    if (sweep >= 1) return
    const sx = -34 + (w + 68) * sweep
    shine.poly([sx, 2, sx + 22, 2, sx + 2, h - 3, sx - 20, h - 3])
      .fill({ color: 0xffffff, alpha: 0.075 * Math.sin(Math.PI * sweep) })
    shine.poly([sx + 16, 6, sx + 25, 6, sx + 8, h - 7, sx - 2, h - 7])
      .fill({ color: p.shine, alpha: 0.08 * Math.sin(Math.PI * sweep) })
  }

  root.on('pointerover',      () => { hover = true;  sweep = 0; draw() })
  root.on('pointerout',       () => { hover = false; down = false; draw() })
  root.on('pointerdown',      () => { down = true;  draw() })
  root.on('pointerup',        () => { down = false; onPress?.(); draw() })
  root.on('pointerupoutside', () => { down = false; draw() })

  // _tick drives the hover shine sweep (called from BattleComponentsStage ticker)
  root._tick = () => {
    if (hover && sweep < 1) { sweep = Math.min(1, sweep + 0.12); drawShine() }
  }

  draw()
  return root
}

// ─── Stacklands-style production line ────────────────────────────────────────
function makeProductionLine() {
  const BG_LIGHT  = 0xEDE8D8
  const BG_TITLE  = 0xBEBAAD
  const WHITE_BDR = 0xF4F0E6
  const BLACK_BDR = 0x08060A
  const TITLE_INK = 0x3A2C18
  const TITLE_DIM = 0x6A5840

  const PNL_X = 28,  PNL_Y = 212
  const PNL_W = 584, PNL_H = 248
  const PNL_R = 8
  const TITLE_H = Math.round(PNL_H / 4)

  const SLOT_W   = 87
  const SLOT_H   = Math.round(SLOT_W * 210 / 130)
  const SLOT_GAP = 12
  const N_SLOTS  = 5
  const SLOTS_W  = N_SLOTS * SLOT_W + (N_SLOTS - 1) * SLOT_GAP

  const BTN_SIZE  = 42
  const BTN_GAP   = 10
  const BTN_STACK = BTN_SIZE * 2 + BTN_GAP

  const CONTENT_W = SLOTS_W + SLOT_GAP + BTN_SIZE
  const CX = Math.round((PNL_W - CONTENT_W) / 2)

  const BODY_H = PNL_H - TITLE_H
  const SY = TITLE_H + Math.round((BODY_H - SLOT_H) / 2)
  const BY = TITLE_H + Math.round((BODY_H - BTN_STACK) / 2)

  const c = new Container()
  c.x = PNL_X
  c.y = PNL_Y

  // drop shadow
  c.addChild(new Graphics()
    .roundRect(6, 10, PNL_W, PNL_H, PNL_R + 2)
    .fill({ color: 0x000000, alpha: 0.45 }))

  // ── Panel body fill (light cream) ────────────────────────────────────────────
  c.addChild(new Graphics()
    .roundRect(0, 0, PNL_W, PNL_H, PNL_R)
    .fill(BG_LIGHT))

  // ── Title bar (top 1/4, 20 % darker) ─────────────────────────────────────────
  // Technique: roundRect covering top portion + roundR, then flat-bottom overwrite.
  c.addChild(new Graphics()
    .roundRect(0, 0, PNL_W, TITLE_H + PNL_R, PNL_R)
    .fill(BG_TITLE))
  // overwrite the unwanted rounded bottom corners of the title roundRect
  c.addChild(new Graphics()
    .rect(0, TITLE_H, PNL_W, PNL_R + 1)
    .fill(BG_LIGHT))
  // subtle hairline divider between title and body
  c.addChild(new Graphics()
    .rect(PNL_R, TITLE_H, PNL_W - PNL_R * 2, 1)
    .fill({ color: BLACK_BDR, alpha: 0.20 }))

  // ── Outer border — thick warm white (Stacklands signature) ───────────────────
  c.addChild(new Graphics()
    .roundRect(0, 0, PNL_W, PNL_H, PNL_R)
    .stroke({ width: 3, color: WHITE_BDR }))

  // ── Inner border — 3 px black (= 6 px screen), tight against white ───────────
  c.addChild(new Graphics()
    .roundRect(3, 3, PNL_W - 6, PNL_H - 6, PNL_R - 1)
    .stroke({ width: 3, color: BLACK_BDR }))

  // ── Title text ────────────────────────────────────────────────────────────────
  const titleMid = Math.round(TITLE_H / 2)
  text(c, '产线 A', CX, titleMid - 6, 12, TITLE_INK)
  text(c, '5 slots · card ratio 1:1.615 · Stacklands', CX + 66, titleMid - 3, 6, TITLE_DIM)

  // ── Slots — transparent fill, title-colour border, 3 px (= 6 px screen) ──────
  for (let i = 0; i < N_SLOTS; i++) {
    const sx = CX + i * (SLOT_W + SLOT_GAP)
    const sy = SY

    // border only, no fill — colour matches title bar
    c.addChild(new Graphics()
      .roundRect(sx, sy, SLOT_W, SLOT_H, 4)
      .stroke({ width: 3, color: BG_TITLE }))
    // slot label
    text(c, `P${i + 1}`, sx + SLOT_W / 2, sy + SLOT_H / 2 - 6, 12, BG_TITLE, [0.5, 0.5])
  }

  // ── Buttons (right of slots) ──────────────────────────────────────────────────
  const BX = CX + SLOTS_W + SLOT_GAP

  const btnCta  = makeStackButton({ x: BX, y: BY,                    size: BTN_SIZE, label: 'cta',   cta: true  })
  const btnNorm = makeStackButton({ x: BX, y: BY + BTN_SIZE + BTN_GAP, size: BTN_SIZE, label: '非cta', cta: false })
  c.addChild(btnCta, btnNorm)

  // propagate ticker to buttons so shine sweep animates
  c._tick = () => { btnCta._tick(); btnNorm._tick() }

  return c
}

export function BattleComponentsStage() {
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
        background: C.bg,
        antialias: false,
        roundPixels: true,
        resolution: 1,
      })
      if (cancelled) {
        app.destroy(true)
        return
      }
      host.appendChild(app.canvas)
      app.stage.scale.set(SCALE)

      await ensurePixelFontReady()
      if (cancelled) return

      app.stage.addChild(makeStageBg())
      text(app.stage, '战斗组件', 34, 16, 12, 0xf4dfb8)
      text(app.stage, '背景 / 弹跳数字 / 产线牌桌', 118, 18, 6, C.muted)

      const bg = makeDriftingBattleBackground()
      const num = makeFlameNumber()
      const prodLine = makeProductionLine()
      app.stage.addChild(bg, num, prodLine)

      let time = 0
      app.ticker.add((ticker) => {
        time += ticker.deltaMS / 1000
        bg._tick?.(time)
        num._tick?.(time)
        prodLine._tick?.()
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
