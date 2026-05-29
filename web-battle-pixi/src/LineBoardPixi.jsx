import React, { useEffect, useRef } from 'react'
import { Application, Container, Graphics, BitmapText } from 'pixi.js'
import { createPixiCard } from './pixiCardView.js'
import { ensurePixelFontReady } from './pixelFont.js'

const CARD_W = 130
const CARD_H = 210
const SLOT_GAP = 18
const LINE_SLOTS = 5
const PAD_X = 16
const PAD_Y = 28
const LINE_W = LINE_SLOTS * CARD_W + (LINE_SLOTS - 1) * SLOT_GAP
const DW = LINE_W + PAD_X * 2
const DH = PAD_Y + CARD_H + 24

function toPixiCard(c) {
  return { ...c, output: c.baseOutput ?? 0, effect: (c.effects ?? []).join(' · ') }
}

// 产线区 · 5 槽
export function LineBoardPixi({ state, selectedUid, onPlaceSlot, onReturnSlot, scale = 1 }) {
  const hostRef = useRef(null)
  const appRef = useRef(null)
  const sceneRef = useRef(null)
  const readyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return
    const app = new Application()
    appRef.current = app
    ;(async () => {
      await app.init({
        width: DW * scale, height: DH * scale,
        background: '#1a1410', antialias: false,
        roundPixels: true, resolution: 1,
      })
      if (cancelled) { app.destroy(true, { children: true, texture: true }); return }
      host.appendChild(app.canvas)
      app.stage.scale.set(scale)
      const scene = new Container()
      app.stage.addChild(scene)
      sceneRef.current = scene
      await ensurePixelFontReady()
      readyRef.current = true
      render()
    })()
    return () => {
      cancelled = true
      const a = appRef.current
      if (a) { try { a.destroy(true, { children: true, texture: false }) } catch {}; appRef.current = null }
      sceneRef.current = null
      readyRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale])

  useEffect(() => { if (readyRef.current) render() })

  function render() {
    const scene = sceneRef.current
    if (!scene) return
    scene.removeChildren()

    const activeLine = state.lines.find((l) => l.id === state.activeLineId) ?? state.lines[0]
    const slots = activeLine?.slots ?? Array(LINE_SLOTS).fill(null)
    const isPlanning = activeLine?.status === 'planning'

    const label = new BitmapText({
      text: `战斗区 · 产线 ${activeLine?.id ?? '-'} · ${activeLine?.status ?? ''}`,
      style: { fontFamily: 'FP12s', fontSize: 12, fill: 0x9a8868 },
    })
    label.x = PAD_X; label.y = 8
    scene.addChild(label)

    for (let i = 0; i < LINE_SLOTS; i++) {
      const sx = PAD_X + i * (CARD_W + SLOT_GAP)
      const sy = PAD_Y
      const card = slots[i]
      if (card) {
        const node = createPixiCard(toPixiCard(card), { width: CARD_W, height: CARD_H, fontTheme: 'fp12', cardStyle: 'namecard' })
        node.x = sx; node.y = sy
        if (isPlanning) {
          node.eventMode = 'static'
          node.cursor = 'pointer'
          node.on('pointertap', () => onReturnSlot?.(activeLine.id, i))
        }
        scene.addChild(node)
      } else {
        const slot = drawEmptySlot(sx, sy, i, selectedUid && isPlanning)
        if (selectedUid && isPlanning) {
          slot.eventMode = 'static'
          slot.cursor = 'pointer'
          slot.on('pointertap', () => onPlaceSlot?.(selectedUid, i))
        }
        scene.addChild(slot)
      }
    }
  }

  return <div ref={hostRef} style={{ display: 'inline-block' }} />
}

function drawEmptySlot(x, y, idx, highlight) {
  const c = new Container()
  c.x = x; c.y = y
  const g = new Graphics()
  g.roundRect(0, 0, CARD_W, CARD_H, 4)
   .fill({ color: highlight ? 0x3a2e1a : 0x1f1a14, alpha: 0.6 })
   .stroke({ width: 1, color: highlight ? 0xffe080 : 0x4a3a20, alignment: 0 })
  c.addChild(g)
  const label = new BitmapText({
    text: `#${idx + 1}`,
    style: { fontFamily: 'FP12s', fontSize: 12, fill: highlight ? 0xffe080 : 0x6a5028 },
  })
  label.anchor.set(0.5)
  label.x = CARD_W / 2; label.y = CARD_H / 2
  c.addChild(label)
  return c
}
