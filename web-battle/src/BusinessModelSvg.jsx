import React from 'react'
import { BUSINESS_MODELS } from './game/cards.js'

/**
 * 商业模式（BM）象征性矢量插画
 * ---------------------------------------------------------------------------
 * 取代旧的 /assets/business-modes/*.png。每个 BM 一幅复杂、象征性的矢量场景，
 * 以 viewBox 0..100 绘制，preserveAspectRatio="xMidYMid slice" 实现 object-fit:cover。
 *
 * 结构：
 *  - 顶层 <defs> 共享渐变（金/银/纸/玻璃 + 5 档稀有度背景 + 暗角）
 *  - 一组可复用符号原语（硬币 / 卡牌 / 小人 / 齿轮 / 星 / 上升箭头 / 柱状图）
 *  - SCENES[id] 组合原语成每张 BM 的专属象征画面
 *  - 底部 4px 色条标记触发时机（月初/结算/充能）
 */

// ---- 元信息映射（与 cards.js 保持同步） -----------------------------------
const META = Object.fromEntries(
  BUSINESS_MODELS.map((b) => [b.id, { rarity: b.rarity, hook: b.hook }]),
)
const HOOK_COLOR = {
  onMonthStart: '#c4b5fd',
  onSettle: '#6ee7b7',
  onCharge: '#fbbf24',
}

// ---- 可复用符号原语 -------------------------------------------------------
function Coin({ x, y, r = 8, label = '¥' }) {
  return (
    <g>
      <ellipse cx={x} cy={y + r * 0.5} rx={r} ry={r * 0.35} fill="rgba(0,0,0,0.35)" />
      <circle cx={x} cy={y} r={r} fill="url(#bmGold)" stroke="#7c5e10" strokeWidth="1.4" />
      <circle cx={x} cy={y} r={r - 2.5} fill="none" stroke="#fff7cf" strokeWidth="1" opacity="0.8" />
      <text x={x} y={y + r * 0.38} textAnchor="middle" fontSize={r * 1.1} fontWeight="700"
        fontFamily="Georgia, serif" fill="#7c5e10">{label}</text>
    </g>
  )
}

function Card({ x, y, w = 16, h = 22, rot = 0, fill = '#f4f6fb', stroke = '#c7cfdb' }) {
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx="2.5" fill={fill} stroke={stroke} strokeWidth="1.2" />
      <rect x={x + 2} y={y + 2.5} width={w - 4} height={h * 0.42} rx="1.4" fill="#cdd6e6" opacity="0.85" />
      <rect x={x + 3} y={y + h * 0.62} width={w - 8} height="1.8" rx="0.9" fill="#94a3b8" />
      <rect x={x + 3} y={y + h * 0.62 + 3.4} width={w - 11} height="1.8" rx="0.9" fill="#b6c0cf" />
    </g>
  )
}

function Person({ x, y, s = 1, fill = '#e5e7eb', crown = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-7 9 Q-7 -2 0 -2 Q7 -2 7 9 Z" fill={fill} />
      <circle cx="0" cy="-7" r="4.6" fill={fill} />
      <circle cx="0" cy="-7" r="4.6" fill="rgba(0,0,0,0.12)" />
      {crown && (
        <path d="M-5 -11.5 L-3.2 -15.5 L0 -12.8 L3.2 -15.5 L5 -11.5 Z"
          fill="#facc15" stroke="#a16207" strokeWidth="0.5" />
      )}
    </g>
  )
}

function Gear({ cx, cy, r, fill = '#9aa6b6', teeth = 8 }) {
  const t = []
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    t.push(
      <rect key={i} x={x - 1.7} y={y - 1.7} width="3.4" height="3.4" fill={fill}
        transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} />,
    )
  }
  return (
    <g>
      {t}
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle cx={cx} cy={cy} r={r} fill="url(#bmMetal)" opacity="0.55" />
      <circle cx={cx} cy={cy} r={r * 0.36} fill="#11161f" />
    </g>
  )
}

function Star({ cx, cy, r, fill = '#facc15', stroke = '#a16207' }) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`)
  }
  return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth="0.8" strokeLinejoin="round" />
}

function UpArrow({ x, y, s = 1, fill = '#34d399' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -10 L8 0 L3 0 L3 11 L-3 11 L-3 0 L-8 0 Z" fill={fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
    </g>
  )
}

function Bars({ x, y, vals = [6, 11, 8, 15], w = 4, gap = 2.5, fill = '#60a5fa' }) {
  return (
    <g>
      {vals.map((v, i) => (
        <rect key={i} x={x + i * (w + gap)} y={y - v} width={w} height={v} rx="1" fill={fill} />
      ))}
    </g>
  )
}

// ---- 每张 BM 的象征场景 ---------------------------------------------------
const SCENES = {
  // ===== onMonthStart =====
  BM_01: () => ( // 全员 Owner — 人人戴皇冠
    <>
      <Person x={28} y={64} s={1.5} fill="#dbeafe" crown />
      <Person x={50} y={58} s={1.8} fill="#fde68a" crown />
      <Person x={72} y={64} s={1.5} fill="#fecaca" crown />
      <Star cx={50} cy={26} r={6} />
      <text x={50} y={90} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff7cf" opacity="0.9">+1</text>
    </>
  ),
  BM_02: () => ( // OKR 对齐 — 靶心+箭
    <>
      <circle cx={48} cy={50} r={28} fill="#1f2937" stroke="#475569" strokeWidth="2" />
      <circle cx={48} cy={50} r={19} fill="none" stroke="#94a3b8" strokeWidth="2" />
      <circle cx={48} cy={50} r={10} fill="#ef4444" />
      <circle cx={48} cy={50} r={4} fill="#fff" />
      <line x1={14} y1={84} x2={48} y2={50} stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 50 L40 50 L46 44 Z" fill="#facc15" />
      <path d="M14 84 l-5 1 l3 -5 Z" fill="#c4b5fd" />
    </>
  ),
  BM_05: () => ( // 差异化定位 — 一张异色卡
    <>
      <Card x={20} y={42} w={15} h={20} rot={-6} fill="#cbd5e1" />
      <Card x={36} y={42} w={15} h={20} rot={0} fill="#cbd5e1" />
      <Card x={56} y={36} w={17} h={24} rot={9} fill="#f472b6" stroke="#9d174d" />
      <Star cx={64} cy={26} r={5} fill="#f9a8d4" stroke="#9d174d" />
    </>
  ),
  BM_14: () => ( // PMO — 甘特图夹板
    <>
      <rect x={24} y={20} width={52} height={62} rx="4" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.6" />
      <rect x={40} y={15} width={20} height="8" rx="3" fill="#64748b" />
      <rect x={30} y={32} width={26} height="5" rx="2.5" fill="#60a5fa" />
      <rect x={38} y={42} width={30} height="5" rx="2.5" fill="#34d399" />
      <rect x={30} y={52} width={20} height="5" rx="2.5" fill="#fbbf24" />
      <path d="M30 64 l4 4 l8 -9" fill="none" stroke="#22c55e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  BM_15: () => ( // 抓大放小 — 大球 + 小球
    <>
      <circle cx={40} cy={54} r={22} fill="url(#bmGold)" stroke="#7c5e10" strokeWidth="1.6" />
      <text x={40} y={60} textAnchor="middle" fontSize="20" fontWeight="800" fill="#7c5e10">大</text>
      <circle cx={74} cy={70} r={9} fill="#94a3b8" opacity="0.7" />
      <text x={74} y={74} textAnchor="middle" fontSize="9" fill="#1f2937">小</text>
    </>
  ),
  BM_03: () => ( // 降本增效 — 剪刀剪成本
    <>
      <Coin x={62} y={42} r={13} label="¥" />
      <path d="M22 30 L48 46 M22 62 L48 46" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
      <circle cx={20} cy={28} r={5} fill="none" stroke="#cbd5e1" strokeWidth="3" />
      <circle cx={20} cy={64} r={5} fill="none" stroke="#cbd5e1" strokeWidth="3" />
      <UpArrow x={66} y={74} s={0.7} fill="#34d399" />
    </>
  ),
  BM_04: () => ( // 精益创业 — MVP 火箭 + 循环
    <>
      <path d="M48 18 C58 30 58 48 50 60 L46 60 C38 48 38 30 48 18 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.4" />
      <circle cx={48} cy={36} r={4.5} fill="#60a5fa" />
      <path d="M40 56 l-8 8 M56 56 l8 8" stroke="#94a3b8" strokeWidth="2" />
      <path d="M44 62 q4 12 8 0" fill="#fb923c" />
      <path d="M28 78 a18 10 0 1 0 40 0" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeDasharray="4 3" />
    </>
  ),
  BM_16: () => ( // 007 — 特工：领结+墨镜，囤满手牌
    <>
      <Card x={18} y={48} w={14} h={20} rot={-16} fill="#e2e8f0" />
      <Card x={30} y={46} w={14} h={20} rot={-6} fill="#e2e8f0" />
      <Card x={42} y={45} w={14} h={20} rot={4} fill="#e2e8f0" />
      <circle cx={62} cy={34} r={13} fill="#1f2937" />
      <path d="M51 30 a6 5 0 0 1 9 0 M64 30 a6 5 0 0 1 9 0" fill="#0b0f17" stroke="#334155" strokeWidth="1.2" />
      <path d="M58 44 L62 49 L66 44 Z" fill="#ef4444" />
      <path d="M55 47 L62 50 L69 47 L66 56 L58 56 Z" fill="#111827" />
    </>
  ),
  BM_17: () => ( // Sprint 冲刺 — 秒表 + 速度线
    <>
      <circle cx={50} cy={54} r={24} fill="#1f2937" stroke="#cbd5e1" strokeWidth="2.4" />
      <rect x={45} y={22} width={10} height="7" rx="2" fill="#cbd5e1" />
      <line x1={50} y1={54} x2={50} y2={36} stroke="#ef4444" strokeWidth="2.6" strokeLinecap="round" />
      <line x1={50} y1={54} x2={63} y2={58} stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx={50} cy={54} r={3} fill="#fff" />
      <path d="M10 44 h14 M8 54 h12 M12 64 h12" stroke="#60a5fa" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  BM_18: () => ( // 数据驱动 — 仪表盘 + 放大镜
    <>
      <rect x={20} y={26} width={50} height={42} rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.6" />
      <Bars x={26} y={60} vals={[8, 14, 10, 18, 13]} fill="#34d399" />
      <path d="M26 50 L34 44 L42 48 L50 38 L58 42" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <circle cx={64} cy={64} r={9} fill="none" stroke="#cbd5e1" strokeWidth="3" />
      <line x1={70} y1={70} x2={80} y2={80} stroke="#cbd5e1" strokeWidth="3.4" strokeLinecap="round" />
    </>
  ),
  BM_19: () => ( // 中台建设 — 居中平台/层叠
    <>
      <rect x={22} y={60} width={56} height="9" rx="2" fill="#475569" />
      <rect x={28} y={48} width={44} height="9" rx="2" fill="#64748b" />
      <rect x={34} y={36} width={32} height="9" rx="2" fill="#94a3b8" />
      <rect x={44} y={24} width={12} height="9" rx="2" fill="#c4b5fd" />
      <line x1={32} y1={69} x2={32} y2={45} stroke="#334155" strokeWidth="2" />
      <line x1={68} y1={69} x2={68} y2={45} stroke="#334155" strokeWidth="2" />
    </>
  ),
  BM_20: () => ( // 起立坐下 — 一升一降
    <>
      <Person x={34} y={66} s={1.5} fill="#86efac" />
      <UpArrow x={34} y={36} s={0.9} fill="#22c55e" />
      <Person x={66} y={68} s={1.2} fill="#fca5a5" />
      <path d="M66 40 L74 30 L69 30 L69 22 L63 22 L63 30 L58 30 Z" fill="#ef4444" transform="rotate(180 66 31)" />
    </>
  ),
  BM_21: () => ( // 砍价式管理 — 价签 + 下降%
    <>
      <path d="M30 28 L60 28 L74 50 L60 72 L30 72 Z" fill="url(#bmGold)" stroke="#7c5e10" strokeWidth="1.6" />
      <circle cx={62} cy={50} r={4} fill="#1f2937" />
      <text x={42} y={56} textAnchor="middle" fontSize="16" fontWeight="800" fill="#7c5e10">%</text>
      <path d="M20 44 L26 50 L20 56" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 50 h12" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  BM_22: () => ( // 凡事 ROI — 计算器 + 硬币
    <>
      <rect x={22} y={22} width={36} height={56} rx="4" fill="#1f2937" stroke="#64748b" strokeWidth="1.6" />
      <rect x={27} y={27} width={26} height="11" rx="2" fill="#34d399" opacity="0.85" />
      <text x={40} y={36} textAnchor="middle" fontSize="8" fontWeight="700" fill="#0f172a">ROI</text>
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={28 + c * 9} y={44 + r * 9} width="6.5" height="6.5" rx="1.3" fill="#475569" />
      )))}
      <Coin x={68} y={62} r={11} label="%" />
    </>
  ),
  BM_23: () => ( // 护城河信徒 — 城堡 + 护城河
    <>
      <ellipse cx={50} cy={74} rx={34} ry={11} fill="#1d4ed8" opacity="0.55" />
      <ellipse cx={50} cy={72} rx={22} ry={6} fill="#3b82f6" opacity="0.6" />
      <rect x={36} y={34} width={28} height={32} fill="#94a3b8" stroke="#475569" strokeWidth="1.4" />
      <path d="M36 34 v-6 h4 v4 h4 v-4 h4 v4 h4 v-4 h4 v4 h4 v-4 h4 v6 Z" fill="#cbd5e1" />
      <rect x={46} y={48} width={8} height={18} rx="3" fill="#1f2937" />
      <Star cx={50} cy={22} r={5} />
    </>
  ),

  // ===== onSettle =====
  BM_06: () => ( // 批量涌现 — 漩涡涌出形状
    <>
      <path d="M50 52 m0 0 a14 14 0 1 1 -10 4" fill="none" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
      <circle cx={30} cy={34} r={5} fill="#60a5fa" />
      <rect x={64} y={28} width={9} height={9} rx="2" fill="#fbbf24" transform="rotate(20 68 32)" />
      <polygon points="74,58 80,68 68,68" fill="#f472b6" />
      <circle cx={28} cy={66} r={4} fill="#c4b5fd" />
      <rect x={70} y={70} width={7} height={7} rx="1.6" fill="#34d399" />
    </>
  ),
  BM_08: () => ( // 工程师文化 — 代码括号 + 齿轮
    <>
      <text x={26} y={58} fontSize="34" fontWeight="800" fontFamily="monospace" fill="#60a5fa">&lt;</text>
      <text x={62} y={58} fontSize="34" fontWeight="800" fontFamily="monospace" fill="#60a5fa">&gt;</text>
      <text x={42} y="56" fontSize="22" fontWeight="800" fontFamily="monospace" fill="#34d399">/</text>
      <Gear cx={50} cy={74} r={9} teeth={8} fill="#9aa6b6" />
    </>
  ),
  BM_10: () => ( // 北极星指标 — 北极星 + 指针
    <>
      <Star cx={54} cy={36} r={15} fill="#fef08a" stroke="#ca8a04" />
      <circle cx={54} cy={36} r={4} fill="#fffbeb" />
      <path d="M22 78 L54 36" stroke="#94a3b8" strokeWidth="1.6" strokeDasharray="3 3" />
      <circle cx={22} cy={78} r={4} fill="#60a5fa" />
      {[[18, 30], [80, 24], [30, 60], [78, 64]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.4} fill="#fff" opacity="0.8" />
      ))}
    </>
  ),
  BM_24: () => ( // 销售文化 — 握手 + 硬币
    <>
      <path d="M22 50 q10 -10 24 -2 q14 -8 24 2 l-6 8 q-8 -6 -16 0 q-10 -6 -20 0 Z" fill="#fcd9b8" stroke="#b08968" strokeWidth="1.2" />
      <rect x={30} y={56} width={36} height="6" rx="3" fill="#a16207" opacity="0.5" />
      <Coin x={50} y={34} r={11} label="¥" />
    </>
  ),
  BM_25: () => ( // 运营驱动 — 大齿轮带小齿轮
    <>
      <Gear cx={44} cy={52} r={18} teeth={10} fill="#9aa6b6" />
      <Gear cx={70} cy={70} r={11} teeth={8} fill="#cbd5e1" />
      <text x={44} y={57} textAnchor="middle" fontSize="13" fontWeight="800" fill="#cbd5e1">O</text>
    </>
  ),
  BM_07: () => ( // 本地部署 DeepSeek — 服务器机架 + AI 芯片 + 鲸
    <>
      <rect x={24} y={22} width={34} height={56} rx="4" fill="#0f172a" stroke="#475569" strokeWidth="1.6" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={28} y={27 + i * 12} width={26} height="9" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
          <circle cx={32} cy={31.5 + i * 12} r={1.6} fill="#34d399" />
          <circle cx={37} cy={31.5 + i * 12} r={1.6} fill="#fbbf24" />
        </g>
      ))}
      <rect x={62} y={44} width={20} height={20} rx="3" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1.4" />
      <text x={72} y={58} textAnchor="middle" fontSize="9" fontWeight="800" fill="#dbeafe">AI</text>
      {[44, 50, 56, 62].map((y) => <line key={y} x1={58} y1={y} x2={62} y2={y} stroke="#93c5fd" strokeWidth="1.2" />)}
      {[44, 50, 56, 62].map((y) => <line key={`r${y}`} x1={82} y1={y} x2={86} y2={y} stroke="#93c5fd" strokeWidth="1.2" />)}
    </>
  ),
  BM_09: () => ( // All-in 增长 — 筹码全押
    <>
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={40} cy={70 - i * 7} rx={16} ry={6} fill={i % 2 ? '#ef4444' : '#1f2937'} stroke="#fff" strokeWidth="1" strokeDasharray="3 3" />
      ))}
      <ellipse cx={40} cy={42} rx={16} ry={6} fill="#facc15" stroke="#7c5e10" strokeWidth="1.2" />
      <UpArrow x={72} y={50} s={1.1} fill="#22c55e" />
    </>
  ),
  BM_26: () => ( // 飞轮效应 — 飞轮 + 动量箭头
    <>
      <circle cx={50} cy={52} r={24} fill="none" stroke="#6ee7b7" strokeWidth="5" />
      <circle cx={50} cy={52} r={11} fill="#1f2937" stroke="#6ee7b7" strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return <line key={i} x1={50 + Math.cos(a) * 11} y1={52 + Math.sin(a) * 11} x2={50 + Math.cos(a) * 22} y2={52 + Math.sin(a) * 22} stroke="#34d399" strokeWidth="2.4" />
      })}
      <path d="M70 30 a26 26 0 0 1 6 14" fill="none" stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M76 44 l1 -6 l-6 2 Z" fill="#fbbf24" />
    </>
  ),
  BM_27: () => ( // 产品经理至上 — PM 戴冠 + 灯泡
    <>
      <Person x={44} y={66} s={1.8} fill="#a7f3d0" crown />
      <circle cx={70} cy={34} r={10} fill="#fde68a" stroke="#ca8a04" strokeWidth="1.4" />
      <rect x={66} y={43} width={8} height="5" rx="1.5" fill="#64748b" />
      <path d="M66 33 q4 -6 8 0" fill="none" stroke="#ca8a04" strokeWidth="1.4" />
    </>
  ),
  BM_28: () => ( // 颠覆式创新 2.0 — 烧瓶 + 突破折线
    <>
      <path d="M42 24 h12 v10 l10 24 a8 8 0 0 1 -7 12 h-18 a8 8 0 0 1 -7 -12 l10 -24 Z" fill="#a7f3d0" stroke="#15803d" strokeWidth="1.6" opacity="0.9" />
      <rect x={40} y={20} width={16} height="6" rx="2" fill="#64748b" />
      <circle cx={42} cy={62} r={2.6} fill="#22c55e" />
      <circle cx={50} cy={66} r={2} fill="#22c55e" />
      <path d="M70 70 L78 40 L84 52 L92 22" fill="none" stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" transform="translate(-6 0)" />
    </>
  ),
  BM_29: () => ( // 现金牛牛矩阵 — 牛 + 硬币 + 四宫格暗示
    <>
      <rect x={20} y={20} width={40} height={40} fill="none" stroke="#475569" strokeWidth="1.2" strokeDasharray="3 3" />
      <line x1={40} y1={20} x2={40} y2={60} stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
      <line x1={20} y1={40} x2={60} y2={40} stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
      <ellipse cx={58} cy={60} rx={20} ry={13} fill="#e5e7eb" stroke="#475569" strokeWidth="1.4" />
      <circle cx={46} cy={54} r={5} fill="#e5e7eb" stroke="#475569" strokeWidth="1.2" />
      <path d="M42 50 q-4 -3 -2 -7 M50 50 q4 -3 2 -7" stroke="#94a3b8" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx={44} cy={54} r={1} fill="#1f2937" />
      <Coin x={74} y={40} r={9} label="¥" />
    </>
  ),
  BM_30: () => ( // 政委巡查 — 徽章/星 + 放大镜
    <>
      <path d="M50 22 L74 32 V52 Q74 70 50 80 Q26 70 26 52 V32 Z" fill="#1f2937" stroke="#94a3b8" strokeWidth="1.6" />
      <Star cx={50} cy={48} r={12} fill="#f87171" stroke="#7f1d1d" />
      <circle cx={66} cy={66} r={7} fill="none" stroke="#fde68a" strokeWidth="2.6" />
      <line x1={71} y1={71} x2={80} y2={80} stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  BM_31: () => ( // 永远微笑制 — 大笑脸 + 闪光
    <>
      <circle cx={50} cy={52} r={26} fill="url(#bmGold)" stroke="#a16207" strokeWidth="1.8" />
      <circle cx={40} cy={46} r={3.4} fill="#1f2937" />
      <circle cx={60} cy={46} r={3.4} fill="#1f2937" />
      <path d="M38 58 q12 14 24 0" fill="none" stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
      <path d="M78 26 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#fff7cf" />
    </>
  ),
  BM_32: () => ( // 20% 副业制 — 饼图 20% + 灯泡
    <>
      <circle cx={46} cy={52} r={24} fill="#334155" />
      <path d="M46 52 L46 28 A24 24 0 0 1 67 64 Z" fill="#475569" />
      <path d="M46 52 L46 28 A24 24 0 0 0 25 64 Z" fill="#fbbf24" opacity="0.9" />
      <text x={36} y={70} textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff7cf">20%</text>
      <circle cx={76} cy={30} r={8} fill="#fde68a" stroke="#ca8a04" strokeWidth="1.2" />
      <rect x={73} y={37} width={6} height="4" rx="1.2" fill="#64748b" />
    </>
  ),
  BM_33: () => ( // 持有到老 — 沙漏 + 钻石
    <>
      <path d="M32 24 H60 L46 50 Z M32 80 H60 L46 54 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.6" />
      <rect x={28} y={20} width={36} height="5" rx="2" fill="#64748b" />
      <rect x={28} y={79} width={36} height="5" rx="2" fill="#64748b" />
      <path d="M40 38 L52 38 L46 50 Z" fill="#fbbf24" />
      <path d="M62 58 l8 -10 l8 10 l-8 12 Z" fill="#67e8f9" stroke="#0e7490" strokeWidth="1.2" />
      <path d="M62 58 h16 M70 48 v22" stroke="#0e7490" strokeWidth="0.8" />
    </>
  ),

  // ===== onCharge =====
  BM_12: () => ( // ESG 报告 — 叶 + 地球 + 文档
    <>
      <rect x={24} y={26} width={36} height={50} rx="3" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.4" />
      <rect x={29} y={33} width={26} height="3" rx="1.5" fill="#94a3b8" />
      <rect x={29} y={40} width={20} height="3" rx="1.5" fill="#cbd5e1" />
      <circle cx={64} cy={60} r={14} fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1.4" />
      <path d="M54 60 q10 -6 20 0 M58 52 q6 16 0 16" fill="none" stroke="#93c5fd" strokeWidth="1" />
      <path d="M40 60 q-8 -14 8 -18 q0 16 -8 18 Z" fill="#22c55e" stroke="#14532d" strokeWidth="1.2" />
    </>
  ),
  BM_34: () => ( // 券商进场 — 公牛 + 上行蜡烛
    <>
      <path d="M30 44 q-8 -10 -2 -16 q6 4 8 12 M62 44 q8 -10 2 -16 q-6 4 -8 12" fill="#e5e7eb" stroke="#475569" strokeWidth="1.4" />
      <ellipse cx={46} cy={54} rx={18} ry={14} fill="#e5e7eb" stroke="#475569" strokeWidth="1.4" />
      <circle cx={40} cy={50} r={1.6} fill="#1f2937" />
      <circle cx={52} cy={50} r={1.6} fill="#1f2937" />
      <path d="M40 62 q6 5 12 0" stroke="#94a3b8" strokeWidth="1.6" fill="none" />
      <g>
        <rect x={70} y={48} width={5} height={16} fill="#22c55e" /><line x1={72.5} y1={42} x2={72.5} y2={68} stroke="#22c55e" strokeWidth="1.4" />
        <rect x={80} y={36} width={5} height={18} fill="#22c55e" /><line x1={82.5} y1={30} x2={82.5} y2={58} stroke="#22c55e" strokeWidth="1.4" />
      </g>
    </>
  ),
  BM_35: () => ( // PR 公关战 — 喇叭 + 声波
    <>
      <path d="M24 46 L40 46 L58 32 L58 72 L40 58 L24 58 Z" fill="#fbbf24" stroke="#a16207" strokeWidth="1.6" />
      <rect x={20} y={46} width={6} height={12} rx="2" fill="#a16207" />
      <path d="M64 38 q10 14 0 28 M70 32 q16 20 0 40" fill="none" stroke="#fde68a" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  BM_36: () => ( // 使命愿景价值观 — 旗帜 + 标语
    <>
      <line x1={30} y1={18} x2={30} y2={82} stroke="#64748b" strokeWidth="3" />
      <path d="M30 22 L74 22 L66 34 L74 46 L30 46 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.4" />
      <Star cx={44} cy={34} r={6} fill="#fff7cf" stroke="#ca8a04" />
      <rect x={36} y={56} width={36} height="6" rx="3" fill="#cbd5e1" />
      <rect x={40} y={66} width={28} height="6" rx="3" fill="#94a3b8" />
    </>
  ),
  BM_38: () => ( // 延链补链强链 — 锁链相扣
    <>
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={30 + i * 20} cy={50 + (i % 2 ? 0 : 0)} rx={11} ry={7}
          fill="none" stroke={i === 1 ? '#fbbf24' : '#94a3b8'} strokeWidth="4"
          transform={`rotate(${i % 2 ? 50 : -50} ${30 + i * 20} 50)`} />
      ))}
      <UpArrow x={78} y={36} s={0.7} fill="#22c55e" />
    </>
  ),
  BM_39: () => ( // PPT 战略顾问 — 投影板 + 指针
    <>
      <rect x={20} y={22} width={56} height={40} rx="3" fill="#0f172a" stroke="#64748b" strokeWidth="1.6" />
      <Bars x={27} y={56} vals={[7, 12, 9, 15]} fill="#60a5fa" />
      <path d="M48 50 L58 36 L64 42" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
      <line x1={48} y1={62} x2={48} y2={78} stroke="#64748b" strokeWidth="2.4" />
      <line x1={40} y1={78} x2={56} y2={78} stroke="#64748b" strokeWidth="2.4" strokeLinecap="round" />
      <line x1={70} y1={74} x2={58} y2={52} stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  BM_13: () => ( // 反脆弱 — 盾 + 弹簧/上行
    <>
      <path d="M50 20 L74 30 V52 Q74 72 50 82 Q26 72 26 52 V30 Z" fill="url(#bmMetal)" stroke="#64748b" strokeWidth="1.8" />
      <path d="M40 52 l6 -8 l-4 0 l6 -8 l-4 0 l6 -8" fill="none" stroke="#fbbf24" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <UpArrow x={56} y={52} s={0.8} fill="#22c55e" />
    </>
  ),
  BM_37: () => ( // All Hands 大会 — 举起的手 + 话筒
    <>
      <circle cx={50} cy={30} r={8} fill="#1f2937" stroke="#94a3b8" strokeWidth="1.4" />
      <rect x={47} y={36} width={6} height={14} rx="3" fill="#64748b" />
      {[30, 46, 62].map((x, i) => (
        <path key={i} d={`M${x} 80 v-16 q0 -4 4 -4 q4 0 4 4 v16`} fill="#fcd9b8" stroke="#b08968" strokeWidth="1.2" />
      ))}
      <path d="M44 50 q6 6 12 0" stroke="#fde68a" strokeWidth="2" fill="none" />
    </>
  ),
  BM_11: () => ( // 颠覆式创新 — 循环箭头 + 闪电（复用产线）
    <>
      <path d="M50 24 a26 26 0 1 1 -24 16" fill="none" stroke="#fb923c" strokeWidth="5" strokeLinecap="round" />
      <path d="M50 24 l-8 -6 l2 11 Z" fill="#fb923c" />
      <path d="M54 38 L42 56 L50 56 L44 72 L62 50 L53 50 Z" fill="#fde047" stroke="#a16207" strokeWidth="1" />
    </>
  ),
  BM_40: () => ( // 四宫格战略 — 2x2：星/牛/问号/狗
    <>
      <rect x={24} y={24} width={52} height={52} rx="4" fill="#0f172a" stroke="#64748b" strokeWidth="1.6" />
      <line x1={50} y1={24} x2={50} y2={76} stroke="#64748b" strokeWidth="1.4" />
      <line x1={24} y1={50} x2={76} y2={50} stroke="#64748b" strokeWidth="1.4" />
      <Star cx={37} cy={37} r={7} />
      <ellipse cx={63} cy={38} rx={9} ry={6} fill="#e5e7eb" />
      <text x={37} y={67} textAnchor="middle" fontSize="16" fontWeight="800" fill="#60a5fa">?</text>
      <path d="M58 60 q6 -3 10 2 l-2 6 h-8 Z" fill="#a16207" />
    </>
  ),

  __default: () => (
    <>
      <circle cx={50} cy={50} r={22} fill="#334155" stroke="#94a3b8" strokeWidth="2" />
      <text x={50} y={57} textAnchor="middle" fontSize="20" fontWeight="800" fill="#cbd5e1">BM</text>
    </>
  ),
}

export function BusinessModelSvg({ id, className }) {
  const meta = META[id] || { rarity: 'common', hook: 'onMonthStart' }
  const scene = SCENES[id] || SCENES.__default
  const hookColor = HOOK_COLOR[meta.hook] || '#94a3b8'
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bmGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="0.5" stopColor="#facc15" />
          <stop offset="1" stopColor="#b8860b" />
        </linearGradient>
        <linearGradient id="bmMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <radialGradient id="bmBg-common" cx="0.5" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#2b3242" />
          <stop offset="1" stopColor="#12151d" />
        </radialGradient>
        <radialGradient id="bmBg-rare" cx="0.5" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#1d2c46" />
          <stop offset="1" stopColor="#0f1626" />
        </radialGradient>
        <radialGradient id="bmBg-elite" cx="0.5" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#2f2347" />
          <stop offset="1" stopColor="#170f26" />
        </radialGradient>
        <radialGradient id="bmBg-epic" cx="0.5" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#3c2718" />
          <stop offset="1" stopColor="#1b1107" />
        </radialGradient>
        <radialGradient id="bmBg-legendary" cx="0.5" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#403318" />
          <stop offset="1" stopColor="#1d1608" />
        </radialGradient>
        <radialGradient id="bmVignette" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.5)" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#bmBg-${meta.rarity})`} />
      {scene()}
      <rect width="100" height="100" fill="url(#bmVignette)" />
      <rect x="0" y="96" width="100" height="4" fill={hookColor} opacity="0.92" />
    </svg>
  )
}
