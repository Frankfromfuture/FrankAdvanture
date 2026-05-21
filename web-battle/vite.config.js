import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

const EXPORT_BY_TYPE = {
  card: 'CARD_TEMPLATES',
  bm: 'BUSINESS_MODELS',
  event: 'EVENTS',
  board: 'BOARD_EVENTS',
}

function cardsWritebackPlugin() {
  return {
    name: 'franks-cards-writeback',
    configureServer(server) {
      server.middlewares.use('/__dev/write-cards', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        try {
          const body = await readJson(req)
          const exportName = EXPORT_BY_TYPE[body.type]
          if (!exportName || !body.item?.id) {
            throw new Error('缺少 type 或 item.id')
          }

          const filePath = path.resolve(server.config.root, 'src/game/cards.js')
          const source = fs.readFileSync(filePath, 'utf8')
          const nextSource = replaceItemInExport(source, exportName, body.item)
          fs.writeFileSync(filePath, nextSource)

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        } catch (error) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: error.message }))
        }
      })
    },
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => { raw += chunk })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function replaceItemInExport(source, exportName, item) {
  const exportStart = source.indexOf(`export const ${exportName} = [`)
  if (exportStart === -1) throw new Error(`找不到 ${exportName}`)

  const arrayStart = source.indexOf('[', exportStart)
  const arrayEnd = findMatching(source, arrayStart, '[', ']')
  const itemStart = findObjectById(source, arrayStart + 1, arrayEnd, item.id)
  if (itemStart === -1) throw new Error(`${exportName} 中找不到 id=${item.id}`)

  const itemEnd = findMatching(source, itemStart, '{', '}') + 1
  const commaEnd = source.slice(itemEnd, itemEnd + 1) === ',' ? itemEnd + 1 : itemEnd
  const indent = source.slice(source.lastIndexOf('\n', itemStart) + 1, itemStart)
  const replacement = formatJsObject(item, indent)

  return `${source.slice(0, itemStart)}${replacement}${source.slice(commaEnd)}`
}

function findObjectById(source, start, end, id) {
  let index = start
  while (index < end) {
    const objectStart = source.indexOf('{', index)
    if (objectStart === -1 || objectStart >= end) return -1
    const objectEnd = findMatching(source, objectStart, '{', '}') + 1
    const chunk = source.slice(objectStart, objectEnd)
    if (
      chunk.includes(`id: '${id}'`) ||
      chunk.includes(`id: "${id}"`) ||
      chunk.includes(`"id": "${id}"`)
    ) {
      return objectStart
    }
    index = objectEnd
  }
  return -1
}

function findMatching(source, start, open, close) {
  let depth = 0
  let quote = ''
  let escaped = false

  for (let i = start; i < source.length; i += 1) {
    const char = source[i]
    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === open) depth += 1
    if (char === close) {
      depth -= 1
      if (depth === 0) return i
    }
  }
  throw new Error(`找不到匹配的 ${close}`)
}

function formatJsObject(item, indent) {
  const body = JSON.stringify(item, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${indent}${line}`))
    .join('\n')
  return `${body},`
}

export default defineConfig({
  plugins: [react(), cardsWritebackPlugin()],
})
