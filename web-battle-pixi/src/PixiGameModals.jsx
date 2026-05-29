// Pixi 化的游戏弹层：结算 / 高光三选一 / 收购奖励 / 终局
// 共享 PixiModalKit 提供的面板/按钮/文本助手
//
// API 与 GameModals.jsx 保持一致，可直接替换

import React from 'react'
import { Graphics } from 'pixi.js'
import { usePixiModal, drawPanel, addText, addButton, M } from './PixiModalKit.jsx'
import { createPixiCard } from './pixiCardView.js'

const CARD_W = 130
const CARD_H = 210

// 把 engine 卡牌实例映射成 pixiCardView 期望字段
function toPixiCard(c) {
  return { ...c, output: c.baseOutput ?? 0, effect: (c.effects ?? []).join(' · ') }
}

// ─── 结算 ───────────────────────────────────────────────────────────────────
export function PixiSettlementModal({ settlement, onClose }) {
  const ref = usePixiModal({
    onRender: (scene, vp) => {
      if (!settlement) return
      const W = 440
      const H = 290
      const x = Math.round((vp.width - W) / 2)
      const y = Math.round((vp.height - H) / 2)
      drawPanel(scene, x, y, W, H)

      const profit = settlement.income - settlement.maintenance
      let cy = y + 20
      addText(scene, `📊 第 ${settlement.month} 月结算`, x + W / 2, cy, { size: 14, color: M.ink, anchor: [0.5, 0] })
      cy += 26

      const row = (label, value, color = M.ink) => {
        addText(scene, label, x + 24, cy, { size: 12, color: M.softInk })
        addText(scene, value, x + W - 24, cy, { size: 12, color, anchor: [1, 0] })
        cy += 16
      }
      row('产线原始收入', `¥${settlement.rawIncome}`)
      row('事件加成后', `¥${settlement.income}`)
      row('月度运营成本', `-¥${settlement.maintenance}`, M.red)
      cy += 4
      const line = new Graphics()
      line.rect(x + 20, cy, W - 40, 1).fill(M.border)
      scene.addChild(line)
      cy += 8
      addText(scene, '本月利润', x + 24, cy, { size: 13, color: M.ink })
      addText(scene, `${profit >= 0 ? '+' : ''}¥${profit}`, x + W - 24, cy, {
        size: 13, color: profit >= 0 ? M.green : M.red, anchor: [1, 0],
      })
      cy += 22
      addText(scene, `AP 使用 ${settlement.usedAp} · 结转 ${settlement.apCarry}`, x + 24, cy, { size: 11, color: M.softInk })
      cy += 18

      if (settlement.lineReports?.length) {
        addText(scene, '产线明细：', x + 24, cy, { size: 11, color: M.softInk })
        cy += 14
        settlement.lineReports.forEach((r) => {
          addText(scene, `产线 ${r.lineId}`, x + 32, cy, { size: 11, color: M.ink })
          addText(scene, `¥${r.total}`, x + W - 24, cy, { size: 11, color: M.ink, anchor: [1, 0] })
          cy += 14
        })
      }

      addButton(scene, {
        x: x + W - 92, y: y + H - 36, w: 72, h: 24,
        label: '确认', primary: true, onClick: onClose,
      })
    },
    deps: [settlement],
  })
  if (!settlement) return null
  return <div ref={ref} />
}

// ─── 高光三选一 ─────────────────────────────────────────────────────────────
export function PixiHighlightPickModal({ candidates, onPick, onSkip }) {
  const ref = usePixiModal({
    onRender: (scene, vp) => {
      if (!candidates?.length) return
      const PAD = 24
      const GAP = 16
      const W = PAD * 2 + candidates.length * CARD_W + (candidates.length - 1) * GAP
      const H = 60 + CARD_H + 60
      const x = Math.round((vp.width - W) / 2)
      const y = Math.round((vp.height - H) / 2)
      drawPanel(scene, x, y, W, H)

      addText(scene, '🎉 高光时刻 · 三选一加入牌堆', x + W / 2, y + 18, { size: 14, color: M.ink, anchor: [0.5, 0] })

      candidates.forEach((c, i) => {
        const cardNode = createPixiCard(toPixiCard(c), {
          width: CARD_W, height: CARD_H, fontTheme: 'fp12', cardStyle: 'namecard',
        })
        cardNode.x = x + PAD + i * (CARD_W + GAP)
        cardNode.y = y + 48
        cardNode.eventMode = 'static'
        cardNode.cursor = 'pointer'
        cardNode.on('pointerover', () => { cardNode.y -= 6 })
        cardNode.on('pointerout', () => { cardNode.y += 6 })
        cardNode.on('pointertap', () => onPick(i))
        scene.addChild(cardNode)
      })

      addButton(scene, {
        x: x + W - 92, y: y + H - 36, w: 72, h: 24,
        label: '跳过', onClick: onSkip,
      })
    },
    deps: [candidates],
  })
  if (!candidates?.length) return null
  return <div ref={ref} />
}

// ─── 收购奖励 ──────────────────────────────────────────────────────────────
export function PixiRivalRewardModal({ rewardLog, cards, onClaim }) {
  const ref = usePixiModal({
    onRender: (scene, vp) => {
      if (!cards?.length) return
      const PAD = 24
      const GAP = 12
      const cardCount = Math.min(cards.length, 3)
      const W = PAD * 2 + cardCount * CARD_W + (cardCount - 1) * GAP
      const H = 70 + CARD_H + 60
      const x = Math.round((vp.width - W) / 2)
      const y = Math.round((vp.height - H) / 2)
      drawPanel(scene, x, y, W, H)

      const title = `📦 收购完成${rewardLog?.rivalName ? ` · ${rewardLog.rivalName}` : ''}`
      addText(scene, title, x + W / 2, y + 18, { size: 14, color: M.ink, anchor: [0.5, 0] })
      addText(scene, `${cards.length} 张卡将加入牌堆`, x + W / 2, y + 42, { size: 11, color: M.softInk, anchor: [0.5, 0] })

      cards.slice(0, cardCount).forEach((c, i) => {
        const cardNode = createPixiCard(toPixiCard(c), {
          width: CARD_W, height: CARD_H, fontTheme: 'fp12', cardStyle: 'namecard',
        })
        cardNode.x = x + PAD + i * (CARD_W + GAP)
        cardNode.y = y + 60
        scene.addChild(cardNode)
      })

      addButton(scene, {
        x: x + W - 92, y: y + H - 36, w: 72, h: 24,
        label: '收下', primary: true, onClick: onClaim,
      })
    },
    deps: [cards, rewardLog],
  })
  if (!cards?.length) return null
  return <div ref={ref} />
}

// ─── 终局 ───────────────────────────────────────────────────────────────────
export function PixiResultModal({ result, onContinue }) {
  const ref = usePixiModal({
    onRender: (scene, vp) => {
      if (!result || result.boardMeeting || result.stagePromotion) return
      const W = 380
      const H = 180
      const x = Math.round((vp.width - W) / 2)
      const y = Math.round((vp.height - H) / 2)
      drawPanel(scene, x, y, W, H)

      addText(scene, '🏁 本关结束', x + W / 2, y + 22, { size: 16, color: M.ink, anchor: [0.5, 0] })
      const message = result.message ?? JSON.stringify(result).slice(0, 80)
      addText(scene, message, x + W / 2, y + 60, { size: 12, color: M.softInk, anchor: [0.5, 0] })

      if (onContinue) {
        addButton(scene, {
          x: x + W - 100, y: y + H - 40, w: 80, h: 26,
          label: '继续', primary: true, onClick: onContinue,
        })
      }
    },
    deps: [result],
  })
  if (!result || result.boardMeeting || result.stagePromotion) return null
  return <div ref={ref} />
}
