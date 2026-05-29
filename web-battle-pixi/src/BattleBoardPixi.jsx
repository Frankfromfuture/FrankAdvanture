import React, { useEffect, useRef } from 'react'
import { Application, Assets, Container, Graphics, BitmapText } from 'pixi.js'
import { createPixiCard } from './pixiCardView.js'
import { ensurePixelFontReady } from './pixelFont.js'

const CARD_W = 130
const CARD_H = 210
const SLOT_GAP = 18
const HAND_GAP = 10
const LINE_SLOTS = 5
const PAD_X = 16
const PAD_Y = 16
const SECTION_GAP = 28

const LINE_W = LINE_SLOTS * CARD_W + (LINE_SLOTS - 1) * SLOT_GAP
const DW = LINE_W + PAD_X * 2
const DH = PAD_Y * 2 + CARD_H + SECTION_GAP + CARD_H + 20

// 把 engine 的 card instance 映射成 pixiCardView 期望的字段
function toPixiCard(c) {
  return {
    ...c,
    output: c.baseOutput ?? 0,
    effect: (c.effects ?? []).join(' · '),
    portrait: c.portrait, // 大概率没有，pixiCardView 会回退到灰底
  }
}

export function BattleBoardPixi({ state, selectedUid, onSelectCard, onPlaceSlot, onReturnSlot, scale = 1 }) {
  const hostRef = useRef(null)
  const appRef = useRef(null)
  const sceneRef = useRef(null)
  const readyRef = useRef(false)

  // 初始化 Pixi App（仅一次）
  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return

    const app = new Application()
    appRef.current = app

    ;(async () => {
      await app.init({
        width: DW * scale,
        height: DH * scale,
        background: '#1a1410',
        antialias: false,
        roundPixels: true,
        resolution: 1,
      })
      if (cancelled) { app.destroy(true, { children: true, texture: true }); return }
      host.appendChild(app.canvas)
      app.stage.scale.set(scale)
      const scene = new Container()
      app.stage.addChild(scene)
      sceneRef.current = scene

      await ensurePixelFontReady()
      readyRef.current = true
      // 触发一次首绘
      renderScene()
    })()

    return () => {
      cancelled = true
      const a = appRef.current
      if (a) {
        try { a.destroy(true, { children: true, texture: false }) } catch {}
        appRef.current = null
      }
      sceneRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale])

  // 当 state / selectedUid 变化时重绘
  useEffect(() => { if (readyRef.current) renderScene() })

  function renderScene() {
    const scene = sceneRef.current
    if (!scene) return
    scene.removeChildren()

    const activeLine = state.lines.find((l) => l.id === state.activeLineId) ?? state.lines[0]
    const slots = activeLine?.slots ?? Array(LINE_SLOTS).fill(null)
    const isPlanning = activeLine?.status === 'planning'

    // ── 产线区 ────────────────────────────────────────────────
    const lineY = PAD_Y
    drawSectionLabel(scene, `产线 ${activeLine?.id ?? '-'} · ${activeLine?.status ?? ''}`, PAD_X, lineY - 12)

    for (let i = 0; i < LINE_SLOTS; i++) {
      const sx = PAD_X + i * (CARD_W + SLOT_GAP)
      const sy = lineY
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

    // ── 手牌区 ────────────────────────────────────────────────
    const handY = PAD_Y + CARD_H + SECTION_GAP
    drawSectionLabel(scene, `手牌（${state.hand.length}） · AP ${state.apAvailable}`, PAD_X, handY - 12)

    const hand = state.hand
    const handTotalW = hand.length * CARD_W + Math.max(0, hand.length - 1) * HAND_GAP
    const handStartX = Math.max(PAD_X, Math.round((DW - handTotalW) / 2))

    hand.forEach((card, i) => {
      const node = createPixiCard(toPixiCard(card), { width: CARD_W, height: CARD_H, fontTheme: 'fp12', cardStyle: 'namecard' })
      node.x = handStartX + i * (CARD_W + HAND_GAP)
      node.y = handY
      node.eventMode = 'static'
      node.cursor = 'pointer'
      node.on('pointertap', () => onSelectCard?.(card.uid === selectedUid ? null : card.uid))
      if (card.uid === selectedUid) {
        const ring = new Graphics()
        ring.roundRect(-3, -3, CARD_W + 6, CARD_H + 6, 6)
            .stroke({ width: 2, color: 0xffe080, alignment: 0 })
        node.addChild(ring)
        node.y = handY - 8
      }
      scene.addChild(node)
    })
  }

  return <div ref={hostRef} />
}

function drawEmptySlot(x, y, idx, highlight) {
  const c = new Container()
  c.x = x; c.y = y
  const g = new Graphics()
  // 虚线效果用一圈短矩形近似（简单版：实线 + 透明度）
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

function drawSectionLabel(scene, text, x, y) {
  const t = new BitmapText({
    text,
    style: { fontFamily: 'FP12s', fontSize: 12, fill: 0x9a8868 },
  })
  t.x = x; t.y = y
  scene.addChild(t)
}
