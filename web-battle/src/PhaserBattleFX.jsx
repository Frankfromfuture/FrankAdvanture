import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

const DEPT_COLORS = {
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

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return undefined

    class BattleFXScene extends Phaser.Scene {
      constructor() {
        super('BattleFXScene')
        this.cardObjects = []
        this.rings = []
        this.energyLines = []
      }

      create() {
        sceneRef.current = this
        this.makeTextures()
      }

      makeTextures() {
        const spark = this.make.graphics({ x: 0, y: 0, add: false })
        spark.fillStyle(0xffffff, 1)
        spark.fillCircle(8, 8, 8)
        spark.generateTexture('spark', 16, 16)
        spark.destroy()

        const beam = this.make.graphics({ x: 0, y: 0, add: false })
        beam.fillStyle(0xffffff, 1)
        beam.fillRoundedRect(0, 0, 160, 6, 3)
        beam.generateTexture('beam', 160, 6)
        beam.destroy()
      }

      playCombo(event) {
        if (!event) return
        const { width, height } = this.scale
        this.cardObjects.forEach((item) => item.destroy())
        this.cardObjects = []
        const comboId = event.id ?? Date.now()
        this.activeComboId = comboId

        this.cameras.main.shake(260, 0.008)
        this.flashScreen(0x8b5cf6)

        const cards = event.cards?.length ? event.cards : []
        const startX = width * 0.50 - (cards.length - 1) * 48
        cards.forEach((card, index) => {
          const color = DEPT_COLORS[card.color] ?? 0xffffff
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
            onComplete: () => this.spawnParticles(targetX, targetY, color, 20, 84),
          })
        })

        this.comboText(event.gain, event.mult)
        this.spawnParticles(width * 0.50, height * 0.47, 0xc084fc, 42, 128)
        this.time.delayedCall(1450, () => this.releaseCards(comboId))
      }

      releaseCards(comboId) {
        if (this.activeComboId !== comboId || this.cardObjects.length === 0) return
        const leavingCards = [...this.cardObjects]
        this.cardObjects = []
        leavingCards.forEach((cardObject, index) => {
          this.tweens.add({
            targets: cardObject,
            x: cardObject.x + (index - 1) * 18,
            y: cardObject.y + 46,
            alpha: 0,
            scale: 0.72,
            duration: 420,
            ease: 'Cubic.in',
            onComplete: () => cardObject.destroy(),
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
        const chipsPower = this.add.text(0, -10, card.type === 'employee' ? String(card.power) : card.trait, {
          fontFamily: 'Inter, PingFang SC, sans-serif',
          fontSize: card.type === 'employee' ? '25px' : '13px',
          fontStyle: '900',
          color: '#102033',
          align: 'center',
          wordWrap: { width: 60 },
        }).setOrigin(0.5)
        const rank = this.add.text(28, -38, `¥${card.cost}`, {
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
        const chips = this.add.text(0, 42, '普通', {
          fontFamily: 'Inter, PingFang SC, sans-serif',
          fontSize: '11px',
          fontStyle: '900',
          color: '#5b21b6',
        }).setOrigin(0.5)
        container.add([shadow, body, top, chipsPower, rank, dept, name, chips])
        return container
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

      spawnParticles(x, y, color, count, radius) {
        for (let i = 0; i < count; i += 1) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
          const distance = Phaser.Math.FloatBetween(radius * 0.25, radius)
          const spark = this.add.image(x, y, 'spark')
          spark.setTint(color)
          spark.setBlendMode(Phaser.BlendModes.ADD)
          spark.setScale(Phaser.Math.FloatBetween(0.16, 0.46))
          spark.setDepth(16)
          this.tweens.add({
            targets: spark,
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            alpha: 0,
            scale: 0,
            duration: Phaser.Math.Between(520, 1100),
            ease: 'Cubic.out',
            onComplete: () => spark.destroy(),
          })
        }
      }

      flashScreen(color) {
        const flash = this.add.rectangle(
          this.scale.width / 2,
          this.scale.height / 2,
          this.scale.width,
          this.scale.height,
          color,
          0.16,
        )
        flash.setBlendMode(Phaser.BlendModes.ADD)
        flash.setDepth(30)
        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 360,
          onComplete: () => flash.destroy(),
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
    if (fxEvent && sceneRef.current?.playCombo) {
      sceneRef.current.playCombo(fxEvent)
    }
  }, [fxEvent])

  return <div className="phaser-fx-canvas" ref={hostRef} aria-hidden="true" />
}

export default PhaserBattleFX
