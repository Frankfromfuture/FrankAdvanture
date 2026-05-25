import React from 'react'

/**
 * 五个像素风立体卡包 SVG。
 * 共用一个 2.5D 盒型框架（顶面 + 正面 + 右侧面 + 底阴影），不同 variant 替换配色与正面图案。
 *
 * viewBox 64×80, 所有形状对齐 2px 网格，shape-rendering=crispEdges 保留像素硬边。
 */

const VARIANTS = {
  // 研发包 - 蓝 - 烧杯 + 分子粒
  rd: {
    top: '#93c5fd',
    front: '#2563eb',
    side: '#1e3a8a',
    dark: '#0c1f47',
    seal: '#fbbf24',
    sealMark: '#7c2d12',
    pattern: (
      <g shapeRendering="crispEdges">
        {/* 烧杯瓶身 */}
        <rect x="22" y="46" width="20" height="20" fill="#dbeafe" />
        <rect x="20" y="46" width="2" height="20" fill="#dbeafe" />
        <rect x="42" y="46" width="2" height="20" fill="#dbeafe" />
        {/* 瓶口 */}
        <rect x="24" y="42" width="16" height="4" fill="#dbeafe" />
        <rect x="22" y="44" width="20" height="2" fill="#dbeafe" />
        {/* 液体 */}
        <rect x="22" y="56" width="20" height="10" fill="#22d3ee" />
        <rect x="20" y="56" width="2" height="10" fill="#22d3ee" />
        <rect x="42" y="56" width="2" height="10" fill="#22d3ee" />
        {/* 气泡 */}
        <rect x="28" y="58" width="2" height="2" fill="#dbeafe" />
        <rect x="34" y="60" width="2" height="2" fill="#dbeafe" />
        <rect x="30" y="62" width="2" height="2" fill="#dbeafe" />
        {/* 上方分子点 */}
        <rect x="14" y="20" width="2" height="2" fill="#dbeafe" />
        <rect x="48" y="22" width="2" height="2" fill="#dbeafe" />
        <rect x="32" y="16" width="2" height="2" fill="#dbeafe" />
      </g>
    ),
  },

  // 销售包 - 红 - 喇叭 + 上升箭头
  sales: {
    top: '#fca5a5',
    front: '#dc2626',
    side: '#7f1d1d',
    dark: '#450a0a',
    seal: '#fbbf24',
    sealMark: '#7c2d12',
    pattern: (
      <g shapeRendering="crispEdges">
        {/* 喇叭口（左大右小，朝右上方喊话） */}
        <rect x="14" y="42" width="2" height="14" fill="#fee2e2" />
        <rect x="16" y="44" width="2" height="10" fill="#fee2e2" />
        <rect x="18" y="46" width="14" height="6" fill="#fee2e2" />
        {/* 喇叭手柄 */}
        <rect x="32" y="48" width="4" height="2" fill="#fff" />
        {/* 声波线（向右斜射） */}
        <rect x="38" y="40" width="4" height="2" fill="#fff" />
        <rect x="40" y="42" width="2" height="2" fill="#fff" />
        <rect x="42" y="46" width="4" height="2" fill="#fff" />
        <rect x="46" y="48" width="2" height="2" fill="#fff" />
        <rect x="38" y="54" width="4" height="2" fill="#fff" />
        <rect x="40" y="56" width="2" height="2" fill="#fff" />
        {/* 上升箭头柱 */}
        <rect x="20" y="62" width="2" height="4" fill="#fde047" />
        <rect x="26" y="58" width="2" height="8" fill="#fde047" />
        <rect x="32" y="54" width="2" height="12" fill="#fde047" />
        <rect x="38" y="50" width="2" height="16" fill="#fde047" />
        {/* 箭头尖 */}
        <rect x="42" y="22" width="2" height="2" fill="#fde047" />
        <rect x="40" y="24" width="6" height="2" fill="#fde047" />
        <rect x="42" y="26" width="2" height="6" fill="#fde047" />
      </g>
    ),
  },

  // 运营包 - 绿 - 大齿轮
  ops: {
    top: '#86efac',
    front: '#16a34a',
    side: '#14532d',
    dark: '#052e16',
    seal: '#fbbf24',
    sealMark: '#7c2d12',
    pattern: (
      <g shapeRendering="crispEdges">
        {/* 齿轮齿牙 (12 颗) */}
        <rect x="30" y="32" width="4" height="4" fill="#dcfce7" />
        <rect x="30" y="64" width="4" height="4" fill="#dcfce7" />
        <rect x="16" y="48" width="4" height="4" fill="#dcfce7" />
        <rect x="44" y="48" width="4" height="4" fill="#dcfce7" />
        <rect x="20" y="36" width="4" height="4" fill="#dcfce7" />
        <rect x="40" y="36" width="4" height="4" fill="#dcfce7" />
        <rect x="20" y="60" width="4" height="4" fill="#dcfce7" />
        <rect x="40" y="60" width="4" height="4" fill="#dcfce7" />
        {/* 齿轮主体圆 */}
        <rect x="24" y="38" width="16" height="2" fill="#dcfce7" />
        <rect x="22" y="40" width="20" height="2" fill="#dcfce7" />
        <rect x="20" y="42" width="24" height="12" fill="#dcfce7" />
        <rect x="22" y="54" width="20" height="2" fill="#dcfce7" />
        <rect x="24" y="56" width="16" height="2" fill="#dcfce7" />
        {/* 中心孔 */}
        <rect x="28" y="44" width="8" height="8" fill="#14532d" />
        <rect x="30" y="42" width="4" height="2" fill="#14532d" />
        <rect x="30" y="52" width="4" height="2" fill="#14532d" />
      </g>
    ),
  },

  // 服务包 - 紫 - 公文包 + 西装条纹
  srv: {
    top: '#d8b4fe',
    front: '#9333ea',
    side: '#581c87',
    dark: '#3b0764',
    seal: '#fde68a',
    sealMark: '#7c2d12',
    pattern: (
      <g shapeRendering="crispEdges">
        {/* 西装细条纹 */}
        <rect x="10" y="22" width="2" height="44" fill="#7e22ce" opacity="0.55" />
        <rect x="20" y="22" width="2" height="44" fill="#7e22ce" opacity="0.55" />
        <rect x="44" y="22" width="2" height="44" fill="#7e22ce" opacity="0.55" />
        <rect x="54" y="22" width="2" height="44" fill="#7e22ce" opacity="0.55" />
        {/* 公文包手柄 */}
        <rect x="28" y="40" width="8" height="2" fill="#f5d0fe" />
        <rect x="26" y="42" width="2" height="2" fill="#f5d0fe" />
        <rect x="36" y="42" width="2" height="2" fill="#f5d0fe" />
        {/* 公文包本体 */}
        <rect x="22" y="44" width="20" height="18" fill="#f5d0fe" />
        {/* 中央扣 */}
        <rect x="30" y="50" width="4" height="2" fill="#581c87" />
        <rect x="28" y="52" width="8" height="2" fill="#581c87" />
        <rect x="30" y="54" width="4" height="2" fill="#581c87" />
        {/* 包面分割线 */}
        <rect x="22" y="48" width="20" height="1" fill="#9333ea" />
      </g>
    ),
  },

  // 工具包 - 橙 - 交叉扳手与锤子
  tools: {
    top: '#fdba74',
    front: '#ea580c',
    side: '#7c2d12',
    dark: '#431407',
    seal: '#fbbf24',
    sealMark: '#7c2d12',
    pattern: (
      <g shapeRendering="crispEdges">
        {/* 扳手 (\方向) */}
        <rect x="14" y="38" width="4" height="4" fill="#fde047" />
        <rect x="16" y="42" width="4" height="4" fill="#fde047" />
        <rect x="14" y="44" width="2" height="2" fill="#fde047" />
        <rect x="20" y="44" width="2" height="4" fill="#fde047" />
        <rect x="22" y="46" width="2" height="4" fill="#fde047" />
        <rect x="24" y="48" width="2" height="4" fill="#fde047" />
        <rect x="26" y="50" width="2" height="4" fill="#fde047" />
        <rect x="28" y="52" width="2" height="4" fill="#fde047" />
        <rect x="30" y="54" width="2" height="4" fill="#fde047" />
        <rect x="32" y="56" width="2" height="4" fill="#fde047" />
        <rect x="34" y="58" width="4" height="4" fill="#fde047" />
        <rect x="36" y="62" width="2" height="2" fill="#fde047" />
        {/* 锤子 (/方向) 头 */}
        <rect x="40" y="36" width="6" height="4" fill="#e5e7eb" />
        <rect x="42" y="34" width="6" height="2" fill="#e5e7eb" />
        <rect x="46" y="36" width="2" height="4" fill="#9ca3af" />
        {/* 锤柄 */}
        <rect x="38" y="40" width="2" height="2" fill="#92400e" />
        <rect x="36" y="42" width="2" height="2" fill="#92400e" />
        <rect x="34" y="44" width="2" height="2" fill="#92400e" />
        <rect x="32" y="46" width="2" height="2" fill="#92400e" />
        <rect x="30" y="48" width="2" height="2" fill="#92400e" />
        <rect x="28" y="50" width="2" height="2" fill="#92400e" />
        <rect x="26" y="52" width="2" height="2" fill="#92400e" />
        <rect x="24" y="54" width="2" height="2" fill="#92400e" />
        <rect x="22" y="56" width="2" height="2" fill="#92400e" />
        <rect x="20" y="58" width="2" height="2" fill="#92400e" />
      </g>
    ),
  },

  // 神秘包 - 金黄色 - 问号
  mystery: {
    top: '#fef08a',
    front: '#eab308',
    side: '#a16207',
    dark: '#451a03',
    seal: '#ef4444',
    sealMark: '#991b1b',
    pattern: (
      <g shapeRendering="crispEdges">
        <rect x="26" y="32" width="12" height="4" fill="#ffffff" />
        <rect x="24" y="36" width="4" height="6" fill="#ffffff" />
        <rect x="36" y="36" width="4" height="10" fill="#ffffff" />
        <rect x="30" y="44" width="8" height="4" fill="#ffffff" />
        <rect x="28" y="48" width="4" height="4" fill="#ffffff" />
        <rect x="28" y="56" width="4" height="4" fill="#ffffff" />
      </g>
    ),
  },
}

export function PackBox3D({ variant = 'rd' }) {
  const v = VARIANTS[variant] ?? VARIANTS.rd
  return (
    <svg
      viewBox="0 0 64 80"
      xmlns="http://www.w3.org/2000/svg"
      className="pack-box-svg"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* 底部投影 */}
      <rect x="4" y="74" width="56" height="4" fill="rgba(0,0,0,0.45)" />

      {/* 右侧面 (深色，制造立体感) */}
      <polygon points="56,16 62,10 62,72 56,78" fill={v.side} />
      <rect x="56" y="76" width="6" height="2" fill={v.dark} />

      {/* 顶面 (斜视，菱形 → 简化为平行四边形) */}
      <polygon points="8,16 14,10 62,10 56,16" fill={v.top} />
      {/* 顶面接缝高光 */}
      <polygon points="10,15 14,11 60,11 56,15" fill="rgba(255,255,255,0.18)" />

      {/* 正面主体 */}
      <rect x="8" y="16" width="48" height="62" fill={v.front} />

      {/* 正面图案区域 */}
      {v.pattern}

      {/* 顶部撕拉口锯齿 */}
      <g shapeRendering="crispEdges">
        <rect x="8" y="20" width="48" height="2" fill={v.dark} />
        <rect x="10" y="22" width="2" height="2" fill={v.dark} />
        <rect x="14" y="22" width="2" height="2" fill={v.dark} />
        <rect x="18" y="22" width="2" height="2" fill={v.dark} />
        <rect x="22" y="22" width="2" height="2" fill={v.dark} />
        <rect x="26" y="22" width="2" height="2" fill={v.dark} />
        <rect x="30" y="22" width="2" height="2" fill={v.dark} />
        <rect x="34" y="22" width="2" height="2" fill={v.dark} />
        <rect x="38" y="22" width="2" height="2" fill={v.dark} />
        <rect x="42" y="22" width="2" height="2" fill={v.dark} />
        <rect x="46" y="22" width="2" height="2" fill={v.dark} />
        <rect x="50" y="22" width="2" height="2" fill={v.dark} />
        <rect x="54" y="22" width="2" height="2" fill={v.dark} />
      </g>

      {/* 中央封印贴纸 */}
      <g shapeRendering="crispEdges">
        <rect x="22" y="68" width="20" height="6" fill={v.seal} />
        <rect x="20" y="69" width="2" height="4" fill={v.seal} />
        <rect x="42" y="69" width="2" height="4" fill={v.seal} />
        {/* 封印星标 */}
        <rect x="30" y="69" width="4" height="2" fill={v.sealMark} />
        <rect x="28" y="71" width="8" height="2" fill={v.sealMark} />
      </g>

      {/* 左侧高光柱 (光源左上) */}
      <rect x="8" y="16" width="2" height="62" fill="rgba(255,255,255,0.22)" />
      {/* 右侧深色（接缝阴影） */}
      <rect x="54" y="16" width="2" height="62" fill="rgba(0,0,0,0.25)" />
      {/* 底部阴影 */}
      <rect x="8" y="76" width="48" height="2" fill={v.dark} />
    </svg>
  )
}
