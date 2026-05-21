import { PERSON_MODULE_LIBRARY } from './moduleLibrary'
import { PERSON_MODULE_TABLE } from './moduleTable'

const SKIN_CYCLE = ['peach', 'warm', 'olive', 'tan', 'rose']
const HAIR_TONE_CYCLE = ['ink', 'coffee', 'auburn', 'silver', 'violet', 'teal', 'gold']

const DEPT_DEFAULTS = {
  R: { outfit: 'hoodie', accessory: 'laptop', background: 'rdLab', effect: 'code' },
  S: { outfit: 'sales', accessory: 'phone', background: 'salesStage', effect: 'money' },
  O: { outfit: 'opsVest', accessory: 'clipboard', background: 'opsBoard', effect: 'ops' },
  NONE: { outfit: 'executive', accessory: 'rocket', background: 'boardroom', effect: 'stars' },
}

const TIER_DEFAULTS = {
  专员: { face: 'round', hair: 'messy', neckwear: 'badge', eyewear: 'none', scale: 0.92, tierClass: 'tier-junior' },
  经理: { face: 'soft', hair: 'neat', neckwear: 'tie', eyewear: 'round', scale: 1, tierClass: 'tier-manager' },
  总监: { face: 'square', hair: 'wave', neckwear: 'medal', eyewear: 'square', scale: 1.06, tierClass: 'tier-director' },
  VP: { face: 'sharp', hair: 'wave', neckwear: 'medal', eyewear: 'shades', scale: 1.1, tierClass: 'tier-vp' },
  CXO: { face: 'sharp', hair: 'crown', neckwear: 'medal', eyewear: 'shades', scale: 1.14, tierClass: 'tier-cxo' },
}

const RARITY_DEFAULTS = {
  common: { effect: 'none', sparkle: 0 },
  rare: { sparkle: 1 },
  elite: { sparkle: 2 },
  epic: { sparkle: 3, effect: 'aura' },
  legendary: { sparkle: 4, effect: 'legendary' },
}

const TYPE_DEFAULTS = {
  fun: {
    face: 'round',
    hair: 'spike',
    outfit: 'hoodie',
    neckwear: 'scarf',
    eyewear: 'visor',
    accessory: 'bot',
    background: 'functionPanel',
    effect: 'code',
    scale: 0.96,
    tierClass: 'tier-module',
  },
  srv: {
    face: 'soft',
    hair: 'neat',
    outfit: 'finance',
    neckwear: 'badge',
    eyewear: 'round',
    accessory: 'book',
    background: 'serviceDesk',
    effect: 'stars',
    scale: 0.96,
    tierClass: 'tier-module',
  },
}

export function composePerson(card) {
  const seed = hashString(card?.id ?? card?.name ?? 'person')
  const dept = card?.dept ?? 'NONE'
  const type = card?.type ?? 'emp'
  const tier = card?.tier ?? (type === 'emp' ? '专员' : '模块')
  const base = type === 'emp'
    ? {
        ...DEPT_DEFAULTS[dept],
        ...TIER_DEFAULTS[tier],
        ...RARITY_DEFAULTS[card?.rarity],
      }
    : {
        ...TYPE_DEFAULTS[type],
        ...RARITY_DEFAULTS[card?.rarity],
      }

  const table = PERSON_MODULE_TABLE[card?.id] ?? {}
  const spec = {
    face: 'round',
    hair: 'neat',
    outfit: 'hoodie',
    neckwear: 'none',
    eyewear: 'none',
    accessory: 'laptop',
    background: 'boardroom',
    effect: 'none',
    scale: 1,
    sparkle: 0,
    tierClass: 'tier-junior',
    ...base,
    ...table,
  }

  const skinKey = table.skin ?? SKIN_CYCLE[seed % SKIN_CYCLE.length]
  const hairToneKey = table.hairTone ?? HAIR_TONE_CYCLE[Math.floor(seed / 7) % HAIR_TONE_CYCLE.length]

  const modules = {
    skin: pickModule('skin', skinKey),
    face: pickModule('face', spec.face),
    hair: pickModule('hair', spec.hair),
    outfit: pickModule('outfit', spec.outfit),
    neckwear: pickModule('neckwear', spec.neckwear),
    eyewear: pickModule('eyewear', spec.eyewear),
    accessory: pickModule('accessory', spec.accessory),
    background: pickModule('background', spec.background),
    effect: pickModule('effect', spec.effect),
  }

  const hairTone = PERSON_MODULE_LIBRARY.hairTone[hairToneKey] ?? PERSON_MODULE_LIBRARY.hairTone.ink

  return {
    modules,
    sparkle: spec.sparkle,
    tierClass: spec.tierClass,
    typeClass: `person-type-${type}`,
    deptClass: `person-dept-${String(dept).toLowerCase()}`,
    cssVars: {
      '--person-skin': modules.skin.color,
      '--person-skin-shadow': modules.skin.shadow,
      '--person-blush': modules.skin.blush,
      '--person-hair': hairTone,
      '--person-outfit': modules.outfit.color,
      '--person-outfit-shadow': modules.outfit.shadow,
      '--person-accent': modules.neckwear.color,
      '--person-bg-a': modules.background.a,
      '--person-bg-b': modules.background.b,
      '--person-scale': spec.scale,
    },
  }
}

function pickModule(group, key) {
  return PERSON_MODULE_LIBRARY[group][key] ?? Object.values(PERSON_MODULE_LIBRARY[group])[0]
}

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}
