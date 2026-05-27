import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

// Dept → particle color
const DEPT_COLORS = {
  R: 0xa78bfa,
  S: 0xf87171,
  O: 0x4ade80,
  NONE: 0xfbbf24,
}

// Rarity → glow color
const RARITY_GLOW_COLOR = {
  elite: 0xc084fc,
  epic: 0xfb923c,
  legendary: 0xffc857,
}

// Legacy combo card colors
const COMBO_DEPT_COLORS = {
  rd: 0x2dd4bf,
  sales: 0xf6ad55,
  admin: 0xa78bfa,
  function: 0x93c5fd,
  service: 0xf0a8d4,
}

function PhaserBattleFX({ fxEvent }) {
  const hostRef = useRef(null)
  const gameRef = useRef(null)
  const sceneRef = useRef(null)
  const latestFxEventRef = useRef(null)

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return undefined

    class BattleFXScene extends Phaser.Scene {
      constructor() {
        super('BattleFXScene')
        this.cardObjects = []
      }

      create() {
        sceneRef.current = this
        this.makeTextures()
        if (latestFxEventRef.current) {
          this.playFxEvent(latestFxEventRef.current)
        }
      }

      makeTextures() {
        // Soft radial glow dot
        const glowG = this.make.graphics({ x: 0, y: 0, add: false })
        for (let i = 7; i >= 0; i--) {
          const r = 8 + i * 6
          const alpha = 0.06 + (7 - i) * 0.05
          glowG.fillStyle(0xffffff, alpha)
          glowG.fillCircle(64, 64, r)
        }
        glowG.generateTexture('glow_dot', 128, 128)
        glowG.destroy()

        // Small spark
        const sparkG = this.make.graphics({ x: 0, y: 0, add: false })
        sparkG.fillStyle(0xffffff, 1)
        sparkG.fillCircle(6, 6, 6)
        sparkG.generateTexture('spark', 12, 12)
        sparkG.destroy()

        // Diamond/star4
        const starG = this.make.graphics({ x: 0, y: 0, add: false })
        starG.fillStyle(0xffffff, 1)
        starG.fillTriangle(8, 0, 16, 8, 8, 16)
        starG.fillTriangle(8, 0, 0, 8, 8, 16)
        starG.generateTexture('star4', 16, 16)
        starG.destroy()

        // Ring for shockwave
        const ringG = this.make.graphics({ x: 0, y: 0, add: false })
        ringG.lineStyle(7, 0xffffff, 1)
        ringG.strokeCircle(80, 80, 72)
        ringG.generateTexture('ring', 160, 160)
        ringG.destroy()

        // Beam for energy line
        const beamG = this.make.graphics({ x: 0, y: 0, add: false })
        beamG.fillStyle(0xffffff, 1)
        beamG.fillRoundedRect(0, 0, 160, 6, 3)
        beamG.generateTexture('beam', 160, 6)
        beamG.destroy()
      }

      playFxEvent(event) {
        if (!event) return
        if (event.type === 'settlement') {
          this.playSettlement(event.settlementFx)
        } else if (event.type === 'combo') {
          this.playCombo(event)
        }
      }

      // ─── SETTLEMENT: Chain activation P1→P5 + number burst ──────────────────
      playSettlement(settlementFx) {
        if (!settlementFx) return
        const canvasRect = this.game.canvas.getBoundingClientRect()

        // Collect slot DOM positions + timing from design data
        const slotActivations = []
        settlementFx.reports.forEach((report) => {
          report.slotResults.forEach((slot, slotIdx) => {
            if (!slot.animateSlotFx || !slot.card || slot.output <= 0) return
            const el = document.querySelector(
              `[data-line-id="${report.lineId}"][data-slot-idx="${slotIdx}"]`
            )
            if (!el) return
            const rect = el.getBoundingClientRect()
            slotActivations.push({
              x: rect.left - canvasRect.left + rect.width / 2,
              y: rect.top - canvasRect.top + rect.height / 2,
              deptColor: DEPT_COLORS[slot.card?.dept] ?? 0xfbbf24,
              glowColor: RARITY_GLOW_COLOR[slot.card?.rarity] ?? null,
              rarity: slot.card?.rarity,
              fxDelay: slot.fxDelay,
              output: slot.output,
            })
          })
        })

        // Fire each slot activation at its scheduled delay
        slotActivations.forEach(({ x, y, deptColor, glowColor, rarity, fxDelay }) => {
          this.time.delayedCall(fxDelay, () => {
            this.slotActivationFX(x, y, deptColor, glowColor, rarity)
          })
        })

        // Fire big number burst at totalFx.delay
        const { delay, gain } = settlementFx.totalFx
        this.time.delayedCall(delay, () => {
          const cx = this.scale.width * 0.5
          const cy = this.scale.height * 0.46
          this.numberBurstFX(cx, cy, gain)
        })
      }

      // Single slot activation: glow flash + postFX glow + dept-color particles
      slotActivationFX(x, y, deptColor, glowColor, rarity) {
        // Glow dot expand
        const dot = this.add.image(x, y, 'glow_dot')
        dot.setTint(deptColor)
        dot.setBlendMode(Phaser.BlendModes.ADD)
        dot.setScale(0.4)
        dot.setAlpha(0.85)
        dot.setDepth(10)

        // postFX glow (Phaser 4 WebGL — filters.external.addGlow)
        const effectColor = glowColor ?? deptColor
        try {
          dot.filters.external.addGlow(effectColor, 10, 0, 1, false)
        } catch (_) {}

        this.tweens.add({
          targets: dot,
          scale: 2.4,
          alpha: 0,
          duration: 480,
          ease: 'Sine.easeOut',
          onComplete: () => dot.destroy(),
        })

        // Particle count scales with rarity
        const count = rarity === 'legendary' ? 30 : rarity === 'epic' ? 22 : rarity === 'elite' ? 16 : 11
        this.spawnBurst(x, y, deptColor, count, 110)

        // Gentle per-slot shake
        this.cameras.main.shake(100, 0.003, true)
      }

      // Number burst: explode + 2× shockwave ring + screen flash + gold star rain
      numberBurstFX(x, y, _gain) {
        // ① White flash
        this.flashScreen(0xffffff, 0.72, 130)

        // ② Two staggered shockwave rings
        this.spawnRing(x, y, 0xffc857, 0)
        this.spawnRing(x, y, 0xfde68a, 180)

        // ③ Gold spark explode (main burst)
        const goldEmitter = this.add.particles(x, y, 'spark', {
          speed: { min: 260, max: 980 },
          angle: { min: 0, max: 360 },
          scale: { start: 1.35, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: { min: 620, max: 1350 },
          gravityY: 360,
          tint: [0xffc857, 0xfbbf24, 0xfde68a, 0xffffff],
          blendMode: Phaser.BlendModes.ADD,
          emitting: false,
        })
        goldEmitter.setDepth(20)
        goldEmitter.explode(320, x, y)

        // ④ Accent stars (slower, multi-color)
        const starEmitter = this.add.particles(x, y, 'star4', {
          speed: { min: 90, max: 390 },
          angle: { min: 0, max: 360 },
          scale: { start: 2.8, end: 0 },
          alpha: { start: 1, end: 0 },
          lifespan: { min: 900, max: 2100 },
          gravityY: 160,
          tint: [0xffc857, 0xc084fc, 0x60a5fa, 0xfb923c],
          blendMode: Phaser.BlendModes.ADD,
          emitting: false,
        })
        starEmitter.setDepth(21)
        starEmitter.explode(96, x, y)

        this.spawnRing(x, y, 0xffffff, 320)

        // ⑤ Big camera shake
        this.cameras.main.shake(480, 0.019)

        // Cleanup after particles die
        this.time.delayedCall(1800, () => {
          goldEmitter.destroy()
          starEmitter.destroy()
        })
      }

      spawnRing(x, y, color, delay) {
        this.time.delayedCall(delay, () => {
          const ring = this.add.image(x, y, 'ring')
          ring.setTint(color)
          ring.setBlendMode(Phaser.BlendModes.ADD)
          ring.setScale(0.25)
          ring.setAlpha(0.95)
          ring.setDepth(18)
          try {
            ring.filters.external.addGlow(color, 10, 0, 1, false)
          } catch (_) {}
          this.tweens.add({
            targets: ring,
            scale: 6.2,
            alpha: 0,
            duration: 820,
            ease: 'Sine.easeOut',
            onComplete: () => ring.destroy(),
          })
        })
      }

      spawnBurst(x, y, color, count, radius) {
        for (let i = 0; i < count; i++) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
          const dist = Phaser.Math.FloatBetween(radius * 0.2, radius)
          const spark = this.add.image(x, y, 'spark')
          spark.setTint(color)
          spark.setBlendMode(Phaser.BlendModes.ADD)
          spark.setScale(Phaser.Math.FloatBetween(0.2, 0.65))
          spark.setDepth(16)
          this.tweens.add({
            targets: spark,
            x: x + Math.cos(angle) * dist,
            y: y + Math.sin(angle) * dist,
            alpha: 0,
            scale: 0,
            duration: Phaser.Math.Between(360, 860),
            ease: 'Cubic.easeOut',
            onComplete: () => spark.destroy(),
          })
        }
      }

      flashScreen(color, maxAlpha, duration) {
        const { width, height } = this.scale
        const flash = this.add.rectangle(width / 2, height / 2, width, height, color, maxAlpha)
        flash.setBlendMode(Phaser.BlendModes.ADD)
        flash.setDepth(30)
        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration,
          ease: 'Sine.easeOut',
          onComplete: () => flash.destroy(),
        })
      }

      // ─── LEGACY COMBO (preserved) ────────────────────────────────────────────
      playCombo(event) {
        if (!event) return
        const { width, height } = this.scale
        this.cardObjects.forEach((item) => item.destroy())
        this.cardObjects = []
        const comboId = event.id ?? Date.now()
        this.activeComboId = comboId

        this.cameras.main.shake(260, 0.008)
        this.flashScreen(0x8b5cf6, 0.16, 360)

        const cards = event.cards?.length ? event.cards : []
        const startX = width * 0.50 - (cards.length - 1) * 48
        cards.forEach((card, index) => {
          const color = COMBO_DEPT_COLORS[card.color] ?? 0xffffff
          const targetX = startX + index * 96
          const targetY = height * 0.50 + (index % 2) * 10
          const cardObject = this.makeFxCard(card, color)
          cardObject.setPosition(width * (0.23 + index * 0.12), height + 80)
          cardObject.setScale(0.66)
          cardObject.setAlpha(0)
          cardObject.setDepth(8 + index)
          this.cardObjects.push(cardObject)

          this.tweens.add({
            targets: cardObject,
            x: targetX,
            y: targetY,
            alpha: 1,
            scale: 1,
            angle: -7 + index * 5,
            duration: 460 + index * 90,
            ease: 'Back.out',
            onStart: () => this.energyBeam(cardObject.x, cardObject.y, targetX, targetY, color),
            onComplete: () => this.spawnBurst(targetX, targetY, color, 20, 84),
          })
        })

        this.comboText(event.gain, event.mult)
        this.spawnBurst(width * 0.50, height * 0.47, 0xc084fc, 42, 128)
        this.time.delayedCall(1450, () => this.releaseCards(comboId))
      }

      releaseCards(comboId) {
        if (this.activeComboId !== comboId || this.cardObjects.length === 0) return
        const leaving = [...this.cardObjects]
        this.cardObjects = []
        leaving.forEach((obj, index) => {
          this.tweens.add({
            targets: obj,
            x: obj.x + (index - 1) * 18,
            y: obj.y + 46,
            alpha: 0,
            scale: 0.72,
            duration: 420,
            ease: 'Cubic.in',
            onComplete: () => obj.destroy(),
          })
        })
      }

      makeFxCard(card, color) {
        const container = this.add.container(0, 0)
        const shadow = this.add.rectangle(8, 12, 78, 106, 0x000000, 0.28)
        shadow.setRotation(0.08)
        const body = this.add.rectangle(0, 0, 78, 106, color, 0.94)
        body.setStrokeStyle(3, 0xffffff, 0.72)
        const top = this.add.rectangle(0, -43, 70, 18, 0xffffff, 0.22)
        const power = this.add.text(0, -10, card.type === 'employee' ? String(card.power) : card.trait, {
          fontFamily: 'Inter, PingFang SC, sans-serif',
          fontSize: card.type === 'employee' ? '25px' : '13px',
          fontStyle: '900',
          color: '#102033',
          align: 'center',
          wordWrap: { width: 60 },
        }).setOrigin(0.5)
        const cost = this.add.text(28, -38, `¥${card.cost}`, {
          fontFamily: 'Inter, PingFang SC, sans-serif',
          fontSize: '16px',
          fontStyle: '900',
          color: '#5b21b6',
        }).setOrigin(0.5)
        const dept = this.add.text(-27, -38, card.type === 'employee' ? card.dept : card.rarity, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '12px',
          fontStyle: '800',
          color: '#102033',
        }).setOrigin(0, 0.5)
        const name = this.add.text(0, 24, card.name, {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: '12px',
          fontStyle: '800',
          color: '#102033',
          align: 'center',
          wordWrap: { width: 66 },
        }).setOrigin(0.5)
        const label = this.add.text(0, 42, '普通', {
          fontFamily: 'Inter, PingFang SC, sans-serif',
          fontSize: '11px',
          fontStyle: '900',
          color: '#5b21b6',
        }).setOrigin(0.5)
        container.add([shadow, body, top, power, cost, dept, name, label])
        return container
      }

      energyBeam(fromX, fromY, toX, toY, color) {
        const midX = (fromX + toX) / 2
        const midY = (fromY + toY) / 2
        const distance = Phaser.Math.Distance.Between(fromX, fromY, toX, toY)
        const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY)
        const beam = this.add.image(midX, midY, 'beam')
        beam.setTint(color)
        beam.setBlendMode(Phaser.BlendModes.ADD)
        beam.setScale(distance / 160, 1.2)
        beam.setRotation(angle)
        beam.setAlpha(0.92)
        beam.setDepth(7)
        this.tweens.add({
          targets: beam,
          alpha: 0,
          scaleY: 0.2,
          duration: 420,
          ease: 'Sine.out',
          onComplete: () => beam.destroy(),
        })
      }

      comboText(gain, mult) {
        const { width, height } = this.scale
        const scoreText = this.add.text(width * 0.43, height * 0.30, `+${gain}`, {
          fontFamily: 'Inter, PingFang SC, sans-serif',
          fontSize: '46px',
          fontStyle: '900',
          color: '#8b5cf6',
          stroke: '#ffffff',
          strokeThickness: 7,
          shadow: { color: '#a78bfa', blur: 22, fill: true },
        }).setOrigin(0.5)
        scoreText.setDepth(20)
        const multText = this.add.text(width * 0.61, height * 0.25, `x${mult}.0`, {
          fontFamily: 'Inter, PingFang SC, sans-serif',
          fontSize: '40px',
          fontStyle: '900',
          color: '#2dd4bf',
          stroke: '#ffffff',
          strokeThickness: 6,
          shadow: { color: '#c084fc', blur: 18, fill: true },
        }).setOrigin(0.5)
        multText.setDepth(20)
        this.tweens.add({
          targets: [scoreText, multText],
          y: '-=92',
          scale: { from: 0.72, to: 1.14 },
          alpha: { from: 1, to: 0 },
          duration: 3000,
          ease: 'Cubic.out',
          onComplete: () => {
            scoreText.destroy()
            multText.destroy()
          },
        })
      }
    }

    gameRef.current = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: hostRef.current,
      width: hostRef.current.clientWidth,
      height: hostRef.current.clientHeight,
      transparent: true,
      backgroundColor: 'rgba(0,0,0,0)',
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      render: {
        antialias: true,
        premultipliedAlpha: false,
      },
      scene: BattleFXScene,
    })

    return () => {
      sceneRef.current = null
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  useEffect(() => {
    latestFxEventRef.current = fxEvent
    if (!fxEvent || !sceneRef.current) return
    sceneRef.current.playFxEvent(fxEvent)
  }, [fxEvent])

  return <div className="phaser-fx-canvas" ref={hostRef} aria-hidden="true" />
}

export default PhaserBattleFX
