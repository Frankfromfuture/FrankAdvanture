import React from 'react'
import { createPortal } from 'react-dom'
import {
  BriefcaseBusiness,
  ClipboardList,
  Factory,
  FlaskConical,
  HandCoins,
  Sparkles,
  Zap,
} from 'lucide-react'
import { DEPT_META, RARITY_LABELS } from './game/cards.js'
import { ServiceFunSvg, hasServiceFunSvg } from './ServiceFunSvg.jsx'
import { ExecutiveSvgPortrait } from './人物/ExecutiveSvgPortrait.jsx'
import { useCursorTilt } from './hooks/useCursorTilt.js'
import { useFloatingTooltip } from './hooks/useFloatingTooltip.jsx'

export function CardView({
  card,
  selected = false,
  entering = false,
  dragging = false,
  mode = 'hand',
  outputOverride,
  draggable = false,
  onClick,
  onDragStart,
  onDragEnd,
  style,
}) {
  const isFounder = card.id?.startsWith('EMP_FOUNDER')
  const rarityLabel = RARITY_LABELS[card.rarity] ?? card.rarity
  const DepartmentIcon = getCardDepartmentIcon(card)
  const cardEffects = card.effects ?? []
  const cardAffixEffects = card.affixEffects ?? []
  const cardAffixes = card.affixes ?? []
  const hasOutputOverride = card.type === 'emp' && Number.isFinite(outputOverride)
  const isActionCard = card.type === 'fun' || card.type === 'srv'
  const baseOutput = Number.isFinite(card.baseOutput) ? card.baseOutput : 0
  const primary = hasOutputOverride ? `¥${outputOverride}` : card.type === 'emp' ? `¥${baseOutput}` : getActionPrimaryParts(cardEffects[0])
  const outputChanged = hasOutputOverride && outputOverride !== baseOutput
  const effects = [...cardEffects, ...cardAffixEffects].filter((effect) => !effect.startsWith('COST') && !effect.startsWith('BASE_OUTPUT'))
  const shortEffectText = effects.slice(0, 2).map(summarizeEffectShort).join(' · ') || ''
  const fullEffectText = effects.map(summarizeEffect).join(' / ') || '基础行动'
  const neighborDirection = getNeighborDirection(effects)
  const Component = onClick ? 'button' : 'div'
  const canTilt = (mode === 'hand' && selected) || mode === 'reveal'
  const usesFloatingHint = mode !== 'flying'
  const tilt = useCursorTilt({ enabled: canTilt, amplitude: 18, parallax: true, parallaxShift: 0.35, parallaxStrength: 0.35 })
  const tooltip = useFloatingTooltip({ delay: 150, maxEstimateWidth: 244, maxEstimateHeight: 104 })

  const tooltipContent = (
    <div>
      <div>{fullEffectText}</div>
      {card.flavor && (
        <>
          <div className="tooltip-divider" />
          <div style={{ fontStyle: 'italic', color: '#fff4bd', opacity: 0.8 }}>"{card.flavor}"</div>
        </>
      )}
    </div>
  )

  function handleStagePointerMove(event) {
    if (!usesFloatingHint) return
    tooltip.showTooltip(tooltipContent, event)
  }

  function handleStagePointerLeave() {
    if (!usesFloatingHint) return
    tooltip.hideTooltip()
  }

  function handlePointerMove(event) {
    if (usesFloatingHint) {
      tooltip.showTooltip(tooltipContent, event)
    }
    tilt.onPointerMove(event)
  }

  function handlePointerLeave(event) {
    if (usesFloatingHint) {
      tooltip.hideTooltip()
    }
    tilt.onPointerLeave(event)
  }

  return (
    <>
      <span
        ref={tilt.wrapRef}
        className={`card-stage ${mode} ${selected ? 'selected' : ''} ${entering ? 'entering' : ''} ${dragging ? 'dragging' : ''} rarity-${card.rarity} ${isFounder ? 'is-founder' : ''}`}
        data-card-uid={card.uid}
        style={style}
        data-effect-hint={fullEffectText}
        onPointerMove={handleStagePointerMove}
        onPointerLeave={handleStagePointerLeave}
      >
        <span className="card-stage-shadow" aria-hidden="true" />
        {!isFounder && <span className="card-glow-ring" aria-hidden="true" />}
        <Component
          ref={tilt.targetRef}
          className={`card-view ${mode} ${selected ? 'selected' : ''} ${entering ? 'entering' : ''} ${dragging ? 'dragging' : ''} ${neighborDirection ? `neighbor-${neighborDirection}` : ''} rarity-${card.rarity} type-${card.type} dept-${card.dept.toLowerCase()} ${isFounder ? 'is-founder' : ''}`}
          data-card-id={card.id}
          draggable={draggable}
          onClick={onClick}
          onPointerEnter={handleStagePointerMove}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          aria-label={`${card.name} · ${fullEffectText}`}
          type={onClick ? 'button' : undefined}
        >
          {isFounder && <span className="founder-border-glow" aria-hidden="true" />}
          {neighborDirection && (
            <span className={`neighbor-cue ${neighborDirection}`} aria-hidden="true">
              {(neighborDirection === 'left' || neighborDirection === 'both') && <i className="left" />}
              {(neighborDirection === 'right' || neighborDirection === 'both') && <i className="right" />}
            </span>
          )}
          <span className="card-top">
            <i className="card-title-chip">
              <DepartmentIcon className="card-dept-icon" size={12} aria-hidden="true" />
              <span>{isFounder ? '创始人' : card.name}</span>
            </i>
            <em>{rarityLabel}</em>
            <b><Zap className="card-ap-icon" size={12} />{card.ap}</b>
          </span>
          <span className="card-portrait" aria-hidden="true">
            {card.type === 'emp' && <ExecutiveSvgPortrait card={card} />}
            {(card.type === 'srv' || card.type === 'fun') && hasServiceFunSvg(card.id) && (
              <span className="srvfun-svg-wrap"><ServiceFunSvg cardId={card.id} /></span>
            )}
          </span>
          <span className={`card-output delta-${card.outputDelta ?? 'neutral'} ${card.type === 'emp' ? 'exec-number' : 'action-primary'} ${outputChanged ? 'changed' : ''}`}>
            {isActionCard ? (
              <>
                <span className="action-primary-label">{primary.label}</span>
                {primary.value && <span className="action-primary-value exec-number">{primary.value}</span>}
              </>
            ) : primary}
          </span>
          {!isActionCard && shortEffectText && <span className="card-effects">{shortEffectText}</span>}
        </Component>
      </span>
      {usesFloatingHint && tooltip.renderTooltip()}
    </>
  )
}

function getCardDepartmentIcon(card) {
  if (card.type === 'fun') return Sparkles
  if (card.type === 'srv') return BriefcaseBusiness
  if (card.dept === 'R') return FlaskConical
  if (card.dept === 'S') return HandCoins
  if (card.dept === 'O') return ClipboardList
  return Factory
}

function getNeighborDirection(effects) {
  const normalized = effects.join(' ')
  const hasBoth = /\bBOTH\s*:/.test(normalized)
  const hasLeft = /\bLEFT\s*:/.test(normalized)
  const hasRight = /\bRIGHT\s*:/.test(normalized)
  if (hasBoth || (hasLeft && hasRight)) return 'both'
  if (hasLeft) return 'left'
  if (hasRight) return 'right'
  return ''
}

function getActionPrimaryParts(effect = '') {
  const label = summarizeEffect(effect)
  const value = summarizeEffectValue(String(effect).replace('TRIGGER: ', '').trim())
  if (!value) return { label, value: '' }

  return {
    label: label
      .replace(value, '')
      .replace(/\s*(倍率|加强|产能)\s*$/g, '$1')
      .replace(/\s+/g, ' ')
      .trim(),
    value,
  }
}

export function summarizeEffect(effect = '') {
  const normalized = String(effect).replace('TRIGGER: ', '').trim()
  const value = summarizeEffectValue(normalized)
  const strengthen = value ? `加强 ${value}` : '加强'

  if (normalized.includes('FOUNDER_LEAN_MANAGEMENT')) return '精益管理：只要Founder在手里，本轮最大AP+1，打出的话本轮 AP+3'
  if (normalized.includes('FOUNDER_SALES_HIGH')) return 'Sales High：只要在手里，产出系数*1.2，打出的话本轮产出系数*1.8'
  if (normalized.includes('FOUNDER_AI_RD')) return 'AI-Driven 研发：只要在手里，每轮抓牌数+1，打出的话本轮抓牌数+3（手牌数不能超过10 张）'

  if (normalized.includes('MONTH_NO_MAINTAIN')) return '本月免维持费'
  if (normalized.includes('MONTH_BONUS')) return value ? `本月产能 ${value}` : '本月产能增加'
  if (normalized.includes('MONTH_STAR_RATE')) return value ? `叙事率 ${value}` : '叙事率提高'
  if (normalized.includes('LINE_XMULT')) return value ? `全线倍率 ${value}` : '全线倍率提高'
  if (normalized.includes('LINE_ALL_R')) return value ? `全线研发员工${effectValueVerb(value)}` : '全线研发员工加强'
  if (normalized.includes('LINE_ALL_S')) return value ? `全线销售员工${effectValueVerb(value)}` : '全线销售员工加强'
  if (normalized.includes('LINE_ALL_O')) return value ? `全线运营员工${effectValueVerb(value)}` : '全线运营员工加强'
  if (normalized.includes('LINE_ALL')) return value ? `全线员工${effectValueVerb(value)}` : '全线员工加强'
  if (normalized.includes('RIGHT:')) return `右邻员工${effectValueVerb(value) || strengthen}`
  if (normalized.includes('LEFT:')) return `左邻员工${effectValueVerb(value) || strengthen}`
  if (normalized.includes('BOTH:')) return `两侧员工${effectValueVerb(value) || strengthen}`
  if (normalized.includes('ADJ_R')) return value ? `相邻研发员工${effectValueVerb(value)}` : '相邻研发员工加强'
  if (normalized.includes('ADJ_S')) return value ? `相邻销售员工${effectValueVerb(value)}` : '相邻销售员工加强'
  if (normalized.includes('SAME_DEPT')) return value ? `同部门员工${effectValueVerb(value)}` : '同部门员工加强'
  if (normalized.includes('SELF_IF_P1')) return value ? `在启动位时自身${effectValueVerb(value)}` : '启动位自身加强'
  if (normalized.includes('SELF_IF_P3')) return value ? `在中位时自身${effectValueVerb(value)}` : '中位自身加强'
  if (normalized.includes('SELF_IF_P5')) return value ? `在收割位时自身${effectValueVerb(value)}` : '收割位自身加强'
  if (normalized.includes('SELF_IF_LEFT_DEPT_R')) return value ? `左邻为研发时自身${effectValueVerb(value)}` : '左邻为研发时自身加强'
  if (normalized.includes('SELF_IF_ADJ_FUN')) return value ? `相邻功能牌时自身${effectValueVerb(value)}` : '相邻功能牌时自身加强'
  if (normalized.includes('SELF_IF_LINE_HAS_FUN')) return value ? `产线有功能牌时自身${effectValueVerb(value)}` : '产线有功能牌时自身加强'
  if (normalized.includes('SELF:')) return value ? `自身${effectValueVerb(value)}` : '自身加强'
  return normalized.replace(/_/g, ' ')
}

function summarizeEffectShort(effect = '') {
  const normalized = String(effect).replace('TRIGGER: ', '').trim()
  const value = summarizeEffectValue(normalized)

  if (normalized.includes('FOUNDER_LEAN_MANAGEMENT')) return '精益管理'
  if (normalized.includes('FOUNDER_SALES_HIGH')) return 'Sales High'
  if (normalized.includes('FOUNDER_AI_RD')) return 'AI研发'

  if (normalized.includes('MONTH_NO_MAINTAIN')) return '免维持'
  if (normalized.includes('MONTH_BONUS')) return value ? `本月${value}` : '本月加产'
  if (normalized.includes('MONTH_STAR_RATE')) return value ? `叙事${value}` : '叙事率'
  if (normalized.includes('LINE_XMULT')) return value ? `全线${value}` : '全线倍率'
  if (normalized.includes('LINE_ALL_R')) return value ? `研发${value}` : '研发加强'
  if (normalized.includes('LINE_ALL_S')) return value ? `销售${value}` : '销售加强'
  if (normalized.includes('LINE_ALL_O')) return value ? `运营${value}` : '运营加强'
  if (normalized.includes('LINE_ALL')) return value ? `全线${value}` : '全线加强'
  if (normalized.includes('RIGHT:')) return value ? `右邻${value}` : '右邻加强'
  if (normalized.includes('LEFT:')) return value ? `左邻${value}` : '左邻加强'
  if (normalized.includes('BOTH:')) return value ? `两侧${value}` : '两侧加强'
  if (normalized.includes('ADJ_R')) return value ? `邻研发${value}` : '邻研发'
  if (normalized.includes('ADJ_S')) return value ? `邻销售${value}` : '邻销售'
  if (normalized.includes('SAME_DEPT')) return value ? `同部门${value}` : '同部门'
  if (normalized.includes('SELF_IF_P1')) return value ? `启动${value}` : '启动位'
  if (normalized.includes('SELF_IF_P3')) return value ? `中位${value}` : '中位'
  if (normalized.includes('SELF_IF_P5')) return value ? `收割${value}` : '收割位'
  if (normalized.includes('SELF_IF_LEFT_DEPT_R')) return value ? `左研发${value}` : '左研发'
  if (normalized.includes('SELF_IF_ADJ_FUN')) return value ? `邻功能${value}` : '邻功能'
  if (normalized.includes('SELF_IF_LINE_HAS_FUN')) return value ? `有功能${value}` : '有功能'
  if (normalized.includes('SELF:')) return value ? `自身${value}` : '自身加强'
  return summarizeEffect(normalized)
}

function summarizeEffectValue(effect = '') {
  const multiplier = effect.match(/x\d+(?:\.\d+)?/)
  if (multiplier) return multiplier[0]
  const yen = effect.match(/[+-]¥\d+(?:\.\d+)?/)
  if (yen) return yen[0]
  const percent = effect.match(/[+-]\d+(?:\.\d+)?%/)
  if (percent) return percent[0]
  return ''
}

function effectValueVerb(value = '') {
  if (!value) return ''
  if (value.startsWith('x')) return `倍率 ${value}`
  if (value.includes('¥')) return `产能 ${value}`
  return `加强 ${value}`
}
