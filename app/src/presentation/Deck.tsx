import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { slides } from './deck'

const W = 1920
const H = 1080
const FRAME = 20 // px of breathing room around the rounded stage

function useStageScale() {
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min((window.innerWidth - 2 * FRAME) / W, (window.innerHeight - 2 * FRAME) / H))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return scale
}

interface DeckProps {
  /** Current slide (0-based). Owned by the parent so it survives switching views. */
  index: number
  onGo: (i: number) => void
  /** False while the deck is off-screen: keyboard shortcuts are ignored. */
  active: boolean
}

export default function Deck({ index: idx, onGo: go, active }: DeckProps) {
  const nav = useNavigate()
  const scale = useStageScale()
  const [showNotes, setShowNotes] = useState(false)
  const [jump, setJump] = useState(false)
  const [showHidden, setShowHidden] = useState(false)

  const visible = useMemo(
    () => slides.map((s, i) => ({ s, i })).filter(({ s, i }) => showHidden || !s.backup || i === idx).map(({ i }) => i),
    [showHidden, idx],
  )

  const step = useCallback((dir: 1 | -1) => {
    const pos = visible.indexOf(idx)
    const next = visible[Math.min(Math.max(pos + dir, 0), visible.length - 1)]
    go(next)
  }, [visible, idx, go])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // Enter/Space on a focused button should press the button (e.g. carousel), not advance the slide.
      if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof HTMLButtonElement) return
      switch (e.key) {
        case 'ArrowRight': case 'PageDown': case ' ': case 'Enter': e.preventDefault(); step(1); break
        case 'ArrowLeft': case 'PageUp': case 'Backspace': e.preventDefault(); step(-1); break
        case 'Home': go(0); break
        case 'End': go(slides.length - 1); break
        case 'f': case 'F':
          if (document.fullscreenElement) void document.exitFullscreen()
          else void document.documentElement.requestFullscreen?.()
          break
        case 'n': case 'N': setShowNotes((v) => !v); break
        case 'b': case 'B': setShowHidden((v) => !v); break
        case 'g': case 'G': case 'j': case 'J': setJump((v) => !v); break
        case 'Escape': setJump(false); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, go, active])

  const slide = slides[idx]
  const Slide = slide.Component
  const pos = visible.indexOf(idx)

  return (
    <div className="deck">
      <div className="deck__progress" style={{ width: `${((pos + 1) / visible.length) * 100}%` }} />
      <div className="deck__stage" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <Slide key={slide.id} />
      </div>

      <div className="deck__hud">
        <button onClick={() => nav('/')}>Home</button>
        <button onClick={() => step(-1)} aria-label="Previous slide">←</button>
        <span>{pos + 1} / {visible.length}</span>
        <button onClick={() => step(1)} aria-label="Next slide">→</button>
        <span className="spacer" />
        <button onClick={() => setJump(true)}>Slides (G)</button>
        <button onClick={() => setShowNotes((v) => !v)}>Notes (N)</button>
        <button onClick={() => setShowHidden((v) => !v)}>{showHidden ? 'Hide' : 'Show'} backup (B)</button>
        <button onClick={() => void (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}>Fullscreen (F)</button>
      </div>

      {showNotes && (
        <aside className="deck__notes">
          <h4>Speaker notes · {slide.title}</h4>
          {slide.notes.length ? slide.notes.map((t, i) => <p key={i}>{t}</p>) : <p>(none)</p>}
        </aside>
      )}

      {jump && (
        <div className="deck__jump" onClick={() => setJump(false)}>
          <div className="deck__jump-panel" onClick={(e) => e.stopPropagation()}>
            {slides.map((s, i) => (
              <button
                key={s.id}
                className="deck__jump-item"
                aria-current={i === idx}
                onClick={() => { go(i); setJump(false) }}
              >
                <span className="deck__jump-num">{i + 1}</span>
                <span>{s.title}</span>
                {(s.backup || s.optional) && <span className="deck__jump-tag">{s.backup ? 'backup' : 'optional'}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
