import { composePerson } from './compositionRules'

export function PixelPersonPortrait({ card }) {
  const person = composePerson(card)
  const { modules } = person
  const sparkles = Array.from({ length: person.sparkle }, (_, index) => index)

  return (
    <span
      className={[
        'pixel-person-portrait',
        person.typeClass,
        person.deptClass,
        person.tierClass,
        modules.background.className,
        modules.effect.className,
      ].join(' ')}
      style={person.cssVars}
    >
      <span className="pixel-person-bg" data-mark={modules.background.mark} />
      <span className="pixel-person-backlight" />
      <span className="pixel-person-shadow" />
      <span
        className={[
          'pixel-person',
          modules.face.className,
          modules.hair.className,
          modules.outfit.className,
          modules.neckwear.className,
          modules.eyewear.className,
          modules.accessory.className,
        ].join(' ')}
      >
        <span className="pixel-person-legs" />
        <span className="pixel-person-body">
          <span className="pixel-person-shirt" />
          <span className="pixel-person-jacket" />
          <span className="pixel-person-neckwear" />
        </span>
        <span className="pixel-person-neck" />
        <span className="pixel-person-head">
          <span className="pixel-person-ear left" />
          <span className="pixel-person-ear right" />
          <span className="pixel-person-face" />
          <span className="pixel-person-hair" />
          <span className="pixel-person-eye left" />
          <span className="pixel-person-eye right" />
          <span className="pixel-person-glasses" />
          <span className="pixel-person-mouth" />
        </span>
        <span className="pixel-person-accessory" data-glyph={modules.accessory.glyph} />
        <span className="pixel-person-hand left" />
        <span className="pixel-person-hand right" />
      </span>
      <span className="pixel-person-fx">
        {sparkles.map((index) => <i key={index} />)}
      </span>
    </span>
  )
}
