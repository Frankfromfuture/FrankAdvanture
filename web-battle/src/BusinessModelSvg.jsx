import React from 'react'
import { BUSINESS_MODELS } from './game/cards.js'

/**
 * 商业模式（BM）矢量插画组件（AI 生成图片版本）
 * ---------------------------------------------------------------------------
 * 读取在 public/assets/business-modes/ 下由 AI 生成并被切成正方形的 BM_XX.png 图像，
 * 并完全填充装入 3:2 的卡片槽位中。
 * 底部的 4px 时序条标记触发时机（月初烟蓝/结算烟绿/充能暖沙）。
 */

// ---- 触发类型色条 ----
const HOOK_COLOR = {
  onMonthStart: '#9caec7', // 烟蓝
  onSettle: '#8eae99',     // 烟绿
  onCharge: '#cca885',     // 暖沙
}

const META = Object.fromEntries(
  BUSINESS_MODELS.map((b) => [b.id, { rarity: b.rarity, hook: b.hook }]),
)

export function BusinessModelSvg({ id, className }) {
  const meta = META[id] || { rarity: 'common', hook: 'onMonthStart' }
  const hookColor = HOOK_COLOR[meta.hook] || '#94a3b8'
  const imagePath = `/assets/business-modes/${id}.png`

  return (
    <div 
      className={`bm-image-container ${className}`} 
      style={{ 
        position: 'absolute', 
        inset: 0,
        width: '100%', 
        height: '100%', 
        overflow: 'hidden' 
      }}
    >
      <img 
        src={imagePath} 
        alt={id} 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none'
        }}
      />
      {/* 底部时序特征色条 */}
      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '4px',
          backgroundColor: hookColor,
          opacity: 0.92,
          zIndex: 2
        }}
        aria-hidden="true"
      />
    </div>
  )
}
