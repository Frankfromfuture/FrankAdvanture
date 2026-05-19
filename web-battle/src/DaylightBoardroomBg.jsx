import { useEffect, useRef } from 'react'

function DaylightBoardroomBg() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    const W = 640
    const H = 360
    canvas.width = W
    canvas.height = H
    if ('imageSmoothingEnabled' in ctx) ctx.imageSmoothingEnabled = false

    function resize() {
      const scale = Math.max(window.innerWidth / W, window.innerHeight / H)
      canvas.style.width = `${Math.ceil(W * scale)}px`
      canvas.style.height = `${Math.ceil(H * scale)}px`
    }
    window.addEventListener('resize', resize)
    resize()

    const C = {
      wallTop: '#eef3f6', wallMid: '#dce7ee', wallBottom: '#c7d5df', wallLine: 'rgba(96,116,132,.16)',
      skyTop: '#b9e5ff', skyBottom: '#f3fbff', frameDark: '#61717e', frameMid: '#8ea0ad', frameLight: '#c7d3db',
      city1: '#94b1c4', city2: '#a8c2d2', city3: '#bfd2dd', floor: '#c3915e',
      tableDark: '#593820', tableMid: '#8a5b34', tableLight: '#c98b52', chairBack: '#2d394b', chairSeat: '#42556f', chairHi: '#657995', metal: '#697887',
      screenFrame: '#5e6d79', screenDark: '#213045', blue: '#6ec6e8', green: '#79d58b', yellow: '#f4c96b', red: '#ee7b70',
      paper: '#fff7df', paperShadow: '#d6c7a5', plant: '#2f7a50', plantLight: '#63b977',
    }

    function rngFactory(a) {
      return function rand() {
        let t = a += 0x6D2B79F5
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }
    const rng = rngFactory(20260517)
    const skyline = makeSkyline()
    const clouds = [
      { x: 8, y: 20, s: 0.85, v: 2.6, a: 0.56 },
      { x: 72, y: 38, s: 0.65, v: 1.8, a: 0.44 },
      { x: 128, y: 16, s: 0.75, v: 2.2, a: 0.50 },
    ]
    const dust = []
    for (let i = 0; i < 58; i += 1) {
      dust.push({ x: rng() * W, y: 26 + rng() * 180, v: 0.12 + rng() * 0.35, a: 0.04 + rng() * 0.11 })
    }

    function rect(x, y, w, h, c) {
      if (c) ctx.fillStyle = c
      ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h))
    }
    function line(x1, y1, x2, y2, c) {
      ctx.strokeStyle = c
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(Math.floor(x1) + 0.5, Math.floor(y1) + 0.5)
      ctx.lineTo(Math.floor(x2) + 0.5, Math.floor(y2) + 0.5)
      ctx.stroke()
    }
    function ellipse(x, y, rx, ry, c) {
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.ellipse(Math.floor(x), Math.floor(y), Math.floor(rx), Math.floor(ry), 0, 0, Math.PI * 2)
      ctx.fill()
    }
    function quad(x1, y1, x2, y2, x3, y3, x4, y4) {
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.lineTo(x3, y3)
      ctx.lineTo(x4, y4)
      ctx.closePath()
      ctx.fill()
    }
    function roundRect(x, y, w, h, r, c) {
      x = Math.floor(x); y = Math.floor(y); w = Math.floor(w); h = Math.floor(h); r = Math.floor(r)
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.quadraticCurveTo(x + w, y, x + w, y + r)
      ctx.lineTo(x + w, y + h - r)
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
      ctx.lineTo(x + r, y + h)
      ctx.quadraticCurveTo(x, y + h, x, y + h - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.fill()
    }

    function getWindows() {
      return [{ x: 46, y: 38, w: 148, h: 136 }, { x: 246, y: 32, w: 148, h: 142 }, { x: 446, y: 38, w: 148, h: 136 }]
    }
    function makeSkyline() {
      const colors = [C.city1, C.city2, C.city3, '#88a7bc']
      const arr = []
      let x = 0
      while (x < 235) {
        const bw = 12 + Math.floor(rng() * 24)
        const bh = 28 + Math.floor(rng() * 58)
        arr.push({ x, w: bw, h: bh, color: colors[Math.floor(rng() * colors.length)], seed: Math.floor(rng() * 99) })
        x += bw + 3 + Math.floor(rng() * 7)
      }
      return arr
    }

    function drawWall() {
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, C.wallTop); g.addColorStop(0.58, C.wallMid); g.addColorStop(1, C.wallBottom)
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
      for (let x = 0; x <= W; x += 106) rect(x, 0, 1, 218, C.wallLine)
      rect(0, 216, W, 2, 'rgba(86,105,122,.24)')
      rect(0, 219, W, 5, '#b8c6d0')
    }
    function drawWindows() {
      const wins = getWindows()
      for (let i = 0; i < wins.length; i += 1) {
        const w = wins[i]
        rect(w.x - 6, w.y - 6, w.w + 12, w.h + 12, C.frameDark)
        rect(w.x - 4, w.y - 4, w.w + 8, w.h + 8, C.frameMid)
        rect(w.x - 1, w.y - 1, w.w + 2, w.h + 2, C.frameLight)
        const sky = ctx.createLinearGradient(0, w.y, 0, w.y + w.h)
        sky.addColorStop(0, C.skyTop); sky.addColorStop(1, C.skyBottom)
        ctx.fillStyle = sky; ctx.fillRect(w.x, w.y, w.w, w.h)
        rect(w.x + Math.floor(w.w / 2) - 2, w.y, 4, w.h, C.frameMid)
        rect(w.x, w.y + Math.floor(w.h / 2), w.w, 3, C.frameMid)
      }
    }
    function drawCloud(x, y, s, a) {
      rect(x, y + 4 * s, 22 * s, 5 * s, `rgba(255,255,255,${a})`)
      rect(x + 8 * s, y, 24 * s, 8 * s, `rgba(255,255,255,${a})`)
      rect(x + 24 * s, y + 3 * s, 22 * s, 6 * s, `rgba(255,255,255,${a})`)
      rect(x + 4 * s, y + 10 * s, 48 * s, 4 * s, `rgba(232,246,255,${a * 0.55})`)
    }
    function drawOutdoor(t) {
      const wins = getWindows()
      for (let wi = 0; wi < wins.length; wi += 1) {
        const w = wins[wi]
        ctx.save()
        ctx.beginPath()
        ctx.rect(w.x, w.y, w.w, w.h)
        ctx.clip()
        for (let r = -1; r <= 2; r += 1) {
          for (let j = 0; j < skyline.length; j += 1) {
            const b = skyline[j]
            const bx = w.x + ((b.x + r * 220) % 220)
            const base = w.y + w.h
            rect(bx, base - b.h, b.w, b.h, b.color)
            rect(bx + 2, base - b.h + 4, b.w - 4, 2, 'rgba(255,255,255,.2)')
            for (let yy = base - b.h + 10; yy < base - 6; yy += 12) {
              for (let xx = bx + 5; xx < bx + b.w - 4; xx += 10) {
                if (((xx + yy + b.seed) % 6) !== 0) rect(xx, yy, 3, 3, 'rgba(255,255,255,.32)')
              }
            }
          }
        }
        for (let c = 0; c < clouds.length; c += 1) {
          const cl = clouds[c]
          drawCloud(w.x + ((cl.x + t * cl.v) % (w.w + 80)) - 40, w.y + cl.y, cl.s, cl.a)
        }
        ctx.restore()
      }
    }
    function drawSun(t) {
      ctx.fillStyle = `rgba(255,250,210,${0.075 + 0.018 * Math.sin(t * 0.8)})`
      quad(50, 176, 192, 176, 292, 318, 108, 318)
      quad(248, 176, 392, 176, 438, 320, 276, 320)
      quad(446, 176, 590, 176, 552, 320, 390, 320)
    }
    function drawFloor() {
      rect(0, 224, W, 136, C.floor)
      for (let y = 236; y < H; y += 18) rect(0, y, W, 1, 'rgba(92,58,36,.22)')
      for (let x = -120; x < W + 120; x += 44) line(x, 224, x - 45, H, 'rgba(92,58,36,.14)')
      rect(0, 224, W, 1, 'rgba(255,255,255,.45)')
    }

    function drawScreen(t) {
      rect(438, 58, 150, 94, C.screenFrame); rect(444, 64, 138, 82, C.screenDark)
      for (let gy = 76; gy <= 136; gy += 20) rect(454, gy, 112, 1, 'rgba(255,255,255,.14)')
      for (let gx = 454; gx <= 566; gx += 28) rect(gx, 76, 1, 60, 'rgba(255,255,255,.10)')
      rect(454, 69, 34, 4, C.blue); rect(494, 69, 18, 4, C.green)
      for (let i = 0; i < 14; i += 1) {
        const bh = 3 + Math.floor(10 * Math.abs(Math.sin(t * 0.9 + i * 0.7)))
        rect(456 + i * 8, 132 - bh, 4, bh, i % 3 === 0 ? C.red : C.green)
      }
      const pts = []
      for (let p = 0; p < 18; p += 1) {
        const py = 110 - Math.sin(p * 0.75 + t * 1.25) * 10 - Math.sin(p * 0.22 + t * 0.45) * 13 + p * -0.6
        pts.push([456 + p * 6, Math.max(80, Math.min(126, py))])
      }
      for (let q = 0; q < pts.length - 1; q += 1) line(pts[q][0], pts[q][1], pts[q + 1][0], pts[q + 1][1], pts[q + 1][1] < pts[q][1] ? C.green : C.red)
      rect(pts[17][0] - 2, pts[17][1] - 2, 4, 4, C.yellow); rect(511, 152, 12, 104, C.frameDark); rect(468, 256, 98, 7, C.frameDark)
    }
    function drawWhiteboard() {
      rect(56, 62, 136, 82, '#778894'); rect(62, 68, 124, 70, '#fbfdf8'); rect(107, 76, 34, 12, '#d2e6ff')
      rect(112, 81, 24, 2, 'rgba(51,65,84,.52)'); rect(73, 106, 30, 12, '#d8f0d4'); rect(109, 106, 30, 12, '#ffe8b2'); rect(145, 106, 30, 12, '#ffd9d2')
      line(124, 88, 124, 96, 'rgba(51,65,84,.62)'); line(88, 96, 160, 96, 'rgba(51,65,84,.62)')
      line(88, 96, 88, 106, 'rgba(51,65,84,.62)'); line(124, 96, 124, 106, 'rgba(51,65,84,.62)'); line(160, 96, 160, 106, 'rgba(51,65,84,.62)')
      const xs = [88, 124, 160]; const cols = ['#b5dcb8', '#ecd995', '#edb8b1']
      for (let i = 0; i < 3; i += 1) {
        line(xs[i], 118, xs[i], 124, 'rgba(51,65,84,.48)')
        for (let j = -1; j <= 1; j += 1) rect(xs[i] + j * 8 - 2, 126, 4, 4, cols[i])
      }
    }
    function drawClock() {
      const n = new Date()
      const s = n.getSeconds() + n.getMilliseconds() / 1000
      const m = n.getMinutes() + s / 60
      const h = (n.getHours() % 12) + m / 60
      const cx = 320; const cy = 70
      ellipse(cx, cy, 22, 22, '#7b8995'); ellipse(cx, cy, 17, 17, '#f7fbff')
      for (let i = 0; i < 12; i += 1) {
        const a = -Math.PI / 2 + i * Math.PI / 6
        line(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13, cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, i % 3 === 0 ? '#263244' : '#5b6878')
      }
      const ha = -Math.PI / 2 + h * Math.PI / 6
      const ma = -Math.PI / 2 + m * Math.PI / 30
      const sa = -Math.PI / 2 + s * Math.PI / 30
      line(cx, cy, cx + Math.cos(ha) * 7, cy + Math.sin(ha) * 7, '#263244')
      line(cx, cy, cx + Math.cos(ma) * 12, cy + Math.sin(ma) * 12, '#334154')
      line(cx, cy, cx + Math.cos(sa) * 15, cy + Math.sin(sa) * 15, '#ee5f5a')
      rect(cx - 1, cy - 1, 3, 3, '#ee5f5a')
    }

    function drawLeaf(cx, cy, dir, sc, light) {
      const w = Math.round(22 * sc); const h = Math.round(10 * sc)
      const main = light ? C.plantLight : C.plant; const dark = light ? C.plant : '#27613f'; const hi = light ? '#8fd08d' : '#4da86a'
      rect(cx - w * 0.15 * dir, cy - h / 2, w * 0.45, 2, main)
      rect(cx - w * 0.35 * dir, cy - h / 2 + 2, w * 0.75, 3, main)
      rect(cx - w * 0.45 * dir, cy - h / 2 + 5, w * 0.9, 3, dark)
      rect(cx - w * 0.28 * dir, cy - h / 2 + 8, w * 0.58, 2, dark)
      rect(cx - w * 0.05 * dir, cy - 1, w * 0.38, 1, hi)
    }
    function drawPlant(x, y, dir) {
      rect(x - 13, y + 42, 26, 31, '#7c4f36'); rect(x - 17, y + 38, 34, 8, '#a66c4a')
      const stems = [[-1.85, 40, 1, true], [-1.55, 52, 1.1, false], [-1.25, 44, 0.95, true], [-0.95, 34, 0.86, false], [-2.25, 32, 0.82, true], [-0.65, 28, 0.75, false]]
      for (let i = 0; i < stems.length; i += 1) {
        const st = stems[i]; const ex = x + Math.cos(st[0]) * st[1] * dir; const ey = y + 42 + Math.sin(st[0]) * st[1]
        line(x, y + 42, ex, ey, st[3] ? '#2b6f49' : C.plant)
        drawLeaf(ex, ey, dir, st[2], st[3])
      }
      drawLeaf(x - 18 * dir, y + 28, dir, 0.78, true); drawLeaf(x + 18 * dir, y + 30, -dir, 0.72, false); drawLeaf(x, y + 22, dir, 0.85, true)
    }
    function drawPinePad(cx, cy, w, h, a) {
      rect(cx - w / 2 + 8, cy - h / 2, w - 16, 4, `rgba(99,185,119,${a})`)
      rect(cx - w / 2 + 2, cy - h / 2 + 4, w - 4, 5, `rgba(47,122,80,${a})`)
      rect(cx - w / 2, cy - h / 2 + 9, w, 5, `rgba(47,122,80,${a})`)
      rect(cx - w / 2 + 6, cy - h / 2 + 14, w - 12, 4, `rgba(35,92,59,${a})`)
      rect(cx - w / 2 + 14, cy - h / 2 + 18, w - 28, 3, `rgba(35,92,59,${a})`)
    }
    function drawWelcomePine(x, y) {
      const rx = x; const ry = y + 44
      rect(rx - 5, ry - 72, 10, 104, '#6b4a2f'); rect(rx - 3, ry - 72, 3, 104, '#7b5738'); rect(rx + 3, ry - 70, 2, 98, 'rgba(70,38,22,.28)')
      line(rx - 3, ry - 56, rx - 44, ry - 66, '#68472f'); line(rx - 3, ry - 72, rx - 28, ry - 90, '#68472f'); line(rx + 3, ry - 42, rx + 30, ry - 52, '#68472f'); line(rx + 2, ry - 26, rx - 18, ry - 38, '#68472f')
      drawPinePad(rx - 48, ry - 72, 46, 17, 0.95); drawPinePad(rx - 30, ry - 92, 40, 15, 0.86); drawPinePad(rx - 5, ry - 108, 38, 16, 0.92); drawPinePad(rx + 28, ry - 56, 42, 15, 0.82); drawPinePad(rx - 12, ry - 42, 34, 13, 0.72)
      rect(x - 15, y + 44, 30, 30, '#6f4933'); rect(x - 20, y + 39, 40, 8, '#9b6545'); rect(x - 13, y + 47, 26, 2, 'rgba(255,255,255,.16)'); rect(x - 12, y + 70, 24, 4, 'rgba(50,30,20,.18)')
    }
    function drawPlants() { drawPlant(32, 212, 1); drawWelcomePine(604, 214) }

    function drawPaper(x, y, w, h) {
      rect(x + 3, y + 3, w, h, 'rgba(80,55,32,.18)'); rect(x, y, w, h, C.paper); rect(x, y, w, 2, C.paperShadow)
      for (let i = 0; i < 5; i += 1) rect(x + 7, y + 8 + i * 5, w - 14 - (i % 2) * 12, 1, 'rgba(51,65,84,.45)')
    }
    function drawCup(x, y, t) {
      rect(x + 2, y + 18, 14, 3, 'rgba(40,55,38,.24)'); rect(x + 1, y + 1, 14, 18, '#0b5a3e'); rect(x + 2, y + 2, 12, 2, '#176d4d'); rect(x + 2, y + 15, 12, 3, '#074631')
      rect(x, y - 2, 16, 5, '#f4f0e8'); rect(x + 2, y - 4, 12, 3, '#ffffff'); rect(x + 5, y - 6, 6, 2, '#e6ddd2'); rect(x + 6, y - 5, 4, 1, '#2b2b2b')
      rect(x + 4, y + 6, 8, 8, '#f6f1df'); rect(x + 5, y + 7, 6, 6, '#0b5a3e'); rect(x + 7, y + 8, 2, 1, '#f6f1df'); rect(x + 6, y + 10, 4, 1, '#f6f1df')
      rect(x + 4, y + 4, 8, 1, 'rgba(255,255,255,.28)'); rect(x + 3, y + 8, 1, 7, 'rgba(255,255,255,.22)'); rect(x + 12, y + 5, 1, 10, 'rgba(0,0,0,.16)')
      rect(x + 5 + Math.floor(Math.sin(t * 2)), y - 15, 1, 7, 'rgba(255,255,255,.50)'); rect(x + 10 - Math.floor(Math.sin(t * 2)), y - 18, 1, 8, 'rgba(255,255,255,.38)')
    }
    function drawTableItems(t) {
      drawPaper(142, 192, 62, 38); drawPaper(434, 194, 64, 40); drawPaper(286, 202, 54, 34); drawCup(506, 194, t + 0.4); drawCup(182, 238, t)
    }
    function drawTable(t) {
      ellipse(320, 326, 258, 36, 'rgba(44,31,22,.25)')
      roundRect(70, 182, 500, 120, 22, C.tableDark); roundRect(86, 168, 468, 120, 22, C.tableMid); roundRect(104, 178, 432, 24, 12, C.tableLight)
      rect(116, 235, 408, 3, 'rgba(255,220,165,.24)'); rect(130, 282, 34, 64, C.tableDark); rect(476, 282, 34, 64, C.tableDark)
      drawTableItems(t)
    }
    function drawChair(cx, cy, s) {
      const bw = Math.round(42 * s); const bh = Math.round(48 * s); const sw = Math.round(50 * s); const sh = Math.round(16 * s)
      ellipse(cx, cy + 32 * s, 42 * s, 9 * s, 'rgba(35,30,28,.20)')
      rect(cx - sw / 2 - 7 * s, cy - 24 * s, 6 * s, 24 * s, C.chairBack); rect(cx + sw / 2 + 1 * s, cy - 24 * s, 6 * s, 24 * s, C.chairBack)
      rect(cx - sw / 2 - 7 * s, cy - 24 * s, 13 * s, 4 * s, C.chairHi); rect(cx + sw / 2 - 6 * s, cy - 24 * s, 13 * s, 4 * s, C.chairHi)
      roundRect(cx - bw / 2, cy - bh - 10 * s, bw, bh, Math.round(8 * s), C.chairBack); roundRect(cx - bw / 2 + 5 * s, cy - bh - 4 * s, bw - 10 * s, bh - 12 * s, Math.round(5 * s), C.chairSeat)
      rect(cx - sw / 2, cy - 4 * s, sw, sh, C.chairBack); roundRect(cx - sw / 2 + 3 * s, cy - 8 * s, sw - 6 * s, sh, Math.round(4 * s), C.chairSeat)
      rect(cx - 3 * s, cy + 7 * s, 6 * s, 24 * s, C.metal); rect(cx - 27 * s, cy + 31 * s, 54 * s, 4 * s, C.metal)
      line(cx, cy + 31 * s, cx - 24 * s, cy + 42 * s, C.metal); line(cx, cy + 31 * s, cx + 24 * s, cy + 42 * s, C.metal)
    }
    function drawChairs() {
      drawChair(118, 300, 1.08); drawChair(226, 312, 1.14); drawChair(320, 316, 1.18); drawChair(414, 312, 1.14); drawChair(522, 300, 1.08)
    }
    function drawDust(t, dt) {
      for (let i = 0; i < dust.length; i += 1) {
        const d = dust[i]
        d.x += d.v * dt * 10
        d.y += Math.sin(t + d.x * 0.05) * dt * 2
        if (d.x > W) d.x = -4
        rect(d.x, d.y, 1, 1, `rgba(255,255,255,${d.a})`)
      }
    }
    function drawOverlay(t) {
      ctx.fillStyle = 'rgba(255,255,255,.045)'
      for (let y = 0; y < H; y += 5) rect(0, y, W, 1)
      rect(0, Math.floor((t * 14) % H), W, 1, `rgba(80,95,110,${0.012 + 0.008 * Math.sin(t * 6)})`)
    }

    function draw(t, dt) {
      drawWall(); drawWindows(); drawOutdoor(t); drawSun(t); drawFloor(); drawScreen(t); drawWhiteboard(); drawClock(); drawPlants(); drawTable(t); drawChairs(); drawDust(t, dt); drawOverlay(t)
    }

    let last = performance.now()
    let time = 0
    let rafId
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      time += dt
      draw(time, dt)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="daylight-boardroom-bg" aria-hidden="true" />
}

export default DaylightBoardroomBg
