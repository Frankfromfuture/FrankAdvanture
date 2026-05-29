import React, { useEffect, useRef } from 'react'
import { Application, Container, Graphics, BitmapText } from 'pixi.js'
import { createPixiCard } from './pixiCardView.js'
import { ensurePixelFontReady } from './pixelFont.js'

const CARD_W = 130
const CARD_H = 210
const HAND_GAP = 10
const PAD_X = 16
const PAD_Y = 28
const DH = PAD_Y + CARD_H + 24

function toPixiCard(c) {
  return { ...c, output: c.baseOutput ?? 0, effect: (c.effects ?? []).join(' · ') }
}

// 手牌区 · 宽度自适应外层
export function HandBoardPixi({ state, selectedUid, onSelectCard, width = 960, scale = 1 }) {
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
        width: width * scale, height: DH * scale,
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
  }, [scale, width])

  useEffect(() => { if (readyRef.current) render() })

  function render() {
    const scene = sceneRef.current
    if (!scene) return
    scene.removeChildren()

    const label = new BitmapText({
      text: `手牌 ${state.hand.length} · AP ${state.apAvailable}${state.discardRequired > 0 ? ` · 需弃 ${state.discardRequired}` : ''}`,
      style: { fontFamily: 'FP12s', fontSize: 12, fill: state.discardRequired > 0 ? 0xe85040 : 0x9a8868 },
    })
    label.x = PAD_X; label.y = 8
    scene.addChild(label)

    const hand = state.hand
    if (hand.length === 0) return

    // 自适应间距：手牌太多时压缩
    const availableW = width - PAD_X * 2
    const naturalW = hand.length * CARD_W + (hand.length - 1) * HAND_GAP
    const overflow = naturalW - availableW
    let step = CARD_W + HAND_GAP
    if (overflow > 0) {
      step = (availableW - CARD_W) / Math.max(1, hand.length - 1)
    }

    const totalW = (hand.length - 1) * step + CARD_W
    const startX = Math.round((width - totalW) / 2)

    hand.forEach((card, i) => {
      const node = createPixiCard(toPixiCard(card), { width: CARD_W, height: CARD_H, fontTheme: 'fp12', cardStyle: 'namecard' })
      node.x = startX + i * step
      node.y = PAD_Y
      node.eventMode = 'static'
      node.cursor = 'pointer'
      node.on('pointertap', () => onSelectCard?.(card.uid === selectedUid ? null : card.uid))
      if (card.uid === selectedUid) {
        const ring = new Graphics()
        ring.roundRect(-3, -3, CARD_W + 6, CARD_H + 6, 6)
            .stroke({ width: 2, color: 0xffe080, alignment: 0 })
        node.addChild(ring)
        node.y = PAD_Y - 8
      }
      scene.addChild(node)
    })
  }

  return <div ref={hostRef} style={{ display: 'block' }} />
}
