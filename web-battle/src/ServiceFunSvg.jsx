import React from 'react'

/**
 * 服务卡 / 功能卡 / 传奇服务/功能 — 像素 SVG 插画
 *
 * 共 25 张：12 张功能 (FUN_01-12) + 10 张服务 (SRV_01-10) + 3 张传奇 (SRV_LEG_01 / FUN_LEG_01 / FUN_LEG_02)
 * viewBox 80×60 (4:3 比例，匹配 .card-portrait 的 aspect-ratio 1/0.8)
 *
 * 数据结构：每张卡片是 `{ bg: string, shapes: [[x,y,w,h,color], ...] }`
 * 所有形状对齐 2px 网格，shape-rendering="crispEdges" 保留像素硬边
 */

const PALETTE = {
  // 通用色 (减少重复定义)
  paperLight: '#fef3c7',
  paperMid: '#fde68a',
  paperDark: '#a16207',
  metalLight: '#e5e7eb',
  metalDark: '#6b7280',
  metalShine: '#fff',
  ink: '#1e293b',
  inkLight: '#475569',
  red: '#dc2626',
  redDeep: '#7f1d1d',
  green: '#16a34a',
  greenDeep: '#14532d',
  blue: '#2563eb',
  blueDeep: '#1e3a8a',
  blueSky: '#60a5fa',
  yellow: '#fbbf24',
  yellowDeep: '#a16207',
  orange: '#ea580c',
  purple: '#9333ea',
  purpleDeep: '#581c87',
  gold: '#facc15',
  goldGlow: '#fef08a',
  white: '#fff',
  shadow: 'rgba(0,0,0,0.15)',
}

/**
 * 每张卡 = { bg, shapes }；shapes[i] = [x, y, w, h, color]
 * 注：viewBox 80×60 → 单位约 1.25px per cell. 使用 2px 步长保证对齐。
 */
const ICONS = {
  // ============== FUN 功能卡 ==============

  // 市场调研 - 放大镜检查饼图
  FUN_01: {
    bg: '#e0f2fe',
    shapes: [
      // 饼图
      [16, 22, 16, 16, PALETTE.blue],
      [16, 22, 8, 8, PALETTE.red],
      [24, 22, 8, 8, PALETTE.yellow],
      [16, 30, 8, 8, PALETTE.green],
      // 放大镜镜框
      [44, 18, 12, 2, PALETTE.metalDark],
      [42, 20, 2, 12, PALETTE.metalDark],
      [44, 32, 12, 2, PALETTE.metalDark],
      [56, 20, 2, 12, PALETTE.metalDark],
      [44, 20, 12, 12, PALETTE.blueSky],
      // 镜面高光
      [46, 22, 4, 2, PALETTE.white],
      // 手柄
      [56, 32, 2, 2, PALETTE.metalDark],
      [58, 34, 2, 2, PALETTE.metalDark],
      [60, 36, 2, 2, PALETTE.metalDark],
      [62, 38, 4, 2, PALETTE.metalDark],
      [64, 40, 2, 2, PALETTE.metalDark],
    ],
  },

  // 产品冲刺 - 火箭
  FUN_02: {
    bg: '#fee2e2',
    shapes: [
      // 火箭尖
      [38, 8, 4, 2, PALETTE.red],
      [36, 10, 8, 2, PALETTE.red],
      // 主体
      [34, 12, 12, 18, PALETTE.metalLight],
      [38, 16, 4, 4, PALETTE.blueSky], // 窗户
      [36, 16, 2, 4, PALETTE.metalShine],
      // 侧翼
      [28, 24, 6, 8, PALETTE.red],
      [46, 24, 6, 8, PALETTE.red],
      // 火焰
      [36, 30, 8, 4, PALETTE.orange],
      [38, 34, 4, 4, PALETTE.yellow],
      [34, 32, 2, 2, PALETTE.orange],
      [44, 32, 2, 2, PALETTE.orange],
      // 星星
      [18, 14, 2, 2, PALETTE.yellow],
      [60, 18, 2, 2, PALETTE.yellow],
      [16, 36, 2, 2, PALETTE.yellow],
      [62, 40, 2, 2, PALETTE.yellow],
    ],
  },

  // 团队建设 - 三个人围篝火
  FUN_03: {
    bg: '#fef3c7',
    shapes: [
      // 篝火
      [36, 32, 8, 8, PALETTE.orange],
      [38, 30, 4, 2, PALETTE.yellow],
      [38, 36, 4, 4, PALETTE.red],
      // 柴
      [32, 40, 16, 2, PALETTE.paperDark],
      // 人 1 (左)
      [12, 18, 6, 6, '#fde68a'], // 头
      [10, 24, 10, 10, PALETTE.green], // 身
      // 人 2 (中)
      [38, 14, 6, 6, '#fde68a'],
      [36, 20, 10, 8, PALETTE.blue],
      // 人 3 (右)
      [62, 18, 6, 6, '#fde68a'],
      [60, 24, 10, 10, PALETTE.red],
    ],
  },

  // 产品推广 - 大喇叭 + 心形
  FUN_04: {
    bg: '#fce7f3',
    shapes: [
      // 喇叭
      [12, 24, 4, 12, PALETTE.red],
      [16, 22, 4, 16, PALETTE.red],
      [20, 20, 16, 20, PALETTE.red],
      [16, 22, 4, 16, PALETTE.redDeep],
      // 手柄
      [36, 30, 6, 4, PALETTE.metalDark],
      // 飞出的心形
      [48, 18, 4, 2, '#ec4899'],
      [46, 20, 2, 2, '#ec4899'],
      [52, 20, 2, 2, '#ec4899'],
      [48, 22, 4, 2, '#ec4899'],
      [50, 24, 2, 2, '#ec4899'],
      // 第二颗心
      [60, 30, 4, 2, '#f472b6'],
      [58, 32, 2, 2, '#f472b6'],
      [64, 32, 2, 2, '#f472b6'],
      [60, 34, 4, 2, '#f472b6'],
      [62, 36, 0, 0, '#f472b6'],
      // 声波
      [42, 22, 2, 2, PALETTE.metalDark],
      [42, 36, 2, 2, PALETTE.metalDark],
    ],
  },

  // 数据分析 - 柱状图 + 放大镜
  FUN_05: {
    bg: '#dbeafe',
    shapes: [
      // 轴
      [12, 44, 56, 2, PALETTE.ink],
      [12, 14, 2, 30, PALETTE.ink],
      // 柱
      [18, 36, 6, 8, PALETTE.blue],
      [28, 28, 6, 16, PALETTE.green],
      [38, 22, 6, 22, PALETTE.yellow],
      [48, 16, 6, 28, PALETTE.red],
      // 趋势线
      [22, 32, 2, 2, PALETTE.purple],
      [30, 26, 2, 2, PALETTE.purple],
      [40, 20, 2, 2, PALETTE.purple],
      [50, 14, 2, 2, PALETTE.purple],
    ],
  },

  // 流程优化 - 箭头流程
  FUN_06: {
    bg: '#f0fdf4',
    shapes: [
      // 起点框
      [10, 14, 14, 10, PALETTE.green],
      [12, 16, 10, 6, PALETTE.white],
      // 箭头 →
      [24, 18, 4, 2, PALETTE.ink],
      [28, 16, 2, 6, PALETTE.ink],
      [30, 18, 2, 2, PALETTE.ink],
      // 中点框
      [32, 14, 14, 10, PALETTE.yellow],
      [34, 16, 10, 6, PALETTE.white],
      // 箭头 ↓
      [38, 24, 2, 4, PALETTE.ink],
      [36, 28, 6, 2, PALETTE.ink],
      [38, 30, 2, 2, PALETTE.ink],
      // 终点框 (CHECKED)
      [32, 32, 14, 14, PALETTE.blue],
      [35, 36, 2, 4, PALETTE.white],
      [37, 40, 2, 2, PALETTE.white],
      [39, 38, 2, 2, PALETTE.white],
      [41, 36, 2, 2, PALETTE.white],
    ],
  },

  // 跨部门协作 - 锁链
  FUN_07: {
    bg: '#ede9fe',
    shapes: [
      // 链环 1
      [14, 22, 4, 4, PALETTE.metalDark],
      [12, 24, 2, 8, PALETTE.metalDark],
      [18, 24, 2, 8, PALETTE.metalDark],
      [14, 30, 4, 4, PALETTE.metalDark],
      [16, 26, 2, 4, PALETTE.metalShine],
      // 链环 2 (中)
      [28, 22, 4, 4, PALETTE.metalDark],
      [26, 24, 2, 8, PALETTE.metalDark],
      [32, 24, 2, 8, PALETTE.metalDark],
      [28, 30, 4, 4, PALETTE.metalDark],
      [30, 26, 2, 4, PALETTE.metalShine],
      // 链环 3
      [42, 22, 4, 4, PALETTE.metalDark],
      [40, 24, 2, 8, PALETTE.metalDark],
      [46, 24, 2, 8, PALETTE.metalDark],
      [42, 30, 4, 4, PALETTE.metalDark],
      [44, 26, 2, 4, PALETTE.metalShine],
      // 链环 4
      [56, 22, 4, 4, PALETTE.metalDark],
      [54, 24, 2, 8, PALETTE.metalDark],
      [60, 24, 2, 8, PALETTE.metalDark],
      [56, 30, 4, 4, PALETTE.metalDark],
      [58, 26, 2, 4, PALETTE.metalShine],
    ],
  },

  // OKR 制定 - 靶子 + 箭
  FUN_08: {
    bg: '#fef9c3',
    shapes: [
      // 靶
      [22, 12, 36, 36, PALETTE.red],
      [26, 16, 28, 28, PALETTE.white],
      [30, 20, 20, 20, PALETTE.red],
      [34, 24, 12, 12, PALETTE.white],
      [38, 28, 4, 4, PALETTE.gold],
      // 箭杆
      [12, 30, 24, 2, PALETTE.paperDark],
      // 箭羽
      [10, 28, 2, 2, PALETTE.red],
      [10, 32, 2, 2, PALETTE.red],
      // 箭头
      [34, 28, 2, 2, PALETTE.ink],
      [36, 30, 2, 2, PALETTE.ink],
      [34, 32, 2, 2, PALETTE.ink],
    ],
  },

  // 加班动员 - 咖啡 + 时钟
  FUN_09: {
    bg: '#1f2937',
    shapes: [
      // 月亮
      [56, 8, 8, 8, PALETTE.goldGlow],
      [54, 10, 2, 4, PALETTE.goldGlow],
      [64, 10, 2, 4, PALETTE.goldGlow],
      // 咖啡杯身
      [22, 24, 16, 16, PALETTE.white],
      [24, 38, 12, 4, PALETTE.metalLight],
      // 咖啡
      [24, 26, 12, 4, '#78350f'],
      // 把手
      [38, 28, 2, 8, PALETTE.white],
      [40, 30, 2, 4, PALETTE.white],
      // 蒸汽
      [26, 16, 2, 6, PALETTE.metalLight],
      [30, 12, 2, 8, PALETTE.metalLight],
      [34, 16, 2, 6, PALETTE.metalLight],
      // 闹钟
      [48, 30, 12, 12, PALETTE.yellow],
      [50, 32, 8, 8, PALETTE.white],
      // 时针 (午夜)
      [54, 34, 2, 4, PALETTE.ink],
      [54, 36, 4, 2, PALETTE.ink],
      // 铃
      [48, 28, 2, 2, PALETTE.yellow],
      [58, 28, 2, 2, PALETTE.yellow],
    ],
  },

  // 品牌建设 - 旗帜
  FUN_10: {
    bg: '#fef3c7',
    shapes: [
      // 旗杆
      [22, 12, 2, 36, PALETTE.paperDark],
      [20, 10, 6, 4, PALETTE.gold],
      // 旗面
      [24, 14, 32, 18, PALETTE.red],
      [26, 16, 28, 14, PALETTE.redDeep],
      // 旗面 logo (星)
      [38, 18, 4, 2, PALETTE.gold],
      [36, 20, 8, 2, PALETTE.gold],
      [38, 22, 4, 4, PALETTE.gold],
      [36, 26, 4, 2, PALETTE.gold],
      [40, 26, 4, 2, PALETTE.gold],
      // 底座
      [16, 46, 14, 2, PALETTE.ink],
    ],
  },

  // 用户运营活动 - 礼物盒
  FUN_11: {
    bg: '#fce7f3',
    shapes: [
      // 盒体
      [20, 24, 40, 24, PALETTE.red],
      // 顶盖
      [18, 20, 44, 6, PALETTE.redDeep],
      // 中央绿带
      [38, 24, 4, 24, PALETTE.green],
      [18, 20, 44, 6, PALETTE.redDeep],
      [38, 20, 4, 6, PALETTE.green],
      // 蝴蝶结
      [32, 12, 6, 8, PALETTE.green],
      [42, 12, 6, 8, PALETTE.green],
      [38, 16, 4, 4, PALETTE.greenDeep],
      // 礼带尾
      [30, 18, 2, 4, PALETTE.green],
      [48, 18, 2, 4, PALETTE.green],
    ],
  },

  // 技术债务清理 - 扫把扫 bug
  FUN_12: {
    bg: '#f3e8ff',
    shapes: [
      // 扫帚把
      [10, 12, 2, 28, PALETTE.paperDark],
      [12, 14, 2, 2, PALETTE.paperDark],
      [14, 16, 2, 2, PALETTE.paperDark],
      // 刷毛
      [16, 18, 14, 4, PALETTE.yellow],
      [14, 22, 18, 4, PALETTE.yellow],
      [12, 26, 22, 4, PALETTE.yellow],
      [10, 30, 26, 4, PALETTE.yellowDeep],
      // 小 bug
      [50, 30, 8, 6, PALETTE.green],
      [48, 32, 2, 2, PALETTE.green],
      [58, 32, 2, 2, PALETTE.green],
      [52, 32, 2, 2, PALETTE.white], // 眼
      [56, 32, 2, 2, PALETTE.white],
      // 腿
      [48, 36, 2, 2, PALETTE.ink],
      [58, 36, 2, 2, PALETTE.ink],
      // 动作线 ~
      [40, 24, 4, 2, PALETTE.purple],
      [40, 28, 4, 2, PALETTE.purple],
      [40, 32, 4, 2, PALETTE.purple],
    ],
  },

  // ============== SRV 服务卡 ==============

  // 律师事务所 - 天平
  SRV_01: {
    bg: '#e0e7ff',
    shapes: [
      // 支柱
      [38, 14, 4, 32, PALETTE.paperDark],
      // 横梁
      [18, 14, 44, 2, PALETTE.paperDark],
      // 左盘
      [16, 20, 12, 2, PALETTE.metalDark],
      [18, 22, 8, 4, PALETTE.metalLight],
      // 右盘
      [52, 20, 12, 2, PALETTE.metalDark],
      [54, 22, 8, 4, PALETTE.metalLight],
      // 吊绳
      [22, 16, 2, 4, PALETTE.ink],
      [58, 16, 2, 4, PALETTE.ink],
      // 底座
      [30, 46, 20, 4, PALETTE.paperDark],
    ],
  },

  // 税务筹划 - 计算器
  SRV_02: {
    bg: '#fef9c3',
    shapes: [
      // 机身
      [22, 12, 36, 38, PALETTE.metalDark],
      // 屏幕
      [26, 16, 28, 8, '#86efac'],
      [50, 18, 2, 4, PALETTE.greenDeep], // $
      [48, 18, 4, 2, PALETTE.greenDeep],
      [48, 22, 4, 2, PALETTE.greenDeep],
      // 按钮 4x3
      [26, 28, 4, 4, PALETTE.metalLight],
      [32, 28, 4, 4, PALETTE.metalLight],
      [38, 28, 4, 4, PALETTE.metalLight],
      [44, 28, 4, 4, PALETTE.metalLight],
      [50, 28, 4, 4, PALETTE.orange],
      [26, 34, 4, 4, PALETTE.metalLight],
      [32, 34, 4, 4, PALETTE.metalLight],
      [38, 34, 4, 4, PALETTE.metalLight],
      [44, 34, 4, 4, PALETTE.metalLight],
      [50, 34, 4, 4, PALETTE.orange],
      [26, 40, 4, 4, PALETTE.metalLight],
      [32, 40, 4, 4, PALETTE.metalLight],
      [38, 40, 4, 4, PALETTE.metalLight],
      [44, 40, 4, 4, PALETTE.metalLight],
      [50, 40, 4, 4, PALETTE.red],
    ],
  },

  // 外部咨询 - 握手
  SRV_03: {
    bg: '#dbeafe',
    shapes: [
      // 左手套袖 (蓝西装)
      [10, 24, 14, 12, PALETTE.blue],
      [10, 22, 14, 2, PALETTE.blueDeep],
      // 左手
      [22, 26, 8, 8, '#fde68a'],
      // 右手套袖
      [56, 24, 14, 12, PALETTE.red],
      [56, 22, 14, 2, PALETTE.redDeep],
      // 右手
      [50, 26, 8, 8, '#fde68a'],
      // 握手交点
      [28, 28, 24, 6, '#fcd34d'],
      [28, 26, 24, 2, '#fde68a'],
      // 闪光
      [38, 18, 2, 2, PALETTE.gold],
      [40, 16, 2, 2, PALETTE.gold],
      [42, 18, 2, 2, PALETTE.gold],
      [40, 20, 2, 2, PALETTE.gold],
    ],
  },

  // 融资顾问 - 钱袋
  SRV_04: {
    bg: '#fef9c3',
    shapes: [
      // 袋身
      [22, 18, 36, 32, '#7c2d12'],
      [22, 18, 36, 4, '#92400e'], // 高光
      [22, 46, 36, 4, '#3f1d05'], // 阴影
      // 束口
      [28, 14, 24, 6, '#a16207'],
      // $ 符号
      [36, 28, 8, 2, PALETTE.gold],
      [34, 30, 4, 2, PALETTE.gold],
      [34, 32, 12, 2, PALETTE.gold],
      [42, 34, 4, 2, PALETTE.gold],
      [34, 36, 12, 2, PALETTE.gold],
      [34, 38, 4, 2, PALETTE.gold],
      [36, 40, 8, 2, PALETTE.gold],
      // 竖
      [38, 26, 4, 18, PALETTE.gold],
    ],
  },

  // 管理咨询 - 文件夹 + 勾
  SRV_05: {
    bg: '#dcfce7',
    shapes: [
      // 文件夹
      [16, 12, 48, 38, '#fde047'],
      [16, 12, 22, 4, '#facc15'], // tab
      [16, 16, 48, 2, '#a16207'], // 折痕
      // 内页
      [22, 22, 36, 2, PALETTE.ink],
      [22, 28, 24, 2, PALETTE.ink],
      [22, 34, 30, 2, PALETTE.ink],
      [22, 40, 20, 2, PALETTE.ink],
      // 大勾
      [46, 36, 2, 2, PALETTE.green],
      [48, 38, 2, 2, PALETTE.green],
      [50, 40, 2, 2, PALETTE.green],
      [52, 38, 2, 2, PALETTE.green],
      [54, 36, 2, 2, PALETTE.green],
      [56, 34, 2, 2, PALETTE.green],
      [58, 32, 2, 2, PALETTE.green],
    ],
  },

  // 战略顾问 - 国际象棋骑士
  SRV_06: {
    bg: '#e9d5ff',
    shapes: [
      // 马头主体
      [28, 14, 14, 22, PALETTE.ink],
      [42, 18, 10, 18, PALETTE.ink],
      // 鬃毛
      [26, 18, 2, 12, PALETTE.inkLight],
      [24, 20, 2, 10, PALETTE.inkLight],
      // 耳
      [38, 10, 4, 6, PALETTE.ink],
      // 眼
      [44, 22, 2, 2, PALETTE.gold],
      // 嘴
      [50, 28, 4, 2, PALETTE.inkLight],
      // 颈
      [30, 36, 18, 4, PALETTE.ink],
      // 底座
      [22, 40, 36, 4, PALETTE.metalDark],
      [22, 44, 36, 4, PALETTE.metalLight],
    ],
  },

  // PR 公关 - 报纸
  SRV_07: {
    bg: '#fef3c7',
    shapes: [
      // 报纸主体
      [12, 12, 56, 38, '#fff'],
      [12, 12, 56, 2, '#94a3b8'],
      // 报头
      [16, 16, 32, 4, PALETTE.ink],
      [50, 16, 12, 4, PALETTE.red], // BREAKING!
      // 大图
      [16, 22, 20, 14, PALETTE.blue],
      [18, 24, 4, 4, PALETTE.yellow], // 太阳
      [22, 30, 12, 4, '#86efac'], // 草地
      // 文字栏
      [40, 22, 22, 2, PALETTE.ink],
      [40, 26, 22, 2, PALETTE.ink],
      [40, 30, 22, 2, PALETTE.ink],
      [40, 34, 16, 2, PALETTE.ink],
      [16, 40, 46, 2, PALETTE.ink],
      [16, 44, 30, 2, PALETTE.ink],
    ],
  },

  // HR 外包 - 简历 + 人头
  SRV_08: {
    bg: '#fce7f3',
    shapes: [
      // 简历
      [18, 12, 32, 40, PALETTE.white],
      [18, 12, 32, 2, '#94a3b8'],
      // 头像
      [22, 16, 10, 10, '#fde68a'],
      [24, 18, 6, 6, PALETTE.paperDark],
      // 文字栏
      [34, 18, 14, 2, PALETTE.ink],
      [34, 22, 14, 2, PALETTE.ink],
      [22, 30, 26, 2, PALETTE.ink],
      [22, 34, 26, 2, PALETTE.ink],
      [22, 38, 18, 2, PALETTE.ink],
      [22, 42, 24, 2, PALETTE.ink],
      [22, 46, 14, 2, PALETTE.ink],
      // 录用印章
      [50, 36, 16, 12, PALETTE.red],
      [52, 38, 12, 8, PALETTE.redDeep],
      [54, 40, 2, 2, PALETTE.white],
      [60, 40, 2, 2, PALETTE.white],
      [54, 44, 8, 2, PALETTE.white],
    ],
  },

  // 投行顾问 - 银行柱
  SRV_09: {
    bg: '#e0e7ff',
    shapes: [
      // 屋顶
      [12, 12, 56, 4, PALETTE.metalDark],
      [10, 14, 60, 2, PALETTE.ink],
      // 三角顶
      [36, 8, 8, 4, PALETTE.metalDark],
      // 柱子 (4 根)
      [16, 18, 6, 24, PALETTE.metalLight],
      [28, 18, 6, 24, PALETTE.metalLight],
      [40, 18, 6, 24, PALETTE.metalLight],
      [52, 18, 6, 24, PALETTE.metalLight],
      // 柱头/柱础
      [14, 18, 10, 2, PALETTE.metalDark],
      [26, 18, 10, 2, PALETTE.metalDark],
      [38, 18, 10, 2, PALETTE.metalDark],
      [50, 18, 10, 2, PALETTE.metalDark],
      [14, 42, 10, 2, PALETTE.metalDark],
      [26, 42, 10, 2, PALETTE.metalDark],
      [38, 42, 10, 2, PALETTE.metalDark],
      [50, 42, 10, 2, PALETTE.metalDark],
      // 地基
      [10, 46, 60, 4, PALETTE.metalDark],
      // $
      [38, 22, 4, 2, PALETTE.gold],
      [36, 24, 8, 2, PALETTE.gold],
      [40, 26, 4, 16, PALETTE.gold],
    ],
  },

  // 法律团队 - 法槌
  SRV_10: {
    bg: '#fef3c7',
    shapes: [
      // 槌头
      [38, 12, 22, 10, '#7c2d12'],
      [38, 12, 22, 2, '#a16207'], // 高光
      [38, 18, 22, 4, '#451a03'], // 阴影
      // 槌柄
      [22, 22, 18, 4, '#a16207'],
      [20, 26, 2, 2, '#a16207'],
      // 底座
      [14, 38, 52, 4, '#7c2d12'],
      [14, 42, 52, 2, '#451a03'],
      // 桌面
      [12, 44, 56, 6, PALETTE.metalDark],
      // 闪光线
      [54, 28, 2, 4, PALETTE.gold],
      [60, 28, 2, 4, PALETTE.gold],
      [50, 32, 2, 2, PALETTE.gold],
      [64, 32, 2, 2, PALETTE.gold],
    ],
  },

  // ============== 传奇 ==============

  // 麦肯锡战略 - 金色罗盘
  SRV_LEG_01: {
    bg: '#fef3c7',
    shapes: [
      // 罗盘外圈
      [20, 12, 40, 4, PALETTE.gold],
      [20, 44, 40, 4, PALETTE.gold],
      [16, 16, 4, 28, PALETTE.gold],
      [60, 16, 4, 28, PALETTE.gold],
      [20, 16, 4, 2, PALETTE.gold],
      [56, 16, 4, 2, PALETTE.gold],
      [20, 42, 4, 2, PALETTE.gold],
      [56, 42, 4, 2, PALETTE.gold],
      // 内圆
      [22, 18, 36, 24, '#1e3a8a'],
      [20, 22, 2, 16, '#1e3a8a'],
      [58, 22, 2, 16, '#1e3a8a'],
      // 指针 (北红南白)
      [38, 22, 4, 8, PALETTE.red],
      [38, 30, 4, 8, PALETTE.white],
      // 中心宝石
      [38, 28, 4, 4, PALETTE.gold],
      // N S E W
      [38, 18, 4, 2, PALETTE.gold],
      [38, 40, 4, 2, PALETTE.gold],
      [24, 28, 2, 4, PALETTE.gold],
      [54, 28, 2, 4, PALETTE.gold],
      // 闪光
      [10, 18, 2, 2, PALETTE.goldGlow],
      [66, 22, 2, 2, PALETTE.goldGlow],
      [12, 42, 2, 2, PALETTE.goldGlow],
      [66, 44, 2, 2, PALETTE.goldGlow],
    ],
  },

  // 黑天鹅基金
  FUN_LEG_01: {
    bg: '#1e1b4b',
    shapes: [
      // 月光
      [60, 8, 6, 6, PALETTE.goldGlow],
      [58, 10, 2, 2, PALETTE.goldGlow],
      [66, 10, 2, 2, PALETTE.goldGlow],
      // 水面
      [8, 48, 64, 4, '#312e81'],
      [8, 50, 64, 2, '#1e1b4b'],
      // 天鹅身
      [20, 32, 28, 14, PALETTE.ink],
      [18, 36, 2, 8, PALETTE.ink],
      [48, 34, 4, 10, PALETTE.ink],
      // 颈
      [30, 22, 4, 14, PALETTE.ink],
      [32, 18, 4, 6, PALETTE.ink],
      // 头
      [34, 14, 8, 8, PALETTE.ink],
      // 喙
      [42, 18, 4, 2, PALETTE.orange],
      [44, 16, 2, 2, PALETTE.orange],
      // 眼
      [38, 16, 2, 2, PALETTE.red],
      // 翅羽
      [24, 30, 4, 2, PALETTE.inkLight],
      [30, 28, 4, 2, PALETTE.inkLight],
      [38, 30, 4, 2, PALETTE.inkLight],
      // 倒影
      [30, 50, 4, 2, PALETTE.inkLight],
    ],
  },

  // 专利墙战略 - 城堡墙 + 文档
  FUN_LEG_02: {
    bg: '#fef3c7',
    shapes: [
      // 城墙底
      [12, 30, 56, 20, PALETTE.metalDark],
      [12, 32, 56, 2, PALETTE.metalLight], // 横纹
      [12, 38, 56, 2, PALETTE.metalLight],
      [12, 44, 56, 2, PALETTE.metalLight],
      // 竖砖纹
      [22, 30, 2, 20, PALETTE.ink],
      [36, 30, 2, 20, PALETTE.ink],
      [50, 30, 2, 20, PALETTE.ink],
      // 城墙顶垛
      [12, 22, 8, 8, PALETTE.metalDark],
      [24, 22, 8, 8, PALETTE.metalDark],
      [36, 22, 8, 8, PALETTE.metalDark],
      [48, 22, 8, 8, PALETTE.metalDark],
      [60, 22, 8, 8, PALETTE.metalDark],
      // 文档 (代表专利)
      [28, 10, 20, 14, PALETTE.white],
      [30, 12, 16, 2, PALETTE.ink],
      [30, 16, 16, 2, PALETTE.ink],
      [30, 20, 12, 2, PALETTE.ink],
      // 红印
      [42, 18, 6, 6, PALETTE.red],
    ],
  },
}

export function ServiceFunSvg({ cardId }) {
  const icon = ICONS[cardId]
  if (!icon) return null
  return (
    <svg
      viewBox="0 0 80 60"
      xmlns="http://www.w3.org/2000/svg"
      className="srvfun-svg"
      shapeRendering="crispEdges"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect width="80" height="60" fill={icon.bg} />
      {icon.shapes.map(([x, y, w, h, color], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={color} />
      ))}
    </svg>
  )
}

/** 列出当前支持的 cardId（供 fallback 判断） */
export function hasServiceFunSvg(cardId) {
  return ICONS[cardId] != null
}
