const RANK_BY_TIER = {
  专员: 'specialist',
  经理: 'manager',
  总监: 'director',
  VP: 'vice_president',
  CXO: 'cxo',
}

const SKIN_PALETTES = {
  classic: ['#FFD4B2', '#F9A876', '#E29363', '#C67443', '#8E4F2E'],
  warm: ['#F4BD8D', '#D8895E', '#B96B42', '#8C442B', '#62311F'],
  tan: ['#D79A62', '#BE7447', '#96512F', '#66331E', '#432114'],
  deep: ['#9A5A35', '#7A3D25', '#5C2D1D', '#3D1B13', '#24100B'],
  rose: ['#F3B8A8', '#D8887A', '#B76258', '#87413B', '#5A2927'],
}

const HAIR_PALETTES = {
  ink: ['#191326', '#2B203D', '#3A2D54', '#6C5CE7'],
  coffee: ['#24140F', '#3B241A', '#5C3828', '#9B5B32'],
  silver: ['#5E6470', '#8D96A5', '#C8D0DB', '#FFFFFF'],
  gold: ['#5C3A08', '#A16207', '#D8A600', '#FFE000'],
  teal: ['#063F45', '#0F766E', '#14B8A6', '#67E8F9'],
}

const DEPT_DEFAULTS = {
  R: { profession: 'engineer', background: 'city_window', effect_back: 'data_bits', effect_front: 'notification', outfit: 'hoodie', hand_accessory: 'laptop', badge: 'chart_badge', accent: 'cyan' },
  S: { profession: 'sales', background: 'rank_card', effect_back: 'coins', effect_front: 'sales_fire', outfit: 'business_suit', hand_accessory: 'phone', badge: 'stock_badge', expression: 'sales_charm', accent: 'red' },
  O: { profession: 'operator', background: 'office', effect_back: 'arrows', effect_front: 'notification', outfit: 'business_suit', hand_accessory: 'document', badge: 'id_badge', accent: 'green' },
  NONE: { profession: 'founder', background: 'halo', effect_back: 'gold_aura', effect_front: 'signature_spark', outfit: 'armor', hand_accessory: 'rocket', badge: 'nameplate', accent: 'gold' },
}

const TIER_DEFAULTS = {
  专员: { expression: 'funny', face_shape: 'round', face_detail: 'none', eyewear: 'none', hair: 'spiky', neckwear: 'lanyard', head_accessory: 'none' },
  经理: { expression: 'confident', face_shape: 'soft_square', face_detail: 'cheek_lines', eyewear: 'round_glasses', hair: 'side_part', neckwear: 'tie', head_accessory: 'none' },
  总监: { expression: 'serious', face_shape: 'strong_chin', face_detail: 'laugh_lines', eyewear: 'square_glasses', hair: 'swept_back', neckwear: 'executive_pin', head_accessory: 'none' },
  VP: { expression: 'proud', face_shape: 'strong_chin', face_detail: 'laugh_lines', eyewear: 'sunglasses', hair: 'swept_back', neckwear: 'executive_pin', head_accessory: 'none' },
  CXO: { expression: 'proud', face_shape: 'strong_chin', face_detail: 'laugh_lines', eyewear: 'sunglasses', hair: 'crown_hair', neckwear: 'executive_pin', head_accessory: 'small_crown' },
}

const RARITY_DEFAULTS = {
  common: { background: 'office', effect_back: 'none', effect_front: 'none' },
  rare: { effect_back: 'sparkles' },
  elite: { effect_back: 'data_bits' },
  epic: { background: 'rank_card', effect_back: 'gold_aura', effect_front: 'signature_spark' },
  legendary: { background: 'halo', effect_back: 'gold_aura', effect_front: 'signature_spark', head_accessory: 'small_crown' },
}

export const EMPLOYEE_SVG_AVATAR_TABLE = {
  EMP_R_01: { outfit: 'labcoat', hair: 'spiky', eyewear: 'square_glasses', hand_accessory: 'laptop', expression: 'confident', head_accessory: 'none', skin: 'classic', hairTone: 'ink' },
  EMP_R_02: { hair: 'side_part', eyewear: 'square_glasses', hand_accessory: 'laptop', expression: 'confident', skin: 'warm', hairTone: 'coffee' },
  EMP_R_03: { outfit: 'business_suit', hand_accessory: 'pen_tablet', expression: 'serious', hairTone: 'silver' },
  EMP_R_04: { outfit: 'labcoat', hand_accessory: 'stethoscope', eyewear: 'ar_glasses', hair: 'bob', expression: 'sleepy', skin: 'rose', hairTone: 'teal' },
  EMP_R_05: { hair: 'spiky', eyewear: 'ar_glasses', hand_accessory: 'laptop', face_detail: 'under_eye', expression: 'funny', hairTone: 'ink' },
  EMP_R_06: { outfit: 'business_suit', hand_accessory: 'pen_tablet', eyewear: 'square_glasses', face_detail: 'mustache', expression: 'serious' },
  EMP_R_07: { outfit: 'armor', hand_accessory: 'rocket', eyewear: 'sunglasses', effect_back: 'gold_aura', expression: 'proud' },
  EMP_R_08: { outfit: 'labcoat', hair: 'bald_executive', eyewear: 'round_glasses', hand_accessory: 'stethoscope', background: 'halo', effect_front: 'signature_spark', hairTone: 'silver' },
  EMP_R_09: { hair: 'spiky', outfit: 'hoodie', eyewear: 'ar_glasses', hand_accessory: 'laptop', expression: 'funny', face_detail: 'freckles', hairTone: 'teal' },
  EMP_R_10: { hair: 'spiky', outfit: 'hoodie', eyewear: 'ar_glasses', hand_accessory: 'coffee', expression: 'anxious', face_detail: 'under_eye' },
  EMP_R_11: { outfit: 'business_suit', hand_accessory: 'document', eyewear: 'monocle', expression: 'serious', background: 'office' },
  EMP_R_12: { outfit: 'armor', hand_accessory: 'rocket', eyewear: 'ar_glasses', effect_back: 'gold_aura', expression: 'proud' },
  EMP_R_13: { outfit: 'labcoat', hair: 'bob', eyewear: 'ar_glasses', hand_accessory: 'stethoscope', effect_back: 'data_bits', effect_front: 'notification' },
  EMP_R_14: { outfit: 'hoodie', hair: 'spiky', eyewear: 'round_glasses', hand_accessory: 'laptop', face_detail: 'beard_stubble' },
  EMP_R_15: { outfit: 'hoodie', hair: 'spiky', eyewear: 'ar_glasses', hand_accessory: 'rocket', expression: 'funny', effect_front: 'signature_spark' },
  LEG_R_01: { outfit: 'armor', hair: 'bald_executive', eyewear: 'round_glasses', hand_accessory: 'rocket', head_accessory: 'halo', skin: 'classic', hairTone: 'silver' },
  LEG_R_02: { outfit: 'armor', hair: 'crown_hair', eyewear: 'ar_glasses', hand_accessory: 'laptop', skin: 'classic', hairTone: 'silver' },

  EMP_S_01: { hair: 'side_part', eyewear: 'none', hand_accessory: 'phone', expression: 'sales_charm', skin: 'warm' },
  EMP_S_02: { hair: 'swept_back', eyewear: 'round_glasses', hand_accessory: 'phone', expression: 'sales_charm' },
  EMP_S_03: { hair: 'swept_back', eyewear: 'sunglasses', hand_accessory: 'money_clip', effect_front: 'coin_pop', expression: 'proud' },
  EMP_S_04: { hand_accessory: 'briefcase', eyewear: 'sunglasses', effect_front: 'coin_pop', expression: 'proud' },
  EMP_S_05: { outfit: 'trench', hair: 'spiky', hand_accessory: 'megaphone', neckwear: 'lanyard', expression: 'sales_charm', face_detail: 'freckles' },
  EMP_S_06: { hair: 'bob', hand_accessory: 'pen_tablet', badge: 'stock_badge', expression: 'sleepy', eyewear: 'round_glasses' },
  EMP_S_07: { outfit: 'armor', hand_accessory: 'money_clip', eyewear: 'sunglasses', effect_front: 'sales_fire', expression: 'proud' },
  EMP_S_08: { outfit: 'armor', hair: 'crown_hair', hand_accessory: 'money_clip', eyewear: 'sunglasses', background: 'halo', effect_front: 'sales_fire' },
  EMP_S_09: { head_accessory: 'headset', hand_accessory: 'phone', eyewear: 'round_glasses', expression: 'sales_charm' },
  EMP_S_10: { hand_accessory: 'megaphone', outfit: 'trench', effect_front: 'sales_fire', expression: 'sales_charm' },
  EMP_S_11: { hand_accessory: 'briefcase', outfit: 'business_suit', eyewear: 'sunglasses', effect_front: 'coin_pop' },
  EMP_S_12: { outfit: 'armor', hair: 'crown_hair', hand_accessory: 'megaphone', effect_front: 'sales_fire', background: 'rank_card' },
  EMP_S_13: { hair: 'bob', eyewear: 'sunglasses', hand_accessory: 'phone', effect_back: 'sparkles', effect_front: 'notification' },
  EMP_S_14: { hair: 'swept_back', eyewear: 'sunglasses', hand_accessory: 'money_clip', outfit: 'armor', effect_front: 'coin_pop' },
  EMP_S_15: { head_accessory: 'headset', hand_accessory: 'phone', outfit: 'business_suit', effect_back: 'gold_aura', expression: 'sales_charm' },
  LEG_S_01: { outfit: 'armor', hair: 'crown_hair', eyewear: 'sunglasses', hand_accessory: 'money_clip', effect_front: 'sales_fire', skin: 'tan' },
  LEG_S_02: { outfit: 'armor', hair: 'swept_back', eyewear: 'none', hand_accessory: 'rocket', effect_back: 'gold_aura', head_accessory: 'halo' },

  EMP_O_01: { outfit: 'hoodie', hair: 'spiky', hairTone: 'ink', eyewear: 'none', hand_accessory: 'document', badge: 'id_badge', expression: 'confident', skin: 'classic' },
  EMP_O_02: { hair: 'side_part', eyewear: 'square_glasses', hand_accessory: 'document', badge: 'chart_badge', expression: 'confident' },
  EMP_O_03: { outfit: 'business_suit', hand_accessory: 'briefcase', badge: 'chart_badge', effect_back: 'arrows', expression: 'serious' },
  EMP_O_04: { hair: 'bob', hand_accessory: 'keycard', head_accessory: 'headset', badge: 'id_badge', expression: 'anxious' },
  EMP_O_05: { profession: 'finance', hand_accessory: 'money_clip', badge: 'stock_badge', eyewear: 'square_glasses', expression: 'serious' },
  EMP_O_06: { hand_accessory: 'pen_tablet', badge: 'chart_badge', eyewear: 'round_glasses', expression: 'anxious' },
  EMP_O_07: { outfit: 'armor', hand_accessory: 'briefcase', effect_back: 'gold_aura', expression: 'proud' },
  EMP_O_08: { hair: 'bob', hand_accessory: 'keycard', badge: 'id_badge', expression: 'confident', face_shape: 'chubby' },
  EMP_O_09: { hand_accessory: 'pen_tablet', eyewear: 'ar_glasses', effect_back: 'data_bits', expression: 'sleepy' },
  EMP_O_10: { outfit: 'trench', hand_accessory: 'document', badge: 'chart_badge', expression: 'serious' },
  EMP_O_11: { outfit: 'labcoat', hand_accessory: 'pen_tablet', eyewear: 'ar_glasses', effect_back: 'data_bits', expression: 'confident' },
  EMP_O_12: { outfit: 'armor', hand_accessory: 'briefcase', background: 'rank_card', effect_back: 'gold_aura', expression: 'proud' },
  EMP_O_13: { hair: 'bald_executive', outfit: 'armor', hand_accessory: 'document', head_accessory: 'halo', effect_back: 'gold_aura' },
  EMP_O_14: { outfit: 'trench', hand_accessory: 'document', eyewear: 'round_glasses', face_detail: 'laugh_lines' },
  EMP_O_15: { profession: 'finance', hand_accessory: 'money_clip', badge: 'stock_badge', background: 'rank_card', effect_front: 'coin_pop' },
  LEG_O_01: { outfit: 'armor', hair: 'crown_hair', hand_accessory: 'keycard', head_accessory: 'small_crown', effect_back: 'gold_aura' },
  LEG_O_02: { outfit: 'armor', hair: 'bald_executive', hand_accessory: 'document', head_accessory: 'halo', effect_back: 'gold_aura', hairTone: 'silver' },
  LEG_M_01: { outfit: 'armor', hair: 'crown_hair', eyewear: 'sunglasses', hand_accessory: 'rocket', head_accessory: 'small_crown', background: 'halo' },
}

export function composeEmployeeSvgAvatar(card) {
  const seed = hashString(card?.id ?? card?.name ?? 'employee')
  const dept = card?.dept ?? 'NONE'
  const tier = card?.tier ?? '专员'
  const rank = RANK_BY_TIER[tier] ?? 'specialist'
  const complexity = card?.unlockLevel === 1 ? 'lv1-simple' : 'standard'
  const table = EMPLOYEE_SVG_AVATAR_TABLE[card?.id] ?? {}
  const spec = {
    rank,
    skin: skinBySeed(seed),
    hairTone: hairToneBySeed(seed),
    ears: seed % 7 === 0 ? 'large' : 'normal',
    ...DEPT_DEFAULTS[dept],
    ...TIER_DEFAULTS[tier],
    ...RARITY_DEFAULTS[card?.rarity],
    ...table,
  }

  return {
    schema: {
      background: spec.background,
      effect_back: spec.effect_back,
      outfit: spec.outfit,
      neckwear: spec.neckwear,
      face_shape: spec.face_shape,
      ears: spec.ears,
      face_detail: spec.face_detail,
      expression: spec.expression,
      eyewear: spec.eyewear,
      hair: spec.hair,
      head_accessory: spec.head_accessory,
      badge: spec.badge,
      hand_accessory: spec.hand_accessory,
      rank: spec.rank,
      effect_front: spec.effect_front,
    },
    cssVars: {
      ...skinVars(spec.skin),
      ...hairVars(spec.hairTone),
      ...accentVars(spec.accent),
      '--avatar-rarity': rarityColor(card?.rarity),
    },
    meta: {
      profession: spec.profession,
      rank: spec.rank,
      skin: spec.skin,
      hairTone: spec.hairTone,
      complexity,
    },
  }
}

function skinBySeed(seed) {
  return ['classic', 'warm', 'tan', 'rose', 'deep'][seed % 5]
}

function hairToneBySeed(seed) {
  return ['ink', 'coffee', 'silver', 'gold', 'teal'][Math.floor(seed / 5) % 5]
}

function skinVars(key) {
  const colors = SKIN_PALETTES[key] ?? SKIN_PALETTES.classic
  return {
    '--svg-skin-0': colors[0],
    '--svg-skin-1': colors[1],
    '--svg-skin-2': colors[2],
    '--svg-skin-3': colors[3],
    '--svg-skin-4': colors[4],
  }
}

function hairVars(key) {
  const colors = HAIR_PALETTES[key] ?? HAIR_PALETTES.ink
  return {
    '--svg-hair-0': colors[0],
    '--svg-hair-1': colors[1],
    '--svg-hair-2': colors[2],
    '--svg-hair-3': colors[3],
  }
}

function accentVars(key) {
  if (key === 'red') return { '--svg-accent-0': '#FF3366', '--svg-accent-1': '#D91A4D', '--svg-accent-2': '#FFE000' }
  if (key === 'green') return { '--svg-accent-0': '#42D77D', '--svg-accent-1': '#1D8F55', '--svg-accent-2': '#00F2FE' }
  if (key === 'gold') return { '--svg-accent-0': '#FFE000', '--svg-accent-1': '#D8A600', '--svg-accent-2': '#FF3366' }
  return { '--svg-accent-0': '#00F2FE', '--svg-accent-1': '#4C7FA8', '--svg-accent-2': '#FFE000' }
}

function rarityColor(rarity) {
  if (rarity === 'legendary') return '#ffc857'
  if (rarity === 'epic') return '#fb923c'
  if (rarity === 'elite') return '#c084fc'
  if (rarity === 'rare') return '#60a5fa'
  return '#94a3b8'
}

function hashString(value) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  }
  return hash
}
