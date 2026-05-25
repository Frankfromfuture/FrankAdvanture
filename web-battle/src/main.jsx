import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// 设计基准分辨率（1920×1080）。运行时等比例 cover 缩放，铺满当前视口且不拉伸元素。
const DESIGN_W = 1920
const DESIGN_H = 1080

function updateScale() {
  const isPortraitMobile = getOrientationState().isPortraitMobile
  const scaleX = window.innerWidth / (isPortraitMobile ? DESIGN_H : DESIGN_W)
  const scaleY = window.innerHeight / (isPortraitMobile ? DESIGN_W : DESIGN_H)
  const scale = Math.min(scaleX, scaleY)
  document.documentElement.style.setProperty('--app-scale', String(scale))
  document.documentElement.style.setProperty('--app-rotation', isPortraitMobile ? '90deg' : '0deg')
  document.documentElement.style.setProperty('--design-w', `${DESIGN_W}px`)
  document.documentElement.style.setProperty('--design-h', `${DESIGN_H}px`)
}

function Root() {
  useEffect(() => {
    updateScale()
    function handleViewportChange() {
      updateScale()
    }
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)
    return () => {
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
    }
  }, [])

  return (
    <div className="app-scaler">
      <App />
    </div>
  )
}

function getOrientationState() {
  if (typeof window === 'undefined') return { isPortraitMobile: false }
  const narrowViewport = Math.min(window.innerWidth, window.innerHeight) <= 920
  const isPortrait = window.innerHeight > window.innerWidth
  return { isPortraitMobile: narrowViewport && isPortrait }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// 模块加载时先算一次，避免首帧未变量化
updateScale()

createRoot(document.getElementById('root')).render(<Root />)
