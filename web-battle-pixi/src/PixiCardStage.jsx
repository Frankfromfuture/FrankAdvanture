import React, { useEffect, useRef } from 'react'
import { Application, Assets } from 'pixi.js'
import { createPixiCard } from './pixiCardView.js'
import { ensurePixelFontReady } from './pixelFont.js'

const CARD_W = 130
const CARD_H = 210
const GAP   = 18

export function PixiCardStage({ cards, scale = 2, designW, designH, fontTheme = 'zpix', cardStyle = 'standard' }) {
  const hostRef = useRef(null)
  const appRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const host = hostRef.current
    if (!host) return

    // 若未传入画布逻辑尺寸，根据卡牌数量自动计算
    const DW = designW ?? (cards.length * CARD_W + (cards.length - 1) * GAP + 20)
    const DH = designH ?? (CARD_H + 20)

    const app = new Application()
    appRef.current = app

    ;(async () => {
      await app.init({
        width:  DW * scale,
        height: DH * scale,
        background: '#1a1410',
        antialias: false,
        roundPixels: true,
        resolution: 1,
      })
      if (cancelled) {
        app.destroy(true, { children: true, texture: true })
        return
      }
      host.appendChild(app.canvas)

      // 逻辑层容器：所有内容画在 DW×DH 设计像素上，再整数倍放大
      const root = app.stage
      root.scale.set(scale)

      // 并行：预加载肖像 + 烘焙像素字体
      const portraitPaths = cards.map((c) => c.portrait)
      await Promise.all([
        Assets.load(portraitPaths),
        ensurePixelFontReady(),
      ])
      if (cancelled) return

      // 横排居中布局
      const totalW = cards.length * CARD_W + (cards.length - 1) * GAP
      const startX = Math.round((DW - totalW) / 2)
      const baseY  = Math.round((DH - CARD_H) / 2)

      cards.forEach((card, i) => {
        const cardNode = createPixiCard(card, { width: CARD_W, height: CARD_H, fontTheme, cardStyle })
        cardNode.x = startX + i * (CARD_W + GAP)
        cardNode.y = baseY
        root.addChild(cardNode)
      })
    })()

    return () => {
      cancelled = true
      const a = appRef.current
      if (a) {
        try {
          a.destroy(true, { children: true, texture: false })
        } catch (e) {
          // ignore double-destroy
        }
        appRef.current = null
      }
    }
  }, [cards, scale, designW, designH, fontTheme, cardStyle])

  return <div ref={hostRef} />
}
