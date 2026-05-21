import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// 设计基准分辨率（1920×1080）。运行时按浏览器窗口宽高分别缩放，铺满当前视口。
const DESIGN_W = 1920
const DESIGN_H = 1080

function updateScale() {
  const scaleX = window.innerWidth / DESIGN_W
  const scaleY = window.innerHeight / DESIGN_H
  document.documentElement.style.setProperty('--app-scale', String(Math.min(scaleX, scaleY)))
  document.documentElement.style.setProperty('--app-scale-x', String(scaleX))
  document.documentElement.style.setProperty('--app-scale-y', String(scaleY))
  document.documentElement.style.setProperty('--design-w', `${DESIGN_W}px`)
  document.documentElement.style.setProperty('--design-h', `${DESIGN_H}px`)
}

function Root() {
  const [orientation, setOrientation] = useState(() => getOrientationState())

  useEffect(() => {
    updateScale()
    function handleViewportChange() {
      updateScale()
      setOrientation(getOrientationState())
    }
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
    }
  }, [])

  useEffect(() => {
    if (!orientation.isMobile) return
    function requestLandscapeMode() {
      requestLandscapeLock()
    }
    requestLandscapeMode()
    window.addEventListener('pointerdown', requestLandscapeMode, { once: true })
    return () => window.removeEventListener('pointerdown', requestLandscapeMode)
  }, [orientation.isMobile])

  return (
    <>
      <div className="app-scaler">
        <App />
      </div>
      {orientation.shouldPrompt && (
        <button className="orientation-guard" type="button" onClick={requestLandscapeLock}>
          <span className="orientation-phone" aria-hidden="true" />
          <strong>请横屏游玩</strong>
          <em>旋转手机获得完整董事会视野</em>
          <small>点击这里尝试自动横屏</small>
        </button>
      )}
    </>
  )
}

function getOrientationState() {
  if (typeof window === 'undefined') return { isMobile: false, shouldPrompt: false }
  const narrowViewport = Math.min(window.innerWidth, window.innerHeight) <= 920
  const isMobile = narrowViewport
  const isPortrait = window.innerHeight > window.innerWidth
  return { isMobile, shouldPrompt: isMobile && isPortrait }
}

async function requestLandscapeLock() {
  try {
    if (screen.orientation?.lock) {
      await screen.orientation.lock('landscape')
    }
  } catch {}
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// 模块加载时先算一次，避免首帧未变量化
updateScale()

createRoot(document.getElementById('root')).render(<Root />)
