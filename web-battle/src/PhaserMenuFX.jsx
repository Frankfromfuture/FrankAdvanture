import { useEffect, useRef } from 'react'
import Phaser from 'phaser'

function PhaserMenuFX() {
  const hostRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return undefined

    class MenuFXScene extends Phaser.Scene {
      constructor() {
        super('MenuFXScene')
        this.logoSprite = null
      }

      preload() {
        this.load.svg('menu_logo', '/assets/menu/FR.svg', { width: 1400 })
      }

      create() {
        this.createPhaserLogo()
        this.time.delayedCall(120, () => this.playLogoIntro())
      }

      getLogoBounds() {
        const logo = document.querySelector('.main-menu-logo')
        const canvasRect = this.game.canvas.getBoundingClientRect()
        if (!logo) {
          return {
            x: this.scale.width * 0.5,
            y: this.scale.height * 0.24,
            width: this.scale.width * 0.72,
            height: this.scale.height * 0.2,
          }
        }
        const rect = logo.getBoundingClientRect()
        return {
          x: rect.left - canvasRect.left + rect.width / 2,
          y: rect.top - canvasRect.top + rect.height * 0.52,
          width: rect.width,
          height: rect.height,
        }
      }

      createPhaserLogo() {
        const bounds = this.getLogoBounds()
        const logo = this.add.image(bounds.x, bounds.y, 'menu_logo')
        const scale = bounds.width / logo.width
        logo.setScale(scale)
        logo.setDepth(10)
        logo.setAlpha(0)
        logo.setAngle(-14)
        logo.setBlendMode(Phaser.BlendModes.NORMAL)
        logo.setOrigin(0.5)
        logo.setScale(scale * 0.4)
        this.logoSprite = logo
      }

      playLogoIntro() {
        const bounds = this.getLogoBounds()

        if (this.logoSprite) {
          const finalScale = bounds.width / this.logoSprite.width
          this.logoSprite.setPosition(bounds.x, bounds.y)
          this.tweens.add({
            targets: this.logoSprite,
            alpha: 1,
            angle: -3,
            scaleX: finalScale * 1.12,
            scaleY: finalScale * 0.95,
            duration: 560,
            ease: 'Back.easeOut',
            onComplete: () => {
              this.tweens.add({
                targets: this.logoSprite,
                scaleX: finalScale * 1.08,
                scaleY: finalScale,
                duration: 240,
                ease: 'Sine.easeOut',
              })
            },
          })
          this.time.delayedCall(1120, () => this.startBreathing(finalScale, bounds.y))
        }
      }

      startBreathing(baseScale, baseY) {
        if (!this.logoSprite) return
        this.tweens.add({
          targets: this.logoSprite,
          y: baseY + 5,
          scaleX: baseScale * 1.095,
          scaleY: baseScale * 1.012,
          yoyo: true,
          repeat: -1,
          duration: 2800,
          ease: 'Sine.easeInOut',
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
      scene: MenuFXScene,
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div className="phaser-menu-fx-canvas" ref={hostRef} aria-hidden="true" />
}

export default PhaserMenuFX
