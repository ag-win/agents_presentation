import { useEffect, useState } from 'react'
import '../../demo/demo.css'
import '../support.css'
import { backendLine } from '../../demo/ui/PipelinePanel'
import { BackupControl } from '../../demo/ui/BackupControl'
import { SlowmoControl } from '../../demo/ui/SlowmoControl'
import { useSupport, useSupportBench, useSupportPrompts } from '../hooks'
import { supportBench, supportPrompts, supportSession } from '../sharedSession'
import { BenchPanel } from './BenchPanel'
import { Board } from './Board'
import { Inbox } from './Inbox'
import { Inspector } from './Inspector'
import { TracePanel } from './TracePanel'

/**
 * Overlay for the ShopEase support desk: the whole system on one board, an inbox of customer messages and a test bench
 * on the left, the play-by-play in the middle, and an inspector for any box on the right. Holds no state of its own
 * except which left tab is showing.
 */
export function SupportOverlay({ onClose }: { onClose: () => void }) {
  const snap = useSupport()
  const prompts = useSupportPrompts()
  const bench = useSupportBench()
  const [tab, setTab] = useState<'inbox' | 'bench'>('inbox')
  const status = backendLine(snap.backend)
  const defaults = prompts.defaults

  useEffect(() => {
    void supportSession.refreshBackend()
    void supportPrompts.load()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const reset = () => {
    supportBench.reset()
    supportSession.reset()
  }
  const locked = snap.busy || bench.running

  return (
    <div className="demo-overlay demo-overlay--large" role="dialog" aria-modal="true" aria-label="ShopEase support desk demo" data-modal>
      <header className="demo-head">
        <h2>ShopEase Support Desk, live</h2>
        <span className={`demo-status${status.warn ? ' is-warn' : ''}`}>{status.text}</span>
        <BackupControl onChanged={() => void supportSession.refreshBackend()} />
        <SlowmoControl slowmo={snap.slowmo} onChange={(next) => supportSession.setSlowmo(next)} />
        <button className="demo-btn" onClick={reset}>Reset</button>
        <button className="demo-btn demo-btn--icon" onClick={onClose} aria-label="Close">×</button>
      </header>

      {defaults ? (
        <div className="sx">
          <Board snap={snap} layout={supportSession.layout} selected={prompts.selected} />
          <div className="sx__panels">
            <section className="sx__panel" aria-label="Inbox and test bench">
              <div className="sx__tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'inbox'} className={tab === 'inbox' ? 'is-on' : ''} onClick={() => setTab('inbox')}>Inbox</button>
                <button role="tab" aria-selected={tab === 'bench'} className={tab === 'bench' ? 'is-on' : ''} onClick={() => setTab('bench')}>Test bench</button>
              </div>
              {tab === 'inbox' ? <Inbox scenarios={defaults.scenarios} disabled={locked} /> : <BenchPanel scenarios={defaults.scenarios} bench={bench} disabled={snap.busy} />}
            </section>
            <section className="sx__panel" aria-label="Play-by-play"><TracePanel snap={snap} /></section>
            <section className="sx__panel" aria-label="Inspector"><Inspector snap={snap} layout={supportSession.layout} prompts={prompts} defaults={defaults} /></section>
          </div>
        </div>
      ) : (
        <div className="sx__wait">
          <p>{prompts.loadError ?? 'Loading…'}</p>
          {prompts.loadError && <button className="demo-btn" onClick={() => void supportPrompts.load()}>Try again</button>}
        </div>
      )}
    </div>
  )
}
