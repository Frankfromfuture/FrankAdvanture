// PixiCardView v2：多字体主题 + 双卡面样式
//
// opts.fontTheme : 'zpix' | 'fp8' | 'fp10' | 'fp12'
// opts.cardStyle : 'standard'（顶条式）| 'namecard'（名片式）

import { Container, Graphics, Sprite, BitmapText, Texture } from 'pixi.js'

export const RARITY_COLORS = {
  common:    { ring: 0x6e6e6e, accent: 0x9a9a9a, bg: 0x2a2520 },
  rare:      { ring: 0x4a90c8, accent: 0x7ec4f5, bg: 0x1c2a35 },
  epic:      { ring: 0xb866d9, accent: 0xd89cf0, bg: 0x2c1c35 },
  elite:     { ring: 0xe09040, accent: 0xf5c478, bg: 0x352620 },
  legendary: { ring: 0xf0c040, accent: 0xfff0a0, bg: 0x352c14 },
}

const RARITY_LABEL = {
  common: 'COMMON', rare: 'RARE', epic: 'EPIC',
  elite: 'ELITE', legendary: 'LEGENDARY',
}

const FONT_THEMES = {
  zpix: { sm: 'Zpix12', smSz: 12, md: 'Zpix16', mdSz: 16, mdLH: 17, lg: 'Zpix24', lgSz: 24 },
  fp8:  { sm: 'FP8s',   smSz: 8,  md: 'FP8s',   mdSz: 8,  mdLH: 9,  lg: 'FP8l',  lgSz: 24 },
  fp10: { sm: 'FP10s',  smSz: 10, md: 'FP10s',  mdSz: 10, mdLH: 11, lg: 'FP10l', lgSz: 20 },
  fp12: { sm: 'FP12s',  smSz: 12, md: 'FP12s',  mdSz: 12, mdLH: 13, lg: 'FP12l', lgSz: 24 },
}

const LIGHTNING_POLY = [6,0, 0,8, 4,8, 2,13, 9,5, 5,5]
const CORNER = 4

// ─── 公共工具 ────────────────────────────────────────────────────────────────

function makeOuter(W, H) {
  const outer = new Container()
  outer.eventMode = 'static'
  outer.cursor = 'pointer'
  outer.pivot.set(W / 2, H / 2)
  outer.position.set(W / 2, H / 2)
  return outer
}

function addPortrait(card_, card, PX, PY, PW, PH) {
  try {
    const texture = Texture.from(card.portrait)
    texture.source.scaleMode = 'nearest'
    const portrait = new Sprite(texture)
    portrait.x = PX; portrait.y = PY
    portrait.width = PW; portrait.height = PH
    const mask = new Graphics()
    mask.roundRect(PX, PY, PW, PH, 2).fill(0xffffff)
    card_.addChild(mask)
    portrait.mask = mask
    card_.addChild(portrait)
  } catch {
    const ph = new Graphics()
    ph.roundRect(PX, PY, PW, PH, 2).fill(0x333333)
    card_.addChild(ph)
  }
}

function addBorders(card_, W, H, palette) {
  const inner = new Graphics()
  inner.roundRect(0.5, 0.5, W-1, H-1, CORNER-0.5)
       .stroke({ width: 1, color: palette.ring, alignment: 0 })
  card_.addChild(inner)

  const outer = new Graphics()
  outer.roundRect(-0.5, -0.5, W+1, H+1, CORNER+0.5)
       .stroke({ width: 1, color: 0x000000, alignment: 0 })
  card_.addChild(outer)
}

function addHover(outerCnt, W, H) {
  const s = { scale: 1, targetScale: 1, y: 0, targetY: 0 }
  outerCnt.on('pointerover', () => { s.targetScale = 1.06; s.targetY = -4 })
  outerCnt.on('pointerout',  () => { s.targetScale = 1;    s.targetY = 0  })
  outerCnt.onRender = () => {
    const k = 0.25
    s.scale += (s.targetScale - s.scale) * k
    s.y     += (s.targetY     - s.y    ) * k
    outerCnt.scale.set(s.scale)
    outerCnt.position.set(W / 2, H / 2 + s.y)
  }
}

function addOutputNumber(card_, ft, palette, str, cx, cy) {
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const sh = new BitmapText({ text: str, style: { fontFamily: ft.lg, fontSize: ft.lgSz, fill: 0x000000 } })
    sh.anchor.set(0.5, 0.5); sh.x = cx + dx; sh.y = cy + dy
    card_.addChild(sh)
  }
  const t = new BitmapText({ text: str, style: { fontFamily: ft.lg, fontSize: ft.lgSz, fill: palette.accent } })
  t.anchor.set(0.5, 0.5); t.x = cx; t.y = cy
  card_.addChild(t)
}

// ─── 标准样式（顶条式） ──────────────────────────────────────────────────────

function createStandard(card, opts) {
  const W = opts.width  ?? 130
  const H = opts.height ?? 210
  const ft = FONT_THEMES[opts.fontTheme] ?? FONT_THEMES.zpix
  const palette = RARITY_COLORS[card.rarity] ?? RARITY_COLORS.common
  const TOP_BAR_H = 16

  const outer = makeOuter(W, H)
  const card_ = new Container()
  outer.addChild(card_)

  // 背景
  const bg = new Graphics()
  bg.roundRect(0, 0, W, H, CORNER).fill(palette.bg)
  card_.addChild(bg)

  // 顶条
  const topBar = new Graphics()
  topBar.roundRect(0, 0, W, TOP_BAR_H, CORNER).fill(palette.ring)
  topBar.rect(0, TOP_BAR_H - CORNER, W, CORNER).fill(palette.ring)
  card_.addChild(topBar)

  // 肖像
  const PX = 4, PY = TOP_BAR_H + 4
  const PW = W - 8, PH = 100
  addPortrait(card_, card, PX, PY, PW, PH)

  // 卡名
  const nameText = new BitmapText({ text: card.name,
    style: { fontFamily: ft.sm, fontSize: ft.smSz, fill: 0xffffff } })
  nameText.x = 4
  nameText.y = Math.round((TOP_BAR_H - ft.smSz) / 2)
  card_.addChild(nameText)

  // AP
  const apCnt = new Container()
  const bolt = new Graphics()
  bolt.poly(LIGHTNING_POLY).fill(0xfff0a0).stroke({ width: 1, color: 0x000000, alignment: 0 })
  const bs = (ft.smSz - 2) / 13
  bolt.scale.set(bs)
  apCnt.addChild(bolt)
  const apText = new BitmapText({ text: `×${card.ap ?? 0}`,
    style: { fontFamily: ft.sm, fontSize: ft.smSz, fill: 0x000000 } })
  apText.x = Math.round(9 * bs + 1); apText.y = 0
  apCnt.addChild(apText)
  apCnt.x = W - 28; apCnt.y = Math.round((TOP_BAR_H - ft.smSz) / 2)
  card_.addChild(apCnt)

  // 产值数字
  const outputCy = PY + PH + 14
  addOutputNumber(card_, ft, palette, `¥${card.output}`, W / 2, outputCy)

  // 效果文字
  const eff = new BitmapText({ text: card.effect,
    style: { fontFamily: ft.md, fontSize: ft.mdSz, fill: 0xe8d8b8,
      wordWrap: true, wordWrapWidth: W - 8, lineHeight: ft.mdLH, align: 'center' } })
  eff.anchor.set(0.5, 0)
  eff.x = W / 2; eff.y = outputCy + Math.round(ft.lgSz / 2) + 4
  card_.addChild(eff)

  addBorders(card_, W, H, palette)
  addHover(outer, W, H)
  return outer
}

// ─── 名片样式 ────────────────────────────────────────────────────────────────
// 布局（以 fp12 为例，smSz=12 lgSz=24）：
//   y=0-2   : 2px 稀有度色条（圆角顶）
//   y=5     : 左：稀有度文字（彩色）  右：⚡AP
//   y=20    : 肖像（高 72px）
//   y=100   : 卡片名（sm 字体，12px，次要）
//   y=117   : 分隔线（稀有度色）
//   y=130   : ¥ 产值（lg 字体，24px，最醒目）
//   y=148   : 效果文字（sm 字体）

// ── 小图标绘制（中心在 0,0；最终 g.x/g.y 控制位置） ──────────────────────
function drawDeptIcon(g, type, dept, color) {
  const stroke = { width: 1, color, alignment: 0 }
  if (type === 'fun') {
    // 闪光：四角星
    g.poly([0,-5, 1,-1, 5,0, 1,1, 0,5, -1,1, -5,0, -1,-1]).stroke(stroke)
    return
  }
  if (type === 'srv') {
    // 公文包：把手 + 箱体 + 中间锁扣
    g.rect(-2, -4, 4, 2).stroke(stroke)
    g.rect(-5, -2, 10, 7).stroke(stroke)
    g.moveTo(-5, 1).lineTo(5, 1).stroke(stroke)
    return
  }
  if (dept === 'R') {
    // 烧杯
    g.poly([-3,-4, 3,-4, 2,-2, 4,3, -4,3, -2,-2]).stroke(stroke)
    g.moveTo(-3, 1).lineTo(3, 1).stroke(stroke)
    return
  }
  if (dept === 'S') {
    // 三枚堆叠的钱币
    g.rect(-4, -4, 8, 2).stroke(stroke)
    g.rect(-4, -1, 8, 2).stroke(stroke)
    g.rect(-4,  2, 8, 2).stroke(stroke)
    return
  }
  if (dept === 'O') {
    // 文件夹/写字板：顶部夹子 + 主体 + 横线
    g.rect(-2, -5, 4, 2).stroke(stroke)
    g.rect(-4, -3, 8, 8).stroke(stroke)
    g.moveTo(-2, 0).lineTo(2, 0).stroke(stroke)
    g.moveTo(-2, 2).lineTo(2, 2).stroke(stroke)
    return
  }
}

function createNamecard(card, opts) {
  const W = opts.width  ?? 130
  const H = opts.height ?? 210
  const ft = FONT_THEMES[opts.fontTheme] ?? FONT_THEMES.zpix
  const palette = RARITY_COLORS[card.rarity] ?? RARITY_COLORS.common

  const outer = makeOuter(W, H)
  const card_ = new Container()
  outer.addChild(card_)

  // 背景
  const bg = new Graphics()
  bg.roundRect(0, 0, W, H, CORNER).fill(palette.bg)
  card_.addChild(bg)

  // 顶部 2px 稀有度色条
  const accentBar = new Graphics()
  accentBar.roundRect(0, 0, W, CORNER + 2, CORNER).fill(palette.ring) // 上圆角
  accentBar.rect(0, 2, W, CORNER).fill(palette.ring)                  // 抹掉下圆角
  card_.addChild(accentBar)

  // ── 类型/部门徽章（左上角：白色正圆 + 黑框 + 图标） ───────────────────────
  const DEPT_CLR = {
    R: 0x7040b0, S: 0xb03010, O: 0x107868,
    FUN: 0x9050c0, SRV: 0x806040,
  }
  const CR  = 7                              // 圆半径（设计 px）
  const CCX = 4 + CR                         // 圆心 x = 11
  const CCY = 5 + Math.round(ft.smSz / 2)   // 圆心 y，与文字行垂直居中

  const badge = new Graphics()
  badge.circle(CCX, CCY, CR).fill(0xffffff)
  badge.circle(CCX, CCY, CR).stroke({ width: 1, color: 0x000000, alignment: 0 })
  card_.addChild(badge)

  // 图标分支：fun→闪光、srv→公文包；emp 内部再按 dept 分（R 烧杯 / S 钱币 / O 文件夹）
  const iconKey = card.type === 'fun' ? 'FUN'
                : card.type === 'srv' ? 'SRV'
                : card.dept
  const iconClr = DEPT_CLR[iconKey] ?? 0x444444
  const icon = new Graphics()
  drawDeptIcon(icon, card.type, card.dept, iconClr)
  icon.x = CCX
  icon.y = CCY
  card_.addChild(icon)

  // 稀有度标签（右移至徽章右侧）
  const rarityT = new BitmapText({
    text: RARITY_LABEL[card.rarity] ?? card.rarity.toUpperCase(),
    style: { fontFamily: ft.sm, fontSize: ft.smSz, fill: 0xffffff },
  })
  rarityT.tint = palette.ring
  rarityT.x = CCX + CR + 3   // = 21，徽章右边缘 + 3px 间距
  rarityT.y = 5
  card_.addChild(rarityT)

  // AP（右上）
  const apCnt = new Container()
  const bolt = new Graphics()
  bolt.poly(LIGHTNING_POLY).fill(0xfff0a0).stroke({ width: 1, color: 0x000000, alignment: 0 })
  const bs = (ft.smSz - 2) / 13
  bolt.scale.set(bs)
  apCnt.addChild(bolt)
  const apText = new BitmapText({ text: `×${card.ap ?? 0}`,
    style: { fontFamily: ft.sm, fontSize: ft.smSz, fill: 0xffffff } })
  apText.tint = 0xffe080
  apText.x = Math.round(9 * bs + 1); apText.y = 0
  apCnt.addChild(apText)
  apCnt.x = W - 28; apCnt.y = 5
  card_.addChild(apCnt)

  // 肖像
  const PX = 4
  const PY = 5 + ft.smSz + 3
  const PW = W - 8
  const PH = 72
  addPortrait(card_, card, PX, PY, PW, PH)

  // 卡片名（sm 字体，次于产值）
  const nameY = PY + PH + 8
  const nameT = new BitmapText({
    text: card.name,
    style: { fontFamily: ft.sm, fontSize: ft.smSz, fill: 0xffffff },
  })
  nameT.anchor.set(0.5, 0)
  nameT.x = W / 2; nameT.y = nameY
  card_.addChild(nameT)

  // 分隔线
  const divY = nameY + ft.smSz + 5
  const div = new Graphics()
  div.rect(8, divY, W - 16, 1).fill(palette.ring)
  card_.addChild(div)

  // 产值（lg 字体，最醒目，居中）
  const outputCy = divY + Math.round(ft.lgSz / 2) + 5
  addOutputNumber(card_, ft, palette, `¥${card.output}`, W / 2, outputCy)

  // 效果文字
  const effY = outputCy + Math.round(ft.lgSz / 2) + 5
  const eff = new BitmapText({ text: card.effect,
    style: { fontFamily: ft.sm, fontSize: ft.smSz, fill: 0xc8b898,
      wordWrap: true, wordWrapWidth: W - 10, lineHeight: ft.mdLH, align: 'center' } })
  eff.anchor.set(0.5, 0)
  eff.x = W / 2; eff.y = effY
  card_.addChild(eff)

  addBorders(card_, W, H, palette)
  addHover(outer, W, H)
  return outer
}

// ─── 入口 ────────────────────────────────────────────────────────────────────

export function createPixiCard(card, opts = {}) {
  return opts.cardStyle === 'namecard'
    ? createNamecard(card, opts)
    : createStandard(card, opts)
}
