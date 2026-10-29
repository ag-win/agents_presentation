import { useEffect, useRef } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import Deck from '../presentation/Deck'
import { slides } from '../presentation/deck'
import Builder from './Builder'

type View = 'presentation' | 'builder'

const VIEWS: { id: View; label: string }[] = [
  { id: 'presentation', label: 'Presentation' },
  { id: 'builder', label: 'Agent Builder' },
]

/**
 * Hosts both views side by side and slides between them. A single route renders this
 * component for both /presentation/* and /builder, so switching never remounts anything
 * (the deck keeps its slide, the builder keeps its state).
 */
export default function Workspace() {
  const { pathname } = useLocation()
  const nav = useNavigate()
  const lastSlide = useRef(0)

  const view: View | null = pathname.startsWith('/builder') ? 'builder' : pathname.startsWith('/presentation') ? 'presentation' : null
  const m = pathname.match(/^\/presentation\/(\d+)/)
  if (view === 'presentation') {
    lastSlide.current = Math.min(Math.max((m ? parseInt(m[1], 10) : 1) - 1, 0), slides.length - 1)
  }

  const presRef = useRef<HTMLDivElement>(null)
  const buildRef = useRef<HTMLDivElement>(null)
  // The off-screen pane must not take focus or keyboard input.
  useEffect(() => {
    const setInert = (el: HTMLElement | null, off: boolean) => {
      if (!el) return
      if (off) el.setAttribute('inert', '')
      else el.removeAttribute('inert')
    }
    setInert(presRef.current, view !== 'presentation')
    setInert(buildRef.current, view !== 'builder')
  }, [view])

  if (!view) return <Navigate to="/" replace />

  const goView = (v: View) => {
    if (v === view) return
    nav(v === 'builder' ? '/builder' : `/presentation/${lastSlide.current + 1}`)
  }

  return (
    <div className="workspace" data-view={view}>
      <nav className="viewdots" aria-label="Switch view">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            title={v.label}
            aria-label={v.label}
            aria-current={view === v.id}
            onClick={() => goView(v.id)}
          />
        ))}
      </nav>
      <div className="workspace__track">
        <div className="workspace__pane" ref={presRef}>
          <Deck
            index={lastSlide.current}
            onGo={(i) => nav(`/presentation/${i + 1}`, { replace: true })}
            active={view === 'presentation'}
          />
        </div>
        <div className="workspace__pane" ref={buildRef}>
          <Builder />
        </div>
      </div>
    </div>
  )
}
