import React from 'react'
import { BattleSkeleton } from './BattleSkeleton.jsx'

// 独立全屏 Battle 页面。/?battle 或 #battle 触发。
export function BattlePage() {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#1a1410',
      color: '#f0e0c0',
      fontFamily: 'Zpix, monospace',
      padding: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 16px',
        borderBottom: '1px solid #2a1e10',
      }}>
        <h1 style={{ margin: 0, fontSize: 14, letterSpacing: 2, opacity: 0.75 }}>FRANK&#39;S ADVENTURE · BATTLE</h1>
        <a href="?" style={{ marginLeft: 'auto', fontSize: 12, color: '#9a8868', textDecoration: 'none' }}>
          ← 返回组件预览
        </a>
      </div>
      <BattleSkeleton />
    </div>
  )
}
