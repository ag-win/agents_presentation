import { useEffect } from 'react'
import '../demo.css'
import '../systemPrompt/system.css'
import { systemDemoSession as session } from '../systemDemoSession'
import { systemPromptStore as store } from '../systemPrompt/sharedStore'
import { useSystemPrompt } from '../systemPrompt/useSystemPrompt'
import { useDemo } from '../useDemo'
import { PhoneChat } from './PhoneChat'
import { PipelinePanel, backendLine } from './PipelinePanel'
import { SlowmoControl } from './SlowmoControl'
import { SystemPromptBox } from './SystemPromptBox'

/**
 * Overlay for the system-prompt slide: the birthday chat on a phone, the Input -> LLM -> Output pipeline on the
 * right, and between them an editable system prompt that is attached just before the prompt reaches the LLM.
 * Holds no state of its own; closing it changes nothing (see PhoneDemoSession and SystemPromptStore).
 */
export function SystemPromptOverlay({ onClose }: { onClose: () => void }) {
  const snap = useDemo(session)
  const sys = useSystemPrompt()
  const status = backendLine(snap.backend)

  useEffect(() => {
    void session.refreshBackend()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const reset = () => {
    session.reset()
    store.reset()
  }

  return (
    <div className="demo-overlay demo-overlay--large" role="dialog" aria-modal="true" aria-label="System prompt demo" data-modal>
      <header className="demo-head">
        <h2>The system prompt, live</h2>
        <span className={`demo-status${status.warn ? ' is-warn' : ''}`}>{status.text}</span>
        <SlowmoControl slowmo={snap.slowmo} onChange={(next) => session.setSlowmo(next)} />
        <button className="demo-btn" onClick={reset}>Reset</button>
        <button className="demo-btn demo-btn--icon" onClick={onClose} aria-label="Close">×</button>
      </header>

      <div className="demo-body demo-body--sys">
        <div className="demo-left">
          <PhoneChat snap={snap} session={session} />
          <div className="demo-scenarios">
            <button className={`demo-btn${snap.mode === 'planned' ? ' is-on' : ''}`} onClick={() => session.startPlanned()}>▶ Planned conversation</button>
            <button className={`demo-btn${snap.mode === 'free' ? ' is-on' : ''}`} onClick={() => session.startFree()}>Free chat</button>
          </div>
        </div>
        <div className="demo-right">
          <PipelinePanel
            snap={snap}
            className="demo-pipe--sys"
            llm={{ systemText: sys.text, expanded: sys.llmExpanded, onToggle: () => store.toggleLlm(), aside: <SystemPromptBox /> }}
          />
        </div>
      </div>
    </div>
  )
}
