import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface View { readonly x: number; readonly y: number; readonly k: number }
export interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

interface Options {
  readonly contentW: number
  readonly contentH: number
  /** Space at the bottom of the box that is covered by something else; "fit" and "focus" use the part above it. */
  readonly insetBottom?: number
  readonly maxZoom?: number
  /** Element that receives wheel / pinch events (defaults to the box itself). Pass it as state so the hook notices when it mounts. */
  readonly wheelTarget?: HTMLElement | null
  /** Called when the user zooms or drags (so the caller can switch off auto-follow). */
  readonly onManual?: () => void
}

/**
 * Pan and zoom for a fixed-size piece of content inside a box. Touchpad pinch (which browsers report as ctrl + wheel)
 * zooms around the pointer; two-finger scroll or the mouse wheel pans; dragging pans; code can zoom to a rectangle.
 * Boxes stay in the page's own coordinates, so it works inside the slide stage, which is itself scaled.
 */
export function useZoomPan({ contentW, contentH, insetBottom = 0, maxZoom = 3.2, wheelTarget, onManual }: Options) {
  // A callback ref: the box may mount later than the hook (the demo only shows the board once its data has loaded).
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [el, setEl] = useState<HTMLDivElement | null>(null)
  const box = useCallback((node: HTMLDivElement | null) => { boxRef.current = node; setEl(node) }, [])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setViewState] = useState<View>({ x: 0, y: 0, k: 1 })
  const viewRef = useRef(view)
  const [animate, setAnimate] = useState(true)
  const userZoomed = useRef(false)
  const moved = useRef(false)
  const manual = useRef(onManual)
  manual.current = onManual

  const setView = useCallback((v: View) => { viewRef.current = v; setViewState(v) }, [])

  const fitView = useCallback((w: number, h: number): View => {
    const usable = Math.max(1, h - insetBottom)
    const k = Math.min(w / contentW, usable / contentH)
    return { k, x: (w - contentW * k) / 2, y: (usable - contentH * k) / 2 }
  }, [contentW, contentH, insetBottom])

  // Keep the content fitted until the user zooms: measure on first layout and on resize.
  useLayoutEffect(() => {
    if (!el) return
    const measure = () => {
      const next = { w: el.offsetWidth, h: el.offsetHeight }
      setSize(next)
      if (!userZoomed.current) { setAnimate(false); setView(fitView(next.w, next.h)) }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el, fitView, setView])

  const minK = size.w ? fitView(size.w, size.h).k * 0.8 : 0.1

  const fit = useCallback(() => {
    userZoomed.current = false
    setAnimate(true)
    setView(fitView(size.w, size.h))
  }, [fitView, size, setView])

  /** Zoom by `factor` about a point (box coordinates). Instant, so pinching feels direct. */
  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    userZoomed.current = true
    setAnimate(false)
    const v = viewRef.current
    const k = Math.min(maxZoom, Math.max(minK, v.k * factor))
    setView({ k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k })
  }, [maxZoom, minK, setView])

  const zoomBy = useCallback((factor: number) => {
    manual.current?.()
    zoomAt(factor, size.w / 2, (size.h - insetBottom) / 2)
  }, [zoomAt, size, insetBottom])

  const panBy = useCallback((dx: number, dy: number) => {
    userZoomed.current = true
    setAnimate(false)
    const v = viewRef.current
    setView({ ...v, x: v.x + dx, y: v.y + dy })
  }, [setView])

  /** Animate so `r` fills the visible area (with `pad` around it), never zooming beyond maxZoom or below `minScale`. */
  const zoomToRect = useCallback((r: Rect, pad: number, minScale = 0) => {
    const usable = size.h - insetBottom
    const k = Math.min(maxZoom, Math.max(minScale, Math.min(size.w / (r.w + 2 * pad), usable / (r.h + 2 * pad))))
    userZoomed.current = true
    setAnimate(true)
    setView({ k, x: size.w / 2 - (r.x + r.w / 2) * k, y: usable / 2 - (r.y + r.h / 2) * k })
  }, [size, insetBottom, maxZoom, setView])

  /** Animate to centre `r` in the visible area, zooming in to at least `minScale` (used to follow the execution). */
  const centerOn = useCallback((r: Rect, minScale: number) => {
    const usable = size.h - insetBottom
    const k = Math.min(maxZoom, Math.max(viewRef.current.k, minScale))
    userZoomed.current = true
    setAnimate(true)
    setView({ k, x: size.w / 2 - (r.x + r.w / 2) * k, y: usable / 2 - (r.y + r.h / 2) * k })
  }, [size, insetBottom, maxZoom, setView])

  // Touchpad pinch (ctrl + wheel) zooms around the pointer; a plain wheel / two-finger scroll pans, except over a scrollable panel.
  useEffect(() => {
    const target = wheelTarget ?? el
    if (!target || !el) return
    const onWheel = (e: WheelEvent) => {
      const lines = e.deltaMode === 1 ? 16 : 1
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        const scale = rect.width / el.offsetWidth || 1
        const d = Math.max(-40, Math.min(40, e.deltaY * lines))
        manual.current?.()
        zoomAt(Math.exp(-d * 0.01), (e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale)
        return
      }
      if ((e.target as HTMLElement).closest('[data-scrollable]')) return
      e.preventDefault()
      manual.current?.()
      panBy(-e.deltaX * lines, -e.deltaY * lines)
    }
    target.addEventListener('wheel', onWheel, { passive: false })
    return () => target.removeEventListener('wheel', onWheel)
  }, [el, wheelTarget, zoomAt, panBy])

  // Drag to pan. A drag must not count as a click on the box underneath.
  const drag = useRef<{ x: number; y: number; view: View; scale: number } | null>(null)
  const bind = {
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest('.szoom__ui')) return
      const el = boxRef.current
      if (!el) return
      drag.current = { x: e.clientX, y: e.clientY, view: viewRef.current, scale: el.getBoundingClientRect().width / el.offsetWidth || 1 }
      moved.current = false
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dx = (e.clientX - d.x) / d.scale, dy = (e.clientY - d.y) / d.scale
      if (!moved.current && Math.hypot(dx, dy) < 5) return
      if (!moved.current) { moved.current = true; manual.current?.() }
      userZoomed.current = true
      setAnimate(false)
      setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy })
    },
    onPointerUp: () => { drag.current = null },
    onPointerLeave: () => { drag.current = null },
    onClickCapture: (e: React.MouseEvent) => {
      if (moved.current) { e.stopPropagation(); moved.current = false }
    },
  }

  return { box, view, animate, fit, zoomBy, zoomToRect, centerOn, bind, ready: size.w > 0 }
}
