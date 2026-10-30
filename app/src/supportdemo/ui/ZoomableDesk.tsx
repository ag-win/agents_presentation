import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import '../../demo/demo.css'
import '../support.css'
import { BLANK_SNAPSHOT } from '../blankSnapshot'
import { SupportLayout } from '../SupportLayout'
import { Board } from './Board'

interface View { readonly x: number; readonly y: number; readonly k: number }
interface Rect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
interface Caption { readonly title: string; readonly text: string }

const MAX_ZOOM = 3.2

const BRANCH_CAPTIONS: Readonly<Record<string, Caption>> = {
  complaint: { title: 'Prompt chain', text: 'Extract the facts, check the order with plain code (the gate), draft the reply, polish the tone. Each step feeds the next, and the gate can stop the chain early.' },
  order: { title: 'Tool call', text: 'The model asks to run get_order_status. The app runs it and hands the result back; the model then explains it in plain words.' },
  product: { title: 'Parallelization', text: 'Code finds the product. Specs and Reviews are summarised at the same time, then a third call combines them into one answer.' },
  multi: { title: 'Orchestrator-workers', text: 'A planner splits the message at run time. One worker per task runs in parallel, then a final call merges their answers.' },
  feedback: { title: 'Simple reply', text: 'Thank the customer; plain code files the note for the product team.' },
  escalate: { title: 'Human in the loop', text: 'The model writes case notes and a calm holding reply. A person must approve before anything is sent.' },
  other: { title: 'Simple reply', text: 'Answers general questions from the shop policy and politely declines anything off-topic.' },
}

/**
 * The support-desk board on a slide, with zoom: click a path (or any box) to zoom into it, scroll to zoom anywhere,
 * drag to move, Fit to see everything again. The board is the same one the live demo uses, with nothing running.
 */
export function ZoomableDesk() {
  const layout = useMemo(() => new SupportLayout(), [])
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 })
  const [animate, setAnimate] = useState(true)
  const [caption, setCaption] = useState<Caption | null>(null)
  const moved = useRef(false)

  const fitView = useCallback((w: number, h: number): View => {
    const k = Math.min(w / SupportLayout.width, h / SupportLayout.height)
    return { k, x: (w - SupportLayout.width * k) / 2, y: (h - SupportLayout.height * k) / 2 }
  }, [])

  // Keep the board fitted until the user zooms: measure the box and fit on first layout and on resize.
  const zoomed = useRef(false)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const measure = () => {
      const next = { w: el.offsetWidth, h: el.offsetHeight }
      setSize(next)
      if (!zoomed.current) { setAnimate(false); setView(fitView(next.w, next.h)) }
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fitView])

  const minK = size.w ? fitView(size.w, size.h).k * 0.9 : 0.1

  const zoomToRect = (r: Rect, pad: number) => {
    const k = Math.min(MAX_ZOOM, size.w / (r.w + 2 * pad), size.h / (r.h + 2 * pad))
    zoomed.current = true
    setAnimate(true)
    setView({ k, x: size.w / 2 - (r.x + r.w / 2) * k, y: size.h / 2 - (r.y + r.h / 2) * k })
  }

  const fit = () => {
    zoomed.current = false
    setCaption(null)
    setAnimate(true)
    setView(fitView(size.w, size.h))
  }

  const zoomBy = (factor: number, cx = size.w / 2, cy = size.h / 2) => {
    zoomed.current = true
    setCaption(null)
    setAnimate(false)
    setView((v) => {
      const k = Math.min(MAX_ZOOM, Math.max(minK, v.k * factor))
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k }
    })
  }

  const focusBranch = (branch: string) => {
    const card = layout.cards.find((c) => c.branch === branch)
    if (!card) return
    setCaption(BRANCH_CAPTIONS[branch] ?? null)
    zoomToRect(card, 60)
  }

  const focusNode = (id: string) => {
    const spec = layout.node(id)
    if (spec.branch) return focusBranch(spec.branch)
    const group = id === 'quality' || id === 'revise' ? [layout.node('quality'), layout.node('revise')] : [spec]
    const x = Math.min(...group.map((n) => n.x)), y = Math.min(...group.map((n) => n.y))
    const w = Math.max(...group.map((n) => n.x + n.w)) - x, h = Math.max(...group.map((n) => n.y + n.h)) - y
    setCaption({ title: id === 'quality' || id === 'revise' ? 'Evaluator-optimizer' : spec.label, text: spec.blurb })
    zoomToRect({ x, y, w, h }, 150)
  }

  // Wheel zoom around the pointer. Native listener so it can prevent the page from scrolling.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const scale = rect.width / el.offsetWidth || 1
      zoomBy(Math.exp(-e.deltaY * 0.0015), (e.clientX - rect.left) / scale, (e.clientY - rect.top) / scale)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  // Drag to pan. A drag must not count as a click on the box underneath.
  const drag = useRef<{ x: number; y: number; view: View; scale: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.szoom__ui')) return
    const rect = box.current!.getBoundingClientRect()
    drag.current = { x: e.clientX, y: e.clientY, view, scale: rect.width / box.current!.offsetWidth || 1 }
    moved.current = false
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.x) / d.scale, dy = (e.clientY - d.y) / d.scale
    if (!moved.current && Math.hypot(dx, dy) < 5) return
    if (!moved.current) { moved.current = true; zoomed.current = true; setAnimate(false); setCaption(null) }
    setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy })
  }
  const onPointerUp = () => { drag.current = null }

  return (
    <div
      ref={box}
      className="szoom"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClickCapture={(e) => { if (moved.current) { e.stopPropagation(); moved.current = false } }}
      onClick={(e) => { if (!(e.target as HTMLElement).closest('.sb-card, .sb-node')) fit() }}
    >
      <div className={`szoom__stage${animate ? ' is-animated' : ''}`} style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>
        <Board snap={BLANK_SNAPSHOT} layout={layout} selected={null} onNodeClick={focusNode} onCardClick={focusBranch} />
      </div>

      {caption && (
        <div className="szoom__caption szoom__ui">
          <h3>{caption.title}</h3>
          <p>{caption.text}</p>
        </div>
      )}
      <div className="szoom__tools szoom__ui">
        <button type="button" onClick={() => zoomBy(1.4)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">−</button>
        <button type="button" onClick={fit}>Fit</button>
      </div>
      {!caption && <div className="szoom__hint szoom__ui">Click a path to zoom in · scroll to zoom · drag to move</div>}
    </div>
  )
}
