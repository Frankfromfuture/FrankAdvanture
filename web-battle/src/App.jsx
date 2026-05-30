import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import CompendiumScreen from './CompendiumScreen.jsx'
import { CardView, summarizeEffect } from './CardView.jsx'
import { useFloatingTooltip } from './hooks/useFloatingTooltip.jsx'
import PhaserBattleFX from './PhaserBattleFX.jsx'
import PhaserMenuFX from './PhaserMenuFX.jsx'
import { PackBox3D } from './PackBox3D.jsx'
import { ServiceFunSvg, hasServiceFunSvg } from './ServiceFunSvg.jsx'
import { BusinessModelSvg } from './BusinessModelSvg.jsx'
import { createRivalInstance, createBattle, RIVAL_SCHEDULE, RIVAL_ARCHETYPES } from './game/rivals.js'
import { MarketShareBar } from './components/MarketShareBar.jsx'
import { ExecutiveSvgPortrait } from './人物/ExecutiveSvgPortrait.jsx'
import { PixelPersonPortrait } from './人物/PixelPersonPortrait.jsx'
import {
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Coins,
  Factory,
  FlaskConical,
  HandCoins,
  Layers3,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  UserPlus,
  Zap,
  AlertTriangle,
  Skull,
} from 'lucide-react'
import {
  AFFIX_POOL,
  BUSINESS_MODELS,
  CARD_TEMPLATES,
  DEPT_META,
  PACK_DEFINITIONS,
  RARITY_LABELS,
  UPGRADE_PATHS,
  STAGES,
  getCardBurn,
  getCardExtraBurn,
  getBMMonthlyCost,
  getCardAssetValue,
  getBMAssetValue,
} from './game/cards.js'
import {
  GAME_CONFIG,
  dismissRecruitReveal,
  clearPlanningLine,
  computeBattlePreview,
  createInitialState,
  discardFromHand,
  enterIntermission,
  exitIntermission,
  fireCard,
  getActiveLine,
  getEffectiveApLimit,
  getLineAp,
  getPositionalBuff,
  openPack,
  placeCardInSlot,
  purchaseBusinessModel,
  purchaseShopItem,
  resolveEvent,
  resolveMonth,
  returnSlotToHand,
  rollSchool,
  rollShop,
  upgradeCard,
  dismissCardInBoardMeeting,
  pickHighlightCard,
  dismissHighlightCard,
  claimRivalReward,
  unsubscribeBusinessModel,
  computeValuation,
  getAllCards,
  sortHandDefault,
  autoDeployActiveLine,
  playFunctionCard,
} from './game/engine.js'

const TUTORIAL_STEPS = [
  {
    title: '欢迎入职，新 CEO',
    body: '顶部那一排数字别慌——累计 ¥ 是你向投资人交差的「KPI」，现金 ¥ 是「公司还能撑几个月」，AP 是「你今天还有多少精力开会」。董事会全靠这几个数字判断你能不能续命。',
    focus: 'top',
    targetSelector: '.top-hud',
    placement: 'bottom',
  },
  {
    title: '把人塞进产线 (5 格生产位)',
    body: '5 个工位各有自己的部门偏好：P1/P2 更适合销售，P3 更适合研发，P4/P5 更适合运营。把人放在顺手的位置，产线才会真的转起来。',
    focus: 'line',
    targetSelector: '.line-board.active .slot-row',
    placement: 'top',
  },
  {
    title: 'HR 部今天只给你 3 张简历',
    body: '右边每月放 3 个候选人，只能签 1 个。先看 AP（薪资）、产出（产值），再瞄一眼右上角那个红红绿绿的 roll（面试当天他运气如何）。\n剩下两个？HR 会说「保持联系」。',
    focus: 'market',
    targetSelector: '.recruit-market',
    placement: 'left',
  },
  {
    title: '按那个「▶」开始爆分',
    body: '产线旁那个三角形按钮就是月底结算。点下去 P1 → P5 依次触发，数字一个个炸出来——那个声音叫做「升职加薪 BGM」。\nAP 别超限，超了说明你又要熬夜了。',
    focus: 'settle',
    targetSelector: '.line-board.active .line-action-button.start',
    placement: 'top',
  },
]

// ============================================================
// Layout Editor — context + localStorage helpers
// ============================================================
// v4: 槽位主题名（替换旧的 P1/P2/P3/P4/P5）
const SLOT_LABELS = ['前线业务', '市场支持', '研发中心', '运营中台', '组织后台']

const LAYOUT_STORAGE_KEY = 'frank-battle-layout-v1'
const TEXT_STORAGE_KEY   = 'frank-battle-texts-v1'
const DEFAULT_LAYOUT_OVERRIDES = {}
function _resolveLayoutOverride(id, overrides) {
  return overrides[id] ?? {}
}
function _loadLayout() {
  try {
    const stored = JSON.parse(localStorage.getItem(LAYOUT_STORAGE_KEY) ?? 'null') ?? {}
    return {
      ...DEFAULT_LAYOUT_OVERRIDES,
      ...stored,
    }
  }
  catch { return DEFAULT_LAYOUT_OVERRIDES }
}
function _loadTexts() {
  try { return JSON.parse(localStorage.getItem(TEXT_STORAGE_KEY) ?? 'null') ?? {} }
  catch { return {} }
}
const GAME_STATE_STORAGE_KEY = 'frank-battle-state-v1'

function _loadGameState() {
  try {
    const raw = localStorage.getItem(GAME_STATE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && parsed.version === 1 && parsed.state) {
      return parsed.state
    }
  } catch (e) {
    console.error("Failed to load game state:", e)
  }
  return null
}

function _saveGameState(state) {
  try {
    if (state) {
      localStorage.setItem(GAME_STATE_STORAGE_KEY, JSON.stringify({ version: 1, state }))
    }
  } catch (e) {
    console.error("Failed to save game state:", e)
  }
}

const LayoutEditCtx = React.createContext({
  editMode: false,
  overrides: {},
  update: () => {},
  textOverrides: {},
  updateText: () => {},
})

function DriftingCheckerboardBackground({ direction, stageId = 1 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const STAGE_PALETTES = {
      1: { colorA: '#c9bfb1', colorB: '#ece7df' }, // 天使轮 - Morandi taupe & warm off-white
      2: { colorA: '#a7c0a8', colorB: '#ece8e1' }, // 种子轮 - Soft emerald & sand warm
      3: { colorA: '#a0b2c6', colorB: '#e8edf3' }, // A 轮 - Cool slate & soft ice blue
      4: { colorA: '#b8a6d9', colorB: '#ebe6f3' }, // B 轮 - Growth purple & soft grey-purple
      5: { colorA: '#94cbd3', colorB: '#e6f1f3' }, // C 轮 - Teal blue & arctic mint
      6: { colorA: '#8a9597', colorB: '#e5e8e8' }, // D 轮 - Graphite & slate grey
      7: { colorA: '#e0cca5', colorB: '#f5eedf' }, // IPO - Champagne & soft cream
      8: { colorA: '#9ba3d7', colorB: '#e9eaf5' }, // 千亿 - Royal deep indigo & ice
      9: { colorA: '#2d2f34', colorB: '#f5c63c' }, // 行业第一 - Obsidian void & gold grid lines
    }

    const palette = STAGE_PALETTES[stageId] || STAGE_PALETTES[1]
    const COLOR_A = palette.colorA
    const COLOR_B = palette.colorB
    const SIZE = 48 // tile side length (px)
    const SPEED = 7 // px/sec along each axis

    let W = 0, H = 0, dpr = 1

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    let animFrameId
    const start = performance.now()

    function draw(now) {
      const t = (now - start) / 1000
      const period = SIZE * 2

      let vx = 0
      let vy = 0

      switch (direction) {
        case 'left-up':
          vx = -1
          vy = -1
          break
        case 'left-down':
          vx = -1
          vy = 1
          break
        case 'right-up':
          vx = 1
          vy = -1
          break
        case 'right-down':
          vx = 1
          vy = 1
          break
        case 'left':
          vx = -1
          vy = 0
          break
        case 'right':
          vx = 1
          vy = 0
          break
        case 'up':
          vx = 0
          vy = -1
          break
        case 'down':
          vx = 0
          vy = 1
          break
        default:
          vx = 1
          vy = -1
      }

      let ox = (SPEED * vx * t) % period
      let oy = (SPEED * vy * t) % period

      if (ox < 0) ox += period
      if (oy < 0) oy += period

      ctx.fillStyle = COLOR_B
      ctx.fillRect(0, 0, W, H)

      const startCol = -2, startRow = -2
      const cols = Math.ceil(W / SIZE) + 4
      const rows = Math.ceil(H / SIZE) + 4

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (startCol + c) * SIZE + ox
          const y = (startRow + r) * SIZE + oy

          const dark = ((c + r) & 1) === 0
          ctx.fillStyle = dark ? COLOR_A : COLOR_B
          ctx.fillRect(x, y, SIZE, SIZE)
        }
      }

      animFrameId = requestAnimationFrame(draw)
    }

    animFrameId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animFrameId)
    }
  }, [direction, stageId])

  return createPortal(
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />,
    document.body
  )
}

function ScientistIcon(props) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Orbital atom lines */}
      <ellipse cx="50" cy="45" rx="35" ry="12" stroke="var(--icon-color, #00f2fe)" strokeWidth="2.5" transform="rotate(30 50 45)" strokeDasharray="3 3" />
      <ellipse cx="50" cy="45" rx="35" ry="12" stroke="var(--icon-color, #00f2fe)" strokeWidth="2.5" transform="rotate(-30 50 45)" strokeDasharray="3 3" />
      {/* Electron dots */}
      <circle cx="20" cy="27" r="4" fill="var(--icon-accent, #ffe000)" />
      <circle cx="80" cy="27" r="4" fill="var(--icon-accent, #ffe000)" />
      <circle cx="50" cy="80" r="4" fill="var(--icon-accent, #ffe000)" />
      {/* Beaker */}
      <path d="M42 20H58M45 20V35L30 65C28 69 31 74 36 74H64C69 74 72 69 70 65L55 35V20H45Z" stroke="var(--icon-color, #00f2fe)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Beaker liquid */}
      <path d="M33.5 58H66.5L64 63H36L33.5 58Z" fill="var(--icon-color, #00f2fe)" opacity="0.3" />
      <path d="M36 63H64C67 63 69 66 67.5 69C66.5 71 64.5 72 62.5 72H37.5C35.5 72 33.5 71 32.5 69C31 66 33 63 36 63Z" fill="var(--icon-color, #00f2fe)" opacity="0.6" />
      <circle cx="45" cy="50" r="3" fill="var(--icon-color, #00f2fe)" />
      <circle cx="55" cy="45" r="2.5" fill="var(--icon-color, #00f2fe)" />
      <circle cx="48" cy="38" r="2" fill="var(--icon-color, #00f2fe)" />
    </svg>
  )
}

function SalesIcon(props) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Growing chart */}
      <path d="M15 80 L35 60 L55 68 L85 30" stroke="var(--icon-color, #ff3366)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M73 30 H85 V42" stroke="var(--icon-color, #ff3366)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 80H85" stroke="var(--icon-color, #ff3366)" opacity="0.3" strokeWidth="2.5" />
      {/* Money Badge */}
      <circle cx="50" cy="52" r="18" stroke="var(--icon-accent, #ffe000)" strokeWidth="4.5" fill="#1b1b22" />
      <path d="M50 42 C45 42 42 45 42 48 C42 53 58 51 58 56 C58 59 55 62 50 62 C44 62 42 59 42 59 M50 38V42 M50 62V66" stroke="var(--icon-accent, #ffe000)" strokeWidth="3" strokeLinecap="round" />
      {/* Sound waves */}
      <path d="M72 40 C76 44 76 50 72 54" stroke="var(--icon-color, #ff3366)" strokeWidth="3" strokeLinecap="round" />
      <path d="M78 34 C85 41 85 53 78 60" stroke="var(--icon-color, #ff3366)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      <path d="M28 54 C24 50 24 44 28 40" stroke="var(--icon-color, #ff3366)" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 60 C15 53 15 41 22 34" stroke="var(--icon-color, #ff3366)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

function CxoIcon(props) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      {/* Organization structure / Building network */}
      <path d="M20 80V50L35 38L50 50V80" stroke="var(--icon-color, #42d77d)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M50 80V35L65 23L80 35V80" stroke="var(--icon-color, #42d77d)" strokeWidth="3.5" strokeLinejoin="round" opacity="0.7" />
      <path d="M10 80H90" stroke="var(--icon-color, #42d77d)" strokeWidth="4.5" strokeLinecap="round" />
      {/* Organization tie */}
      <path d="M50 42 L56 46 L53 62 L50 68 L47 62 L44 46 Z" fill="var(--icon-accent, #00f2fe)" stroke="var(--icon-accent, #00f2fe)" strokeWidth="1.5" />
      <path d="M45 42H55L53 38H47L45 42Z" fill="var(--icon-accent, #00f2fe)" />
      {/* Crown */}
      <path d="M40 32 L43 23 L50 27 L57 23 L60 32 Z" fill="var(--icon-accent, #ffe000)" stroke="var(--icon-accent, #ffe000)" strokeWidth="1.5" />
      <circle cx="50" cy="27" r="1.5" fill="#1b1b22" />
      <circle cx="43" cy="23" r="1.5" fill="#1b1b22" />
      <circle cx="57" cy="23" r="1.5" fill="#1b1b22" />
    </svg>
  )
}

function ProfessionSelectCard({ name, title, dept, desc, icon: Icon, onClick, className, id, isSelected }) {
  const wrapRef = useRef(null)
  const cardRef = useRef(null)

  function handleMouseMove(e) {
    const wrap = wrapRef.current
    const card = cardRef.current
    if (!wrap || !card) return
    const rect = wrap.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const w = rect.width
    const h = rect.height
    
    // Normalize coordinates from -0.5 to 0.5
    const pctX = (x / w) - 0.5
    const pctY = (y / h) - 0.5
    
    // Extreme 3D rotation angles for pop-out depth
    const tiltY = pctX * 18
    const tiltX = -pctY * 18
    
    card.style.setProperty('--prof-tilt-x', `${tiltX.toFixed(2)}deg`)
    card.style.setProperty('--prof-tilt-y', `${tiltY.toFixed(2)}deg`)
    
    const glareX = (x / w) * 100
    const glareY = (y / h) * 100
    card.style.setProperty('--prof-glare-x', `${glareX.toFixed(2)}%`)
    card.style.setProperty('--prof-glare-y', `${glareY.toFixed(2)}%`)
  }

  function handleMouseLeave() {
    const card = cardRef.current
    if (!card) return
    card.style.setProperty('--prof-tilt-x', '0deg')
    card.style.setProperty('--prof-tilt-y', '0deg')
    card.style.setProperty('--prof-glare-x', '50%')
    card.style.setProperty('--prof-glare-y', '50%')
  }

  return (
    <button
      ref={wrapRef}
      className="profession-card-wrap"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      aria-label={`选择职业背景: ${name}`}
    >
      <div
        ref={cardRef}
        id={id}
        className={`profession-card ${className} ${isSelected ? 'selected-active' : ''}`}
      >
        <div className="prof-card-shine" />
        <div className="prof-card-inner">
          <div className="prof-card-dept-badge">{dept}</div>
          <div className="prof-card-icon-container">
            <Icon className="prof-card-svg-icon" />
          </div>
          <h2 className="prof-card-title">{name}</h2>
          <span className="prof-card-subtitle">{title}</span>
          <div className="prof-card-divider" />
          <div className="prof-card-details">
            {desc}
          </div>
        </div>
      </div>
    </button>
  )
}

function ProfessionSelectScreen({ onSelect, onBack }) {
  const [selectedProf, setSelectedProf] = useState(null)

  return (
    <div className="profession-select-overlay">
      <h1 className="profession-select-title">选择创始人出身背景</h1>
      <p className="profession-select-subtitle">不同的行业经验，将塑造独一无二的起始发展道路与核心卡牌</p>
      
      <div className="profession-cards-container">
        <ProfessionSelectCard
          id="prof-select-scientist"
          name="科学家"
          title="Scientist"
          dept="研发部 (R)"
          className="prof-scientist"
          icon={ScientistIcon}
          isSelected={selectedProf === 'scientist'}
          onClick={() => setSelectedProf('scientist')}
          desc={
            <>
              <p>“硬核研发，厚积薄发”</p>
              <ul>
                <li>专属主角: <strong>创始人 · 科学家</strong> (EPIC)</li>
                <li>随机职员: 专员牌 ×1 + 经理牌 ×1 (R)</li>
                <li>核心技能: <strong>AI-Driven 研发</strong><br/>· 手里：每轮抓牌数 +1<br/>· 打出：本轮抓牌数 +3 (手牌上限 10)</li>
              </ul>
            </>
          }
        />
        
        <ProfessionSelectCard
          id="prof-select-sales"
          name="销售冠军"
          title="Sales Champion"
          dept="销售部 (S)"
          className="prof-sales"
          icon={SalesIcon}
          isSelected={selectedProf === 'sales'}
          onClick={() => setSelectedProf('sales')}
          desc={
            <>
              <p>“业绩为王，舌战群雄”</p>
              <ul>
                <li>专属主角: <strong>创始人 · 销售冠军</strong> (EPIC)</li>
                <li>随机职员: 专员牌 ×1 + 经理牌 ×1 (S)</li>
                <li>核心技能: <strong>Sales High</strong><br/>· 手里：产出系数 ×1.2<br/>· 打出：本轮产出系数 ×1.8</li>
              </ul>
            </>
          }
        />
        
        <ProfessionSelectCard
          id="prof-select-cxo"
          name="大厂 CXO"
          title="Big Tech CXO"
          dept="运营部 (O)"
          className="prof-cxo"
          icon={CxoIcon}
          isSelected={selectedProf === 'cxo'}
          onClick={() => setSelectedProf('cxo')}
          desc={
            <>
              <p>“对齐颗粒度，降本增效”</p>
              <ul>
                <li>专属主角: <strong>创始人 · 大厂 CXO</strong> (EPIC)</li>
                <li>随机职员: 专员牌 ×1 + 经理牌 ×1 (O)</li>
                <li>核心技能: <strong>精益管理</strong><br/>· 手里：最大 AP +1<br/>· 打出：本轮 AP +3</li>
              </ul>
            </>
          }
        />
      </div>
      
      {selectedProf && (
        <div className="prof-actions-area">
          <button
            className={`prof-confirm-button theme-${selectedProf}`}
            onClick={() => onSelect(selectedProf)}
            id="prof-confirm-btn"
          >
            是否选择该背景
          </button>
        </div>
      )}
      
      <button className="prof-back-button" onClick={onBack} id="prof-back-btn">
        返回主菜单
      </button>
    </div>
  )
}

const FloatingTooltipCtx = React.createContext(null)

function App() {
  const [screen, setScreen] = useState('menu')
  const [compendiumReturn, setCompendiumReturn] = useState('menu')
  const [sortMode, setSortMode] = useState('ap') // 'ap' or 'dept'
  const appTooltip = useFloatingTooltip({ delay: 150 })
  const [game, setGame] = useState(() => {
    const loaded = _loadGameState()
    if (loaded) {
      // Robustness: ensure active line has 'planning' status if not ended/intermission
      if (!loaded.result && !loaded.intermissionState) {
        const activeLine = loaded.lines?.find(l => l.id === loaded.activeLineId)
        if (activeLine && activeLine.status !== 'planning') {
          console.warn("Auto-correcting active line status to 'planning'")
          loaded.lines = loaded.lines.map(line =>
            line.id === loaded.activeLineId ? { ...line, status: 'planning' } : line
          )
        }
      }
      return loaded
    }
    return createInitialState()
  })
  
  useEffect(() => {
    _saveGameState(game)
  }, [game])

  useEffect(() => {
    if (!game.result && !game.intermissionState) {
      const activeLine = game.lines?.find(l => l.id === game.activeLineId)
      if (activeLine && activeLine.status !== 'planning') {
        console.warn("Auto-correcting active line status in useEffect...")
        setGame(prev => {
          const curActive = prev.lines?.find(l => l.id === prev.activeLineId)
          if (curActive && curActive.status !== 'planning') {
            return {
              ...prev,
              lines: prev.lines.map(line =>
                line.id === prev.activeLineId ? { ...line, status: 'planning' } : line
              )
            }
          }
          return prev
        })
      }
    }
  }, [game.activeLineId, game.lines, game.result, game.intermissionState])

  const [tutorialStep, setTutorialStep] = useState(0)
  const [tutorialDone, setTutorialDone] = useState(() => {
    try {
      return localStorage.getItem('frank-battle-tutorial-done') === 'true'
    } catch {
      return false
    }
  })

  function handleTutorialDone() {
    setTutorialDone(true)
    try {
      localStorage.setItem('frank-battle-tutorial-done', 'true')
    } catch (e) {
      console.error(e)
    }
  }
  const [hint, setHint] = useState('')
  const [drawer, setDrawer] = useState(null)
  const [enteringHandUids, setEnteringHandUids] = useState(() => new Set())
  const [settlementFx, setSettlementFx] = useState(null)
  const [phaserFxEvent, setPhaserFxEvent] = useState(null)
  const [isSettling, setIsSettling] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [flyingCards, setFlyingCards] = useState([])
  const [draggingCardUid, setDraggingCardUid] = useState(null)
  const [functionCardUid, setFunctionCardUid] = useState(null)
  const [dissolvingCardUid, setDissolvingCardUid] = useState(null)
  const dissolveTimerRef = useRef(null)
  const isInteractionLocked = isSettling || isAnimating
  const [comboOpen, setComboOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [creditsOpen, setCreditsOpen] = useState(false)
  const [layoutEditMode, setLayoutEditMode] = useState(false)
  const [layoutOverrides, setLayoutOverrides] = useState(_loadLayout)
  const [textOverrides, setTextOverrides] = useState(_loadTexts)

  function updateLayoutOv(id, next) {
    setLayoutOverrides(prev => ({ ...prev, [id]: next }))
  }
  function updateText(id, value) {
    setTextOverrides(prev => ({ ...prev, [id]: value }))
  }
  function saveLayout() {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutOverrides))
    localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(textOverrides))
    setLayoutEditMode(false)
  }
  function resetLayout() {
    setLayoutOverrides(DEFAULT_LAYOUT_OVERRIDES)
    setTextOverrides({})
    localStorage.removeItem(LAYOUT_STORAGE_KEY)
    localStorage.removeItem(TEXT_STORAGE_KEY)
  }
  function openLayoutEdit() {
    setSettingsOpen(false)
    setLayoutEditMode(true)
  }

  const hintTimerRef = useRef(null)
  const handEntryTimerRef = useRef(null)
  const settlementFxTimerRef = useRef(null)

  const activeLine = getActiveLine(game)
  const selectedCard = game.hand.find((card) => card.uid === game.selectedCardUid)
  const functionCard = game.hand.find((card) => card.uid === functionCardUid)
  const preview = useMemo(() => computeBattlePreview(game), [game])
  const activeLineAp = getLineAp(activeLine?.slots ?? [])
  const apLimit = getEffectiveApLimit(game)

  // 竞争公司系统：胜利时自动收编对手卡组（无模态弹窗，效果通过 log + 战场样式 in-game 呈现）
  useEffect(() => {
    if (game.rivalRewardPending && game.rivalRewardPending.length > 0) {
      const result = claimRivalReward(game)
      if (result.ok) setGame(result.state)
    }
  }, [game.rivalRewardPending])

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const allCards = getAllCards(game)
    const activeBMs = (game.activeBusinessModels ?? [])
      .map((slot) => BUSINESS_MODELS.find((bm) => bm.id === slot.id))
      .filter(Boolean)

    const snapshot = {
      capturedAt: new Date().toISOString(),
      route: 'battle',
      date: `${game.year}.${String(game.month).padStart(2, '0')}`,
      elapsedMonths: game.elapsedMonths,
      stage: {
        id: game.stage.id,
        name: game.stage.name,
        theme: game.stage.theme,
        threshold: game.stage.threshold,
      },
      valuation: game.valuation,
      computedValuation: computeValuation(game),
      cash: game.cash,
      retainedEarnings: game.retainedEarnings,
      lastMonthProfit: game.lastMonthProfit,
      preview: {
        income: preview.eventIncome,
        rawIncome: preview.rawIncome,
        burn: preview.maintenance,
        netCash: preview.netCash,
        profit: preview.profit,
        cashGain: preview.cashGain,
        cashDelta: preview.cashDelta,
        ccr: preview.ccr,
        monthlyOpCost: preview.monthlyOpCost,
      },
      ap: {
        used: activeLineAp,
        limit: apLimit,
        available: game.apAvailable,
        carry: game.apCarry,
      },
      assets: {
        cardAsset: allCards.reduce((sum, card) => sum + getCardAssetValue(card), 0),
        bmAsset: activeBMs.reduce((sum, bm) => sum + getBMAssetValue(bm), 0),
      },
      burnSources: {
        cards: allCards.reduce((sum, card) => sum + getCardBurn(card), 0),
        extraCards: allCards.reduce((sum, card) => sum + getCardExtraBurn(card), 0),
        businessModels: activeBMs.reduce((sum, bm) => sum + getBMMonthlyCost(bm), 0),
      },
      lines: game.lines.map((line) => ({
        id: line.id,
        status: line.status,
        ap: getLineAp(line.slots),
        cards: line.slots.map((card) => card ? {
          id: card.id,
          name: card.name,
          type: card.type,
          dept: card.dept,
          tier: card.tier,
          rarity: card.rarity,
          ap: card.ap,
          burn: getCardBurn(card),
          asset: getCardAssetValue(card),
        } : null),
      })),
      hand: game.hand.map((card) => ({
        id: card.id,
        name: card.name,
        type: card.type,
        dept: card.dept,
        tier: card.tier,
        rarity: card.rarity,
        ap: card.ap,
        burn: getCardBurn(card),
      })),
      activeBusinessModels: activeBMs.map((bm) => ({
        id: bm.id,
        name: bm.name,
        cost: getBMMonthlyCost(bm),
        asset: getBMAssetValue(bm),
      })),
      lastSettlement: game.lastSettlement ?? null,
      logHead: game.log?.slice(0, 5) ?? [],
    }

    fetch('http://127.0.0.1:5174/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snapshot),
      keepalive: true,
    }).catch(() => {})
  }, [game, preview, activeLineAp, apLimit])

  useEffect(() => () => {
    window.clearTimeout(hintTimerRef.current)
    window.clearTimeout(handEntryTimerRef.current)
    window.clearTimeout(settlementFxTimerRef.current)
    window.clearTimeout(dissolveTimerRef.current)
  }, [])

  useEffect(() => {
    const inactive = flyingCards.some((fc) => !fc.active)
    if (inactive) {
      // 双 rAF：先让浏览器把"起始帧"（transition:none）真正绘制出来，
      // 下一帧再翻到 active 触发过渡，避免起止帧被合并导致瞬移/僵硬。
      let inner = 0
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => {
          setFlyingCards((prev) => prev.map((fc) => (fc.active ? fc : { ...fc, active: true })))
        })
      })
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
      }
    }
  }, [flyingCards])

  useEffect(() => {
    function handleGlobalButtonSound(event) {
      const button = event.target?.closest?.('button, [role="button"]')
      if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return
      playUiSfx(button.dataset.sfx || 'click')
    }
    window.addEventListener('pointerup', handleGlobalButtonSound)
    return () => window.removeEventListener('pointerup', handleGlobalButtonSound)
  }, [])

  function showHint(message) {
    setHint(message)
    window.clearTimeout(hintTimerRef.current)
    hintTimerRef.current = window.setTimeout(() => setHint(''), 2200)
  }

  function animateNewHand(previousState, nextState) {
    const previousHandUids = new Set(previousState.hand.map((card) => card.uid))
    const newHandUids = nextState.hand
      .map((card) => card.uid)
      .filter((uid) => !previousHandUids.has(uid))
    if (newHandUids.length === 0) return
    setEnteringHandUids(new Set(newHandUids))
    window.clearTimeout(handEntryTimerRef.current)
    handEntryTimerRef.current = window.setTimeout(() => {
      setEnteringHandUids(new Set())
    }, 920 + (newHandUids.length - 1) * 120)
  }

  function commit(result, options = {}) {
    if (!result.ok) {
      playUiSfx('error')
      showHint(result.message)
      return
    }
    if (options.sfx && !options.fx) playUiSfx(options.sfx)
    if (options.fx) {
      const settlement = result.state.lastSettlement
      const nextSettlementFx = buildSettlementFx(settlement)
      playSettlementAudio(nextSettlementFx)
      setSettlementFx(nextSettlementFx)
      setPhaserFxEvent({ type: 'settlement', id: nextSettlementFx.id, settlementFx: nextSettlementFx })
      setIsSettling(true)
      window.clearTimeout(settlementFxTimerRef.current)
      settlementFxTimerRef.current = window.setTimeout(() => {
        setSettlementFx(null)
        setIsSettling(false)
        if (options.animateNewHand) animateNewHand(game, result.state)
        // 月末结算后只展示「结算/晋升」弹窗，董事会会议由玩家点击「进入董事会会议」按钮进入
        // （避免 ResultOverlay 与 BoardMeetingHub 同时挂载、互相遮挡导致按钮失效）
        setGame(result.state)
      }, nextSettlementFx.duration)
      return
    }
    if (options.animateNewHand) animateNewHand(game, result.state)
    setGame(result.state)
  }

  function getEstimatedHandCardRect(card, nextHand) {
    const handFanEl = document.querySelector('.hand-fan')
    if (!handFanEl) return null

    const fanRect = handFanEl.getBoundingClientRect()
    const count = nextHand.length
    const targetIndex = nextHand.findIndex((c) => c.uid === card.uid)
    if (targetIndex === -1) return null

    const center = (count - 1) / 2
    const offset = targetIndex - center
    const spread = Math.round(offset * 18)

    const anyHandCard = document.querySelector('.card-stage.hand')
    let currentScale = 1.32 // fallback scale (1.2 * 1.1)
    let targetTop = fanRect.top + 30 // fallback
    if (anyHandCard) {
      const handCards = Array.from(document.querySelectorAll('.card-stage.hand'))
      const firstHandCardEl = handCards[0]
      if (firstHandCardEl) {
        const firstRect = firstHandCardEl.getBoundingClientRect()
        const firstCardCount = game.hand.length
        const firstCardCenter = (firstCardCount - 1) / 2
        const firstCardOffset = 0 - firstCardCenter
        const firstCardMaxOffset = Math.max(1, firstCardCenter)
        const firstCardRatio = firstCardMaxOffset > 0 ? firstCardOffset / firstCardMaxOffset : 0
        const firstCardLift = Math.round((1 - Math.abs(firstCardRatio)) * 16)

        currentScale = firstRect.width / 134
        const handFanScale = currentScale / 1.2

        // The base top of the hand fan (lift = 0)
        const baseTop = firstRect.top + (firstCardLift * handFanScale)

        // Now calculate target lift
        const maxOffset = Math.max(1, center)
        const ratio = maxOffset > 0 ? offset / maxOffset : 0
        const lift = Math.round((1 - Math.abs(ratio)) * 16)

        targetTop = baseTop - (lift * handFanScale)
      }
    } else {
      targetTop = fanRect.top + 30
    }

    const handFanScale = currentScale / 1.2
    const fanCenterX = fanRect.left + fanRect.width / 2
    const targetCenterX = fanCenterX + (spread * handFanScale)

    const cardW = 134 * currentScale
    const cardH = 200 * currentScale

    return {
      left: targetCenterX - cardW / 2,
      top: targetTop,
      width: cardW,
      height: cardH,
    }
  }

  function runFlyAnimation(cardUid, slotIndex, onComplete) {
    const handCardEl = document.querySelector(`.card-stage.hand[data-card-uid="${cardUid}"]`)
    const slotEl = document.querySelector(`.line-board.active .line-slot.pos-${slotIndex + 1}`)

    if (handCardEl && slotEl) {
      const handRect = handCardEl.getBoundingClientRect()
      const slotRect = slotEl.getBoundingClientRect()

      const handCard = game.hand.find((c) => c.uid === cardUid)
      if (handCard) {
        setIsAnimating(true)

        const startCenterX = handRect.left + handRect.width / 2
        const startCenterY = handRect.top + handRect.height / 2
        const endCenterX = slotRect.left + slotRect.width / 2
        const endCenterY = slotRect.top + slotRect.height / 2

        // 每张手牌按扇形角度不同地绕底边中心旋转（--fan-rotate），其 getBoundingClientRect
        // 宽度会被旋转放大，且放大量随角度变化。若直接用 bbox 宽或固定常数当起始缩放，
        // 只有角度≈0 的那张（第一/中间张）能对准，越往两侧越偏。这里按角度反推真实牌面宽，
        // 得到每张卡各自准确的起始缩放；落点统一用 app-scale（槽位卡为设计尺寸 scale 1.0）。
        const fanRotateDeg = parseFloat(handCardEl.style.getPropertyValue('--fan-rotate')) || 0
        const theta = (Math.abs(fanRotateDeg) * Math.PI) / 180
        const CARD_ASPECT = 200 / 134
        const faceWidth = handRect.width / (Math.cos(theta) + CARD_ASPECT * Math.sin(theta))
        const startScale = faceWidth / 134
        const scalerEl = document.querySelector('.app-scaler')
        const appScale = scalerEl ? (scalerEl.getBoundingClientRect().width / scalerEl.offsetWidth) || 1 : 1
        // 槽位卡为设计尺寸（scale 1.0），但 .line-slot-cell 可能被 CSS 缩放（如缩窄 slot）。
        // 直接读取该缩放，保证落点尺寸与真实槽位卡一致，避免与 CSS 常数脱钩。
        const slotCellEl = slotEl.closest('.line-slot-cell')
        let slotCellScale = 1
        if (slotCellEl) {
          const t = getComputedStyle(slotCellEl).transform
          if (t && t !== 'none') {
            const m = new DOMMatrixReadOnly(t)
            if (m.a) slotCellScale = m.a
          }
        }
        const endScale = appScale * slotCellScale

        // Read fanned rotation from the inline style (fallback to 0deg)
        const startRot = handCardEl.style.getPropertyValue('--fan-rotate') || '0deg'
        const endRot = '0deg'

        // 激活产线整体被 rotateX(7deg) 透视倾斜，槽位卡也随之倾斜。
        // 让飞行卡终点带上相同的透视倾角，直接「贴」到经过透视的槽位上，
        // 避免落点时从平面卡瞬切成倾斜卡的跳变。
        const startTilt = '0deg'
        const endTilt = '7deg'

        const newFly = {
          uid: cardUid,
          card: handCard,
          startX: startCenterX - 67,
          startY: startCenterY - 100,
          endX: endCenterX - 67,
          endY: endCenterY - 100,
          startScale,
          endScale,
          startRot,
          endRot,
          startTilt,
          endTilt,
        }

        setFlyingCards((prev) => [...prev, newFly])

        // 过渡 0.48s + 双 rAF 启动延迟，落点后再换上真实槽位卡，避免提前移除造成的末端瞬跳。
        setTimeout(() => {
          onComplete()
          setIsAnimating(false)
          setFlyingCards((prev) => prev.filter((fc) => fc.uid !== cardUid))
        }, 520)
        return
      }
    }

    onComplete()
  }

  function runReturnFlyAnimation(card, lineId, slotIndex, onComplete) {
    const slotEl = document.querySelector(`.line-board.active .line-slot.pos-${slotIndex + 1}`)

    if (slotEl) {
      const slotRect = slotEl.getBoundingClientRect()
      const nextHand = sortHandDefault([...game.hand, card])
      const targetRect = getEstimatedHandCardRect(card, nextHand)

      if (targetRect) {
        setIsAnimating(true)

        const startCenterX = slotRect.left + slotRect.width / 2
        const startCenterY = slotRect.top + slotRect.height / 2
        const endCenterX = targetRect.left + targetRect.width / 2
        const endCenterY = targetRect.top + targetRect.height / 2

        const endScale = targetRect.width / 134
        // Slot card is scale 1.0, fanned hand card is scale 1.32.
        // So the starting scale at the slot should be exactly endScale / 1.32.
        const startScale = endScale / 1.32

        const startRot = '0deg'

        // Reconstruct target rotation based on fanned index
        const count = nextHand.length
        const targetIndex = nextHand.findIndex((c) => c.uid === card.uid)
        const center = (count - 1) / 2
        const offset = targetIndex - center
        const ratio = count > 1 ? offset / Math.max(1, center) : 0
        const rotate = ratio * 6
        const endRot = `${rotate.toFixed(2)}deg`

        const newFly = {
          uid: card.uid,
          card,
          startX: startCenterX - 67,
          startY: startCenterY - 100,
          endX: endCenterX - 67,
          endY: endCenterY - 100,
          startScale,
          endScale,
          startRot,
          endRot,
        }

        setFlyingCards((prev) => [...prev, newFly])

        setTimeout(() => {
          onComplete()
          setIsAnimating(false)
          setFlyingCards((prev) => prev.filter((fc) => fc.uid !== card.uid))
        }, 450)
        return
      }
    }

    onComplete()
  }

  function handleSlotClick(line, slotIndex) {
    if (isInteractionLocked) return
    if (line.status !== 'planning') return
    if (line.slots[slotIndex]) {
      const card = line.slots[slotIndex]
      runReturnFlyAnimation(card, line.id, slotIndex, () => {
        commit(returnSlotToHand(game, line.id, slotIndex), { sfx: 'card' })
      })
      return
    }
    if (!selectedCard) {
      showHint('先选择一张手牌')
      return
    }
    const cardUid = selectedCard.uid
    runFlyAnimation(cardUid, slotIndex, () => {
      commit(placeCardInSlot(game, cardUid, slotIndex), { sfx: 'place' })
    })
  }

  function handleClearLine() {
    if (isInteractionLocked) return
    const line = getActiveLine(game)
    if (!line || line.status !== 'planning') return

    const cardsToReturn = line.slots.filter(Boolean)
    if (cardsToReturn.length === 0) return

    const nextHand = sortHandDefault([...game.hand, ...cardsToReturn])
    const newFlies = []

    cardsToReturn.forEach((card) => {
      const slotIndex = line.slots.findIndex((c) => c && c.uid === card.uid)
      if (slotIndex === -1) return

      const slotEl = document.querySelector(`.line-board.active .line-slot.pos-${slotIndex + 1}`)
      if (!slotEl) return

      const slotRect = slotEl.getBoundingClientRect()
      const targetRect = getEstimatedHandCardRect(card, nextHand)
      if (!targetRect) return

      const startCenterX = slotRect.left + slotRect.width / 2
      const startCenterY = slotRect.top + slotRect.height / 2
      const endCenterX = targetRect.left + targetRect.width / 2
      const endCenterY = targetRect.top + targetRect.height / 2

      const endScale = targetRect.width / 134
      const startScale = endScale / 1.32

      const startRot = '0deg'

      // Reconstruct target rotation based on fanned index
      const count = nextHand.length
      const targetIndex = nextHand.findIndex((c) => c.uid === card.uid)
      const center = (count - 1) / 2
      const offset = targetIndex - center
      const ratio = count > 1 ? offset / Math.max(1, center) : 0
      const rotate = ratio * 6
      const endRot = `${rotate.toFixed(2)}deg`

      newFlies.push({
        uid: card.uid,
        card,
        startX: startCenterX - 67,
        startY: startCenterY - 100,
        endX: endCenterX - 67,
        endY: endCenterY - 100,
        startScale,
        endScale,
        startRot,
        endRot,
      })
    })

    if (newFlies.length > 0) {
      setIsAnimating(true)
      setFlyingCards((prev) => [...prev, ...newFlies])

      setTimeout(() => {
        commit(clearPlanningLine(game), { sfx: 'card' })
        setIsAnimating(false)
        const flyUids = new Set(newFlies.map((f) => f.uid))
        setFlyingCards((prev) => prev.filter((fc) => !flyUids.has(fc.uid)))
      }, 450)
    } else {
      commit(clearPlanningLine(game))
    }
  }

  function canPlaceCardInSlot(line, slotIndex, card) {
    if (isInteractionLocked || !card) return false
    if (card.type === 'fun') return false
    if (line.id !== game.activeLineId || line.status !== 'planning') return false
    if (line.slots[slotIndex]) return false
    const projectedSlots = line.slots.map((slot, index) => (index === slotIndex ? card : slot))
    return getLineAp(projectedSlots) <= getEffectiveApLimit(game, projectedSlots)
  }

  function handleCardDrop(cardUid, slotIndex) {
    if (isInteractionLocked || !cardUid) return
    runFlyAnimation(cardUid, slotIndex, () => {
      commit(placeCardInSlot(game, cardUid, slotIndex), { sfx: 'place' })
    })
    setDraggingCardUid(null)
  }

  function handleSettle() {
    if (isInteractionLocked) return
    commit(resolveMonth(game), { fx: true, animateNewHand: true })
  }

  // 功能牌：点击即直接打出（单一功能，无需 2 选 1 弹窗）
  // 先播放「整张牌扩散消失」动效，结束后再结算并弹出「xxx 功能已触发」提示。
  function handlePlayFunctionCard(cardUid) {
    if (isInteractionLocked || !cardUid || dissolvingCardUid) return
    const card = game.hand.find((c) => c.uid === cardUid)
    setFunctionCardUid(null)
    setDissolvingCardUid(cardUid)
    playUiSfx('card')
    window.clearTimeout(dissolveTimerRef.current)
    dissolveTimerRef.current = window.setTimeout(() => {
      setDissolvingCardUid(null)
      commit(playFunctionCard(game, cardUid))
      if (card) {
        const desc = (card.actionOptions ?? [])
          .map((o) => o.description)
          .filter(Boolean)
          .join(' / ')
        showHint(`「${card.name}」功能已触发${desc ? `：${desc}` : ''}`)
      }
    }, 560)
  }

  function sortHandByAp() {
    setGame((current) => {
      const sortedHand = [...current.hand].sort((a, b) => {
        if (a.ap !== b.ap) return a.ap - b.ap
        return a.name.localeCompare(b.name, 'zh-CN')
      })
      return { ...current, hand: sortedHand }
    })
  }

  function sortHandByDept() {
    const DEPT_ORDER = { 'R': 1, 'S': 2, 'O': 3, 'NONE': 4 }
    setGame((current) => {
      const sortedHand = [...current.hand].sort((a, b) => {
        const orderA = DEPT_ORDER[a.dept] ?? 99
        const orderB = DEPT_ORDER[b.dept] ?? 99
        if (orderA !== orderB) return orderA - orderB
        if (a.ap !== b.ap) return a.ap - b.ap
        return a.name.localeCompare(b.name, 'zh-CN')
      })
      return { ...current, hand: sortedHand }
    })
  }

  function toggleHandSort() {
    if (isInteractionLocked) return
    if (sortMode === 'ap') {
      sortHandByDept()
      setSortMode('dept')
    } else {
      sortHandByAp()
      setSortMode('ap')
    }
  }

  function handleAutoDeploy() {
    if (isInteractionLocked) return
    commit(autoDeployActiveLine(game), { sfx: 'upgrade' })
  }

  function handleDismissReveal() {
    commit(dismissRecruitReveal(game), { sfx: 'open' })
  }

  function handleDiscard(cardUid) {
    commit(discardFromHand(game, cardUid), { sfx: 'card' })
  }

  function restart() {
    localStorage.removeItem(GAME_STATE_STORAGE_KEY)
    setGame(createInitialState())
    setHint('')
    setDrawer(null)
    setEnteringHandUids(new Set())
    setSettlementFx(null)
    setIsSettling(false)
    setDraggingCardUid(null)
    setComboOpen(false)
    setSettingsOpen(false)
    setCreditsOpen(false)
    setTutorialStep(0)
    setTutorialDone(false)
    window.clearTimeout(settlementFxTimerRef.current)
  }

  function startNewGame() {
    playUiSfx('transition')
    setScreen('profession')
  }

  // 测试入口：直接进入对决期，预置一个活跃 Boss 战
  function startBossTest(archetypeId = 'price-butcher', tier = 2) {
    playUiSfx('transition')
    localStorage.removeItem(GAME_STATE_STORAGE_KEY)
    const base = createInitialState({ profession: 'scientist' })
    // 找到对应 tier 的 schedule
    const scheduleEntry = RIVAL_SCHEDULE.find((s) => s.tier === tier) ?? RIVAL_SCHEDULE[1]
    // 用指定 archetype 构造对手
    const archetype = RIVAL_ARCHETYPES.find((a) => a.id === archetypeId) ?? RIVAL_ARCHETYPES[0]
    const rivalInstance = {
      archetypeId: archetype.id,
      archetypeName: archetype.name,
      archetypeTitle: archetype.title,
      name: archetype.rivalNames[0],
      tier,
      isUltimate: archetypeId === 'ultimate',
      estimatedMonthlyIncome: 200,
      weaknessHint: archetype.weaknessHint,
      flavor: archetype.flavor,
    }
    const battle = createBattle(rivalInstance)
    const testState = {
      ...base,
      // 跳到对决月，给足资金
      cash: 4000,
      valuation: 1200,
      highestValuation: 1200,
      elapsedMonths: scheduleEntry.startElapsedMonth,
      battle,
      defeatedRivals: [],
      log: [`🧪 测试模式：直接进入 ${archetype.name} · ${rivalInstance.name} 对决`, ...base.log],
    }
    setGame(testState)
    setHint('')
    setDrawer(null)
    setEnteringHandUids(new Set())
    setSettlementFx(null)
    setIsSettling(false)
    setDraggingCardUid(null)
    setComboOpen(false)
    setSettingsOpen(false)
    setCreditsOpen(false)
    setTutorialStep(0)
    setTutorialDone(true)  // 跳过新手引导
    window.clearTimeout(settlementFxTimerRef.current)
    setScreen('battle')
  }

  function handleSelectProfession(prof) {
    playUiSfx('transition')
    localStorage.removeItem(GAME_STATE_STORAGE_KEY)
    setGame(createInitialState({ profession: prof }))
    setHint('')
    setDrawer(null)
    setEnteringHandUids(new Set())
    setSettlementFx(null)
    setIsSettling(false)
    setDraggingCardUid(null)
    setComboOpen(false)
    setSettingsOpen(false)
    setCreditsOpen(false)
    setTutorialStep(0)
    setTutorialDone(false)
    window.clearTimeout(settlementFxTimerRef.current)
    setScreen('battle')
  }

  function forcePassLevel() {
    const currentStageIndex = STAGES.findIndex(s => s.id === game.stage.id)
    const nextStage = STAGES[currentStageIndex + 1]
    if (!nextStage) {
      showHint("已经是最高阶段了")
      setSettingsOpen(false)
      return
    }
    setGame((current) => ({
      ...current,
      valuation: nextStage.threshold,
      result: nextStage.id === 9
        ? {
            passed: true,
            gameWon: true,
            reason: '终极胜利',
            bestMonth: current.lastSettlement?.income ?? 0,
          }
        : {
            passed: true,
            stagePromotion: true,
            nextStage: nextStage,
            reason: '估值达标',
            bestMonth: current.lastSettlement?.income ?? 0,
          },
      log: [`强制达成阶段晋升: ${nextStage.name}`, ...current.log].slice(0, 7),
    }))
    setSettingsOpen(false)
  }

  function returnMain() {
    playUiSfx('transition')
    setSettingsOpen(false)
    setComboOpen(false)
    setDrawer(null)
    setScreen('menu')
  }

  // ===== 关间「董事会会议」handler =====

  function handleEnterIntermission() {
    setSettingsOpen(false)
    // 已在董事会会议中（如旧存档/旧逻辑残留）→ 只需收起结算弹窗，露出董事会
    if (game.intermissionState) {
      setGame((current) => ({ ...current, result: null }))
      return
    }
    // 进入董事会会议
    const next = enterIntermission(game)
    if (next.ok) {
      playUiSfx('transition')
      setGame(next.state)
      return
    }
    // 兜底：万一无法进入董事会，也不要把玩家卡死在结算页 —— 提示并退回经营界面
    playUiSfx('error')
    showHint(next.message || '无法进入董事会，已返回经营界面')
    setGame((current) => ({ ...current, result: null }))
  }

  function handleQuickEnterBoardMeeting() {
    playUiSfx('transition')
    setSettingsOpen(false)
    setGame((current) => {
      const currentStageIndex = STAGES.findIndex(s => s.id === current.stage.id)
      const nextStage = STAGES[currentStageIndex + 1]
      if (!nextStage) return current

      const passedState = {
        ...current,
        valuation: nextStage.threshold,
        result: {
          passed: true,
          stagePromotion: true,
          nextStage: nextStage,
          reason: '直接过关',
          bestMonth: current.lastSettlement?.income ?? 0,
        },
        log: [`直接过关 → 董事会`, ...current.log].slice(0, 7),
      }
      const next = enterIntermission(passedState)
      return next.ok ? next.state : passedState
    })
  }

  function handleClearArchive() {
    localStorage.removeItem(GAME_STATE_STORAGE_KEY)
    restart()
    setScreen('menu')
  }

  function handleResolveEvent(optionId) {
    commit(resolveEvent(game, optionId), { sfx: 'choice' })
  }

  function handleShopBuy(slotKey) {
    commit(purchaseShopItem(game, slotKey), { sfx: 'buy' })
  }

  function handleShopRoll() {
    commit(rollShop(game), { sfx: 'roll' })
  }

  function handlePack(packSlotIdx, pickIndex) {
    commit(openPack(game, packSlotIdx, pickIndex), { sfx: pickIndex == null ? 'buy' : 'open' })
  }

  function handleUpgrade(cardUid, mode, affixId) {
    commit(upgradeCard(game, cardUid, mode, affixId), { sfx: 'upgrade' })
  }

  function handleFire(cardUid) {
    commit(dismissCardInBoardMeeting(game, cardUid), { sfx: 'fire' })
  }

  function handleBmBuy(schoolSlotIdx, replaceIdx) {
    commit(purchaseBusinessModel(game, schoolSlotIdx, replaceIdx), { sfx: 'upgrade' })
  }

  function handleSchoolRoll() {
    commit(rollSchool(game), { sfx: 'roll' })
  }

  function handleExitIntermission() {
    commit(exitIntermission(game), { sfx: 'transition' })
  }

  function handleBmUnsubscribe(id) {
    commit(unsubscribeBusinessModel(game, id), { sfx: 'fire' })
  }

  function handleHighlightPick(idx) {
    commit(pickHighlightCard(game, idx), { sfx: 'buy' })
  }

  function handleHighlightDismiss() {
    commit(dismissHighlightCard(game), { sfx: 'transition' })
  }

  function handleOpenCompendium() {
    setSettingsOpen(false)
    setCompendiumReturn('battle')
    setScreen('compendium')
  }

  if (screen === 'menu') {
    return (
      <main className="main-menu-shell">
        <div className="main-menu-bg" aria-hidden="true" />
        <div className="main-menu-light" aria-hidden="true" />
        <img className="main-menu-logo" src="/assets/menu/FR.svg" alt="FRANK'S ADVANTURE" />
        <PhaserMenuFX />
        <section className="main-menu-panel">
          <div className="main-menu-actions">
            <MenuTiltButton onClick={() => {
              if (localStorage.getItem(GAME_STATE_STORAGE_KEY) === null) {
                showHint("没有找到存档，请开始新游戏")
              } else {
                setScreen('battle')
              }
            }}>继续上一局</MenuTiltButton>
            <MenuTiltButton onClick={startNewGame}>开始新游戏</MenuTiltButton>
            <MenuTiltButton onClick={() => { setCompendiumReturn('menu'); setScreen('compendium') }}>图鉴</MenuTiltButton>
            <MenuTiltButton onClick={() => setSettingsOpen(true)}>设置</MenuTiltButton>
            <MenuTiltButton onClick={() => setCreditsOpen(true)}>制作组</MenuTiltButton>
            <MenuTiltButton onClick={() => showHint('浏览器版本请直接关闭页面')}>退出</MenuTiltButton>
          </div>
        </section>
        {settingsOpen && (
          <SettingsOverlay
            onClose={() => setSettingsOpen(false)}
            onRestart={startNewGame}
            onClearArchive={handleClearArchive}
            onOpenCompendium={() => {
              setSettingsOpen(false)
              setCompendiumReturn('menu')
              setScreen('compendium')
            }}
          />
        )}
        {creditsOpen && <CreditsOverlay onClose={() => setCreditsOpen(false)} />}
        {hint && <div className="toast">{hint}</div>}
      </main>
    )
  }

  if (screen === 'compendium') {
    return <CompendiumScreen onClose={() => setScreen(compendiumReturn)} />
  }

  const STAGE_THEMES = {
    1: { color: '#60a5fa', rgb: '96, 165, 250' },
    2: { color: '#34d399', rgb: '52, 211, 153' },
    3: { color: '#3b82f6', rgb: '59, 130, 246' },
    4: { color: '#a78bfa', rgb: '167, 139, 250' },
    5: { color: '#22d3ee', rgb: '34, 211, 238' },
    6: { color: '#9ca3af', rgb: '156, 163, 175' },
    7: { color: '#fbbf24', rgb: '251, 191, 36' },
    8: { color: '#818cf8', rgb: '129, 140, 248' },
    9: { color: '#f472b6', rgb: '244, 114, 182' },
  }
  const currentStageTheme = STAGE_THEMES[game.stage.id] || STAGE_THEMES[1]

  return (
    <FloatingTooltipCtx.Provider value={appTooltip}>
    <LayoutEditCtx.Provider value={{ editMode: layoutEditMode, overrides: layoutOverrides, update: updateLayoutOv, textOverrides, updateText }}>
    <main
      className={`battle-shell stage-theme-${game.stage.id} ${layoutEditMode ? 'layout-editing' : ''}`}
      style={{
        '--stage-accent-color': currentStageTheme.color,
        '--stage-accent-glow': `rgba(${currentStageTheme.rgb}, 0.16)`,
        '--stage-accent-glow-sub': `rgba(${currentStageTheme.rgb}, 0.1)`,
      }}
    >
      <DriftingCheckerboardBackground direction={game.driftDirection} stageId={game.stage.id} />

      {game.battle?.active && (
        <MarketShareBar battle={game.battle} intro={(game.battle.monthsElapsed ?? 0) <= 1} />
      )}

      <TopHud
        game={game}
        preview={preview}
        onCombo={() => setComboOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      <section className="battle-grid">
        <aside className="battle-panel ceo-panel">
          <EditableBlock id="ceo-bizmodels" label="商业模式">
            <ActiveBusinessModelsPanel
              activeBusinessModels={game.activeBusinessModels}
              slotCap={game.businessModelSlotCap}
            />
          </EditableBlock>
          <EditableBlock id="ceo-sort-actions" label="手牌排序">
            <div className="hand-sort-actions">
              <button className="sort-btn" disabled={isInteractionLocked} onClick={toggleHandSort}>
                {sortMode === 'ap' ? '按 AP 排序' : '按部门排序'}
              </button>
              <button className="sort-btn" disabled={isInteractionLocked} onClick={handleAutoDeploy}>
                自动布置产线
              </button>
            </div>
          </EditableBlock>
          <EditableBlock id="ceo-log" label="操作日志">
            <LogList items={game.log} />
          </EditableBlock>
        </aside>

        <section className="arena-panel">
          <div className="arena-floor">
            <div className="floor-grid" />
            <PhaserBattleFX fxEvent={phaserFxEvent} />
            <SettlementCenterFx fx={settlementFx} />

            <EditableBlock id="lineBoard-A" label="产线 A" editable={false}>
              <LineBoard
                line={game.lines[0]}
                activeLineId={game.activeLineId}
                report={preview.reports.find((item) => item.lineId === 'A')}
                fxReport={settlementFx?.reports.find((item) => item.lineId === 'A')}
                onSlotClick={handleSlotClick}
                onSettle={handleSettle}
                onClear={handleClearLine}
                selectedCard={selectedCard}
                draggingCard={game.hand.find((card) => card.uid === draggingCardUid)}
                canPlaceCard={canPlaceCardInSlot}
                onCardDrop={handleCardDrop}
                disabled={isInteractionLocked}
                flyingCardUids={flyingCards.map((fc) => fc.uid)}
              />
            </EditableBlock>
            <EditableBlock id="lineBoard-B" label="产线 B" editable={false}>
              <LineBoard
                line={game.lines[1]}
                activeLineId={game.activeLineId}
                report={preview.reports.find((item) => item.lineId === 'B')}
                fxReport={settlementFx?.reports.find((item) => item.lineId === 'B')}
                onSlotClick={handleSlotClick}
                onSettle={handleSettle}
                onClear={handleClearLine}
                selectedCard={selectedCard}
                draggingCard={game.hand.find((card) => card.uid === draggingCardUid)}
                canPlaceCard={canPlaceCardInSlot}
                onCardDrop={handleCardDrop}
                disabled={isInteractionLocked}
                flyingCardUids={flyingCards.map((fc) => fc.uid)}
              />
            </EditableBlock>
          </div>
        </section>

        <aside className="battle-panel event-panel">
          <div className="event-heading-and-card">
            {game.battle?.active && (
              <EditableBlock id="event-heading" label="事件标题">
                <PanelHeading icon={Skull} title="商战阶段" sub={`T${game.battle.tier}${game.battle.isUltimate ? ' · 终极' : ''}`} tone="威胁" />
              </EditableBlock>
            )}
            <EditableBlock id="event-card" label="事件卡片" editable={false}>
              {game.battle?.active ? (
                <div className="event-card tone-威胁">
                  <strong>{game.battle.rivalName}</strong>
                  <p>{game.battle.weaknessHint}</p>
                  <span>对手月度营收 +¥{game.battle.lastRivalIncome ?? game.battle.estimatedMonthlyIncome ?? 0}</span>
                  <span>你方有效收入 ¥{game.battle.lastEffectivePlayerIncome ?? 0}</span>
                  <span>上月份额变化 {game.battle.lastShareDelta != null ? (game.battle.lastShareDelta >= 0 ? `+${game.battle.lastShareDelta}%` : `${game.battle.lastShareDelta}%`) : '0%'}</span>
                </div>
              ) : (
                <div className="event-newspaper-wrapper">
                  <EventCardNewspaper
                    event={game.event}
                    majorEvent={game.majorEvent}
                    upcomingMajorEvent={game.upcomingMajorEvent}
                    countdown={game.majorEventCountdown}
                    battle={game.battle}
                    upcomingRival={game.upcomingRival}
                    elapsedMonths={game.elapsedMonths}
                  />
                </div>
              )}
            </EditableBlock>
          </div>
          <div className="event-ap-slot">
            <EditableBlock id="event-ap" label="行动力 AP" editable={false}>
              <ActionPowerHud game={game} activeLineAp={activeLineAp} apLimit={apLimit} />
            </EditableBlock>
          </div>
          {game.battle?.active && (
            <EditableBlock id="event-preview" label="年度大事件">
              <BossEventPreview
                majorEvent={game.majorEvent}
                upcomingMajorEvent={game.upcomingMajorEvent}
                countdown={game.majorEventCountdown}
                tooltipCtx={appTooltip}
                battle={game.battle}
                upcomingRival={game.upcomingRival}
                elapsedMonths={game.elapsedMonths}
              />
            </EditableBlock>
          )}


        </aside>

      </section>

      <footer className="hand-dock">
        <EditableBlock id="hand-fan" label="手牌区" editable={false}>
          <div className="hand-fan">
            {(() => {
              const selectedIndex = game.hand.findIndex((c) => c.uid === game.selectedCardUid)
              return game.hand.map((card, index) => (
                <CardView
                  key={card.uid}
                  card={card}
                  entering={enteringHandUids.has(card.uid)}
                  selected={game.selectedCardUid === card.uid}
                  dragging={draggingCardUid === card.uid}
                  dissolving={dissolvingCardUid === card.uid}
                  mode="hand"
                  draggable={game.discardRequired === 0 && !isInteractionLocked && card.type !== 'fun'}
                  onDragStart={(event) => {
                    if (card.type === 'fun') return
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', card.uid)
                    setDraggingCardUid(card.uid)
                  }}
                  onDragEnd={() => setDraggingCardUid(null)}
                  style={{
                    ...getHandCardStyle(index, game.hand.length, selectedIndex),
                    '--enter-delay': `${Math.max(0, [...enteringHandUids].indexOf(card.uid)) * 70}ms`,
                    ...(flyingCards.some((fc) => fc.uid === card.uid) ? { opacity: 0, pointerEvents: 'none' } : {}),
                  }}
                  onClick={() => {
                    if (isInteractionLocked) return
                    if (game.discardRequired > 0) {
                      handleDiscard(card.uid)
                      return
                    }
                    if (card.type === 'fun') {
                      handlePlayFunctionCard(card.uid)
                      return
                    }
                    setGame((current) => ({
                      ...current,
                      selectedCardUid: current.selectedCardUid === card.uid ? null : card.uid,
                    }))
                  }}
                />
              ))
            })()}
          </div>
        </EditableBlock>

        <EditableBlock id="hand-meta" label="牌堆信息" editable={false}>
          <div className="hand-meta">
            <DeckButton icon={Layers3} label="牌堆" count={game.drawPile.length} onClick={() => setDrawer('deck')} />
            <DeckButton icon={Archive} label="冷却" count={game.coolingPile.length} onClick={() => setDrawer('cooling')} />
            <HandCount discardRequired={game.discardRequired} handCount={game.hand.length} />
          </div>
        </EditableBlock>
      </footer>

      {hint && <div className="toast">{hint}</div>}
      {!tutorialDone && game.stage.id === 1 && game.month === 1 && !game.result && !game.intermissionState && (
        <TutorialOverlay
          step={tutorialStep}
          onNext={() => {
            if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
              handleTutorialDone()
              return
            }
            setTutorialStep((current) => current + 1)
          }}
          onSkip={handleTutorialDone}
        />
      )}
      {game.revealedRecruitCard && (
        <RecruitPackReveal card={game.revealedRecruitCard} onClose={handleDismissReveal} />
      )}
      {comboOpen && <ComboRulesOverlay onClose={() => setComboOpen(false)} />}
      {settingsOpen && (
        <SettingsOverlay
          onClose={() => setSettingsOpen(false)}
          onRestart={restart}
          onClearArchive={handleClearArchive}
          onPass={forcePassLevel}
          onMain={returnMain}
          canEnterBoardMeeting={!game.intermissionState && game.stage.id < 9}
          onEnterBoardMeeting={handleQuickEnterBoardMeeting}
          onOpenCompendium={handleOpenCompendium}
          onEditLayout={openLayoutEdit}
          onTestBoss={(archetypeId, tier) => {
            setSettingsOpen(false)
            startBossTest(archetypeId, tier)
          }}
        />
      )}
      {Array.isArray(game.highlightPending) && game.highlightPending.length > 0 && (
        <HighlightModal
          candidates={game.highlightPending}
          onPick={handleHighlightPick}
          onDismiss={handleHighlightDismiss}
        />
      )}
      {game.result && !game.intermissionState && (
        <ResultOverlay
          game={game}
          onRestart={restart}
          onEnterIntermission={handleEnterIntermission}
        />
      )}
      {flyingCards.map((fc) => {
        const x = fc.active ? fc.endX : fc.startX
        const y = fc.active ? fc.endY : fc.startY
        const scale = fc.active ? fc.endScale : fc.startScale
        const rot = fc.active ? (fc.endRot || '0deg') : (fc.startRot || '0deg')
        const tilt = fc.active ? (fc.endTilt || '0deg') : (fc.startTilt || '0deg')
        const transition = fc.active
          ? 'transform 0.48s cubic-bezier(0.22, 0.61, 0.36, 1)'
          : 'none'

        return (
          <div
            key={fc.uid}
            className="flying-card-overlay"
            style={{
              transform: `translate(${x}px, ${y}px) perspective(900px) rotateX(${tilt}) rotate(${rot}) scale(${scale})`,
              transition,
              transformOrigin: 'center center',
              willChange: 'transform',
            }}
          >
            <CardView card={fc.card} mode="flying" />
          </div>
        )
      })}
      {drawer && <PileDrawer title={drawer === 'deck' ? '牌堆' : '冷却池'} cards={drawer === 'deck' ? game.drawPile : game.coolingPile} onClose={() => setDrawer(null)} />}

      {game.intermissionState && (
        <BoardMeetingHub
          game={game}
          onResolveEvent={handleResolveEvent}
          onShopBuy={handleShopBuy}
          onShopRoll={handleShopRoll}
          onPack={handlePack}
          onUpgrade={handleUpgrade}
          onFire={handleFire}
          onBmBuy={handleBmBuy}
          onSchoolRoll={handleSchoolRoll}
          onBmUnsubscribe={handleBmUnsubscribe}
          onExit={handleExitIntermission}
        />
      )}

      {layoutEditMode && (
        <LayoutEditorBar
          onSave={saveLayout}
          onReset={resetLayout}
          onExit={() => setLayoutEditMode(false)}
        />
      )}

      {screen === 'profession' && (
        <ProfessionSelectScreen
          onSelect={handleSelectProfession}
          onBack={() => {
            playUiSfx('transition')
            setScreen('menu')
          }}
        />
      )}
      {appTooltip.renderTooltip()}
    </main>
    </LayoutEditCtx.Provider>
    </FloatingTooltipCtx.Provider>
  )
}

// 仪表式数字：目标值变化时，从当前值缓动滚动到新值（上下变化过程）
function AnimatedNumber({ value, duration = 700, format = (n) => n, className = '' }) {
  const [display, setDisplay] = useState(value)
  const displayRef = useRef(value)
  const rafRef = useRef(0)
  const [dir, setDir] = useState(0)

  useEffect(() => {
    const from = displayRef.current
    const to = value
    if (from === to) return
    setDir(to > from ? 1 : -1)
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      const current = Math.round(from + (to - from) * eased)
      displayRef.current = current
      setDisplay(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        displayRef.current = to
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  const isRolling = display !== value
  return (
    <span className={`metric-rolling ${isRolling ? (dir > 0 ? 'up' : 'down') : ''} ${className}`}>
      {format(display)}
    </span>
  )
}

function TopHud({ game, preview, onCombo, onSettings }) {
  const currentStageIndex = STAGES.findIndex((stage) => stage.id === game.stage.id)
  const nextStage = STAGES[currentStageIndex + 1] ?? null

  const dateStr = `${game.year}.${String(game.month).padStart(2, '0')}`;

  // Valuation breakdown: V = cash×0.35 + (cardAsset + bmAsset)×1.4 + recent 3-month avg positive profit×5
  const allCards = getAllCards(game)
  let cardAssetSum = 0
  for (const card of allCards) {
    cardAssetSum += getCardAssetValue(card)
  }
  let bmAssetSum = 0
  if (game.activeBusinessModels) {
    for (const slot of game.activeBusinessModels) {
      const bm = BUSINESS_MODELS.find((b) => b.id === slot.id)
      if (bm) {
        bmAssetSum += getBMAssetValue(bm)
      }
    }
  }
  const cashValue = Math.round(Math.max(0, game.cash) * 0.35)
  const assetValue = Math.round((cardAssetSum + bmAssetSum) * 1.4)
  const profitSamples = (game.profitHistory?.length ? game.profitHistory.slice(-3) : [game.lastMonthProfit ?? 0])
    .map((profit) => Math.max(0, profit ?? 0))
  const avgProfit = profitSamples.length
    ? profitSamples.reduce((sum, profit) => sum + profit, 0) / profitSamples.length
    : 0
  const profitValue = Math.round(avgProfit * 5)
  const totalV = game.valuation

  const minV = game.stage.threshold;
  const maxV = nextStage ? nextStage.threshold : game.stage.threshold;
  const range = maxV - minV;
  const pct = range > 0 ? Math.min(100, Math.max(0, ((totalV - minV) / range) * 100)) : 100;

  // Cash warn
  const isCashWarn = game.cash < preview.maintenance * 1.5;

  const stageTargetValuation = nextStage ? nextStage.threshold : game.stage.threshold
  const stageRemainingV = nextStage ? Math.max(0, nextStage.threshold - totalV) : 0
  const isAboveThreshold = nextStage ? (totalV >= nextStage.threshold) : false

  const tooltipCtx = React.useContext(FloatingTooltipCtx)

  return (
    <header className="top-hud">
      <EditableBlock id="hud-brand" label="品牌标题">
        <div
          className="brand-mark brand-mark-hoverable"
          onPointerEnter={(e) => tooltipCtx.showTooltip(
            <div>
              <div className="tooltip-title">公司发展阶段</div>
              <div>当前阶段: {game.stage.theme}期（{game.stage.name}）</div>
              {nextStage ? (
                <>
                  <div className="tooltip-divider" />
                  <div>当前估值: V {totalV}</div>
                  <div>晋升门槛: V {stageTargetValuation}</div>
                  <div>估值进度: {totalV} / {stageTargetValuation}</div>
                  <div className="tooltip-divider" />
                  {isAboveThreshold ? (
                    <div style={{ color: '#42d77d' }}>
                      本月估值已达标，月末结算后进入董事会。
                    </div>
                  ) : (
                    <div>
                      还需提升估值: <strong style={{ color: '#ff3366', textShadow: 'none' }}>V {stageRemainingV}</strong>
                      {"\n"}达到门槛后，月末结算即可进入董事会。
                    </div>
                  )}
                  <div className="tooltip-divider" />
                  <div>下一阶段: {nextStage.theme}期（{nextStage.name}）</div>
                  <div>晋升奖励: 一次性现金 +¥{nextStage.entryGrant}</div>
                </>
              ) : (
                <>
                  <div className="tooltip-divider" />
                  <div style={{ color: '#ffe000', fontWeight: 'bold' }}>已达到最高融资阶段！</div>
                  <div>最终目标估值: V 80,000 (行业第一)</div>
                </>
              )}
            </div>,
            e
          )}
          onPointerMove={tooltipCtx.updateTooltip}
          onPointerLeave={tooltipCtx.hideTooltip}
        >
          <div>
            <strong><EditableText id="hud-brand-title">{`${game.stage.theme}期（${game.stage.name}）`}</EditableText></strong>
            <span className="brand-mark-date">{dateStr}</span>
          </div>
        </div>
      </EditableBlock>
      <div className="hud-stats-group">
        <EditableBlock id="hud-valuation" label="HUD · 估值">
          <div
            className="hud-item hud-valuation-progress"
            onPointerEnter={(e) => tooltipCtx.showTooltip(
              <div>
                <div className="tooltip-title">估值分析 (V = 现金×0.35 + 资产×1.4 + 近 3 月均利×5)</div>
                <div>现金价值: ¥{cashValue}</div>
                <div>资产价值: ¥{assetValue} (员工卡 ¥{cardAssetSum} + BM ¥{bmAssetSum}) × 1.4</div>
                <div>利润质量: ¥{profitValue} (近 3 月平均 ¥{Math.round(avgProfit)} × 5)</div>
                <div className="tooltip-divider" />
                <div>下一阶段: {nextStage ? `${nextStage.name} (门槛 V ${maxV})` : '已达最高阶段'}</div>
              </div>,
              e
            )}
            onPointerMove={tooltipCtx.updateTooltip}
            onPointerLeave={tooltipCtx.hideTooltip}
          >
            <img className="hud-icon-img" src="/assets/ui-icons/cumulative-cash.png" alt="" aria-hidden="true" />
            <span><EditableText id="hud-valuation-label">估值</EditableText></span>
            <div className="valuation-progress-container">
              <strong>V <AnimatedNumber value={totalV} />{nextStage ? ` / ${maxV}` : ''}</strong>
              <div className="stage-progress-track">
                <div className="stage-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </EditableBlock>

        <EditableBlock id="hud-cash" label="HUD · 现金">
          <div
            className={`hud-item hud-cash ${isCashWarn ? 'warn' : ''}`}
            onPointerEnter={(e) => tooltipCtx.showTooltip(
              <div>
                <div className="tooltip-title">现金 (生命线)</div>
                <div>现金余额: ¥{game.cash}</div>
                <div className="tooltip-warn">⚠ 月末 cash &lt; 0 即破产 game over</div>
                <div className="tooltip-divider" />
                <div>本阶段现金转化率 CCR: {Math.round((preview.ccr ?? 0.7) * 100)}%</div>
                <div>下月预估利润: {preview.profit >= 0 ? `+¥${preview.profit}` : `-¥${Math.abs(preview.profit)}`}</div>
                <div>预估入账 (利润×CCR): {preview.cashGain >= 0 ? `+¥${preview.cashGain}` : `-¥${Math.abs(preview.cashGain)}`}</div>
                <div>月度运营成本: -¥{preview.monthlyOpCost ?? 0}</div>
                <div className="tooltip-divider" />
                <div>预估现金变化: {preview.cashDelta >= 0 ? `+¥${preview.cashDelta}` : `-¥${Math.abs(preview.cashDelta)}`}</div>
              </div>,
              e
            )}
            onPointerMove={tooltipCtx.updateTooltip}
            onPointerLeave={tooltipCtx.hideTooltip}
          >
            <img className="hud-icon-img" src="/assets/ui-icons/cash.png" alt="" aria-hidden="true" />
            <span><EditableText id="hud-cash-label">现金</EditableText></span>
            <strong>¥<AnimatedNumber value={game.cash} /></strong>
          </div>
        </EditableBlock>

        <EditableBlock id="hud-opcost" label="HUD · 月度运营成本">
          <div
            className="hud-item hud-opcost"
            onPointerEnter={(e) => tooltipCtx.showTooltip(
              <div>
                <div className="tooltip-title">月度运营成本</div>
                <div>员工 &amp; BM 维持费: ¥{preview.maintenance}</div>
                <div>月度运营成本: ¥{preview.monthlyOpCost ?? 0}</div>
                <div className="tooltip-divider" />
                <div>合计每月支出: ¥{(preview.maintenance ?? 0) + (preview.monthlyOpCost ?? 0)}</div>
              </div>,
              e
            )}
            onPointerMove={tooltipCtx.updateTooltip}
            onPointerLeave={tooltipCtx.hideTooltip}
          >
            <img className="hud-icon-img" src="/assets/ui-icons/hand-staff.png" alt="" aria-hidden="true" />
            <span><EditableText id="hud-opcost-label">月度运营成本</EditableText></span>
            <strong>-¥{(preview.maintenance ?? 0) + (preview.monthlyOpCost ?? 0)}</strong>
          </div>
        </EditableBlock>

      </div>
      <EditableBlock id="hud-actions" label="操作按钮">
        <div className="hud-actions">
          <button
            className="top-icon-button"
            onClick={onCombo}
            aria-label="Combo 规则"
            onPointerEnter={(e) => tooltipCtx.showTooltip('Combo 规则', e)}
            onPointerMove={tooltipCtx.updateTooltip}
            onPointerLeave={tooltipCtx.hideTooltip}
          >
            <img src="/assets/ui-icons/combo-rules.png" alt="" aria-hidden="true" />
          </button>
          <button
            className="top-icon-button"
            onClick={onSettings}
            aria-label="设置"
            onPointerEnter={(e) => tooltipCtx.showTooltip('设置', e)}
            onPointerMove={tooltipCtx.updateTooltip}
            onPointerLeave={tooltipCtx.hideTooltip}
          >
            <img src="/assets/ui-icons/settings.png" alt="" aria-hidden="true" />
          </button>
        </div>
      </EditableBlock>
    </header>
  )
}

function ActionPowerHud({ game, activeLineAp, apLimit }) {
  const tooltipCtx = React.useContext(FloatingTooltipCtx)
  const serviceBonus = apLimit - game.apAvailable

  return (
    <div
      className="hud-item hud-ap event-ap-card"
      onPointerEnter={(e) => tooltipCtx.showTooltip(
        <div>
          <div className="tooltip-title">行动力 (AP) 组成</div>
          <div>已分配: {activeLineAp} / {apLimit} AP</div>
          <div className="tooltip-divider" />
          <div>基础 AP: {GAME_CONFIG.baseAp} AP</div>
          <div>跨月保留: +{game.apCarry} AP</div>
          <div>事件调整: {game.event.apDelta >= 0 ? `+${game.event.apDelta}` : `${game.event.apDelta}`} AP</div>
          {serviceBonus !== 0 && (
            <div>产线服务卡加成: {serviceBonus >= 0 ? `+${serviceBonus}` : `${serviceBonus}`} AP</div>
          )}
          {game.apAvailable - GAME_CONFIG.baseAp - game.apCarry - (game.event.apDelta ?? 0) > 0 && (
            <div>商业模式加成: +{game.apAvailable - GAME_CONFIG.baseAp - game.apCarry - (game.event.apDelta ?? 0)} AP</div>
          )}
        </div>,
        e
      )}
      onPointerMove={tooltipCtx.updateTooltip}
      onPointerLeave={tooltipCtx.hideTooltip}
    >
      <img className="hud-icon-img" src="/assets/ui-icons/ap.png" alt="" aria-hidden="true" />
      <span><EditableText id="event-ap-label">行动力</EditableText></span>
      <strong>{activeLineAp}/{apLimit}</strong>
    </div>
  )
}

// 紧凑版：放在 event-panel 里，沿用 preview-card hud-item 字体风格
// 优先级：对决进行中 > 商战即将开始 > 年度大事件
function BossEventPreview({ majorEvent, upcomingMajorEvent, countdown, tooltipCtx, battle, upcomingRival, elapsedMonths }) {
  const tierLabels = { 1: '轻度', 2: '中度', 3: '高度', 4: '重度', 5: '毁灭级' }

  // 优先 1：对决进行中 → 显示距离商战结束
  if (battle && battle.active) {
    const battleRemaining = Math.max(0, 6 - (battle.monthsElapsed ?? 0))
    const tier = battle.tier ?? 1
    return (
      <div
        className={`preview-card hud-item boss-preview boss-preview-active boss-tier-${tier}`}
        onPointerEnter={(e) => tooltipCtx.showTooltip(
          <div>
            <div className="tooltip-title">商战 · 进行中</div>
            <div>对手: {battle.archetypeName} · {battle.rivalName}</div>
            <div>难度: T{tier}{battle.isUltimate ? ' · 终极' : ''}</div>
            <div className="tooltip-divider" />
            <div>剩余月数 {battleRemaining} 月内未把对手压到 ≤20% 即超时撤离</div>
          </div>, e)}
        onPointerMove={tooltipCtx.updateTooltip}
        onPointerLeave={tooltipCtx.hideTooltip}
      >
        <span className="boss-preview-label">
          <Skull size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          距离商战结束
        </span>
        <strong>{battleRemaining} 个月</strong>
        <em>T{tier} {tierLabels[tier] ?? ''}{battle.isUltimate ? ' · 终极' : ''}</em>
      </div>
    )
  }

  // 优先 2：商战即将开战
  if (upcomingRival) {
    const monthsToStart = Math.max(0, (upcomingRival.startElapsedMonth ?? 0) - (elapsedMonths ?? 0))
    const tier = upcomingRival.tier ?? 1
    return (
      <div
        className={`preview-card hud-item boss-preview boss-preview-warn boss-tier-${tier}`}
        onPointerEnter={(e) => tooltipCtx.showTooltip(
          <div>
            <div className="tooltip-title">商战倒计时</div>
            <div>对手: {upcomingRival.archetypeName} · {upcomingRival.name}</div>
            <div>难度: T{tier}{upcomingRival.isUltimate ? ' · 终极' : ''}</div>
            <div>预估月收入: ¥{upcomingRival.estimatedMonthlyIncome}</div>
            <div className="tooltip-divider" />
            <div>💡 {upcomingRival.weaknessHint}</div>
          </div>, e)}
        onPointerMove={tooltipCtx.updateTooltip}
        onPointerLeave={tooltipCtx.hideTooltip}
      >
        <span className="boss-preview-label">
          <AlertTriangle size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          商战倒计时
        </span>
        <strong>{monthsToStart} 个月</strong>
        <em>T{tier} {tierLabels[tier] ?? ''}{upcomingRival.isUltimate ? ' · 终极' : ''}</em>
      </div>
    )
  }

  // 优先 3：年度大事件（保留原逻辑）
  const buildTooltip = (ev, label) => (
    <div>
      <div className="tooltip-title">{label}</div>
      {ev && <><div>事件: {ev.name}</div><div>难度: T{ev.tier}（{tierLabels[ev.tier] ?? ''}）</div><div className="tooltip-divider" /></>}
      {(ev?.effectLines ?? []).map((l) => <div key={l}>{l}</div>)}
      {!ev && <div>每隔 12 个月触发一次年度大事件，难度逐年递增。提前 3 个月预警。</div>}
    </div>
  )

  if (majorEvent) {
    const remaining = majorEvent.remainingMonths ?? 0
    const tier = majorEvent.tier ?? 1
    return (
      <div
        className={`preview-card hud-item boss-preview boss-preview-active boss-tier-${tier}`}
        onPointerEnter={(e) => tooltipCtx.showTooltip(buildTooltip(majorEvent, '年度大事件 · 进行中'), e)}
        onPointerMove={tooltipCtx.updateTooltip}
        onPointerLeave={tooltipCtx.hideTooltip}
      >
        <span className="boss-preview-label">
          <Skull size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          年度大事件 · 进行中
        </span>
        <strong>{majorEvent.name}</strong>
        <em>剩余 {remaining} 个月 · T{tier} {tierLabels[tier] ?? ''}</em>
      </div>
    )
  }

  if (upcomingMajorEvent && countdown > 0 && countdown <= 3) {
    const tier = upcomingMajorEvent.tier ?? 1
    return (
      <div
        className={`preview-card hud-item boss-preview boss-preview-warn boss-tier-${tier}`}
        onPointerEnter={(e) => tooltipCtx.showTooltip(buildTooltip(upcomingMajorEvent, '大事件预警'), e)}
        onPointerMove={tooltipCtx.updateTooltip}
        onPointerLeave={tooltipCtx.hideTooltip}
      >
        <span className="boss-preview-label">
          <AlertTriangle size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          大事件预警
        </span>
        <strong>{upcomingMajorEvent.name}</strong>
        <em>{countdown} 个月后触发 · T{tier} {tierLabels[tier] ?? ''}</em>
      </div>
    )
  }

  return (
    <div
      className="preview-card hud-item boss-preview boss-preview-idle"
      onPointerEnter={(e) => tooltipCtx.showTooltip(buildTooltip(null, '年度大事件'), e)}
      onPointerMove={tooltipCtx.updateTooltip}
      onPointerLeave={tooltipCtx.hideTooltip}
    >
      <span className="boss-preview-label">
        <AlertTriangle size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
        年度大事件
      </span>
      <strong>{countdown ?? 12} 个月</strong>
      <em>距下次触发 · 难度逐年递增</em>
    </div>
  )
}


function PanelHeading({ icon: Icon, title, sub, tone = '', textId }) {
  return (
    <div className={`panel-heading ${tone ? `tone-${tone}` : ''}`}>
      <Icon size={18} />
      <div>
        <strong>{textId ? <EditableText id={`${textId}-title`}>{title}</EditableText> : title}</strong>
        <span>{textId ? <EditableText id={`${textId}-sub`}>{sub}</EditableText> : sub}</span>
      </div>
    </div>
  )
}

function Metric({ label, value, tone = '' }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

// 把 getBoundingClientRect 的视觉坐标换算成 .app-scaler 内的设计画布坐标
function rectInDesignCanvas(target) {
  const r = target.getBoundingClientRect()
  const scaler = document.querySelector('.app-scaler')
  if (!scaler) return { x: r.left, y: r.top, w: r.width, h: r.height }
  const sRect = scaler.getBoundingClientRect()
  const sx = sRect.width / scaler.offsetWidth
  const sy = sRect.height / scaler.offsetHeight
  if (!sx || !sy) return { x: r.left, y: r.top, w: r.width, h: r.height }
  return {
    x: (r.left - sRect.left) / sx,
    y: (r.top - sRect.top) / sy,
    w: r.width / sx,
    h: r.height / sy,
  }
}

// 把鼠标 clientX/Y（视觉坐标）换算成设计画布坐标
function clientToDesign(clientX, clientY) {
  const scaler = document.querySelector('.app-scaler')
  if (!scaler) return { x: clientX, y: clientY }
  const sRect = scaler.getBoundingClientRect()
  const sx = sRect.width / scaler.offsetWidth
  const sy = sRect.height / scaler.offsetHeight
  if (!sx || !sy) return { x: clientX, y: clientY }
  return {
    x: (clientX - sRect.left) / sx,
    y: (clientY - sRect.top) / sy,
  }
}

// 设计画布尺寸 (与 main.jsx 同步)
const DESIGN_CANVAS_W = 1920
const DESIGN_CANVAS_H = 1080

function TutorialOverlay({ step, onNext, onSkip }) {
  const item = TUTORIAL_STEPS[step] ?? TUTORIAL_STEPS[0]
  const isLast = step >= TUTORIAL_STEPS.length - 1
  const [rect, setRect] = useState(null)
  const cardRef = useRef(null)

  // 测量目标 DOM 元素位置（每帧轮询 + window resize，避免错过元素挂载时机）
  useEffect(() => {
    let raf = 0
    let active = true
    function measure() {
      if (!active) return
      const target = document.querySelector(item.targetSelector)
      if (target) {
        setRect(rectInDesignCanvas(target))
      } else {
        setRect(null)
      }
      raf = window.requestAnimationFrame(measure)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => {
      active = false
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', measure)
    }
  }, [item.targetSelector])

  // 根据 placement 计算卡片浮现位置 + 箭头朝向
  const placement = item.placement || 'bottom'
  const CARD_W = 440
  const CARD_GAP = 24
  let cardX = 0
  let cardY = 0
  let arrowAxis = 'top'
  if (rect) {
    const cx = rect.x + rect.w / 2
    const cy = rect.y + rect.h / 2
    if (placement === 'bottom') {
      cardX = cx - CARD_W / 2
      cardY = rect.y + rect.h + CARD_GAP
      arrowAxis = 'top'
    } else if (placement === 'top') {
      cardX = cx - CARD_W / 2
      cardY = rect.y - CARD_GAP // CSS 用 transform translate(0,-100%) 把卡片放到上方
      arrowAxis = 'bottom'
    } else if (placement === 'left') {
      cardX = rect.x - CARD_W - CARD_GAP
      cardY = cy
      arrowAxis = 'right'
    } else if (placement === 'right') {
      cardX = rect.x + rect.w + CARD_GAP
      cardY = cy
      arrowAxis = 'left'
    }
    // 防止溢出屏幕 (设计画布坐标，1920×1080)
    const margin = 16
    cardX = Math.max(margin, Math.min(cardX, DESIGN_CANVAS_W - CARD_W - margin))
  } else {
    // 找不到目标 → 居中显示 (设计画布中央)
    cardX = DESIGN_CANVAS_W / 2 - CARD_W / 2
    cardY = DESIGN_CANVAS_H / 2
    arrowAxis = 'none'
  }

  // 焦点圈跟随目标 rect（加 12px padding 让圈比元素大一圈）
  const focusStyle = rect
    ? {
        '--focus-cx': `${rect.x + rect.w / 2}px`,
        '--focus-cy': `${rect.y + rect.h / 2}px`,
        '--focus-w': `${rect.w + 24}px`,
        '--focus-h': `${rect.h + 24}px`,
      }
    : { '--focus-cx': '50%', '--focus-cy': '50%', '--focus-w': '160px', '--focus-h': '160px' }

  return (
    <div className={`tutorial-overlay placement-${placement}`} style={focusStyle}>
      {/* 镂空高亮目标的描边 */}
      {rect && (
        <div
          className="tutorial-focus-ring"
          style={{
            left: rect.x - 6,
            top: rect.y - 6,
            width: rect.w + 12,
            height: rect.h + 12,
          }}
          aria-hidden="true"
        />
      )}
      <section
        ref={cardRef}
        className={`tutorial-card arrow-${arrowAxis}`}
        style={{
          left: `${cardX}px`,
          top: `${cardY}px`,
          width: `${CARD_W}px`,
        }}
      >
        <span>CEO BOOTCAMP · {step + 1}/{TUTORIAL_STEPS.length}</span>
        <strong>{item.title}</strong>
        <p>{item.body}</p>
        <div className="tutorial-actions">
          <button className="tutorial-skip" onClick={onSkip}>跳过 (反正你迟早会重开)</button>
          <button className="tutorial-next" onClick={onNext}>{isLast ? '入职报到 ▸' : '下一条 ▸'}</button>
        </div>
        <i className="tutorial-arrow" aria-hidden="true" />
      </section>
    </div>
  )
}

function ActiveBusinessModelsPanel({ activeBusinessModels, slotCap }) {
  const slots = Array.from({ length: slotCap }, (_, i) => activeBusinessModels[i] || null)
  const tooltipCtx = React.useContext(FloatingTooltipCtx)
  return (
    <section className="active-bm-panel">
      <div className="active-bm-heading">
        <strong>商业模式</strong>
        <span>{activeBusinessModels.length}/{slotCap}</span>
      </div>
      <div className="active-bm-list">
        {slots.map((slot, i) => {
          if (!slot) {
            return <div key={i} className="active-bm-empty"><span>空槽位</span></div>
          }
          const bm = BUSINESS_MODELS.find((b) => b.id === slot.id)
          if (!bm) return null
          return (
            <div
              key={i}
              className={`active-bm-card rarity-${bm.rarity} hook-${bm.hook}`}
              onPointerEnter={(e) => tooltipCtx.showTooltip(
                <div>
                  <div className="tooltip-title">{bm.name}</div>
                  <div>{bm.description}</div>
                  {bm.flavor && (
                    <>
                      <div className="tooltip-divider" />
                      <div style={{ fontStyle: 'italic', color: '#fff4bd', opacity: 0.8 }}>"{bm.flavor}"</div>
                    </>
                  )}
                </div>,
                e
              )}
              onPointerMove={tooltipCtx.updateTooltip}
              onPointerLeave={tooltipCtx.hideTooltip}
            >
              <BusinessModelSvg id={bm.id} className="active-bm-image" />
              <span className="active-bm-film" aria-hidden="true" />
              <div className="active-bm-card-top">
                <strong>{bm.name}</strong>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function LogList({ items }) {
  return (
    <div className="log-list">
      {items.map((item, index) => (
        <span
          key={`${item}-${items.length - index}`}
          className={index === 0 ? 'newest' : ''}
          style={{
            '--type-chars': Math.max(8, item.length),
          }}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

// 放置箭头颜色深浅：按所选卡在该槽位的区位加成强弱（1.5 深 / 1.3 稍深 / 其余 浅）
function placementAdvClass(slotIndex, card) {
  if (!card) return 'adv-none'
  const buff = getPositionalBuff(slotIndex, card.dept)
  if (buff >= 1.45) return 'adv-strong'
  if (buff >= 1.25) return 'adv-mid'
  return 'adv-none'
}

function LineBoard({
  line,
  activeLineId,
  report,
  fxReport,
  selectedCard,
  draggingCard,
  canPlaceCard,
  onSlotClick,
  onCardDrop,
  onSettle,
  onClear,
  disabled,
  flyingCardUids = [],
}) {
  const isActive = line.id === activeLineId && line.status === 'planning'
  const statusLabel = getLineStatus(line, isActive)
  const activeCombos = report?.combos ?? []
  const hasCombo = activeCombos.length > 0
  const tooltipCtx = React.useContext(FloatingTooltipCtx)
  return (
    <>
    <section className={`line-board ${isActive ? 'active' : ''} ${line.status}`}>
      <EditableBlock id={`line-${line.id}-rail`} label={`产线 ${line.id} · 轨道栏`}>
        <div className="line-rail">
          <Factory size={17} />
          <strong>产线 {line.id}</strong>
          <span>{statusLabel}</span>
          <em>¥{report?.total ?? 0}</em>
        </div>
      </EditableBlock>
      <EditableBlock id={`line-${line.id}-slots`} label={`产线 ${line.id} · 卡槽排`} editable={false}>
        <div className="slot-row">
          {hasCombo && (
            <div className="line-combo-hint">已触发 combo：{activeCombos.join('、')}</div>
          )}
          {line.slots.map((card, index) => {
            const slotOutput = report?.slotResults[index]?.output
            const canPlaceSelected = canPlaceCard(line, index, selectedCard)
            const canDropDragged = canPlaceCard(line, index, draggingCard)
            const fxSlot = fxReport?.slotResults?.[index]
            return (
              <div className="line-slot-cell" key={`${line.id}-${index}`}>
                {card && hasCombo && <span className="slot-combo-flash" aria-hidden="true" />}
                <button
                  className={`line-slot pos-${index + 1} ${card ? 'filled' : ''} ${card && hasCombo ? 'combo-glow' : ''} ${canPlaceSelected ? 'can-place' : ''} ${canDropDragged ? 'drop-ready' : ''}`}
                  data-line-id={line.id}
                  data-slot-idx={index}
                  onClick={() => onSlotClick(line, index)}
                  onDragOver={(event) => {
                    if (!canDropDragged) return
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    const cardUid = event.dataTransfer.getData('text/plain')
                    if (canDropDragged) onCardDrop(cardUid, index)
                  }}
                >
                  <span className="slot-label">{SLOT_LABELS[index]}</span>
                  {canPlaceSelected && (
                    <span
                      className={`placement-arrow ${placementAdvClass(index, selectedCard)}`}
                      aria-hidden="true"
                    >
                      <span className="arrow-blade" />
                      <span className="arrow-blade arrow-blade-cross" />
                    </span>
                  )}
                  {card ? (
                    <CardView
                      card={card}
                      mode="slot"
                      outputOverride={slotOutput}
                      style={flyingCardUids.includes(card.uid) ? { opacity: 0, pointerEvents: 'none' } : undefined}
                    />
                  ) : (
                    <i>{slotRole(index)}</i>
                  )}
                  {slotOutput > 0 && <b>¥{slotOutput}</b>}
                </button>
                {fxSlot?.animateSlotFx && fxSlot.output > 0 && (
                  <div
                    className="slot-fx-number"
                    style={{
                      '--fx-delay': `${fxSlot.fxDelay}ms`,
                      '--fx-scale': fxSlot.fxScale,
                    }}
                  >
                    <span>+¥{fxSlot.output}</span>
                  </div>
                )}
              </div>
            )
          })}

          {isActive && (
            <EditableBlock id={`line-${line.id}-actions`} label={`产线 ${line.id} · 操作按钮`}>
              <div className="line-actions" aria-label="产线操作">
                <button
                  className="line-action-button start"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation()
                    onSettle()
                  }}
                  onPointerEnter={(e) => tooltipCtx.showTooltip("启动工作", e)}
                  onPointerMove={tooltipCtx.updateTooltip}
                  onPointerLeave={tooltipCtx.hideTooltip}
                  aria-label="启动工作"
                  title="启动工作"
                >
                  <Play size={22} />
                </button>
                <button
                  className="line-action-button clear"
                  disabled={disabled}
                  onClick={(event) => {
                    event.stopPropagation()
                    onClear()
                  }}
                  onPointerEnter={(e) => tooltipCtx.showTooltip("清空工位", e)}
                  onPointerMove={tooltipCtx.updateTooltip}
                  onPointerLeave={tooltipCtx.hideTooltip}
                  aria-label="清空工位"
                  title="清空工位"
                >
                  <Trash2 size={21} />
                </button>
              </div>
            </EditableBlock>
          )}

          {!isActive && (
            <div className="line-capacity" aria-label={`产线 ${line.id} 产能`}>
              <small>产能</small>
              <b>¥{report?.total ?? 0}</b>
            </div>
          )}
        </div>
      </EditableBlock>
    </section>
    {fxReport?.lineTotalFx && (
      <div
        className={`line-total-fx line-total-${line.id}`}
        style={{
          '--fx-delay': `${fxReport.lineTotalFx.delay}ms`,
        }}
        aria-hidden="true"
      >
        <span>总产值</span>
        <strong>+¥{fxReport.lineTotalFx.total}</strong>
      </div>
    )}
    </>
  )
}

function SettlementCenterFx({ fx }) {
  const items = fx?.centerFx ?? []
  if (!items.length) return null
  return (
    <div className="settlement-center-fx" aria-hidden="true">
      {items.map((item) => (
        <div
          key={item.id}
          className={`slot-fx-number settlement-center-number ${item.kind}`}
          style={{
            '--fx-delay': `${item.delay}ms`,
            '--fx-scale': item.kind === 'total' ? 2.84 : 1,
          }}
        >
          <small>{item.label}</small>
          <span>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

function buildSettlementFx(settlement) {
  const reports = settlement?.lineReports ?? []
  const activeLineId = settlement?.activeLineId ?? reports[0]?.lineId
  const allOutputs = reports.flatMap((report) => report.slotResults.map((slot) => slot.output ?? 0))
  const maxOutput = Math.max(1, ...allOutputs)
  const slotStep = 230
  const slotDuration = 760
  let order = 0
  const fxReports = reports.map((report) => ({
    ...report,
    slotResults: report.slotResults.map((slot) => {
      if (report.lineId !== activeLineId || !slot.card || slot.output <= 0) return { ...slot, fxDelay: 0, animateSlotFx: false }
      const fxDelay = order * slotStep
      const fxScale = (0.82 + Math.min(1.75, Math.sqrt(slot.output / maxOutput) * 1.15)).toFixed(2)
      order += 1
      return { ...slot, fxDelay, fxScale, animateSlotFx: true }
    }),
  }))
  let sequenceOrder = order
  const centerFx = []
  const reportsWithLineTotals = fxReports.map((report) => {
    if (report.lineId === activeLineId || report.total <= 0) return report
    const lineTotalFx = {
      delay: sequenceOrder * slotStep + 120,
      total: report.total,
    }
    sequenceOrder += 1
    return { ...report, lineTotalFx }
  })
  const reportsWithMultiplier = reportsWithLineTotals.map((report) => {
    const hasOutput = report.slotResults.some((slot) => slot.card && slot.output > 0)
    if (!hasOutput) return report
    const rawSlotSum = Math.max(1, report.slotResults.reduce((sum, slot) => sum + (slot.output ?? 0), 0))
    const multiplier = Math.max(report.lineMultiplier ?? 1, report.total / rawSlotSum)
    const multFx = {
      delay: sequenceOrder * slotStep + 120,
      value: formatFxMultiplier(multiplier),
    }
    centerFx.push({
      id: `mult-${report.lineId}`,
      kind: 'mult',
      label: '倍率',
      value: `×${multFx.value}`,
      delay: multFx.delay,
    })
    sequenceOrder += 1
    return { ...report, multFx }
  })
  const slotEndDelay = sequenceOrder > 0 ? (sequenceOrder - 1) * slotStep + slotDuration : 0
  const gain = settlement?.income ?? 0
  centerFx.push({
    id: 'total',
    kind: 'total',
    label: '本月总收入',
    value: `${gain >= 0 ? '+' : '-'}¥${Math.abs(gain)}`,
    delay: slotEndDelay + 120,
  })
  return {
    id: Date.now(),
    reports: reportsWithMultiplier,
    centerFx,
    totalFx: {
      delay: slotEndDelay + 120,
      gain,
    },
    duration: slotEndDelay + 1300,
  }
}

function formatFxMultiplier(value) {
  if (!Number.isFinite(value)) return '1'
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

// ============================================================================
// 音量设置 (module 级，localStorage 持久化)
// ============================================================================
const AUDIO_VOLUME = { master: 0.7, sfx: 0.6 }

try {
  const stored = JSON.parse(window.localStorage.getItem('fa-audio-volume') || 'null')
  if (stored && typeof stored === 'object') {
    if (typeof stored.master === 'number') AUDIO_VOLUME.master = Math.max(0, Math.min(1, stored.master))
    if (typeof stored.sfx === 'number') AUDIO_VOLUME.sfx = Math.max(0, Math.min(1, stored.sfx))
  }
} catch {}

export function setAudioVolume(next) {
  if (typeof next.master === 'number') AUDIO_VOLUME.master = Math.max(0, Math.min(1, next.master))
  if (typeof next.sfx === 'number') AUDIO_VOLUME.sfx = Math.max(0, Math.min(1, next.sfx))
  try {
    window.localStorage.setItem('fa-audio-volume', JSON.stringify(AUDIO_VOLUME))
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent('fa-audio-volume-change'))
  } catch {}
}

function getEffectiveSfxGain() {
  return AUDIO_VOLUME.master * AUDIO_VOLUME.sfx
}

function playSettlementAudio(fx) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return
  const sfxLevel = getEffectiveSfxGain()
  if (sfxLevel <= 0.001) return  // 静音直接跳过
  const ctx = new AudioContextClass()
  const notes = [261.63, 293.66, 329.63, 392.0, 523.25]
  const now = ctx.currentTime
  notes.forEach((freq, index) => {
    const start = now + index * 0.18
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(0.055 * sfxLevel, start + 0.018)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + 0.18)
  })
  const boom = ctx.createOscillator()
  const boomGain = ctx.createGain()
  const boomStart = now + Math.max(0.65, (fx?.reports?.length ?? 1) * 0.12)
  boom.type = 'sawtooth'
  boom.frequency.setValueAtTime(110, boomStart)
  boom.frequency.exponentialRampToValueAtTime(55, boomStart + 0.28)
  boomGain.gain.setValueAtTime(0.0001, boomStart)
  boomGain.gain.exponentialRampToValueAtTime(0.09 * sfxLevel, boomStart + 0.02)
  boomGain.gain.exponentialRampToValueAtTime(0.0001, boomStart + 0.36)
  boom.connect(boomGain).connect(ctx.destination)
  boom.start(boomStart)
  boom.stop(boomStart + 0.38)
  window.setTimeout(() => ctx.close(), 1800)
}

/** 设置面板试听用：短促一声 */
function playVolumeBlip() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return
  const sfxLevel = getEffectiveSfxGain()
  if (sfxLevel <= 0.001) return
  const ctx = new AudioContextClass()
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(523.25, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.08 * sfxLevel, now + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.2)
  window.setTimeout(() => ctx.close(), 400)
}

function playUiSfx(type = 'click') {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return
  const sfxLevel = getEffectiveSfxGain()
  if (sfxLevel <= 0.001) return

  const presets = {
    click: { wave: 'square', notes: [740], length: 0.045, gain: 0.025 },
    card: { wave: 'triangle', notes: [420, 360], length: 0.06, gap: 0.045, gain: 0.032 },
    place: { wave: 'triangle', notes: [360, 520], length: 0.07, gap: 0.05, gain: 0.04 },
    buy: { wave: 'square', notes: [523, 659, 784], length: 0.06, gap: 0.055, gain: 0.035 },
    open: { wave: 'sawtooth', notes: [392, 587, 880], length: 0.075, gap: 0.05, gain: 0.035 },
    roll: { wave: 'square', notes: [330, 440, 330, 554], length: 0.04, gap: 0.035, gain: 0.026 },
    choice: { wave: 'triangle', notes: [494, 740], length: 0.08, gap: 0.06, gain: 0.035 },
    upgrade: { wave: 'square', notes: [523, 659, 784, 1047], length: 0.065, gap: 0.055, gain: 0.04 },
    transition: { wave: 'triangle', notes: [220, 330, 440], length: 0.12, gap: 0.075, gain: 0.035 },
    fire: { wave: 'sawtooth', notes: [220, 146], length: 0.11, gap: 0.06, gain: 0.035 },
    error: { wave: 'sawtooth', notes: [170, 130], length: 0.09, gap: 0.05, gain: 0.035 },
  }
  const preset = presets[type] ?? presets.click
  const ctx = new AudioContextClass()
  const now = ctx.currentTime
  const total = preset.notes.length * (preset.gap ?? 0.05) + preset.length + 0.05

  preset.notes.forEach((freq, index) => {
    const start = now + index * (preset.gap ?? 0.05)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = preset.wave
    osc.frequency.setValueAtTime(freq, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(preset.gain * sfxLevel, start + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + preset.length)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start)
    osc.stop(start + preset.length + 0.02)
  })

  window.setTimeout(() => ctx.close(), Math.ceil(total * 1000) + 80)
}

function getLineStatus(line, isActive) {
  if (isActive) return '可布置'
  if (line.status === 'working') return `生产中 · ${line.workingMonthsLeft} 月`
  return '待轮转'
}

function slotRole(index) {
  if (index === 0) return '启动'
  if (index === 2) return '中枢'
  if (index === 4) return '收割'
  return '工位'
}

function getHandCardStyle(index, count, selectedIndex = -1) {
  const center = (count - 1) / 2
  const offset = index - center
  const maxOffset = Math.max(1, center)
  const ratio = offset / maxOffset
  const lift = Math.round((1 - Math.abs(ratio)) * 16)
  const depth = Math.round((index + 1) * 3 + (1 - Math.abs(ratio)) * 8)
  const rotate = ratio * 3.5
  const yaw = -4 + ratio * 0.5
  const spread = Math.round(offset * 12)
  const enterSway = Math.round(ratio * -90)
  const stackBias = index

  let selectShift = 0
  if (selectedIndex !== -1 && index !== selectedIndex) {
    const shiftAmount = 55
    selectShift = index < selectedIndex ? -shiftAmount : shiftAmount
  }

  const fanX = spread + selectShift
  const fanHoverX = spread + Math.round(ratio * 5) + selectShift

  return {
    '--fan-x': `${fanX}px`,
    '--fan-rotate': `${rotate.toFixed(2)}deg`,
    '--fan-yaw': `${yaw.toFixed(2)}deg`,
    '--fan-lift': `${-lift}px`,
    '--fan-depth': `${depth}px`,
    '--enter-sway': `${enterSway}px`,
    '--fan-hover-rotate': `${(rotate * 0.36).toFixed(2)}deg`,
    '--fan-hover-yaw': `${(yaw * 0.72).toFixed(2)}deg`,
    '--fan-hover-x': `${fanHoverX}px`,
    '--fan-hover-lift': `${-(lift + 10)}px`,
    '--fan-hover-depth': `${depth + 16}px`,
    zIndex: Math.round(100 + stackBias * 4 + (1 - Math.abs(ratio)) * 8),
  }
}


function PackMarket({ packs, budget, used, onOpen, textId }) {
  const visiblePackCount = used ? 0 : packs.length
  return (
    <section className="recruit-market pack-market">
      <div className="active-bm-heading pack-market-heading">
        <strong>{textId ? <EditableText id={`${textId}-title`}>招聘卡包</EditableText> : '招聘卡包'}</strong>
        <span>({visiblePackCount}/3)</span>
      </div>
      <div className="pack-list">
        {!used && packs.map((pack) => {
          const canAfford = budget >= pack.cost
          return (
            <button
              key={pack.uid}
              className="pack-card"
              style={{ '--pack-color': pack.color }}
              disabled={!canAfford}
              onClick={() => onOpen(pack.uid)}
            >
              <span className="pack-shine" aria-hidden="true" />
              <PackBox3D variant={pack.svgVariant} />
              <strong className="pack-name">{pack.name}</strong>
              <span className="pack-price">{canAfford ? `¥${pack.cost}` : '¥不足'}</span>
            </button>
          )
        })}
        {used && (
          <div className="candidate-empty">
            <strong>本月招聘已完成</strong>
            <span>下月刷新 5 选 3 新卡包</span>
          </div>
        )}
      </div>
    </section>
  )
}

function RecruitPackReveal({ card, onClose }) {
  const [phase, setPhase] = useState('opening') // opening → revealed
  useEffect(() => {
    const t = window.setTimeout(() => setPhase('revealed'), 640)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className={`recruit-reveal-overlay ${phase}`} onClick={onClose}>
      <div className="recruit-reveal-sparkles" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className={`spark spark-${i}`} />
        ))}
      </div>
      <div className="recruit-reveal-glow" aria-hidden="true" />
      <div
        className={`recruit-reveal-card-wrap ${phase}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="reveal-banner">挖 到 啦</div>
        <CardView card={card} mode="reveal" />
        <button className="reveal-confirm" onClick={onClose}>收入牌堆 ▸</button>
      </div>
    </div>
  )
}

function DeckButton({ label, count, onClick }) {
  const isCooling = label === '冷却'
  const metaLabel = isCooling ? '休息' : '名册'
  const tooltipCtx = React.useContext(FloatingTooltipCtx)
  const tipText = isCooling ? '休息员工' : '员工名册'
  return (
    <button
      className="deck-button"
      onClick={onClick}
      aria-label={tipText}
      onPointerEnter={(e) => tooltipCtx.showTooltip(tipText, e)}
      onPointerMove={tooltipCtx.updateTooltip}
      onPointerLeave={tooltipCtx.hideTooltip}
    >
      <span className="meta-word-icon" aria-hidden="true">{metaLabel}</span>
      <span className="meta-copy">
        <strong>{count}</strong>
      </span>
    </button>
  )
}

function HandCount({ discardRequired, handCount }) {
  const tooltipCtx = React.useContext(FloatingTooltipCtx)
  return (
    <div
      className={`hand-title ${discardRequired > 0 ? 'discard-alert' : ''}`}
      aria-label="手牌"
      onPointerEnter={(e) => tooltipCtx.showTooltip("手牌", e)}
      onPointerMove={tooltipCtx.updateTooltip}
      onPointerLeave={tooltipCtx.hideTooltip}
    >
      {discardRequired > 0 ? (
        <span className="meta-word-icon discard-badge" aria-hidden="true">需弃牌 {discardRequired}</span>
      ) : (
        <span className="meta-word-icon" aria-hidden="true">手牌</span>
      )}
      <span className="meta-copy">
        <strong>{handCount}/{GAME_CONFIG.handLimit}</strong>
      </span>
    </div>
  )
}

// v4: 5 个产线 Combo 的定义与说明（与 engine.js detectCombos 一一对应）
// 统一表述为「最终结算倍数」：先把每张卡产值算好，再在整线产值上乘 combo 倍数。
const V4_COMBO_DEFS = [
  {
    id: 'brother2',
    name: '好兄弟',
    rarity: 'common',
    trigger: '同部门同级别 2 人（如：销售专员＋销售专员）',
    formula: '整线产值 ×1.2',
    example: '整线 ¥100 → ¥120',
  },
  {
    id: 'brother3',
    name: '超级好兄弟',
    rarity: 'rare',
    trigger: '同部门同级别 3 人（如：销售专员 ×3）',
    formula: '整线产值 ×1.5',
    example: '整线 ¥100 → ¥150',
  },
  {
    id: 'brother4',
    name: '世界最好兄弟',
    rarity: 'epic',
    trigger: '同部门同级别 4 人（如：销售专员 ×4）',
    formula: '整线产值 ×2',
    example: '整线 ¥100 → ¥200',
  },
  {
    id: 'crossDept',
    name: '跨部门协作',
    rarity: 'rare',
    trigger: '不同部门的同级别 3 人（如：销售专员＋研发专员＋运营专员）',
    formula: '整线产值 ×1.4（＋下月抽 1）',
    example: '整线 ¥100 → ¥140',
  },
  {
    id: 'deptMobilize',
    name: '部门出动',
    rarity: 'elite',
    trigger: '同部门连续三级相邻（如：销售专员＋销售经理＋销售总监）',
    formula: '整线产值 ×1.6',
    example: '整线 ¥100 → ¥160',
  },
  {
    id: 'allHands',
    name: '全员出动',
    rarity: 'legendary',
    trigger: '五个槽位均为同一部门的人',
    formula: '整线产值 ×2.5',
    example: '整线 ¥100 → ¥250',
  },
]

function ComboRulesOverlay({ onClose }) {
  return (
    <div className="modal-backdrop retro-backdrop" onMouseDown={onClose}>
      <section className="retro-panel combo-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="retro-title">
          <strong>6 个产线 Combo · 公式速查</strong>
          <button onClick={onClose}>返回</button>
        </div>
        <p className="combo-formula-head">
          最终产值 ＝（各卡产值之和）<b> × combo 倍数</b>　·　combo 自动检测，多个倍数连乘
        </p>
        <ol className="combo-rule-list">
          {V4_COMBO_DEFS.map((c, i) => (
            <li key={c.id} className={`combo-rule-item rarity-${c.rarity}`}>
              <span className="combo-rule-idx">{i + 1}</span>
              <span className="combo-rule-name">{c.name}</span>
              <span className="combo-rule-trigger">{c.trigger}</span>
              <span className="combo-rule-formula">{c.formula}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function SettingsOverlay({ onClose, onRestart, onClearArchive, onPass, onMain, onEnterBoardMeeting, canEnterBoardMeeting, onOpenCompendium, onEditLayout, onTestBoss }) {
  const [master, setMaster] = useState(() => AUDIO_VOLUME.master)
  const [sfx, setSfx] = useState(() => AUDIO_VOLUME.sfx)
  const [bossPickerOpen, setBossPickerOpen] = useState(false)
  const blipTimerRef = useRef(null)

  function handleMasterChange(value) {
    setMaster(value)
    setAudioVolume({ master: value })
    queueBlip()
  }
  function handleSfxChange(value) {
    setSfx(value)
    setAudioVolume({ sfx: value })
    queueBlip()
  }
  function queueBlip() {
    window.clearTimeout(blipTimerRef.current)
    blipTimerRef.current = window.setTimeout(() => playVolumeBlip(), 80)
  }

  return (
    <div className="modal-backdrop retro-backdrop" onMouseDown={onClose}>
      <section className="retro-panel settings-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="retro-title">
          <strong>设置</strong>
        </div>
        <div className="settings-volume">
          <VolumeSlider label="音量" value={master} onChange={handleMasterChange} />
          <VolumeSlider label="音效" value={sfx} onChange={handleSfxChange} />
        </div>
        <button onClick={onClose}>返回</button>
        {onEditLayout && <button className="settings-edit-layout-btn" onClick={onEditLayout}>✎ 编辑布局</button>}
        {onOpenCompendium && <button onClick={onOpenCompendium}>图鉴</button>}
        {onRestart && <button onClick={onRestart}>重新开始</button>}
        {onClearArchive && <button onClick={onClearArchive}>清除存档并重开</button>}
        {onPass && <button onClick={onPass}>直接过关 → 结算画面</button>}
        {canEnterBoardMeeting && (
          <button onClick={onEnterBoardMeeting}>直接进入董事会会议</button>
        )}
        {onTestBoss && <button onClick={() => setBossPickerOpen(true)}>🧪 测试 Boss 战</button>}
        {onMain && <button onClick={onMain}>返回主界面</button>}
      </section>
      {bossPickerOpen && onTestBoss && (
        <BossTestPicker
          onPick={(archetypeId, tier) => {
            setBossPickerOpen(false)
            onTestBoss(archetypeId, tier)
          }}
          onCancel={() => setBossPickerOpen(false)}
        />
      )}
    </div>
  )
}

function BossTestPicker({ onPick, onCancel }) {
  const [tier, setTier] = useState(2)
  return (
    <div className="modal-backdrop retro-backdrop" style={{ zIndex: 200 }} onMouseDown={onCancel}>
      <section className="retro-panel settings-panel" style={{ maxWidth: 480 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="retro-title">
          <strong>🧪 选择测试对手</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '8px 0' }}>
          <span style={{ fontSize: 13, color: '#aab4c8' }}>难度 Tier:</span>
          {[1, 2, 3, 4, 5].map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              style={{
                padding: '4px 12px',
                background: tier === t ? '#ffd060' : 'transparent',
                color: tier === t ? '#2a1a00' : '#e6ecf5',
                border: '1.5px solid #ffd060',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 'bold',
              }}
            >
              T{t}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 8 }}>
          {RIVAL_ARCHETYPES.map((a) => (
            <button
              key={a.id}
              onClick={() => onPick(a.id, a.id === 'ultimate' ? 5 : tier)}
              style={{
                padding: '12px 10px',
                background: 'rgba(20, 30, 50, 0.7)',
                border: a.id === 'ultimate' ? '2px solid #ffd060' : '2px solid #ff5566',
                color: '#e6ecf5',
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 12,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 'bold', color: a.id === 'ultimate' ? '#ffd060' : '#ff8090', marginBottom: 4 }}>
                {a.name} {a.id === 'ultimate' && '· 终极'}
              </div>
              <div style={{ color: '#aab4c8', fontSize: 11, marginBottom: 4 }}>{a.title}</div>
              <div style={{ color: '#c8d4e8', fontSize: 10, lineHeight: 1.4 }}>{a.flavor}</div>
            </button>
          ))}
        </div>
        <button onClick={onCancel}>取消</button>
      </section>
    </div>
  )
}

function VolumeSlider({ label, value, onChange }) {
  const pct = Math.round(value * 100)
  return (
    <label className="volume-slider">
      <span className="volume-slider-label">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
      <span className="volume-slider-value">{pct}</span>
    </label>
  )
}

// ============================================================
// EditableBlock — drag + resize + scale wrapper for battle layout editor
// ============================================================
function EditableBlock({ id, label, children, editable = true, editZIndex = 100, dragPlate = false }) {
  const { editMode, overrides, update } = React.useContext(LayoutEditCtx)
  const elRef = React.useRef(null)
  if (!editable) return <>{children}</>

  const ov = _resolveLayoutOverride(id, overrides)

  const elemScale = ov.scale ?? 1

  // Build override style (applied even outside edit mode for saved state)
  const style = {}
  const hasMoved = ov.dx != null || ov.dy != null
  const hasScale  = ov.scale != null && ov.scale !== 1
  if (hasMoved || hasScale) {
    style.transform = `translate(${ov.dx ?? 0}px, ${ov.dy ?? 0}px) scale(${elemScale})`
    style.transformOrigin = 'top left'
  }
  if (ov.w != null) style.width = `${ov.w}px`
  if (ov.h != null) style.height = `${ov.h}px`
  if (editMode) {
    style.position = 'relative'
    style.zIndex = editZIndex
    style.overflow = 'visible'
  }

  function startPointerDrag(type, event) {
    if (!editMode) return
    if (event.pointerId != null) {
      try { elRef.current?.setPointerCapture?.(event.pointerId) } catch {}
    }
    event.preventDefault()
    event.stopPropagation()
    const appScale = parseFloat(
      document.documentElement.style.getPropertyValue('--app-scale') || '1'
    ) || 1
    const rect = elRef.current.getBoundingClientRect()
    const naturalW = rect.width / appScale
    const naturalH = rect.height / appScale
    const startOv = {
      dx: ov.dx ?? 0,
      dy: ov.dy ?? 0,
      w: ov.w ?? naturalW,
      h: ov.h ?? naturalH,
      scale: elemScale,
    }
    const drag = { type, startCX: event.clientX, startCY: event.clientY, startOv, appScale }

    function onMove(e) {
      const ddx = (e.clientX - drag.startCX) / drag.appScale
      const ddy = (e.clientY - drag.startCY) / drag.appScale
      const s = drag.startOv
      const next = { ...s }
      if (drag.type === 'move') {
        next.dx = s.dx + ddx
        next.dy = s.dy + ddy
      } else {
        if (drag.type.includes('e')) next.w = Math.max(80, s.w + ddx)
        if (drag.type.includes('s')) next.h = Math.max(40, s.h + ddy)
        if (drag.type.includes('w')) { next.dx = s.dx + ddx; next.w = Math.max(80, s.w - ddx) }
        if (drag.type.includes('n')) { next.dy = s.dy + ddy; next.h = Math.max(40, s.h - ddy) }
      }
      update(id, next)
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (event.pointerId != null) {
        try { elRef.current?.releasePointerCapture?.(event.pointerId) } catch {}
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function adjustScale(delta) {
    const next = Math.max(0.1, Math.min(5, parseFloat((elemScale + delta).toFixed(2))))
    update(id, { ...ov, scale: next })
  }

  function shouldStartBlockMove(event) {
    const target = event.target
    if (!(target instanceof Element)) return true
    return !target.closest(
      '.edit-handle, .edit-scale-ctrl, .edit-reset-btn, .editable-text-field, button, input, textarea, select, a'
    )
  }

  if (!editMode) {
    const hasOverride = hasMoved || hasScale || ov.w != null || ov.h != null
    if (!hasOverride) return <>{children}</>
    return (
      <div ref={elRef} style={{ height: '100%', minHeight: 0, ...style }}>
        {children}
      </div>
    )
  }

  const HANDLES = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
  return (
    <div
      ref={elRef}
      className="edit-block"
      data-edit-id={id}
      style={style}
      onPointerDown={(e) => {
        if (shouldStartBlockMove(e)) startPointerDrag('move', e)
      }}
    >
      {dragPlate && (
        <div
          className="edit-drag-plate"
          onPointerDown={(e) => startPointerDrag('move', e)}
        />
      )}
      {/* Move bar */}
      <div className="edit-move-bar" onPointerDown={(e) => startPointerDrag('move', e)}>
        <div className="edit-move-grip">
          <span className="edit-move-icon">✥</span>
          <span className="edit-move-label">{label}</span>
        </div>
        <div className="edit-scale-ctrl" onPointerDown={e => e.stopPropagation()}>
          <button className="edit-scale-btn" onClick={() => adjustScale(-0.05)}>−</button>
          <span className="edit-scale-value">{elemScale.toFixed(2)}×</span>
          <button className="edit-scale-btn" onClick={() => adjustScale(+0.05)}>+</button>
        </div>
        <span className="edit-reset-btn" onPointerDown={(e) => {
          e.stopPropagation()
          const next = { ...ov }
          delete next.dx; delete next.dy; delete next.w; delete next.h; delete next.scale
          update(id, next)
        }}>↺</span>
      </div>
      {/* 8 resize handles */}
      {HANDLES.map(dir => (
        <div
          key={dir}
          className={`edit-handle edit-h-${dir}`}
          onPointerDown={(e) => startPointerDrag(dir, e)}
        />
      ))}
      {children}
    </div>
  )
}

// ============================================================
// EditableText — inline text editor for layout edit mode
// ============================================================
function EditableText({ id, children }) {
  const { editMode, textOverrides, updateText } = React.useContext(LayoutEditCtx)
  const stored = textOverrides[id]
  const display = stored ?? children
  if (!editMode) return <>{display}</>
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      className="editable-text-field"
      onBlur={e => {
        const val = e.currentTarget.textContent
        updateText(id, val !== '' ? val : children)
      }}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() } }}
      onPointerDown={e => e.stopPropagation()}
    >
      {display}
    </span>
  )
}

// ============================================================
// LayoutEditorBar — floating toolbar shown in edit mode
// ============================================================
function LayoutEditorBar({ onSave, onReset, onExit }) {
  return (
    <div className="layout-editor-bar">
      <span className="layout-editor-title">✎ 布局编辑模式</span>
      <span className="layout-editor-hint">金条拖动位置 · 边角调整大小 · [−/+] 矢量缩放 · 点击文字直接编辑</span>
      <div className="layout-editor-actions">
        <button className="layout-btn layout-btn-save" onClick={onSave}>💾 保存布局</button>
        <button className="layout-btn layout-btn-reset" onClick={onReset}>↺ 重置默认</button>
        <button className="layout-btn layout-btn-exit" onClick={onExit}>✕ 退出编辑</button>
      </div>
    </div>
  )
}

function MenuTiltButton({ onClick, children }) {
  function handleMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    // 反向倾斜：鼠标向右 → 卡左仰；上 → 后仰
    const tiltY = (x - 0.5) * 14    // rotateY 沿 X 轴
    const tiltX = (0.5 - y) * 9     // rotateX 沿 Y 轴
    event.currentTarget.style.setProperty('--btn-tilt-x', `${tiltX.toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--btn-tilt-y', `${tiltY.toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--btn-glare-x', `${Math.round(x * 100)}%`)
    event.currentTarget.style.setProperty('--btn-glare-y', `${Math.round(y * 100)}%`)
  }
  function handleLeave(event) {
    event.currentTarget.style.setProperty('--btn-tilt-x', '0deg')
    event.currentTarget.style.setProperty('--btn-tilt-y', '0deg')
    event.currentTarget.style.setProperty('--btn-glare-x', '50%')
    event.currentTarget.style.setProperty('--btn-glare-y', '25%')
  }
  return (
    <button
      className="menu-tilt-btn-wrap"
      onPointerDown={(event) => {
        if (event.button === 0) {
          event.preventDefault()
          onClick?.(event)
        }
      }}
      onClick={(event) => {
        onClick?.(event)
      }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div className="menu-tilt-btn-inner">
        {children}
      </div>
    </button>
  )
}

const CREDITS_SECTIONS = [
  { kind: 'logo', lines: ['A FRANK FAN', 'PRODUCTION'] },
  { kind: 'spacer' },
  { kind: 'title', lines: ['制 作 组', '— STAFF ROLL —'] },
  { kind: 'spacer' },

  { kind: 'role', heading: '总 监 制', rows: [['Executive Producer', 'Frank Fan']] },
  { kind: 'role', heading: '执 行 制 作', rows: [['Producer', 'Frank Fan']] },
  { kind: 'spacer' },

  { kind: 'role', heading: '游戏设计 · GAME DESIGN', rows: [
    ['主策划 · Lead Design', 'Frank Fan'],
    ['系统策划 · Systems', 'Frank Fan'],
    ['数值策划 · Balance', 'Frank Fan'],
    ['关卡设计 · Level', 'Frank Fan'],
    ['剧情编剧 · Narrative', 'Frank Fan'],
  ]},
  { kind: 'spacer' },

  { kind: 'role', heading: '美术 · ART', rows: [
    ['美术总监 · Art Director', 'Frank Fan'],
    ['角色像素 · Character Pixel', 'Frank Fan'],
    ['UI 设计 · UI Design', 'Frank Fan'],
    ['图标绘制 · Iconography', 'Frank Fan'],
    ['特效设计 · VFX', 'Frank Fan'],
  ]},
  { kind: 'spacer' },

  { kind: 'role', heading: '音频 · AUDIO', rows: [
    ['音乐总监 · Music Director', 'Frank Fan'],
    ['作曲 · Composer', 'Frank Fan'],
    ['音效 · Sound Design', 'Frank Fan'],
    ['混音 · Mixing', 'Frank Fan'],
  ]},
  { kind: 'spacer' },

  { kind: 'role', heading: '程序 · ENGINEERING', rows: [
    ['主程序 · Lead Engineer', 'Frank Fan'],
    ['战斗系统 · Battle System', 'Frank Fan'],
    ['UI 工程 · UI Engineering', 'Frank Fan'],
    ['工具链 · Tooling', 'Frank Fan'],
    ['AI 协作 · AI Pair', 'Codex / Claude'],
  ]},
  { kind: 'spacer' },

  { kind: 'role', heading: '测试 · QA', rows: [
    ['首席测试 · Lead QA', '你'],
    ['压力测试 · Stress Test', '你'],
    ['平衡测试 · Playtest', '你'],
    ['Bug Hunter', '你'],
  ]},
  { kind: 'spacer' },

  { kind: 'role', heading: '发行 · PUBLISHING', rows: [
    ['发行 · Publisher', '也许是你'],
    ['市场推广 · Marketing', '也许是你'],
    ['社区运营 · Community', '也许是你'],
    ['商务合作 · Business Dev', '也许是你'],
  ]},
  { kind: 'spacer' },

  { kind: 'title', lines: ['— 特 别 鸣 谢 —', 'SPECIAL THANKS'] },
  { kind: 'list', items: [
    'Vite · React · Phaser',
    'TakWolf / Fusion Pixel 字体',
    'Balatro · Slay the Spire · 炉石',
    '所有还在熬夜的独立游戏作者',
  ]},
  { kind: 'spacer' },

  { kind: 'title', lines: ['— 谨以此局献给 —'] },
  { kind: 'list', items: [
    '每一位还在加班的 CEO',
    '每一位刚被裁的员工',
    '每一位「下一关再说」的赌徒',
  ]},
  { kind: 'spacer' },
  { kind: 'spacer' },

  { kind: 'finale', rows: [
    ['主角 · PROTAGONIST', 'Frank'],
    ['玩家 · PLAYER', '你'],
    ['未来 · FUTURE', '也许是你'],
  ]},

  { kind: 'spacer' },
  { kind: 'fin', text: '— FIN —' },
]

function CreditsOverlay({ onClose }) {
  const reelRef = useRef(null)
  const [paused, setPaused] = useState(false)
  const [manualY, setManualY] = useState(null)
  const dragRef = useRef({ active: false, startClientY: 0, baseY: 0 })

  function handleReelMouseDown(event) {
    event.stopPropagation()
    if (!paused) {
      // 点击：暂停滚动，捕获当前 Y
      const reel = reelRef.current
      let y = 0
      if (reel) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(reel).transform)
        y = matrix.m42
      }
      setManualY(y)
      setPaused(true)
      dragRef.current = { active: true, startClientY: event.clientY, baseY: y }
    } else {
      dragRef.current = { active: true, startClientY: event.clientY, baseY: manualY ?? 0 }
    }
  }

  function handleMouseMove(event) {
    if (!dragRef.current.active) return
    const dy = event.clientY - dragRef.current.startClientY
    setManualY(dragRef.current.baseY + dy)
  }

  function handleMouseUp() {
    dragRef.current.active = false
  }

  const reelStyle = paused && manualY != null
    ? { animation: 'none', transform: `translate(-50%, ${manualY}px)` }
    : undefined

  return (
    <div
      className="credits-cinema"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="credits-scanlines" aria-hidden="true" />
      <div className="credits-vignette" aria-hidden="true" />
      <div
        ref={reelRef}
        className={`credits-reel ${paused ? 'reel-paused' : ''}`}
        style={reelStyle}
        onMouseDown={handleReelMouseDown}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="credits-film-logo">
          <img src="/assets/menu/FR.svg" alt="FRANK'S ADVANTURE" />
        </div>
        {CREDITS_SECTIONS.map((section, idx) => (
          <CreditsBlock key={idx} section={section} />
        ))}
      </div>
      <div className="credits-hint">
        {paused ? '按住拖动 · 点 ✕ 退出' : '点字幕暂停 · 按住可拖动'}
      </div>
      <button className="credits-skip" onClick={onClose}>跳过 ▸</button>
    </div>
  )
}

function CreditsBlock({ section }) {
  switch (section.kind) {
    case 'logo':
      return (
        <div className="credits-logo">
          {section.lines.map((line, i) => <strong key={i}>{line}</strong>)}
        </div>
      )
    case 'title':
      return (
        <div className="credits-title">
          {section.lines.map((line, i) => <h2 key={i}>{line}</h2>)}
        </div>
      )
    case 'role':
      return (
        <div className="credits-role">
          <h3>{section.heading}</h3>
          <dl>
            {section.rows.map(([k, v], i) => (
              <React.Fragment key={i}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      )
    case 'list':
      return (
        <ul className="credits-list">
          {section.items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )
    case 'finale':
      return (
        <div className="credits-finale">
          {section.rows.map(([k, v], i) => (
            <div key={i} className={`credits-finale-row ${v === '你' ? 'is-you' : v === '也许是你' ? 'is-maybe' : ''}`}>
              <span>{k}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      )
    case 'fin':
      return <div className="credits-fin">{section.text}</div>
    case 'spacer':
    default:
      return <div className="credits-spacer" />
  }
}

function isComboRule(effect = '') {
  return /LEFT|RIGHT|BOTH|ADJ|SAME_DEPT|LINE_ALL|LINE_XMULT|SELF_IF|IF_ALL|x\d|[+]\d+%/.test(effect)
}

function HighlightModal({ candidates, onPick, onDismiss }) {
  return (
    <div className="modal-backdrop retro-backdrop" onMouseDown={onDismiss}>
      <section className="retro-panel highlight-modal" onMouseDown={(e) => e.stopPropagation()} style={{ minWidth: 600, padding: 24 }}>
        <div className="retro-title" style={{ marginBottom: 8 }}>
          <strong>🎉 月末高光时刻</strong>
        </div>
        <p style={{ opacity: 0.8, fontSize: 13, marginBottom: 16 }}>
          上月利润足够亮眼，请从 3 张候选中挑选 1 张免费加入牌堆：
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
          {candidates.map((c, i) => (
            <button
              key={c.uid}
              onClick={() => onPick(i)}
              style={{
                flex: 1, padding: 12, background: '#1a1d29', border: '2px solid #c084fc',
                borderRadius: 8, color: '#f4f4f5', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7 }}>{c.dept} · {c.tier} · {c.rarity}</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', margin: '4px 0' }}>{c.name}</div>
              <div style={{ fontSize: 12 }}>AP {c.ap} · 产出 {c.baseOutput}</div>
              {c.effects?.slice(0, 3).map((e, idx) => (
                <div key={idx} style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>• {e}</div>
              ))}
            </button>
          ))}
        </div>
        <button onClick={onDismiss} style={{
          background: 'transparent', border: '1px solid #555', color: '#999',
          padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
        }}>跳过（不挑选）</button>
      </section>
    </div>
  )
}

function ResultOverlay({ game, onRestart, onEnterIntermission }) {
  const result = game.result
  if (!result) return null

  const isGameWon = result.gameWon
  const isGameOver = !!result.gameOver && !isGameWon

  // 破产/失败：不是董事会议程，显示「游戏结束」而非「进入董事会会议」按钮
  // （否则点击会触发 enterIntermission 的「当前没有董事会议程」拒绝，且月份卡住不前进）
  if (isGameOver) {
    return (
      <div className="modal-backdrop retro-backdrop">
        <section className="result-panel failed">
          <span>游戏结束</span>
          <h1>{result.reason || '经营失败'}</h1>
          <div className="result-stats">
            <Metric label="最终估值" value={`¥${game.valuation}`} />
            <Metric label="现金" value={`¥${game.cash}`} />
            <Metric label="经营月数" value={`${result.elapsedMonths ?? game.elapsedMonths} 月`} />
          </div>
          <div className="result-actions">
            <button className="command-button primary" onClick={onRestart}>
              <RotateCcw size={18} />
              再玩一局
            </button>
          </div>
        </section>
      </div>
    )
  }

  const nextStage = result.nextStage
  const isPromotion = !!result.stagePromotion
  const isEmergency = !!result.emergencyReview
  const boardKind = isPromotion ? '阶段达成' : (isEmergency ? '紧急董事会' : '季度董事会')
  const boardTitle = isPromotion
    ? `${game.stage.name} → ${nextStage?.name}`
    : (isEmergency ? `${game.stage.name} 紧急会` : `${game.stage.name} 季度会`)
  const elapsedMonths = result.elapsedMonths ?? game.elapsedMonths

  return (
    <div className="modal-backdrop retro-backdrop">
      <section className={`result-panel ${isGameWon ? 'passed' : 'promoted'}`}>
        <span>{isGameWon ? '终极胜利' : boardKind}</span>
        <h1>{isGameWon ? '行业第一' : boardTitle}</h1>
        <div className="result-stats">
          <Metric label="当前估值" value={`¥${game.valuation}`} />
          {!isGameWon && nextStage && <Metric label={isPromotion ? '下阶段门槛' : '当前阶段门槛'} value={`¥${nextStage.threshold}`} />}
          <Metric label="经营月数" value={`${elapsedMonths} 月`} />
        </div>

        <div className="result-actions">
          {!isGameWon ? (
            <button className="command-button primary" onClick={onEnterIntermission}>
              <Sparkles size={18} />
              进入董事会会议
            </button>
          ) : (
            <button className="command-button primary" onClick={onRestart}>
              <RotateCcw size={18} />
              再玩一局
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function buildRunReport(game) {
  const lineReports = game.lastSettlement?.lineReports ?? []
  const cards = lineReports.flatMap((report) => report.slotResults.map((slot) => slot.card).filter(Boolean))
  const deptCounts = cards.reduce((counts, card) => {
    counts[card.dept] = (counts[card.dept] ?? 0) + 1
    return counts
  }, {})
  const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const buildStyle = topDept === 'R' ? '研发推进' : topDept === 'S' ? '销售爆发' : topDept === 'O' ? '运营控费' : '混合试错'
  const defeatedByEvent = game.result?.defeatedByEvent || game.event?.name || '半年结算'
  const advice = game.cash <= 0
    ? '现金被打穿了。下局优先保留免维持费、月度现金和低 AP 员工。'
    : game.cumulativeIncome < game.level.target
      ? '分数不够。试着把高产出员工放到 P5，并让 P3 同时强化左右两侧。'
      : 'Boss 条件没满足。进入第 6 月前先检查本关事件的硬性要求。'
  return {
    bestMonth: game.result?.bestMonth ?? game.lastSettlement?.income ?? 0,
    defeatedByEvent,
    buildStyle,
    advice,
  }
}

function PileDrawer({ title, cards, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="pile-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-title">
          <strong>{title}</strong>
          <button onClick={onClose}>关闭</button>
        </div>
        <div className="drawer-grid">
          {cards.map((card) => <CardView key={card.uid} card={card} mode="drawer" />)}
          {cards.length === 0 && <p>暂无卡牌</p>}
        </div>
      </section>
    </div>
  )
}

function FunctionCardOverlay({ card, cash, onPick, onClose }) {
  const options = card.actionOptions ?? []
  return (
    <div className="modal-backdrop retro-backdrop" onMouseDown={onClose}>
      <section className="retro-panel function-card-panel" onMouseDown={(event) => event.stopPropagation()}>
        <header className="function-card-header">
          <Sparkles size={18} />
          <strong>{card.name}</strong>
          <button onClick={onClose}>关闭</button>
        </header>
        <div className="function-card-body">
          <CardView card={card} mode="drawer" />
          <div className="function-card-options">
            {options.map((option) => {
              const cost = option.cost ?? option.effect?.cost ?? 0
              const disabled = cash < cost
              return (
                <button
                  key={option.id}
                  className="function-card-option"
                  disabled={disabled}
                  onClick={() => onPick(option.id)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                  {cost > 0 && <em>¥{cost}</em>}
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

// ============================================================================
// 关间「董事会会议」UI (详见 BOARD_MEETING_DESIGN.md §8)
// ============================================================================

function ShopStationIcon() {
  return (
    <svg className="bm-station-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
      <rect x="4" y="24" width="24" height="4" fill="#0c1f47" />
      <rect x="4" y="10" width="24" height="14" fill="#1e3a8a" />
      <rect x="6" y="12" width="20" height="10" fill="#3b82f6" />
      <rect x="8" y="14" width="16" height="6" fill="#60a5fa" />
      <rect x="4" y="8" width="24" height="4" fill="#93c5fd" />
      <rect x="4" y="8" width="2" height="16" fill="#1d4ed8" />
      <rect x="26" y="8" width="2" height="16" fill="#172554" />
      <rect x="4" y="22" width="24" height="2" fill="#172554" />
      <rect x="14" y="12" width="4" height="6" fill="#fbbf24" />
      <rect x="15" y="14" width="2" height="2" fill="#78350f" />
      <rect x="8" y="10" width="2" height="2" fill="#ffffff" />
      <rect x="22" y="16" width="2" height="2" fill="#ffffff" />
    </svg>
  )
}

function HrStationIcon() {
  return (
    <svg className="bm-station-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
      <rect x="6" y="4" width="20" height="24" fill="#78350f" />
      <rect x="8" y="6" width="16" height="20" fill="#b45309" />
      <rect x="10" y="8" width="12" height="16" fill="#f8fafc" />
      <rect x="10" y="8" width="12" height="3" fill="#ef4444" />
      <rect x="12" y="13" width="8" height="2" fill="#cbd5e1" />
      <rect x="12" y="17" width="8" height="2" fill="#cbd5e1" />
      <rect x="12" y="21" width="5" height="2" fill="#cbd5e1" />
      <rect x="19" y="21" width="2" height="2" fill="#10b981" />
      <rect x="12" y="2" width="8" height="4" fill="#94a3b8" />
      <rect x="14" y="3" width="4" height="2" fill="#cbd5e1" />
      <rect x="24" y="10" width="2" height="12" fill="#3b82f6" />
      <rect x="24" y="8" width="2" height="2" fill="#ef4444" />
    </svg>
  )
}

function SchoolStationIcon() {
  return (
    <svg className="bm-station-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
      <rect x="11" y="18" width="10" height="6" fill="#4c1d95" />
      <rect x="12" y="18" width="8" height="5" fill="#6d28d9" />
      <rect x="15" y="8" width="2" height="2" fill="#8b5cf6" />
      <rect x="13" y="10" width="6" height="2" fill="#8b5cf6" />
      <rect x="15" y="10" width="2" height="2" fill="#a78bfa" />
      <rect x="9" y="12" width="14" height="2" fill="#8b5cf6" />
      <rect x="11" y="12" width="10" height="2" fill="#a78bfa" />
      <rect x="15" y="12" width="2" height="2" fill="#fbbf24" />
      <rect x="5" y="14" width="22" height="2" fill="#8b5cf6" />
      <rect x="7" y="14" width="18" height="2" fill="#a78bfa" />
      <rect x="9" y="16" width="14" height="2" fill="#8b5cf6" />
      <rect x="11" y="16" width="10" height="2" fill="#7c3aed" />
      <rect x="13" y="18" width="6" height="2" fill="#4c1d95" />
      <rect x="17" y="13" width="6" height="1" fill="#fbbf24" />
      <rect x="23" y="14" width="1" height="6" fill="#fbbf24" />
      <rect x="22" y="20" width="3" height="3" fill="#d97706" />
    </svg>
  )
}

function RecordsStationIcon() {
  return (
    <svg className="bm-station-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="crispEdges">
      <rect x="4" y="4" width="24" height="24" fill="#b45309" />
      <rect x="6" y="6" width="20" height="20" fill="#fef3c7" />
      <rect x="8" y="8" width="16" height="4" fill="#fbbf24" />
      <rect x="10" y="9" width="12" height="2" fill="#78350f" />
      <rect x="8" y="14" width="7" height="1" fill="#d97706" />
      <rect x="8" y="16" width="7" height="1" fill="#d97706" />
      <rect x="8" y="18" width="7" height="1" fill="#d97706" />
      <rect x="8" y="20" width="5" height="1" fill="#d97706" />
      <rect x="17" y="14" width="7" height="1" fill="#d97706" />
      <rect x="17" y="16" width="7" height="1" fill="#d97706" />
      <rect x="17" y="18" width="7" height="1" fill="#d97706" />
      <rect x="17" y="20" width="7" height="4" fill="#f59e0b" />
      <rect x="19" y="21" width="3" height="2" fill="#fef3c7" />
    </svg>
  )
}

function getPackBoxVariant(id) {
  switch (id) {
    case 'PACK_HEADHUNTER': return 'rd';
    case 'PACK_ELITE': return 'sales';
    case 'PACK_SERVICE': return 'srv';
    case 'PACK_FUNCTION': return 'ops';
    case 'PACK_INSIGHT': return 'tools';
    case 'PACK_MYSTERY': return 'mystery';
    default: return 'rd';
  }
}

function BoardMeetingHub({
  game,
  onResolveEvent,
  onShopBuy,
  onShopRoll,
  onPack,
  onUpgrade,
  onFire,
  onBmBuy,
  onSchoolRoll,
  onBmUnsubscribe,
  onExit,
}) {
  const [activeStation, setActiveStation] = useState(null)
  const [hrCardUid, setHrCardUid] = useState(null)
  const [pendingReplaceIdx, setPendingReplaceIdx] = useState(null)
  const [pendingBmSchoolIdx, setPendingBmSchoolIdx] = useState(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [popActive, setPopActive] = useState(true)
  const panelRef = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setPopActive(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  const im = game.intermissionState
  if (!im) return null

  const nextStage = STAGES.find((stage) => stage.id === im.nextStageId) ?? game.stage
  const isEventPhase = im.phase === 'event'

  function handleMouseMove(event) {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    const panelCenterX = rect.left + rect.width / 2
    const panelCenterY = rect.top + rect.height / 2
    const dx = event.clientX - panelCenterX
    const dy = event.clientY - panelCenterY

    const maxDistanceX = window.innerWidth / 2
    const maxDistanceY = window.innerHeight / 2

    const pctX = dx / maxDistanceX
    const pctY = dy / maxDistanceY

    const tiltY = pctX * 4.5  // Max horizontal tilt
    const tiltX = -pctY * 4.0 // Max vertical tilt

    panelRef.current.style.setProperty("--bm-tilt-x", `${tiltX.toFixed(2)}deg`)
    panelRef.current.style.setProperty("--bm-tilt-y", `${tiltY.toFixed(2)}deg`)
  }

  function handleMouseLeave() {
    if (!panelRef.current) return
    panelRef.current.style.setProperty("--bm-tilt-x", "0deg")
    panelRef.current.style.setProperty("--bm-tilt-y", "0deg")
  }

  const stationCards = [
    {
      id: "strategy",
      color: "amber",
      icon: <RecordsStationIcon />,
      title: "战略指引",
      tag: "STRATEGY",
      description: "确定下一阶段的战略调整与董事抉择",
      status: im.phase === "event" ? "待选择战略" : "战略已确立",
      metric: im.phase === "event" ? "🚨 待决策" : im.event.title,
    },
    {
      id: "shop",
      color: "azure",
      icon: <ShopStationIcon />,
      title: "投资会议",
      tag: "INVESTMENT",
      description: "招募史诗/传奇卡牌与开启人才礼包",
      status: `现金 ¥${game.cash}`,
      metric: `${im.purchased.epic ? "EPIC已购" : "EPIC待选"} · ${im.purchased.legendary ? "LEG已购" : "LEG待选"}`,
    },
    {
      id: "hr",
      color: "rose",
      icon: <HrStationIcon />,
      title: "HR会议",
      tag: "HR MEETING",
      description: "员工职级升职、附加词缀与裁撤",
      status: `升职 ${im.hrActionsCount}/1`,
      metric: `解雇 ${im.fireActionsCount}/5`,
    },
    {
      id: "school",
      color: "violet",
      icon: <SchoolStationIcon />,
      title: "商学院",
      tag: "BUSINESS SCHOOL",
      description: "订阅或退订全局商业模式以调整打法",
      status: `${game.activeBusinessModels.length}/${game.businessModelSlotCap} 槽位`,
      metric: im.schoolPurchased ? "本期已订阅" : "本期可选课",
    },
  ]

  return (
    <div className="bm-overlay" ref={panelRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className={`bm-panel-shadow ${popActive ? "pop-active" : ""}`} />
      <section className={`bm-panel ${popActive ? "pop-active" : ""}`}>
        <header className="bm-panel-header">
          <div className="bm-cash-chip">
            <span aria-hidden="true">¥</span>
            <strong>{game.cash}</strong>
          </div>
          <div className="bm-panel-title">
            <span>BOARD MEETING</span>
            <strong>董事会会议</strong>
            <em>{im.isPromotion ? `${game.stage.name} ▸ ${nextStage.name}` : `${game.stage.name} · 季度会`}</em>
          </div>
          <button
            className="bm-next-button"
            disabled={isEventPhase}
            onClick={() => setConfirmExit(true)}
            title={isEventPhase ? "请先制定本期战略" : (im.isPromotion ? "进入下一阶段" : "结束董事会")}
          >
            {im.isPromotion ? "进入下一阶段 ▸" : "结束董事会 ▸"}
          </button>
        </header>

        {im.resolvedMessage && (
          <div className="bm-toast-strip">▶ {im.resolvedMessage}</div>
        )}

        <main className="bm-panel-body">
          {activeStation ? (
            <div className="bm-drawer-wrap">
              <button className="bm-back-btn" onClick={() => setActiveStation(null)}>◂ 返回会议</button>
              {activeStation === "shop" && (
                <ShopDrawer
                  shopRoll={im.shopRoll}
                  purchased={im.purchased}
                  budget={game.cash}
                  nextLevelId={nextStage.id}
                  onBuy={onShopBuy}
                  onPack={onPack}
                  onRoll={onShopRoll}
                  onClose={() => setActiveStation(null)}
                />
              )}
              {activeStation === "hr" && (
                <HrDrawer
                  game={game}
                  hrCardUid={hrCardUid}
                  setHrCardUid={setHrCardUid}
                  onUpgrade={onUpgrade}
                  onFire={onFire}
                  onClose={() => setActiveStation(null)}
                />
              )}
              {activeStation === "school" && (
                <SchoolDrawer
                  game={game}
                  schoolRoll={im.schoolRoll}
                  pendingReplaceIdx={pendingReplaceIdx}
                  setPendingReplaceIdx={setPendingReplaceIdx}
                  pendingBmSchoolIdx={pendingBmSchoolIdx}
                  setPendingBmSchoolIdx={setPendingBmSchoolIdx}
                  onBmBuy={onBmBuy}
                  onBmUnsubscribe={onBmUnsubscribe}
                  onRoll={onSchoolRoll}
                  onClose={() => setActiveStation(null)}
                />
              )}
              {activeStation === "strategy" && (
                <StrategyDrawer game={game} onResolveEvent={onResolveEvent} onClose={() => setActiveStation(null)} />
              )}
            </div>
          ) : (
            <div className="bm-menu-and-finance">
              <div className="bm-stations-grid">
                {stationCards.map((card) => (
                  <StationCard
                    key={card.id}
                    color={card.color}
                    icon={card.icon}
                    title={card.title}
                    tag={card.tag}
                    description={card.description}
                    status={card.status}
                    metric={card.metric}
                    alert={card.id === 'strategy' && im.phase === 'event'}
                    onClick={() => {
                      if (card.id === "strategy" && im.phase === "event") {
                        setActiveStation("strategy")
                      } else {
                        setActiveStation(card.id)
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </section>

      {confirmExit && (
          <ConfirmExitModal
            budget={game.cash}
            activeBMs={game.activeBusinessModels.length}
            nextStageName={im.isPromotion ? nextStage.name : game.stage.name}
            isPromotion={im.isPromotion}
            onConfirm={() => { setConfirmExit(false); onExit() }}
            onCancel={() => setConfirmExit(false)}
          />
      )}
    </div>
  )
}

// ─── 报纸背景事件卡 — 外壳用 C6 报纸样式，内容原字体原样式 ────────────────
// 将文本中 +/- 前缀数字着色：正值绿，负值红
// 格式示例：'收入 -10%'、'维持费 +15%'、'AP -1'、'+¥200'
function colorizeEffectLine(text) {
  if (!text) return text
  // 捕获：+/- 符号 + 可选¥ + 数字 + 可选小数 + 可选单位(%/百分点/pp)
  const parts = text.split(/([-+](?:¥)?\d+(?:[.,]\d+)?(?:%|百分点|pp)?)/)
  return parts.map((part, i) => {
    if (part.startsWith('+')) return <span key={i} className="newsp-num-pos">{part}</span>
    if (part.startsWith('-')) return <span key={i} className="newsp-num-neg">{part}</span>
    return part
  })
}

function EventCardNewspaper({ event, majorEvent, upcomingMajorEvent, countdown, upcomingRival, elapsedMonths }) {
  const tierLabels = { 1: '轻度', 2: '中度', 3: '高度', 4: '重度', 5: '毁灭级' }

  // 决定第二栏内容（优先级：年度大事件进行中 > 预警 > 商战倒计时）
  let annualSection = null
  if (majorEvent) {
    const remaining = majorEvent.remainingMonths ?? 0
    const tier = majorEvent.tier ?? 1
    annualSection = (
      <>
        <div className="newsp-dateline">
          <span>年度大事件</span>
          <span>T{tier} {tierLabels[tier] ?? ''}</span>
        </div>
        <div className="newsp-single-rule" />
        <div className="newsp-annual-body">
          <strong>{majorEvent.name}</strong>
          <em>进行中 · 剩余 {remaining} 个月</em>
          {(majorEvent.effectLines ?? []).map((line) => <span key={line}>{colorizeEffectLine(line)}</span>)}
        </div>
      </>
    )
  } else if (upcomingMajorEvent && countdown > 0 && countdown <= 3) {
    const tier = upcomingMajorEvent.tier ?? 1
    annualSection = (
      <>
        <div className="newsp-dateline">
          <span>大事件预警</span>
          <span>T{tier} {tierLabels[tier] ?? ''}</span>
        </div>
        <div className="newsp-single-rule" />
        <div className="newsp-annual-body">
          <strong>{upcomingMajorEvent.name}</strong>
          <em>{countdown} 个月后触发</em>
          {(upcomingMajorEvent.effectLines ?? []).map((line) => <span key={line}>{colorizeEffectLine(line)}</span>)}
        </div>
      </>
    )
  } else if (upcomingRival) {
    const monthsToStart = Math.max(0, (upcomingRival.startElapsedMonth ?? 0) - (elapsedMonths ?? 0))
    const tier = upcomingRival.tier ?? 1
    annualSection = (
      <>
        <div className="newsp-dateline">
          <span>商战倒计时</span>
          <span>T{tier} {tierLabels[tier] ?? ''}</span>
        </div>
        <div className="newsp-single-rule" />
        <div className="newsp-annual-body">
          <strong>{upcomingRival.archetypeName} · {upcomingRival.name}</strong>
          <em>{monthsToStart} 个月后开战</em>
          <span>💡 {upcomingRival.weaknessHint}</span>
        </div>
      </>
    )
  }

  return (
    <div className="event-newspaper">
      {/* masthead：border-bottom 4px double = 双横线 */}
      <div className="masthead2">The Daily Biz</div>
      <div className="newsp-dateline">
        <span>季度新闻</span>
        <span>{event.tone}</span>
      </div>
      {/* 单横线 */}
      <div className="newsp-single-rule" />
      {/* 原 event-card 内容，原字体原样式；若有第二栏则留出两行间距 */}
      <div className={`event-card tone-${event.tone}${annualSection ? ' newsp-section-gap' : ''}`}>
        <strong>{event.name}</strong>
        <p>{event.description}</p>
        {(event.effectLines ?? []).map((line) => (
          <span key={line}>{colorizeEffectLine(line)}</span>
        ))}
      </div>
      {/* 第二栏：年度大事件 / 预警 / 商战倒计时 */}
      {annualSection && (
        <>
          <div className="newsp-divider-double" />
          {annualSection}
        </>
      )}
    </div>
  )
}

function describeEventEffect(opt) {
  switch (opt.effect?.type) {
    case 'noop': return '无副作用'
    case 'removeBudgetBonus': return `失去一员大将，+¥${opt.effect.value}`
    case 'recruitLegendary': return `下关获得 1 张 ${opt.effect.dept} 传奇`
    case 'increaseNextTarget': return `下阶段目标增加`
    case 'budgetGainNextMonthPenalty': return `+¥${opt.effect.budget}, 首月手牌 -1`
    case 'unlockEpic': return `下阶段招聘池 +1 ${opt.effect.dept} epic`
    case 'gamble': return `50/50: +¥${opt.effect.win} / -¥${Math.abs(opt.effect.lose)}`
    case 'increaseBmSlot': return '永久 +1 商业模式槽位'
    case 'budgetGain': return `+¥${opt.effect.value}`
    default: return '—'
  }
}

function StationCard({ icon, title, tag, description, status, metric, color, alert, onClick }) {
  return (
    <div className={`bm-station-wrapper tone-${color}`}>
      <button className={`bm-station ${alert ? 'is-alert' : ''}`} onClick={onClick}>
        <span className="bm-station-tag">{tag}</span>
        <span className="bm-station-icon" aria-hidden="true">{icon}</span>
        <span className="bm-station-copy">
          {/* 关键字标题 2x，功能说明 1x */}
          <strong className="bm-station-title">{title}</strong>
          <em className="bm-station-desc">{description}</em>
        </span>
        <span className="bm-station-meta">
          <strong>{status}</strong>
          <em>{metric}</em>
        </span>
        <span className="bm-station-arrow" aria-hidden="true">▾</span>
      </button>
    </div>
  )
}

function ShopDrawer({ shopRoll, purchased, budget, nextLevelId, onBuy, onPack, onRoll, onClose }) {
  const mysteryPack = shopRoll.packs[0]; // Always PACK_MYSTERY at index 0
  const pack1 = shopRoll.packs[1];
  const pack2 = shopRoll.packs[2];

  const renderPackSlot = (entry, idx) => {
    if (!entry) return <div key={idx} className="shop-slot pack empty">—</div>;
    const state = purchased.packs[idx]
    return (
      <div key={idx} className="shop-slot pack">
        <div className="shop-slot-tag">{['C', 'D', 'E'][idx]} · {entry.packDef.name}</div>
        <div className="pack-icon" aria-hidden="true">
          <PackBox3D variant={getPackBoxVariant(entry.packDef.id)} />
        </div>
        <div className="pack-desc">{entry.packDef.description}</div>
        {!state && (
          <button
            className="shop-buy-btn"
            disabled={budget < entry.cost}
            onClick={() => onPack(idx)}
          >买入 −¥{entry.cost}</button>
        )}
        {state?.opened && state.pickIndex === null && (
          <div className="pack-picks">
            <div className="pack-picks-hint">选 1：</div>
            <div className="pack-picks-row">
              {entry.contents.map((item, pickIdx) => (
                <button
                  key={pickIdx}
                  className="pack-pick"
                  onClick={() => onPack(idx, pickIdx)}
                >
                  {item.isBusinessModel
                    ? <BmCardMini bm={{ name: item.bmName, description: item.bmDescription, rarity: item.bmRarity }} />
                    : <CardView card={item} mode="market" />}
                </button>
              ))}
            </div>
          </div>
        )}
        {state?.pickIndex !== null && state?.pickIndex !== undefined && (
          <div className="shop-sold">✓ 已挑选</div>
        )}
      </div>
    )
  };

  return (
    <section className="bm-drawer shop-drawer">
      <header>
        <strong>💼 投资部 · Shop</strong>
        <div className="drawer-actions">
          <button className="bm-roll-btn" disabled={budget < 5} onClick={onRoll}>刷新 (−¥5)</button>
          <button className="bm-close-btn" onClick={onClose}>×</button>
        </div>
      </header>

      <div className="shop-grid">
        {/* Column 1: Mystery Pack */}
        {renderPackSlot(mysteryPack, 0)}

        {/* Column 2: Epic Card (Slot A) */}
        <div className="shop-slot">
          <div className="shop-slot-tag">A · EPIC</div>
          {shopRoll.epicCard ? (
            purchased.epic ? (
              <div className="shop-sold">✓ 已购入</div>
            ) : (
              <>
                <CardView card={shopRoll.epicCard} mode="drawer" />
                <button
                  className="shop-buy-btn"
                  disabled={budget < shopRoll.epicCost}
                  onClick={() => onBuy('epic')}
                >买入 −¥{shopRoll.epicCost}</button>
              </>
            )
          ) : (
            <div className="shop-empty">—</div>
          )}
        </div>

        {/* Column 3: Legendary Card (Slot B) */}
        <div className="shop-slot legendary">
          <div className="shop-slot-tag">B · LEGENDARY ✨</div>
          {shopRoll.legendaryCard ? (
            purchased.legendary ? (
              <div className="shop-sold">✓ 已购入</div>
            ) : (
              <>
                <CardView card={shopRoll.legendaryCard} mode="drawer" />
                <button
                  className="shop-buy-btn legendary"
                  disabled={budget < shopRoll.legendaryCost}
                  onClick={() => onBuy('legendary')}
                >买入 −¥{shopRoll.legendaryCost}</button>
              </>
            )
          ) : (
            <div className="shop-empty">暂无传奇卡可挖角</div>
          )}
        </div>

        {/* Column 4: Pack 1 */}
        {renderPackSlot(pack1, 1)}

        {/* Column 5: Pack 2 */}
        {renderPackSlot(pack2, 2)}
      </div>
    </section>
  )
}

function HrDrawer({ game, hrCardUid, setHrCardUid, onUpgrade, onFire, onClose }) {
  const im = game.intermissionState
  const allCards = [...game.hand, ...game.drawPile, ...game.coolingPile]
  const selectedCard = allCards.find((c) => c.uid === hrCardUid)
  const fireCost = 0 // Dismiss is free now
  const upgradePath = selectedCard ? UPGRADE_PATHS[selectedCard.tier] : null
  const [affixChoice, setAffixChoice] = useState(null)
  const isHrLimitReached = (im?.hrActionsCount || 0) >= 1

  // 升职词缀池：固定从全 6 个里挑前 3 个（避免每次重渲打乱）
  const randomAffixes = useMemo(() => {
    if (!selectedCard) return []
    const idx = (selectedCard.uid?.length ?? 0) % AFFIX_POOL.length
    return [
      AFFIX_POOL[idx],
      AFFIX_POOL[(idx + 2) % AFFIX_POOL.length],
      AFFIX_POOL[(idx + 4) % AFFIX_POOL.length],
    ]
  }, [selectedCard?.uid])

  return (
    <section className="bm-drawer hr-drawer">
      <header>
        <strong>📋 人事部 · HR Office</strong>
        <div className="drawer-actions">
          <span className="hr-stat">解雇员工限额 {im.fireActionsCount}/5</span>
          <button className="bm-close-btn" onClick={onClose}>×</button>
        </div>
      </header>

      <div className="hr-layout">
        <div className="hr-card-list">
          <div className="hr-list-hint">选一张员工卡操作（已操作过的灰色）</div>
          <div className="hr-list-grid">
            {allCards.filter((c) => c.type === 'emp').map((card) => {
              const acted = im.cardActionLog[card.uid]
              return (
                <button
                  key={card.uid}
                  className={`hr-card-pick ${hrCardUid === card.uid ? 'selected' : ''} ${acted ? `acted ${acted}` : ''}`}
                  disabled={!!acted}
                  onClick={() => { setHrCardUid(card.uid); setAffixChoice(null) }}
                >
                  <CardView card={card} mode="drawer" />
                  {acted && <div className="acted-label">{acted === 'upgraded' ? '已升职' : '已解雇'}</div>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="hr-action-panel">
          {!selectedCard ? (
            <p className="hr-hint">← 从左侧选一张员工卡</p>
          ) : (
            <>
              <h4>对 <em>{selectedCard.name}</em> 执行：</h4>

              {isHrLimitReached && (
                <div className="hr-limit-warning" style={{ color: '#ff7676', fontSize: '11px', marginBottom: '12px', fontWeight: 'bold', lineHeight: '1.4' }}>
                  ⚠️ 本期已进行人事变动（每个董事会仅限一次升职或加词缀）
                </div>
              )}

              {upgradePath ? (
                <button
                  className="hr-action-btn upgrade-rarity"
                  disabled={isHrLimitReached || game.cash < upgradePath.cost}
                  onClick={() => { onUpgrade(selectedCard.uid, 'tier'); setHrCardUid(null) }}
                >
                  ① 升职 {selectedCard.tier || '未知'} → {upgradePath.next} （−¥{upgradePath.cost}）
                </button>
              ) : (
                <button className="hr-action-btn disabled" disabled>① 已达职级上限</button>
              )}

              <div className="hr-action-section">
                <span className="hr-section-label">② 附加词缀（3 选 1，−¥8）</span>
                <div className="hr-affix-row">
                  {randomAffixes.map((aff) => (
                    <button
                      key={aff.id}
                      className={`hr-affix-pick ${affixChoice === aff.id ? 'selected' : ''}`}
                      disabled={isHrLimitReached || game.cash < 8}
                      onClick={() => setAffixChoice(aff.id)}
                    >
                      {aff.label}
                    </button>
                  ))}
                </div>
                <button
                  className="hr-action-btn confirm-affix"
                  disabled={isHrLimitReached || !affixChoice || game.cash < 8}
                  onClick={() => { onUpgrade(selectedCard.uid, 'affix', affixChoice); setHrCardUid(null); setAffixChoice(null) }}
                >
                  确认词缀
                </button>
              </div>

              <button
                className="hr-action-btn fire"
                disabled={im.fireActionsCount >= 5}
                onClick={() => { onFire(selectedCard.uid); setHrCardUid(null) }}
              >
                ✗ “向社会输送人才”（免费解雇）
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function SchoolDrawer({
  game,
  schoolRoll,
  pendingReplaceIdx,
  setPendingReplaceIdx,
  pendingBmSchoolIdx,
  setPendingBmSchoolIdx,
  onBmBuy,
  onBmUnsubscribe,
  onRoll,
  onClose,
}) {
  const activeBMs = game.activeBusinessModels
  const slotCap = game.businessModelSlotCap
  const isFull = activeBMs.length >= slotCap
  const im = game.intermissionState
  const schoolPurchased = im?.schoolPurchased || false

  function attemptBuy(schoolIdx) {
    if (!isFull) {
      onBmBuy(schoolIdx)
      return
    }
    setPendingBmSchoolIdx(schoolIdx)
    setPendingReplaceIdx(null)
  }

  function confirmReplace() {
    if (pendingBmSchoolIdx === null || pendingReplaceIdx === null) return
    onBmBuy(pendingBmSchoolIdx, pendingReplaceIdx)
    setPendingBmSchoolIdx(null)
    setPendingReplaceIdx(null)
  }

  return (
    <section className="bm-drawer school-drawer">
      <header>
        <strong>🎓 商学院 · Business School</strong>
        <div className="drawer-actions">
          <span className="school-stat">{activeBMs.length} / {slotCap} 槽位</span>
          <button className="bm-roll-btn" disabled={game.cash < 4 || schoolPurchased} onClick={onRoll}>刷新 (−¥4)</button>
          <button className="bm-close-btn" onClick={onClose}>×</button>
        </div>
      </header>

      <div className="school-section">
        <h4>已习得 (可选择退订)</h4>
        <div className="bm-slot-row">
          {Array.from({ length: slotCap }).map((_, i) => {
            const slot = activeBMs[i]
            const bm = slot ? BUSINESS_MODELS.find((b) => b.id === slot.id) : null
            const replaceMode = pendingBmSchoolIdx !== null && i < activeBMs.length
            return (
              <div key={i} className="bm-slot-container">
                <div
                  className={`bm-slot ${slot ? 'filled' : 'empty'} ${replaceMode ? 'replaceable' : ''} ${pendingReplaceIdx === i ? 'selected' : ''}`}
                  onClick={() => replaceMode && setPendingReplaceIdx(i)}
                >
                  {bm ? <BmCardMini bm={bm} charged={slot.charged} /> : <div className="bm-empty-text">空</div>}
                </div>
                {bm && (
                  <div className="bm-under-info">
                    <p className="bm-under-desc">{bm.description}</p>
                    <div className="bm-under-cost">月费: ¥{getBMMonthlyCost(bm)} / 资产: +¥{getBMAssetValue(bm)}</div>
                    <div className="bm-slot-actions">
                      <button className="bm-unsubscribe-btn" onClick={() => onBmUnsubscribe(bm.id)}>退订</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {pendingBmSchoolIdx !== null && (
          <div className="replace-cta">
            <span>选择要替换的槽位 → 然后点击确认</span>
            <button
              className="bm-confirm-btn"
              disabled={pendingReplaceIdx === null}
              onClick={confirmReplace}
            >确认替换</button>
            <button className="bm-cancel-btn" onClick={() => { setPendingBmSchoolIdx(null); setPendingReplaceIdx(null) }}>取消</button>
          </div>
        )}
      </div>

      <div className="school-section">
        <h4>本期开课</h4>
        <div className="bm-pick-row">
          {schoolRoll.map((bmId, idx) => {
            if (!bmId) return <div key={idx} className="bm-pick-empty">—</div>
            const bm = BUSINESS_MODELS.find((b) => b.id === bmId)
            if (!bm) return null
            return (
              <div key={idx} className="bm-pick-container">
                <div className="bm-slot filled">
                  <BmCardMini bm={bm} />
                </div>
                <div className="bm-under-info">
                  <p className="bm-under-desc">{bm.description}</p>
                  <div className="bm-under-cost">订阅费: ¥{bm.cost} / 月费: ¥{getBMMonthlyCost(bm)}</div>
                  <button
                    className="bm-buy-btn"
                    disabled={game.cash < bm.cost || schoolPurchased}
                    onClick={() => attemptBuy(idx)}
                  >
                    {schoolPurchased ? '已选择本期订阅' : `订阅 −¥${bm.cost}`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function BmCardMini({ bm, charged }) {
  const tooltipCtx = React.useContext(FloatingTooltipCtx)
  return (
    <div
      className={`bm-card rarity-${bm.rarity}`}
      onPointerEnter={(e) => tooltipCtx.showTooltip(
        <div>
          <div className="tooltip-title">{bm.name}</div>
          <div>{bm.description}</div>
          {bm.flavor && (
            <>
              <div className="tooltip-divider" />
              <div style={{ fontStyle: 'italic', color: '#fff4bd', opacity: 0.8 }}>"{bm.flavor}"</div>
            </>
          )}
        </div>,
        e
      )}
      onPointerMove={tooltipCtx.updateTooltip}
      onPointerLeave={tooltipCtx.hideTooltip}
    >
      <BusinessModelSvg id={bm.id} className="bm-card-image" />
      <div className="bm-card-top">
        <strong>{bm.name}</strong>
        <span>{RARITY_LABELS[bm.rarity] ?? bm.rarity}</span>
      </div>
      <div className="bm-card-mid">
        {bm.hook && (
          <span className={`bm-hook-tag hook-${bm.hook}`}>
            {bm.hook === 'onMonthStart' ? '月初' : bm.hook === 'onSettle' ? '结算' : '充能'}
          </span>
        )}
        {bm.hook === 'onCharge' && charged !== undefined && (
          <span className="bm-charge-mark">{charged ? '⚡ 已充能' : '○ 已消耗'}</span>
        )}
      </div>
    </div>
  )
}

function StrategyDrawer({ game, onResolveEvent, onClose }) {
  const im = game.intermissionState
  const isEventPhase = im.phase === 'event'

  return (
    <section className="bm-drawer strategy-drawer">
      <header>
        <strong>📰 战略指引 · Strategic Guidance</strong>
        <div className="drawer-actions">
          <button className="bm-close-btn" onClick={onClose}>×</button>
        </div>
      </header>

      {isEventPhase ? (
        <div className="strategy-event-content">
          <div className="strategy-event-header">
            <span className="event-tag">董事决议</span>
            <h3>{im.event.title}</h3>
          </div>
          <p className="event-flavor">{im.event.flavor}</p>
          <div className="event-options vertical-layout">
            {im.event.options.map((opt) => {
              const cashShort = opt.cost && game.cash < opt.cost
              const pickedList = game.battle?.pickedStrategies ?? []
              const alreadyPicked = im.event.isBossCounter && !opt.repeatable && pickedList.includes(opt.id)
              const disabled = cashShort || alreadyPicked
              return (
                <button
                  key={opt.id}
                  className={`event-option ${disabled ? 'disabled' : ''}${alreadyPicked ? ' already-picked' : ''}`}
                  disabled={disabled}
                  onClick={() => onResolveEvent(opt.id)}
                >
                  <strong>{opt.label}</strong>
                  <span>{alreadyPicked ? '本局已采用' : (cashShort ? '¥ 不足' : describeEventEffect(opt))}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="strategy-resolved-content">
          <div className="strategy-success-banner">
            <div className="resolved-check">✓ 战略决策已达成</div>
            <h3>{im.event.title}</h3>
            {im.resolvedMessage && (
              <p className="resolved-msg">▶ {im.resolvedMessage}</p>
            )}
          </div>
          <div className="strategy-log-section">
            <h4>会议记录与历史日志</h4>
            <div className="bm-log-list">
              {im.logTrail.map((line, i) => (
                <div key={i} className={i === 0 ? "bm-log-newest" : ""}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
function ConfirmExitModal({ budget, activeBMs, nextStageName, isPromotion, onConfirm, onCancel }) {
  return (
    <div className="bm-confirm-overlay" onMouseDown={onCancel}>
      <section className="bm-confirm-modal" onMouseDown={(e) => e.stopPropagation()}>
        <strong>{isPromotion ? '进入下一阶段？' : '结束季度董事会？'}</strong>
        <p>当前 ¥ 现金 <em>{budget}</em> 将继续带入经营。</p>
        <p>已激活商业模式 <em>{activeBMs}</em> 个，{isPromotion ? `进入 ${nextStageName} 阶段。` : `继续经营 ${nextStageName}。`}</p>
        <div className="bm-confirm-actions">
          <button className="bm-cancel-btn" onClick={onCancel}>取消</button>
          <button className="bm-confirm-btn primary" onClick={onConfirm}>{isPromotion ? '确认进入' : '确认结束'}</button>
        </div>
      </section>
    </div>
  )
}

// 用于在卡包预览中把模板渲染成可见的 CardView (模板 → 假实例)
function createDisplayCard(template) {
  return {
    ...template,
    uid: `display-${template.id}`,
    cost: 1,
    baseOutput: 0,
    baseCostMedian: 1,
    baseOutputMedian: 0,
    outputDelta: 'neutral',
    costDelta: 'neutral',
    effects: template.effects || [],
    affixes: [],
    affixEffects: [],
    coolingRemaining: 0,
    location: 'display',
  }
}

export default App
