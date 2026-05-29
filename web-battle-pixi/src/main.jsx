import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.jsx'
import { BattlePage } from './BattlePage.jsx'

// 简易路由：?battle 或 #battle → BattlePage；否则 → App（组件预览）
const params = new URLSearchParams(window.location.search)
const isBattle = params.has('battle') || window.location.hash === '#battle'

if (isBattle) {
  // 全屏模式：覆盖 index.html 里给组件预览准备的居中 flex 布局
  const root = document.getElementById('root')
  root.style.cssText = 'display:block; min-height:100vh; gap:0; align-items:stretch;'
  document.title = "Frank's Adventure · Battle"
}

createRoot(document.getElementById('root')).render(isBattle ? <BattlePage /> : <App />)
