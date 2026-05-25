import React from 'react'
import { createPortal } from 'react-dom'

export function useFloatingTooltip({ delay = 150, maxEstimateWidth = 320, maxEstimateHeight = 240 } = {}) {
  const [tooltip, setTooltip] = React.useState(null)
  const timerRef = React.useRef(null)
  const pendingTooltipRef = React.useRef(null)

  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [])

  const showTooltip = React.useCallback((content, event) => {
    if (!content) return

    const offset = 16
    const nearRight = event.clientX + offset + maxEstimateWidth > window.innerWidth
    const nearBottom = event.clientY + offset + maxEstimateHeight > window.innerHeight

    const nextTooltip = {
      content,
      left: event.clientX + (nearRight ? -offset : offset),
      top: event.clientY + (nearBottom ? -offset : offset),
      x: nearRight ? 'left' : 'right',
      y: nearBottom ? 'top' : 'bottom',
    }

    pendingTooltipRef.current = nextTooltip

    // If already showing a tooltip, update immediately to avoid lagging
    if (tooltip) {
      setTooltip(nextTooltip)
      return
    }

    if (timerRef.current) return
    timerRef.current = window.setTimeout(() => {
      setTooltip(pendingTooltipRef.current)
      timerRef.current = null
    }, delay)
  }, [tooltip, delay, maxEstimateWidth, maxEstimateHeight])

  const updateTooltip = React.useCallback((event) => {
    if (!pendingTooltipRef.current && !tooltip) return

    const offset = 16
    const nearRight = event.clientX + offset + maxEstimateWidth > window.innerWidth
    const nearBottom = event.clientY + offset + maxEstimateHeight > window.innerHeight

    const currentContent = pendingTooltipRef.current 
      ? pendingTooltipRef.current.content 
      : (tooltip ? tooltip.content : null)

    if (!currentContent) return

    const nextTooltip = {
      content: currentContent,
      left: event.clientX + (nearRight ? -offset : offset),
      top: event.clientY + (nearBottom ? -offset : offset),
      x: nearRight ? 'left' : 'right',
      y: nearBottom ? 'top' : 'bottom',
    }

    pendingTooltipRef.current = nextTooltip
    setTooltip(nextTooltip)
  }, [tooltip, maxEstimateWidth, maxEstimateHeight])

  const hideTooltip = React.useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    pendingTooltipRef.current = null
    setTooltip(null)
  }, [])

  const renderTooltip = React.useCallback(() => {
    if (!tooltip) return null

    return createPortal(
      <div
        className={`card-effect-floating-hint x-${tooltip.x} y-${tooltip.y} unified-floating-hint`}
        style={{
          left: tooltip.left,
          top: tooltip.top,
          position: 'fixed',
          zIndex: 20000,
          pointerEvents: 'none',
        }}
      >
        {tooltip.content}
      </div>,
      document.body
    )
  }, [tooltip])

  return {
    showTooltip,
    updateTooltip,
    hideTooltip,
    renderTooltip,
    isShowing: !!tooltip,
  }
}
