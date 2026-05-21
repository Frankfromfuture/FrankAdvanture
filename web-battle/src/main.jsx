import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

// 设计基准分辨率（1920×1080）。所有 px 数值按这个画布大小布版。
const DESIGN_W = 1920
const DESIGN_H = 1080

function updateScale() {
  const scale = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
  document.documentElement.style.setProperty('--app-scale', String(scale))
  document.documentElement.style.setProperty('--design-w', `${DESIGN_W}px`)
  document.documentElement.style.setProperty('--design-h', `${DESIGN_H}px`)
}

function Root() {
  useEffect(() => {
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])
  return (
    <div className="app-scaler">
      <App />
    </div>
  )
}

// 模块加载时先算一次，避免首帧未变量化
updateScale()

createRoot(document.getElementById('root')).render(<Root />)
