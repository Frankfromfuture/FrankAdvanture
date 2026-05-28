// 像素字体加载与 BitmapFont 注册
//
// 清晰三要素：
//   1) skipKerning: true  → 字符位置严格整数对齐
//   2) crispifyTextureSource → alpha 阈值化（≥128→255 else 0）消 Canvas2D 灰边
//   3) source.scaleMode='nearest' → GPU 放大时最近邻采样，不线性插值（消糊/消黏）

import { BitmapFontManager } from 'pixi.js'

let _ready = null

export function ensurePixelFontReady() {
  if (_ready) return _ready
  _ready = (async () => {
    // ── 加载所有字体文件 ────────────────────────────────────────────────
    const faces = [
      new FontFace('Zpix',         "url('/fonts/zpix.ttf')  format('truetype')"),
      new FontFace('Ark10',        "url('/fonts/ark10.woff2') format('woff2')"),
      new FontFace('FusionPixel8',  "url('/fonts/fp8.woff2')  format('woff2')"),
      new FontFace('FusionPixel10', "url('/fonts/fp10.woff2') format('woff2')"),
      new FontFace('FusionPixel12', "url('/fonts/fp12.woff2') format('woff2')"),
    ]
    await Promise.all(faces.map(f => f.load()))
    faces.forEach(f => document.fonts.add(f))
    await document.fonts.ready

    const charset = collectCharset([
      // 卡牌文字
      '首席科学家', '金牌销售', '运营专员',
      '相邻 R&D +30%，每月触发 1 次"突破"',
      '本行所有 Sales 输出 +20',
      '每张相邻卡 +5',
      // 战斗 UI
      '董事会血条玩家攻击防御结束回合行动点我敌方轮次',
      '胜利失败放弃确认取消提示信息效果技能激活空位可放置',
      '对话框基础危险成功警告已选中点击选牌回合剩余手牌',
      '查看详情关闭窗口说明被动主动冷却施放消耗',
      '市场压力本月目标竞争者推进融资窗口现金告急舆论热度',
      '指挥台协同槽连锁产线生产中可布置手牌区开始结算悬停只是原型反馈元素均为最终美术占位',
      '市场经理首席科学家运营助理功能卡技术销售获客交付提效突破',
      '基础信息容器奶白底粗框内嵌凹陷顶部光照微圆角厚度',
      '白色深色灰紫灰棕',
      '商业模式订阅中月费估值加成留存现金流护城河可花现金估值进度行动力本月战场信息产线输出风险待布置同类',
      '按钮组件普通按钮取消开始结算确认粗框斜下厚影光斑凹陷附件紫色棕黄色',
      '战斗组件背景弹跳数字火焰产线牌桌复制漂移棋盘右侧双按钮上下按键非',
      '德州扑克桌式五个点击后变成产线外居中白色',
      '组件生态展示运行时自动布局声明式入口看状态复制示例目录适合配合使用',
      '按钮进度滑杆隔离开发组件化',
      'Press ready fired Slider Yoga Flexbox layout flexWrap gap Stage React',
      '¥0123456789',
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '+-*/.%,:!?·…×()[]{}#@&_=<>~^|\\',
    ])
    const numset = '¥0123456789+-'

    // ── Zpix（12px 原生，笔画 2px，厚重感） ────────────────────────────
    ic('Zpix12', { style: { fontFamily: 'Zpix', fontSize: 12, fill: 0xffffff }, chars: charset, resolution: 1, padding: 1, skipKerning: true })
    ic('Zpix16', { style: { fontFamily: 'Zpix', fontSize: 16, fill: 0xffffff }, chars: charset, resolution: 1, padding: 1, skipKerning: true })
    ic('Zpix24', { style: { fontFamily: 'Zpix', fontSize: 24, fill: 0xffffff }, chars: numset,   resolution: 1, padding: 2, skipKerning: true })

    // ── Ark Pixel 10px（备用） ──────────────────────────────────────────
    ic('Ark10',  { style: { fontFamily: 'Ark10', fontSize: 10, fill: 0xffffff }, chars: charset, resolution: 1, padding: 1, skipKerning: true })

    // ── Fusion Pixel 8px（极细，笔画 1px） ─────────────────────────────
    // 卡名/AP 用原生 8px；效果文字用 8px；产值数字用 24px（3×）
    ic('FP8s',   { style: { fontFamily: 'FusionPixel8', fontSize: 8,  fill: 0xffffff }, chars: charset, resolution: 1, padding: 1, skipKerning: true })
    ic('FP8l',   { style: { fontFamily: 'FusionPixel8', fontSize: 24, fill: 0xffffff }, chars: numset,   resolution: 1, padding: 2, skipKerning: true })

    // ── Fusion Pixel 10px（轻薄，笔画 1px） ────────────────────────────
    ic('FP10s',  { style: { fontFamily: 'FusionPixel10', fontSize: 10, fill: 0xffffff }, chars: charset, resolution: 1, padding: 1, skipKerning: true })
    ic('FP10l',  { style: { fontFamily: 'FusionPixel10', fontSize: 20, fill: 0xffffff }, chars: numset,   resolution: 1, padding: 2, skipKerning: true })

    // ── Fusion Pixel 12px（与 Zpix 同档但笔画细一级） ─────────────────
    ic('FP12s',  { style: { fontFamily: 'FusionPixel12', fontSize: 12, fill: 0xffffff }, chars: charset, resolution: 1, padding: 1, skipKerning: true })
    ic('FP12l',  { style: { fontFamily: 'FusionPixel12', fontSize: 24, fill: 0xffffff }, chars: numset,   resolution: 1, padding: 2, skipKerning: true })
  })()
  return _ready
}

// ── 内部：安装 + 阈值化 atlas ──────────────────────────────────────────
function ic(name, options) {
  const font = BitmapFontManager.install({ name, ...options })
  for (const page of font.pages ?? []) crispify(page.texture?.source)
}

function crispify(source) {
  if (!source) return
  // NEAREST：stage 2x 放大时每个 atlas 像素 → 2×2 屏幕块，无线性模糊/黏字
  source.scaleMode = 'nearest'

  const res = source.resource
  const canvas = res instanceof HTMLCanvasElement ? res : res?.canvas
  if (!canvas) return

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  const { width, height } = canvas
  if (!width || !height) return

  const img = ctx.getImageData(0, 0, width, height)
  const d = img.data
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 128 ? 255 : 0
  ctx.putImageData(img, 0, 0)
  source.update()
}

function collectCharset(strs) {
  const s = new Set()
  for (const str of strs) for (const ch of str) s.add(ch)
  return Array.from(s).join('')
}
