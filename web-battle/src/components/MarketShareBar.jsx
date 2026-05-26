// 市场份额对决血条
// 像素风、红蓝双向、交界处火焰特效（粒子使用 CSS keyframes，不依赖 Phaser 以保持轻量）
// 详见 boss.md §6.1–6.4

import React, { useEffect, useRef, useState } from 'react'

export function MarketShareBar({ battle, intro = false }) {
  const ref = useRef(null)
  const [shake, setShake] = useState(false)

  // 入场震动一次
  useEffect(() => {
    if (intro) {
      setShake(true)
      const t = setTimeout(() => setShake(false), 700)
      return () => clearTimeout(t)
    }
  }, [intro])

  if (!battle || !battle.active) return null

  const playerShare = Math.max(0, Math.min(100, battle.playerShare ?? 50))
  const rivalShare = 100 - playerShare
  const isDanger = playerShare <= 30
  const isWinning = playerShare >= 70
  const flameIntensity = Math.min(1, Math.abs(battle.lastShareDelta ?? 0) / 10)

  return (
    <div className={`market-share-bar-container${shake ? ' msb-intro' : ''}`} ref={ref}>
      <div className={`market-share-bar${isDanger ? ' msb-danger' : ''}${isWinning ? ' msb-winning' : ''}`}>
        {/* 玩家蓝色侧 */}
        <div
          className="msb-player-fill"
          style={{ width: `${playerShare}%` }}
        >
          <span className="msb-share-pct msb-share-pct--player">{playerShare.toFixed(0)}%</span>
        </div>
        {/* 对手红色侧 */}
        <div
          className="msb-rival-fill"
          style={{ width: `${rivalShare}%` }}
        >
          <span className="msb-share-pct msb-share-pct--rival">{rivalShare.toFixed(0)}%</span>
        </div>
        {/* 交界处火焰 */}
        <div
          className="msb-flame"
          style={{ left: `${playerShare}%`, opacity: 0.4 + flameIntensity * 0.6 }}
        >
          <div className="msb-flame-particle msb-flame-p1" />
          <div className="msb-flame-particle msb-flame-p2" />
          <div className="msb-flame-particle msb-flame-p3" />
          <div className="msb-flame-particle msb-flame-p4" />
          <div className="msb-flame-particle msb-flame-p5" />
          <div className="msb-flame-particle msb-flame-p6" />
          <div className="msb-flame-particle msb-flame-p7" />
          <div className="msb-flame-particle msb-flame-p8" />
          <div className="msb-flame-particle msb-flame-p9" />
          <div className="msb-flame-particle msb-flame-p10" />
          <div className="msb-flame-core-pixel" />
          <div className="msb-flame-glow" />
        </div>
      </div>
      {battle.lastShareDelta != null && Math.abs(battle.lastShareDelta) >= 0.5 && (
        <div
          key={battle.monthsElapsed}
          className={`msb-delta-float${battle.lastShareDelta >= 0 ? ' msb-delta-pos' : ' msb-delta-neg'}`}
          style={{ left: `${playerShare}%` }}
        >
          {battle.lastShareDelta >= 0 ? '+' : ''}{battle.lastShareDelta}%
        </div>
      )}
    </div>
  )
}
