// ButtonComponentsStage — custom Pixi button prototypes

import React, { useEffect, useRef } from 'react'
import { Application, Container, Graphics, BitmapText } from 'pixi.js'
import { ensurePixelFontReady } from './pixelFont.js'

const DW = 640
const DH = 230
const SCALE = 2

const C = {
  bg: 0x17130f,
  table: 0x2a2118,
  ink: 0x2a1b10,
  cream: 0xf2e6c7,
  muted: 0x9d8060,
  brown: 0xc99234,
  brownHover: 0xdca344,
  brownDown: 0x9d6822,
  brownEdge: 0x5a3418,
  cta: 0x6d6bb1,
  ctaHover: 0x7a78c4,
  ctaDown: 0x565493,
  ctaEdge: 0x353265,
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
  g.roundRect(18, 22, DW - 36, DH - 44, 10).fill(C.table)
  g.roundRect(18, 22, DW - 36, DH - 44, 10).stroke({ width: 2, color: 0x44311f })
  g.roundRect(26, 31, DW - 52, 12, 6).fill({ color: 0xffffff, alpha: 0.04 })
  return g
}

function buttonPalette(kind) {
  return kind === 'cta'
    ? {
        fill: C.cta,
        hover: C.ctaHover,
        down: C.ctaDown,
        edge: C.ctaEdge,
        text: 0xf5f2ff,
        shine: 0xd8d6ff,
      }
    : {
        fill: C.brown,
        hover: C.brownHover,
        down: C.brownDown,
        edge: C.brownEdge,
        text: 0x2a1707,
        shine: 0xffe1a0,
      }
}

function makePixelButton({
  x,
  y,
  w = 142,
  h = 42,
  label,
  kind = 'normal',
  large = false,
}) {
  const p = buttonPalette(kind)
  const root = new Container()
  root.x = x
  root.y = y
  root.eventMode = 'static'
  root.cursor = 'pointer'

  const body = new Container()
  root.addChild(body)

  const shadow = new Graphics()
  const side = new Graphics()
  const face = new Graphics()
  const shineMask = new Graphics()
  const shine = new Graphics()
  const rim = new Graphics()

  body.addChild(shadow, side, face, shineMask, shine, rim)
  shine.mask = shineMask
  const labelText = text(body, label, w / 2, h / 2 - (large ? 8 : 7), large ? 12 : 12, p.text, [0.5, 0])

  let hover = false
  let down = false
  let sweep = 1

  function draw() {
    const fill = down ? p.down : hover ? p.hover : p.fill
    const depth = down ? 3 : 7
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

    labelText.y = h / 2 - (large ? 8 : 7) + (down ? 1 : 0)
  }

  function drawShine() {
    shine.clear()
    if (sweep >= 1) return
    const sx = -34 + (w + 68) * sweep
    shine.poly([
      sx, 2,
      sx + 22, 2,
      sx + 2, h - 3,
      sx - 20, h - 3,
    ]).fill({ color: 0xffffff, alpha: 0.075 * Math.sin(Math.PI * sweep) })
    shine.poly([
      sx + 16, 6,
      sx + 25, 6,
      sx + 8, h - 7,
      sx - 2, h - 7,
    ]).fill({ color: p.shine, alpha: 0.08 * Math.sin(Math.PI * sweep) })
  }

  root.on('pointerover', () => {
    hover = true
    sweep = 0
    draw()
  })
  root.on('pointerout', () => {
    hover = false
    down = false
    draw()
  })
  root.on('pointerdown', () => {
    down = true
    draw()
  })
  root.on('pointerup', () => {
    down = false
    draw()
  })
  root.on('pointerupoutside', () => {
    down = false
    draw()
  })

  root._tick = () => {
    if (hover && sweep < 1) {
      sweep = Math.min(1, sweep + 0.12)
      drawShine()
    }
  }

  draw()
  return root
}

function makeShowcase() {
  const root = new Container()
  root.addChild(makePixelButton({ x: 76, y: 82, label: '普通按钮', kind: 'normal', w: 132, h: 38 }))
  root.addChild(makePixelButton({ x: 76, y: 144, label: '取消', kind: 'normal', w: 132, h: 38 }))
  root.addChild(makePixelButton({ x: 270, y: 82, label: '开始结算', kind: 'cta', w: 132, h: 38 }))
  root.addChild(makePixelButton({ x: 464, y: 144, label: '确认', kind: 'cta', w: 132, h: 38 }))
  return root
}

export function ButtonComponentsStage() {
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
      const stage = app.stage
      stage.scale.set(SCALE)

      await ensurePixelFontReady()
      if (cancelled) return

      stage.addChild(makeStageBg())
      text(stage, '按钮组件', 34, 16, 12, 0xf4dfb8)
      text(stage, '粗框 · 微圆角 · 黑色厚影 · hover 淡光斑 · pressed 凹陷', 124, 18, 6, C.muted)

      const showcase = makeShowcase()
      stage.addChild(showcase)
      text(stage, 'CTA 使用附件紫色；非 CTA 使用棕黄色', 62, 198, 6, 0x9d8060)

      app.ticker.add(() => {
        for (const child of showcase.children) child._tick?.()
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
