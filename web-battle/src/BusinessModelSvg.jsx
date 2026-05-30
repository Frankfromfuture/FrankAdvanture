import React from 'react'
import { BUSINESS_MODELS } from './game/cards.js'

/**
 * 商业模式（BM）象征性矢量插画
 * ---------------------------------------------------------------------------
 * 取代旧的 /assets/business-modes/*.png。每个 BM 一幅复杂、象征性的矢量场景，
 * 以 viewBox 0..100 绘制，preserveAspectRatio="xMidYMid slice" 实现 object-fit:cover。
 *
 * 优化（v3.3）：
 *  - 全面引入莫兰迪色彩体系（淡雅、低饱和度、高级感）。
 *  - 统一增加蓝图/工程图纸感网格 background 与边框细节，提升复杂度。
 *  - 各场景加入辅助虚线、微标度、坐标点，使其形象、准确、高雅。
 */

// ---- 元信息映射（与 cards.js 保持同步） -----------------------------------
const META = Object.fromEntries(
  BUSINESS_MODELS.map((b) => [b.id, { rarity: b.rarity, hook: b.hook }]),
)

// 莫兰迪色系下的触发类型色条
const HOOK_COLOR = {
  onMonthStart: '#9caec7', // 莫兰迪 烟蓝
  onSettle: '#8eae99',     // 莫兰迪 烟绿
  onCharge: '#cca885',     // 莫兰迪 暖沙
}

// 莫兰迪常用基础色
const COLORS = {
  red: '#B57C7D',
  green: '#8E9F88',
  blue: '#708A9E',
  yellow: '#EBDCB9',
  orange: '#C89E9B',
  dark: '#353238',
  light: '#EAE5DF',
  gray: '#C2BBB2',
  border: 'rgba(255, 255, 255, 0.22)',
}

// ---- 可复用符号原语 -------------------------------------------------------
function Coin({ x, y, r = 8, label = '¥' }) {
  return (
    <g>
      <ellipse cx={x} cy={y + r * 0.5} rx={r} ry={r * 0.35} fill="rgba(0,0,0,0.18)" />
      <circle cx={x} cy={y} r={r} fill="url(#bmGold)" stroke="#7a624d" strokeWidth="1.2" />
      <circle cx={x} cy={y} r={r - 2.2} fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
      <text x={x} y={y + r * 0.36} textAnchor="middle" fontSize={r * 1.05} fontWeight="700"
        fontFamily="Georgia, serif" fill="#604b3a">{label}</text>
    </g>
  )
}

function Card({ x, y, w = 15, h = 21, rot = 0, fill = '#EBEAE5', stroke = '#ACABA6' }) {
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      <rect x={x} y={y} width={w} height={h} rx="2" fill={fill} stroke={stroke} strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width={w - 4} height={h * 0.4} rx="1" fill="#C2CCD6" opacity="0.8" />
      <rect x={x + 3} y={y + h * 0.58} width={w - 6} height="1.5" rx="0.5" fill="#A1AFBC" />
      <rect x={x + 3} y={y + h * 0.58 + 2.8} width={w - 9} height="1.5" rx="0.5" fill="#BAC8D3" />
    </g>
  )
}

function Person({ x, y, s = 1, fill = '#DDD9D4', crown = false }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-6 8 Q-6 -1.5 0 -1.5 Q6 -1.5 6 8 Z" fill={fill} stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />
      <circle cx="0" cy="-6" r="4.2" fill={fill} />
      <circle cx="0" cy="-6" r="4.2" fill="rgba(0,0,0,0.08)" />
      {crown && (
        <path d="M-4 -10 L-2.5 -13.5 L0 -11 L2.5 -13.5 L4 -10 Z"
          fill="#DBC29E" stroke="#8A7355" strokeWidth="0.5" />
      )}
    </g>
  )
}

function Gear({ cx, cy, r, fill = '#8C9C9E', teeth = 8 }) {
  const t = []
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    t.push(
      <rect key={i} x={x - 1.5} y={y - 1.5} width="3" height="3" fill={fill}
        transform={`rotate(${(a * 180) / Math.PI} ${x} ${y})`} />,
    )
  }
  return (
    <g>
      {t}
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle cx={cx} cy={cy} r={r} fill="url(#bmMetal)" opacity="0.4" />
      <circle cx={cx} cy={cy} r={r * 0.35} fill="#272E38" />
    </g>
  )
}

function Star({ cx, cy, r, fill = '#EBDCB9', stroke = '#8A7355' }) {
  const pts = []
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`)
  }
  return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth="0.8" strokeLinejoin="round" />
}

function UpArrow({ x, y, s = 1, fill = '#7FA899' }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 -9 L7 0 L2.5 0 L2.5 10 L-2.5 10 L-2.5 0 L-7 0 Z" fill={fill} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
    </g>
  )
}

function Bars({ x, y, vals = [6, 11, 8, 15], w = 3.6, gap = 2.4, fill = '#7A8B99' }) {
  return (
    <g>
      {vals.map((v, i) => (
        <rect key={i} x={x + i * (w + gap)} y={y - v} width={w} height={v} rx="0.8" fill={fill} />
      ))}
    </g>
  )
}

// ---- 每张 BM 的象征场景 ---------------------------------------------------
const SCENES = {
  // ===== onMonthStart =====
  BM_01: () => ( // 全员 Owner — 关系网 + 皇冠人
    <>
      <path d="M 28 64 L 50 58 L 72 64 Z" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" strokeDasharray="3 3" />
      <line x1="50" y1="26" x2="50" y2="58" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="50" cy="26" r="10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
      <Person x={28} y={64} s={1.4} fill="#D4B8B8" crown />
      <Person x={50} y={58} s={1.7} fill="#E6D5C3" crown />
      <Person x={72} y={64} s={1.4} fill="#C2CBB5" crown />
      <Star cx={50} cy={26} r={6.5} />
      <text x={50} y={91} textAnchor="middle" fontSize="10" fontWeight="700" fill={COLORS.yellow} opacity="0.85">+1 AP</text>
    </>
  ),
  BM_02: () => ( // OKR 对齐 — 准星雷达 + 指引线 + 箭
    <>
      <circle cx={48} cy={50} r={28} fill="rgba(0,0,0,0.22)" stroke="#5D6F7C" strokeWidth="1.6" />
      <circle cx={48} cy={50} r={18} fill="none" stroke="#7A8B99" strokeWidth="1.2" strokeDasharray="3 2" />
      <circle cx={48} cy={50} r={9} fill="rgba(0,0,0,0.15)" stroke="#7A8B99" strokeWidth="1" />
      <line x1="20" y1="50" x2="76" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
      <line x1="48" y1="22" x2="48" y2="78" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
      <circle cx={48} cy={50} r={3.5} fill={COLORS.red} />
      <line x1="14" y1="84" x2="44" y2="54" stroke={COLORS.yellow} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M48 50 L38 52 L44 44 Z" fill={COLORS.yellow} />
      <path d="M14 84 l-4 1 l2 -4 Z" fill="#8C8294" />
    </>
  ),
  BM_05: () => ( // 差异化定位 — 异色突出卡 + 定位轴线
    <>
      <line x1="15" y1="68" x2="85" y2="68" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      <line x1="64" y1="26" x2="64" y2="68" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" strokeDasharray="2 2" />
      <Card x={18} y={42} w={14} h={20} rot={-8} fill="#C2BBB2" stroke="#9A948C" />
      <Card x={34} y={42} w={14} h={20} rot={0} fill="#C2BBB2" stroke="#9A948C" />
      <Card x={55} y={35} w={16} h={23} rot={10} fill={COLORS.orange} stroke={COLORS.red} />
      <Star cx={63} cy={25} r={4.5} fill={COLORS.yellow} stroke="#8A7355" />
    </>
  ),
  BM_14: () => ( // PMO — 甘特进度表 + 连线关系
    <>
      <rect x={22} y={18} width={56} height={64} rx="3" fill="#EAE5DF" stroke="#9F958C" strokeWidth="1.5" />
      <rect x={40} y={13} width={20} height="7" rx="2" fill="#71677C" />
      {/* 虚线背景 */}
      {[28, 38, 48, 58, 68].map((y) => (
        <line key={y} x1={26} y1={y} x2={74} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="0.8" />
      ))}
      <rect x={28} y={28} width={22} height="5" rx="1.5" fill={COLORS.blue} />
      <rect x={38} y={38} width={28} height="5" rx="1.5" fill={COLORS.green} />
      <rect x={28} y={48} width={18} height="5" rx="1.5" fill={COLORS.yellow} />
      <rect x={48} y={58} width={22} height="5" rx="1.5" fill={COLORS.orange} />
      {/* 关联连线 */}
      <path d="M50 33 L54 33 L54 38 L42 38" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      <path d="M46 53 L52 53 L52 58" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" />
      <path d="M30 68 l4 4 l8 -8" fill="none" stroke="#5E7A61" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  BM_15: () => ( // 抓大放小 — 杠杆天平 + 大小砝码
    <>
      <line x1="20" y1="74" x2="80" y2="74" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <polygon points="50,56 46,74 54,74" fill="#6E6478" />
      {/* 天平横梁 */}
      <line x1="32" y1="56" x2="68" y2="60" stroke="#9F958C" strokeWidth="2.2" strokeLinecap="round" />
      {/* 左侧大盘砝码 */}
      <g transform="translate(32 56)">
        <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <circle cx="0" cy="12" r="14" fill="url(#bmGold)" stroke="#8A6E55" strokeWidth="1.2" />
        <text x="0" y="15.5" textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#604b3a">大</text>
      </g>
      {/* 右侧小盘轻质物 */}
      <g transform="translate(68 60)">
        <line x1="0" y1="0" x2="0" y2="12" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <circle cx="0" cy="12" r="7" fill="#8C9C9E" stroke="#5E6B6C" strokeWidth="0.8" />
        <text x="0" y="14.5" textAnchor="middle" fontSize="6.5" fill="#FFF">小</text>
      </g>
    </>
  ),
  BM_03: () => ( // 降本增效 — 剪刀裁剪虚线 + 硬币
    <>
      <Coin x={62} y={42} r={13} label="¥" />
      <path d="M 15 50 H 75" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeDasharray="3 3" />
      <g transform="translate(24 32)">
        <path d="M0 10 L26 24 M0 38 L26 24" stroke={COLORS.red} strokeWidth="3" strokeLinecap="round" />
        <circle cx="0" cy="8" r="4.5" fill="none" stroke={COLORS.red} strokeWidth="2.5" />
        <circle cx="0" cy="40" r="4.5" fill="none" stroke={COLORS.red} strokeWidth="2.5" />
        <circle cx="26" cy="24" r="1.5" fill="#EAE5DF" />
      </g>
      <UpArrow x={62} y={74} s={0.7} fill={COLORS.green} />
    </>
  ),
  BM_04: () => ( // 精益创业 — MVP火箭 + 闭环循环圈
    <>
      {/* 闭环虚线圈 */}
      <path d="M 48 52 m -24 0 a 24 16 0 1 1 48 0 a 24 16 0 1 1 -48 0" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.4" strokeDasharray="4 3" />
      <UpArrow x={72} y={50} s={0.65} fill={COLORS.green} />
      {/* 飞箭 */}
      <g transform="rotate(18 48 42)">
        <path d="M48 16 C57 28 57 45 49 56 L47 56 C39 45 39 28 48 16 Z" fill="#EAE5DF" stroke="#9F958C" strokeWidth="1.2" />
        <circle cx="48" cy="32" r="4" fill={COLORS.blue} />
        <path d="M41 52 l-6 5 M55 52 l6 5" stroke="#9F958C" strokeWidth="1.5" />
        <path d="M45 57 q3 10 6 0" fill={COLORS.orange} />
      </g>
    </>
  ),
  BM_16: () => ( // 007 — 手牌扇面 + 墨镜领结
    <>
      <g transform="translate(4 -4)">
        <Card x={12} y={50} w={13} h={18} rot={-22} fill="#DDD9D4" />
        <Card x={22} y={47} w={13} h={18} rot={-10} fill="#DDD9D4" />
        <Card x={32} y={46} w={13} h={18} rot={2} fill="#DDD9D4" />
        <Card x={42} y={47} w={13} h={18} rot={14} fill="#DDD9D4" />
      </g>
      <g transform="translate(10 0)">
        <circle cx={58} cy={34} r={12.5} fill="#2E2A27" />
        <path d="M47 30 a6 4 0 0 1 9 0 M60 30 a6 4 0 0 1 9 0" fill="#0B0E11" stroke="#4A4540" strokeWidth="1" />
        <path d="M54 44 L58 49 L62 44 Z" fill={COLORS.red} />
        <path d="M51 47 L58 50 L65 47 L62 55 L54 55 Z" fill="#1A181C" />
      </g>
    </>
  ),
  BM_17: () => ( // Sprint 冲刺 — 秒表精细刻度 + 速度线
    <>
      <circle cx={50} cy={54} r={23.5} fill="rgba(0,0,0,0.22)" stroke="#C2BBB2" strokeWidth="2" />
      <circle cx={50} cy={54} r={19.5} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      {/* 刻度点 */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <line key={deg} x1={50 + Math.cos(deg * Math.PI / 180) * 21} y1={54 + Math.sin(deg * Math.PI / 180) * 21}
          x2={50 + Math.cos(deg * Math.PI / 180) * 23.5} y2={54 + Math.sin(deg * Math.PI / 180) * 23.5}
          stroke="#C2BBB2" strokeWidth="1" />
      ))}
      <rect x={46} y={24} width={8} height="6" rx="1.5" fill="#C2BBB2" />
      <line x1={50} y1={54} x2={50} y2={37} stroke={COLORS.red} strokeWidth="2" strokeLinecap="round" />
      <line x1={50} y1={54} x2={62} y2={57} stroke={COLORS.yellow} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={50} cy={54} r={2.5} fill="#FFF" />
      {/* 速度感飞线 */}
      <path d="M12 40 h14 M9 50 h11 M13 60 h10" stroke={COLORS.blue} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  BM_18: () => ( // 数据驱动 — 数据网格 + 折线图 + 放大镜
    <>
      <rect x={18} y={23} width={54} height={44} rx="3" fill="#2E2A27" stroke="#4A4540" strokeWidth="1.5" />
      {/* 网格底纹 */}
      {[29, 35, 41, 47, 53, 59].map((y) => (
        <line key={y} x1={20} y1={y} x2={70} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" />
      ))}
      <Bars x={24} y={61} vals={[7, 13, 9, 17, 12, 19]} fill={COLORS.blue} w={3.2} gap={2} />
      <path d="M24 51 L31 43 L37 47 L45 37 L52 41 L59 31" fill="none" stroke={COLORS.yellow} strokeWidth="1.8" strokeLinecap="round" />
      {/* 放大镜 */}
      <circle cx={65} cy={61} r={8.5} fill="none" stroke="#EAE5DF" strokeWidth="2.5" />
      <line x1={71} y1={67} x2={80} y2={76} stroke="#EAE5DF" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  BM_19: () => ( // 中台建设 — 层叠平台 + 数据交换连线
    <>
      <rect x={20} y={62} width={60} height="8" rx="1.5" fill="#4A4540" />
      <rect x={26} y={50} width={48} height="8" rx="1.5" fill="#5E6B6C" />
      <rect x={32} y={38} width={36} height="8" rx="1.5" fill="#7A8B99" />
      <rect x={44} y={26} width={12} height="8" rx="1.5" fill={COLORS.orange} />
      {/* 连接轴与流通点 */}
      <line x1="30" y1="70" x2="30" y2="44" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="2 2" />
      <line x1="70" y1="70" x2="70" y2="44" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeDasharray="2 2" />
      <circle cx="30" cy="46" r="2" fill={COLORS.yellow} />
      <circle cx="70" cy="56" r="2" fill={COLORS.yellow} />
    </>
  ),
  BM_20: () => ( // 起立坐下 — 浮动柱梁与升降指示
    <>
      <rect x={20} y={70} width={28} height="5" fill="rgba(0,0,0,0.15)" />
      <rect x={52} y={70} width={28} height="5" fill="rgba(0,0,0,0.15)" />
      <Person x={34} y={64} s={1.4} fill={COLORS.green} />
      <UpArrow x={34} y={35} s={0.8} fill={COLORS.green} />
      <Person x={66} y={67} s={1.15} fill={COLORS.red} />
      {/* 下降箭头 */}
      <g transform="rotate(180 66 31)">
        <path d="M66 22 L72 30 L69 30 L69 38 L63 38 L63 30 L60 30 Z" fill={COLORS.red} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
      </g>
    </>
  ),
  BM_21: () => ( // 砍价式管理 — 挂绳标签 + 剪切折现
    <>
      {/* 吊绳 */}
      <path d="M 45 15 Q 50 28 32 30" fill="none" stroke="#9F958C" strokeWidth="1.2" />
      <path d="M30 28 L60 28 L74 50 L60 72 L30 72 Z" fill="url(#bmGold)" stroke="#7a624d" strokeWidth="1.5" />
      <circle cx={62} cy={50} r={3.5} fill="#2E2A27" />
      <text x={42} y={56} textAnchor="middle" fontSize="16.5" fontWeight="800" fill="#604b3a">%</text>
      <path d="M19 44 L25 50 L19 56" fill="none" stroke={COLORS.red} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 50 h12" stroke={COLORS.red} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  BM_22: () => ( // 凡事 ROI — 微型计算器 + 财务报表背景
    <>
      <path d="M 60 20 L 78 20 M 60 28 L 78 28 M 60 36 L 78 36" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />
      <rect x={20} y={20} width={35} height={56} rx="3.5" fill="#353238" stroke="#4A4540" strokeWidth="1.4" />
      <rect x={24} y={25} width={27} height="11" rx="1.5" fill={COLORS.green} opacity="0.8" />
      <text x={37.5} y={33.5} textAnchor="middle" fontSize="8" fontWeight="700" fill="#2E2A27">ROI</text>
      {/* 计算器按键 */}
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={25.5 + c * 8.5} y={42 + r * 8.5} width="6" height="6" rx="1" fill="#5A565C" />
      )))}
      <Coin x={68} y={61} r={11} label="%" />
    </>
  ),
  BM_23: () => ( // 护城河信徒 — Bricks城堡塔楼 + 双圈护城河
    <>
      {/* 护城河水圈 */}
      <ellipse cx={50} cy={73} rx={34} ry={10} fill="none" stroke={COLORS.blue} strokeWidth="2" opacity="0.6" />
      <ellipse cx={50} cy={72} rx={22} ry={6} fill="none" stroke={COLORS.blue} strokeWidth="1" opacity="0.4" />
      {/* 城堡主体 */}
      <rect x={36} y={34} width={28} height={32} fill="#9CA8AA" stroke="#475569" strokeWidth="1.2" />
      {/* 塔顶堞口 */}
      <path d="M36 34 v-6 h4 v4 h4 v-4 h4 v4 h4 v-4 h4 v4 h4 v-4 h4 v6 Z" fill="#C2CCD6" />
      <rect x={46} y={48} width={8} height={18} rx="2" fill="#272E38" />
      <Star cx={50} cy={20} r={5} />
    </>
  ),

  // ===== onSettle =====
  BM_06: () => ( // 批量涌现 — 漩涡扩散 + 精密多形体
    <>
      <path d="M50 50 m0 0 a15 15 0 1 1 -11 4.5" fill="none" stroke={COLORS.green} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 1" />
      <path d="M50 50 m0 0 a22 22 0 1 1 -16 6" fill="none" stroke={COLORS.green} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx={28} cy={32} r={5.5} fill={COLORS.blue} />
      <rect x={64} y={26} width={9} height={9} rx="1.8" fill={COLORS.yellow} transform="rotate(22 68.5 30.5)" />
      <polygon points="75,56 81,66 69,66" fill={COLORS.orange} />
      <circle cx={27} cy={66} r={4.5} fill="#8C8294" />
      <rect x={69} y={69} width={7.5} height={7.5} rx="1.5" fill={COLORS.green} />
    </>
  ),
  BM_08: () => ( // 工程师文化 — 代码括号 + 旋转嵌套齿轮
    <>
      <text x={24} y={57} fontSize="35" fontWeight="800" fontFamily="monospace" fill={COLORS.blue}>&lt;</text>
      <text x={64} y={57} fontSize="35" fontWeight="800" fontFamily="monospace" fill={COLORS.blue}>&gt;</text>
      <text x={44} y="55" fontSize="23" fontWeight="800" fontFamily="monospace" fill={COLORS.green}>/</text>
      <Gear cx={50} cy={73} r={10} teeth={8} fill="#8C9C9E" />
    </>
  ),
  BM_10: () => ( // 北极星指标 — 罗盘刻度线 + 指针 + 极星
    <>
      {/* 极星定位辐射线 */}
      <circle cx={54} cy={36} r={28} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
      <line x1={22} y1={76} x2={54} y2={36} stroke="#9F958C" strokeWidth="1.4" strokeDasharray="3 3" />
      <Star cx={54} cy={36} r={14} fill={COLORS.yellow} stroke="#A88764" />
      <circle cx={54} cy={36} r={3} fill="#FFF" />
      <circle cx={22} cy={76} r={4.5} fill={COLORS.blue} />
      {[[16, 26], [78, 20], [30, 58], [76, 62]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.2} fill="#FFF" opacity="0.75" />
      ))}
    </>
  ),
  BM_24: () => ( // 销售文化 — 握手机理 + 汇率金币
    <>
      <line x1="16" y1="58" x2="84" y2="58" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="2 2" />
      <path d="M22 51 q10 -10 24 -2 q14 -8 24 2 l-6 8 q-8 -6 -16 0 q-10 -6 -20 0 Z" fill="#DDD9D4" stroke="#9F958C" strokeWidth="1" />
      <rect x={30} y={57} width={36} height="5" rx="2.5" fill="#8E9F88" opacity="0.4" />
      <Coin x={50} y={32} r={11.5} label="¥" />
    </>
  ),
  BM_25: () => ( // 运营驱动 — 齿轮联动链条 + 嵌套字母
    <>
      {/* 传动虚线圈 */}
      <path d="M 42 50 L 68 68" stroke="rgba(255,255,255,0.2)" strokeWidth="1.6" strokeDasharray="3 3" />
      <Gear cx={42} cy={49} r={18} teeth={10} fill="#8C9C9E" />
      <Gear cx={68} cy={67} r={11} teeth={8} fill="#BAC8D3" />
      <text x={42} y={54.5} textAnchor="middle" fontSize="13.5" fontWeight="800" fill="#EAE5DF">O</text>
    </>
  ),
  BM_07: () => ( // 本地部署 DeepSeek — 服务器集群 + 连线芯片 + 鲸鱼背景线
    <>
      {/* 极简鲸鱼曲线背景 */}
      <path d="M 20 65 Q 40 50 60 70 T 90 60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" strokeLinecap="round" />
      <rect x={21} y={21} width={34} height={58} rx="3" fill="#2E2A27" stroke="#4A4540" strokeWidth="1.4" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={25} y={26 + i * 13} width={26} height="8" rx="1.5" fill="#3D453A" stroke="#2E372B" strokeWidth="0.8" />
          <circle cx={29} cy={30 + i * 13} r={1.3} fill={COLORS.green} />
          <circle cx={34} cy={30 + i * 13} r={1.3} fill={COLORS.yellow} />
        </g>
      ))}
      <rect x={60} y={42} width={20} height={20} rx="2" fill={COLORS.blue} stroke="#EAE5DF" strokeWidth="1" />
      <text x={70} y={55} textAnchor="middle" fontSize="9" fontWeight="800" fill="#EAE5DF">AI</text>
      {[44, 50, 56, 62].map((y) => <line key={y} x1={55} y1={y} x2={60} y2={y} stroke="#93c5fd" strokeWidth="1" opacity="0.5" />)}
      {[44, 50, 56, 62].map((y) => <line key={`r${y}`} x1={80} y1={y} x2={85} y2={y} stroke="#93c5fd" strokeWidth="1" opacity="0.5" />)}
    </>
  ),
  BM_09: () => ( // All-in 增长 — 刻线筹码堆叠 + 指引箭头
    <>
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={40} cy={70 - i * 6.5} rx={16} ry={5.5} fill={i % 2 ? COLORS.red : '#353238'} stroke="#fff" strokeWidth="0.6" strokeDasharray="3 2" />
      ))}
      <ellipse cx={40} cy={44} rx={16} ry={5.5} fill={COLORS.yellow} stroke="#8A7355" strokeWidth="1" />
      <UpArrow x={72} y={48} s={1.1} fill={COLORS.green} />
    </>
  ),
  BM_26: () => ( // 飞轮效应 — 重力离心飞轮 + 动量环
    <>
      <circle cx={50} cy={52} r={23} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle cx={50} cy={52} r={23} fill="none" stroke={COLORS.green} strokeWidth="2.5" />
      <circle cx={50} cy={52} r={10} fill="#353238" stroke={COLORS.green} strokeWidth="1.5" />
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return <line key={i} x1={50 + Math.cos(a) * 10} y1={52 + Math.sin(a) * 10} x2={50 + Math.cos(a) * 21} y2={52 + Math.sin(a) * 21} stroke={COLORS.green} strokeWidth="1.8" />
      })}
      <path d="M70 30 a26 26 0 0 1 7 14" fill="none" stroke={COLORS.yellow} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M77 44 l1 -5 l-5 1.5 Z" fill={COLORS.yellow} />
    </>
  ),
  BM_27: () => ( // 产品经理至上 — 线框UI背景 + 皇冠人 + 思考灯泡
    <>
      {/* UI线框底图 */}
      <rect x={18} y={20} width={28} height={20} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <line x1={18} y1={25} x2={46} y2={25} stroke="rgba(255,255,255,0.08)" strokeWidth="0.8" />
      <Person x={44} y={64} s={1.7} fill="#C2CBB5" crown />
      <circle cx={70} cy={34} r={9.5} fill={COLORS.yellow} stroke="#A88764" strokeWidth="1.2" />
      <rect x={66.5} y={42.5} width={7} height="4" rx="1" fill="#708A9E" />
      <path d="M66 33.5 q4 -5.5 8 0" fill="none" stroke="#A88764" strokeWidth="1" />
    </>
  ),
  BM_28: () => ( // 颠覆式创新 2.0 — 实验室烧瓶 + 突破斜率折线
    <>
      {/* 网格基线 */}
      <line x1="20" y1="68" x2="84" y2="68" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <path d="M42 24 h12 v9 L63 56 a7 7 0 0 1 -6 11 h-16 a7 7 0 0 1 -6 -11 L42 33 Z" fill={COLORS.green} stroke="#4A5859" strokeWidth="1.4" opacity="0.85" />
      <rect x={40} y={20} width={16} height="5" rx="1.5" fill="#7A8B99" />
      <circle cx={42} cy={60} r={2} fill="#FFF" opacity="0.6" />
      <circle cx={50} cy={64} r={1.5} fill="#FFF" opacity="0.6" />
      <path d="M68 68 L75 38 L81 50 L89 20" fill="none" stroke={COLORS.yellow} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  BM_29: () => ( // 现金牛矩阵 — BCG二乘二格网 + 奶牛头 + 钱币
    <>
      <rect x={18} y={18} width={38} height={38} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3 3" />
      <line x1={37} y1={18} x2={37} y2={56} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" strokeDasharray="2 2" />
      <line x1={18} y1={37} x2={56} y2={37} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" strokeDasharray="2 2" />
      <ellipse cx={56} cy={59} rx={19} ry={12} fill="#EAE5DF" stroke="#9F958C" strokeWidth="1.2" />
      <circle cx={44} cy={53} r={4.5} fill="#EAE5DF" stroke="#9F958C" strokeWidth="1" />
      <path d="M40 49 q-3 -3 -1.5 -6 M48 49 q3 -3 1.5 -6" stroke="#9F958C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx={42.5} cy={53} r={0.8} fill="#2E2A27" />
      <Coin x={74} y={38} r={9} label="¥" />
    </>
  ),
  BM_30: () => ( // 政委巡查 — 徽章盾牌 + 检查镜
    <>
      <path d="M50 20 L73 30 V50 Q73 68 50 78 Q27 68 27 50 V30 Z" fill="#3D453A" stroke="#6C7A67" strokeWidth="1.5" />
      <Star cx={50} cy={46} r={11.5} fill={COLORS.red} stroke="#9C5B5C" />
      <circle cx={65} cy={65} r={7.5} fill="none" stroke={COLORS.yellow} strokeWidth="2" />
      <line x1={70} y1={70} x2={79} y2={79} stroke={COLORS.yellow} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  BM_31: () => ( // 永远微笑制 — 莫兰迪微笑太阳 + 快乐光芒
    <>
      <circle cx={50} cy={52} r={25} fill="url(#bmGold)" stroke="#8A6E55" strokeWidth="1.5" />
      <circle cx={41} cy={46} r={3} fill="#4E3E2C" />
      <circle cx={59} cy={46} r={3} fill="#4E3E2C" />
      <path d="M38 57 q12 12 24 0" fill="none" stroke="#4E3E2C" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M78 26 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 l4 -2 Z" fill="#FFF" opacity="0.8" />
    </>
  ),
  BM_32: () => ( // 20% 副业制 — 饼图拆分面 + 创意发光
    <>
      <circle cx={46} cy={52} r={23} fill="#4A4540" />
      <path d="M46 52 L46 29 A23 23 0 0 1 66 63 Z" fill="#6E6478" />
      <path d="M46 52 L46 29 A23 23 0 0 0 25 63 Z" fill={COLORS.yellow} opacity="0.95" />
      <text x={36} y={70} textAnchor="middle" fontSize="10" fontWeight="800" fill="#604b3a">20%</text>
      <circle cx={75} cy={30} r={8} fill={COLORS.yellow} stroke="#A88764" strokeWidth="1" />
      <rect x={72} y={37} width={6} height="3.5" rx="1" fill="#7A8B99" />
    </>
  ),
  BM_33: () => ( // 持有到老 — 古典沙漏 + 闪耀琢面钻石
    <>
      <path d="M32 23 H60 L46 49 Z M32 77 H60 L46 51 Z" fill="#EAE5DF" stroke="#9F958C" strokeWidth="1.5" />
      <rect x={28} y={19} width={36} height="4.5" rx="1.5" fill="#5A565C" />
      <rect x={28} y={76.5} width={36} height="4.5" rx="1.5" fill="#5A565C" />
      <path d="M40 36 L52 36 L46 49 Z" fill={COLORS.yellow} />
      {/* 钻石 */}
      <path d="M62 58 l8 -10 l8 10 l-8 12 Z" fill="#B4CCD6" stroke="#5D6F7C" strokeWidth="1" />
      <path d="M62 58 h16 M70 48 v22" stroke="#5D6F7C" strokeWidth="0.6" />
    </>
  ),

  // ===== onCharge =====
  BM_12: () => ( // ESG 报告 — 自然叶片 + 地球仪 + 结构文档
    <>
      <rect x={23} y={25} width={35} height={48} rx="2.5" fill="#EAE5DF" stroke="#9F958C" strokeWidth="1.2" />
      <rect x={28} y={31} width={25} height="2.5" rx="1" fill="#9F958C" />
      <rect x={28} y={37} width={18} height="2.5" rx="1" fill="#C2BBB2" />
      <circle cx={63} cy={59} r={13.5} fill={COLORS.blue} stroke="#EAE5DF" strokeWidth="1.2" />
      <path d="M53 59 q10 -6 20 0 M57 51 q6 16 0 16" fill="none" stroke="#EAE5DF" strokeWidth="0.8" />
      <path d="M39 59 q-7 -13 7 -17 q0 15 -7 17 Z" fill={COLORS.green} stroke="#5E7A61" strokeWidth="1" />
    </>
  ),
  BM_34: () => ( // 券商进场 — 华尔街金牛 + 上行阴阳烛
    <>
      <path d="M29 44 q-7 -9 -2 -15 q5 3.5 7 11 M59 44 q7 -9 2 -15 q-5 3.5 -7 11" fill="#EAE5DF" stroke="#9F958C" strokeWidth="1.2" />
      <ellipse cx={44} cy={53} rx={17} ry={13} fill="#EAE5DF" stroke="#9F958C" strokeWidth="1.2" />
      <circle cx={38} cy={49} r={1.5} fill="#353238" />
      <circle cx={50} cy={49} r={1.5} fill="#353238" />
      <path d="M38 60 q5 4.5 11 0" stroke="#9F958C" strokeWidth="1.4" fill="none" />
      {/* 蜡烛图 */}
      <g>
        <rect x={68} y={46} width={4.5} height={15} fill={COLORS.green} /><line x1={70.2} y1={40} x2={70.2} y2={65} stroke={COLORS.green} strokeWidth="1.2" />
        <rect x={77} y={34} width={4.5} height={17} fill={COLORS.green} /><line x1={79.2} y1={28} x2={79.2} y2={55} stroke={COLORS.green} strokeWidth="1.2" />
      </g>
    </>
  ),
  BM_35: () => ( // PR 公关战 — 扬声广播 + 辐射声波圈
    <>
      <path d="M24 45 L39 45 L56 31 L56 69 L39 55 L24 55 Z" fill={COLORS.yellow} stroke="#A88764" strokeWidth="1.5" />
      <rect x={20} y={45} width={5.5} height={11} rx="1.5" fill="#A88764" />
      <path d="M62 37 q9 13 0 26 M67 31 q15 19 0 38 M72 25 q21 25 0 50" fill="none" stroke="#EAE5DF" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
    </>
  ),
  BM_36: () => ( // 使命愿景价值观 — 地图坐标网 + 誓言红旗
    <>
      {/* 坐标线 */}
      <circle cx={50} cy={50} r={32} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <line x1={30} y1={18} x2={30} y2={82} stroke="#7A8B99" strokeWidth="2.5" />
      <path d="M30 22 L70 22 L62 33 L70 44 L30 44 Z" fill={COLORS.red} stroke="#9C5B5C" strokeWidth="1.2" />
      <Star cx={43} cy={33} r={5.5} fill={COLORS.yellow} stroke="#A88764" />
      <rect x={36} y={54} width={34} height="5.5" rx="2.5" fill="#C2BBB2" />
      <rect x={40} y={64} width={26} height="5.5" rx="2.5" fill="#9F958C" />
    </>
  ),
  BM_38: () => ( // 延链补链强链 — 扣合环锁 + 升级提振
    <>
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={28 + i * 19} cy={50} rx={10.5} ry={6.5}
          fill="none" stroke={i === 1 ? COLORS.yellow : '#9F958C'} strokeWidth="3.6"
          transform={`rotate(${i % 2 ? 45 : -45} ${28 + i * 19} 50)`} />
      ))}
      <UpArrow x={76} y={35} s={0.7} fill={COLORS.green} />
    </>
  ),
  BM_39: () => ( // PPT 战略顾问 — 投影屏幕 + 结构指标
    <>
      <rect x={18} y={21} width={54} height={38} rx="2.5" fill="#2E2A27" stroke="#4A4540" strokeWidth="1.5" />
      <Bars x={24} y={53} vals={[6, 11, 8, 14]} fill={COLORS.blue} w={3.2} gap={2} />
      <path d="M44 47 L53 34 L59 40" fill="none" stroke={COLORS.yellow} strokeWidth="1.8" strokeLinecap="round" />
      <line x1={45} y1={59} x2={45} y2={75} stroke="#9F958C" strokeWidth="2" />
      <line x1={37} y1={75} x2={53} y2={75} stroke="#9F958C" strokeWidth="2" strokeLinecap="round" />
      <line x1={67} y1={70} x2={56} y2={49} stroke="#EAE5DF" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  BM_13: () => ( // 反脆弱 — 金属重装盾牌 + 弹性上行
    <>
      <path d="M50 19 L73 29 V50 Q73 69 50 78 Q27 69 27 50 V29 Z" fill="url(#bmMetal)" stroke="#5E6B6C" strokeWidth="1.5" />
      {/* 弹簧回弹折线 */}
      <path d="M40 50 l5 -7 l-3 0 l5 -7 l-3 0 l5 -7" fill="none" stroke={COLORS.yellow} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <UpArrow x={56} y={50} s={0.75} fill={COLORS.green} />
    </>
  ),
  BM_37: () => ( // All Hands 大会 — 众志成城举手 + 会议话筒
    <>
      <circle cx={50} cy={29} r={7.5} fill="#353238" stroke="#9F958C" strokeWidth="1.2" />
      <rect x={47} y={35} width={6} height={13} rx="2.5" fill="#7A8B99" />
      {[28, 44, 60, 72].map((x, i) => (
        <path key={i} d={`M${x} 80 v-15 q0 -3 3 -3 q3 0 3 3 v15`} fill="#DDD9D4" stroke="#9F958C" strokeWidth="1" />
      ))}
      <path d="M43 48 q7 5 14 0" stroke={COLORS.yellow} strokeWidth="1.6" fill="none" />
    </>
  ),
  BM_11: () => ( // 颠覆式创新 — 循环箭头 + 落地闪电
    <>
      <path d="M50 23 a25 25 0 1 1 -23 15.5" fill="none" stroke={COLORS.orange} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M50 23 l-8 -5.5 l2.5 10 Z" fill={COLORS.orange} />
      <path d="M53 36 L41 53 L49 53 L43 69 L60 48 L51 48 Z" fill={COLORS.yellow} stroke="#A88764" strokeWidth="0.8" />
    </>
  ),
  BM_40: () => ( // 四宫格战略 — BCG精细划分 + 四象限文字暗示
    <>
      <rect x={20} y={20} width={52} height={52} rx="3" fill="#2E2A27" stroke="#4A4540" strokeWidth="1.5" />
      <line x1={46} y1={20} x2={46} y2={72} stroke="#4A4540" strokeWidth="1.2" />
      <line x1={20} y1={46} x2={72} y2={46} stroke="#4A4540" strokeWidth="1.2" />
      <Star cx={33} cy={33} r={6.5} />
      <ellipse cx={59} cy={34} rx={8} ry={5.5} fill="#EAE5DF" />
      <text x={33} y={62} textAnchor="middle" fontSize="15" fontWeight="800" fill={COLORS.blue}>?</text>
      <path d="M55 56 q5 -2.5 9 1.5 l-1.5 5.5 h-7.5 Z" fill="#A88764" />
    </>
  ),

  __default: () => (
    <>
      <circle cx={50} cy={50} r={20} fill="#4A4540" stroke="#9F958C" strokeWidth="1.8" />
      <text x={50} y={56.5} textAnchor="middle" fontSize="19" fontWeight="800" fill="#EAE5DF">BM</text>
    </>
  ),
}

export function BusinessModelSvg({ id, className }) {
  const meta = META[id] || { rarity: 'common', hook: 'onMonthStart' }
  const scene = SCENES[id] || SCENES.__default
  const hookColor = HOOK_COLOR[meta.hook] || '#C2BBB2'
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* 莫兰迪金色渐变 */}
        <linearGradient id="bmGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6D5C3" />
          <stop offset="0.5" stopColor="#C4A482" />
          <stop offset="1" stopColor="#9E7F60" />
        </linearGradient>
        {/* 莫兰迪金属渐变 */}
        <linearGradient id="bmMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E2E7E9" />
          <stop offset="0.5" stopColor="#9CA8AA" />
          <stop offset="1" stopColor="#5E6B6C" />
        </linearGradient>
        
        {/* 莫兰迪稀有度背景径向渐变 */}
        <radialGradient id="bmBg-common" cx="0.5" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#5D6F7C" />
          <stop offset="1" stopColor="#2D353C" />
        </radialGradient>
        <radialGradient id="bmBg-rare" cx="0.5" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#6E7B68" />
          <stop offset="1" stopColor="#313A2E" />
        </radialGradient>
        <radialGradient id="bmBg-elite" cx="0.5" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#71677C" />
          <stop offset="1" stopColor="#332D3B" />
        </radialGradient>
        <radialGradient id="bmBg-epic" cx="0.5" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#9C7373" />
          <stop offset="1" stopColor="#4A3434" />
        </radialGradient>
        <radialGradient id="bmBg-legendary" cx="0.5" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#A88764" />
          <stop offset="1" stopColor="#4E3E2D" />
        </radialGradient>
        
        {/* 蓝图网格背景图样 */}
        <pattern id="bmGrid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.4" />
        </pattern>
        
        <radialGradient id="bmVignette" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0.55" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.52)" />
        </radialGradient>
      </defs>
      
      {/* 稀有度渐变背景 */}
      <rect width="100" height="100" fill={`url(#bmBg-${meta.rarity})`} />
      
      {/* 蓝图/规划工程网格底纹 */}
      <rect width="100" height="100" fill="url(#bmGrid)" />
      
      {/* 精细虚线内框 */}
      <rect x="5" y="5" width="90" height="90" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.6" strokeDasharray="3 3" />
      
      {/* 四角边角刻度标记 */}
      <path d="M 8 13 L 8 8 L 13 8" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
      <path d="M 92 13 L 92 8 L 87 8" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
      <path d="M 8 87 L 8 92 L 13 92" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
      <path d="M 92 87 L 92 92 L 87 92" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
      
      {/* 十字对齐标尺线 */}
      <line x1="50" y1="5" x2="50" y2="8" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1="50" y1="92" x2="50" y2="95" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1="5" y1="50" x2="8" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1="92" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      
      {/* 极简工程文本标注 */}
      <text x="10" y="89" fontSize="2.8" fontFamily="monospace" fill="rgba(255,255,255,0.2)" letterSpacing="0.2">MODEL // {id}</text>
      <text x="90" y="89" fontSize="2.8" fontFamily="monospace" fill="rgba(255,255,255,0.2)" textAnchor="end">FRAME // V3.2</text>
      
      {/* 稍微向上平移以平衡底部标字空间的主画面 */}
      <g transform="translate(0 -1.5)">
        {scene()}
      </g>
      
      {/* 暗角与遮罩 */}
      <rect width="100" height="100" fill="url(#bmVignette)" pointerEvents="none" />
      
      {/* 底时序特征色条 */}
      <rect x="0" y="96" width="100" height="4" fill={hookColor} opacity="0.92" />
    </svg>
  )
}
