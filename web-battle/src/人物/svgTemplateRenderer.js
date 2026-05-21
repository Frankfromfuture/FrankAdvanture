const TEMPLATE_CACHE = new Map()

const SVG_COLOR_OVERRIDES = `
<style>
  .skin-0 { fill: var(--svg-skin-0, #FFD4B2); }
  .skin-1 { fill: var(--svg-skin-1, #F9A876); }
  .skin-2 { fill: var(--svg-skin-2, #E29363); }
  .skin-3 { fill: var(--svg-skin-3, #C67443); }
  .skin-4 { fill: var(--svg-skin-4, #8E4F2E); }
  .hair-0 { fill: var(--svg-hair-0, #191326); }
  .hair-1 { fill: var(--svg-hair-1, #2B203D); }
  .hair-2 { fill: var(--svg-hair-2, #3A2D54); }
  .hair-3 { fill: var(--svg-hair-3, #6C5CE7); }
  .accent-0 { fill: var(--svg-accent-0, #FF3366); }
  .accent-1 { fill: var(--svg-accent-1, #D91A4D); }
  .accent-2 { fill: var(--svg-accent-2, #00F2FE); }
</style>`

export function renderSvgTemplate(rawSvg, selectedSlots, options = {}) {
  const parsed = getParsedTemplate(rawSvg)
  const includeSlots = options.includeSlots ? new Set(options.includeSlots) : null
  const body = parsed.slots.filter((slot) => !includeSlots || includeSlots.has(slot.name)).map((slot) => {
    if (!slot.options.size) return wrapSlot(slot, slot.fixedContent)
    const selected = selectedSlots[slot.name] ?? slot.defaultOption ?? 'none'
    const option = slot.options.get(selected) ?? slot.options.get(slot.defaultOption) ?? slot.options.values().next().value
    return wrapSlot(slot, option?.content ?? '', selected)
  }).join('\n')

  return `${parsed.defs}${SVG_COLOR_OVERRIDES}${body}`
}

export function getSvgTemplateOptions(rawSvg) {
  const parsed = getParsedTemplate(rawSvg)
  return parsed.slots.reduce((acc, slot) => {
    acc[slot.name] = [...slot.options.keys()]
    return acc
  }, {})
}

function getParsedTemplate(rawSvg) {
  if (TEMPLATE_CACHE.has(rawSvg)) return TEMPLATE_CACHE.get(rawSvg)
  const parsed = parseTemplate(rawSvg)
  TEMPLATE_CACHE.set(rawSvg, parsed)
  return parsed
}

function parseTemplate(rawSvg) {
  const defs = rawSvg.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? ''
  const slots = []
  let index = 0
  while (index < rawSvg.length) {
    const start = rawSvg.indexOf('<g id="SLOT_', index)
    if (start === -1) break
    const group = readGroup(rawSvg, start)
    const name = attr(group.open, 'data-slot')
    if (name) {
      slots.push({
        id: attr(group.open, 'id'),
        name,
        defaultOption: attr(group.open, 'data-selected'),
        options: readOptionGroups(group.content),
        fixedContent: group.content,
      })
    }
    index = group.end
  }
  return { defs, slots }
}

function readOptionGroups(content) {
  const options = new Map()
  let index = 0
  while (index < content.length) {
    const start = content.indexOf('<g ', index)
    if (start === -1) break
    const group = readGroup(content, start)
    const option = attr(group.open, 'data-option')
    if (option) {
      options.set(option, {
        id: attr(group.open, 'id'),
        content: group.content.replace(/\sclass="hide"/g, ''),
      })
    }
    index = group.end
  }
  return options
}

function readGroup(source, start) {
  const tagRe = /<\/?g\b[^>]*>/g
  tagRe.lastIndex = start
  let depth = 0
  let open = ''
  let firstEnd = 0
  let match
  while ((match = tagRe.exec(source))) {
    const tag = match[0]
    if (!tag.startsWith('</')) {
      depth += 1
      if (depth === 1) {
        open = tag
        firstEnd = tagRe.lastIndex
      }
    } else {
      depth -= 1
      if (depth === 0) {
        return {
          open,
          content: source.slice(firstEnd, match.index),
          end: tagRe.lastIndex,
        }
      }
    }
  }
  return { open: '', content: '', end: source.length }
}

function wrapSlot(slot, content, selected = '') {
  return `<g id="${slot.id}" data-slot="${slot.name}"${selected ? ` data-selected="${selected}"` : ''}>${content}</g>`
}

function attr(tag, name) {
  return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? ''
}
