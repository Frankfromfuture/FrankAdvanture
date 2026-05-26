import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// 设计基准分辨率（1920×1080）。运行时等比例 cover 缩放，铺满当前视口且不拉伸元素。
const DESIGN_W = 1920
const DESIGN_H = 1080

function updateScale() {
  const isPortraitMobile = getOrientationState().isPortraitMobile
  const baseW = isPortraitMobile ? DESIGN_H : DESIGN_W
  const baseH = isPortraitMobile ? DESIGN_W : DESIGN_H

  const scaleX = window.innerWidth / baseW
  const scaleY = window.innerHeight / baseH
  const scale = Math.max(0.001, Math.min(scaleX, scaleY)) || 1

  let designW = DESIGN_W
  let designH = DESIGN_H

  if (scaleX >= scaleY) {
    // scale is scaleY, height fits exactly, width has extra space
    const expandedW = window.innerWidth / scale
    designW = isPortraitMobile ? DESIGN_W : expandedW
    designH = isPortraitMobile ? expandedW : DESIGN_H
  } else {
    // scale is scaleX, width fits exactly, height has extra space
    const expandedH = window.innerHeight / scale
    designW = isPortraitMobile ? expandedH : DESIGN_W
    designH = isPortraitMobile ? DESIGN_H : expandedH
  }

  document.documentElement.style.setProperty('--app-scale', String(scale))
  document.documentElement.style.setProperty('--app-rotation', isPortraitMobile ? '90deg' : '0deg')
  document.documentElement.style.setProperty('--design-w', `${Math.round(designW)}px`)
  document.documentElement.style.setProperty('--design-h', `${Math.round(designH)}px`)
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
