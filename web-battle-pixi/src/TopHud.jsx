import React, { useEffect, useRef } from 'react'
import { Application, Container } from 'pixi.js'
import { ensurePixelFontReady } from './pixelFont.js'
import { createBasicInfoContainer, C } from './BasicInfoContainerStage.jsx'

const BLOCK_W = 124
const BLOCK_H = 62
const GAP = 8
const PAD_X = 12
const PAD_Y = 10
const SLOTS = 5
const DW = PAD_X * 2 + BLOCK_W * SLOTS + GAP * (SLOTS - 1)
const DH = PAD_Y * 2 + BLOCK_H + 12 // 留底部阴影空间

export function TopHud({ state, scale = 1 }) {
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
      renderHud()
    })()

    return () => {
      cancelled = true
      const a = appRef.current
      if (a) { try { a.destroy(true, { children: true, texture: false }) } catch {} ; appRef.current = null }
      sceneRef.current = null
      readyRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale])

  useEffect(() => { if (readyRef.current) renderHud() })

  function renderHud() {
    const scene = sceneRef.current
    if (!scene) return
    scene.removeChildren()

    const stageName = state.stage?.name ?? '-'
    const threshold = state.stage?.threshold ?? 0
    const valuation = state.valuation ?? 0
    const valuationStr = threshold > 0 ? `${valuation}/${threshold}` : `${valuation}`
    const profit = state.lastMonthProfit ?? 0
    const profitColor = profit >= 0 ? C.green : C.red
    const profitSign = profit >= 0 ? '+' : ''

    const blocks = [
      { title: `第 ${state.elapsedMonths + 1} 月`,    subtitle: `阶段 · ${stageName}`,       accent: C.gold,  tone: 'light' },
      { title: `¥${state.cash}`,                     subtitle: '可花现金',                  accent: C.green, tone: 'light' },
      { title: `V ${valuationStr}`,                  subtitle: '估值 / 阶段阈值',           accent: C.gold,  tone: 'light' },
      { title: `AP ${state.apAvailable}`,            subtitle: `结转 ${state.apCarry ?? 0}`, accent: C.blue,  tone: 'dark'  },
      { title: `${profitSign}¥${profit}`,            subtitle: '上月利润',                  accent: profitColor, tone: 'light' },
    ]

    blocks.forEach((b, i) => {
      const node = createBasicInfoContainer({
        x: PAD_X + i * (BLOCK_W + GAP),
        y: PAD_Y,
        w: BLOCK_W,
        h: BLOCK_H,
        title: b.title,
        subtitle: b.subtitle,
        accent: b.accent,
        tone: b.tone,
      })
      scene.addChild(node)
    })
  }

  return <div ref={hostRef} />
}
