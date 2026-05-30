import React from 'react'

/**
 * 服务卡 / 功能卡 / 传奇服务/功能 — 像素插画渲染组件
 * ---------------------------------------------------------------------------
 * 读取在 public/assets/card-portraits/ 下生成的透明像素风卡面 PNG 图像，
 * 并完全填充装入卡牌的插画槽位中。
 */

const SUPPORTED_IDS = new Set([
  // 功能卡 (12张普通 + 2张传奇)
  'FUN_01', 'FUN_02', 'FUN_03', 'FUN_04', 'FUN_05', 'FUN_06', 'FUN_07', 'FUN_08', 'FUN_09', 'FUN_10', 'FUN_11', 'FUN_12',
  'FUN_LEG_01', 'FUN_LEG_02',
  // 服务卡 (10张普通 + 1张传奇)
  'SRV_01', 'SRV_02', 'SRV_03', 'SRV_04', 'SRV_05', 'SRV_06', 'SRV_07', 'SRV_08', 'SRV_09', 'SRV_10',
  'SRV_LEG_01'
])

export function ServiceFunSvg({ cardId }) {
  if (!SUPPORTED_IDS.has(cardId)) return null
  
  const imagePath = `/assets/card-portraits/${cardId}.png`
  
  return (
    <div 
      className="srvfun-image-container"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <img
        src={imagePath}
        alt={cardId}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none'
        }}
      />
    </div>
  )
}

/** 列出当前支持的 cardId（供 fallback 判断） */
export function hasServiceFunSvg(cardId) {
  return SUPPORTED_IDS.has(cardId)
}
