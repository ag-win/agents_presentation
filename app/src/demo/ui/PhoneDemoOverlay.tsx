import { useEffect } from 'react'
import { demoSession } from '../demoSession'
import { useDemo } from '../useDemo'
import { PhoneChat } from './PhoneChat'
import { PipelinePanel } from './PipelinePanel'
import '../demo.css'

/**
 * Full-slide overlay: a phone on the left, the Input -> LLM -> Output pipeline on the right.
 * It holds no state of its own; closing it changes nothing about the chat (see PhoneDemoSession).
 */
export function PhoneDemoOverlay({ onClose }: { onClose: () => void }) {
  const snap = useDemo()
  const { slowmo } = snap

  useEffect(() => {
    void demoSession.refreshBackend()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="demo-overlay" role="dialog" aria-modal="true" aria-label="Single LLM call demo" data-modal>
      <header className="demo-head">
        <h2>One prompt, one LLM call</h2>
        <div className="demo-slow">
          <button
            className={`demo-btn${slowmo.enabled ? ' is-on' : ''}`}
            aria-pressed={slowmo.enabled}
            onClick={() => demoSession.setSlowmo({ ...slowmo, enabled: !slowmo.enabled })}
          >
            Slow-mo
          </button>
          {slowmo.enabled && (
            <label className="demo-slider">
              <input
                type="range" min={2} max={30} step={1} value={slowmo.factor}
                onChange={(e) => demoSession.setSlowmo({ enabled: true, factor: Number(e.target.value) })}
                aria-label="Slow-motion factor"
              />
              <span>{slowmo.factor}× slower</span>
            </label>
          )}
        </div>
        <button className="demo-btn" onClick={() => demoSession.reset()}>Reset</button>
        <button className="demo-btn demo-btn--icon" onClick={onClose} aria-label="Close">×</button>
      </header>

      <div className="demo-body">
        <div className="demo-left">
          <PhoneChat snap={snap} />
          <div className="demo-scenarios">
            <button className={`demo-btn${snap.mode === 'planned' ? ' is-on' : ''}`} onClick={() => demoSession.startPlanned()}>
              ▶ Planned conversation
            </button>
            <button className={`demo-btn${snap.mode === 'free' ? ' is-on' : ''}`} onClick={() => demoSession.startFree()}>
              Free chat
            </button>
          </div>
        </div>
        <div className="demo-right">
          <PipelinePanel snap={snap} />
        </div>
      </div>
    </div>
  )
}
