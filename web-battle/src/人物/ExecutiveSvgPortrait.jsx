import { useMemo } from 'react'
import executiveAvatarSvg from './assets/executive_modular_64x64_pixel_bust_avatar_system.svg?raw'
import { composeEmployeeSvgAvatar } from './executiveSvgAvatarRules'
import { renderSvgTemplate } from './svgTemplateRenderer'

const FIGURE_SLOTS = [
  'body_base',
  'outfit',
  'neckwear',
  'face_shape',
  'ears',
  'face_detail',
  'expression',
  'eyewear',
  'hair',
  'head_accessory',
  'badge',
  'hand_accessory',
  'rank',
  'effect_front',
]

const LV1_FIGURE_SLOTS = [
  'body_base',
  'outfit',
  'face_shape',
  'expression',
  'eyewear',
  'hair',
]

export function ExecutiveSvgPortrait({ card }) {
  const avatar = useMemo(() => composeEmployeeSvgAvatar(card), [card])
  const figureSlots = avatar.meta.complexity === 'lv1-simple' ? LV1_FIGURE_SLOTS : FIGURE_SLOTS
  const figureBody = useMemo(() => (
    renderSvgTemplate(executiveAvatarSvg, avatar.schema, { includeSlots: figureSlots })
  ), [avatar.schema, figureSlots])

  return (
    <span className="executive-svg-portrait" style={avatar.cssVars} data-profession={avatar.meta.profession}>
      <svg
        className="executive-svg-avatar executive-svg-figure"
        viewBox="0 0 64 64"
        width="64"
        height="64"
        shapeRendering="crispEdges"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: figureBody }}
      />
    </span>
  )
}
