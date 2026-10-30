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
import { SupportLayout } from '../SupportLayout'
import { TracePanel } from './TracePanel'
import { useZoomPan } from './useZoomPan'
import { ZoomControls } from './ZoomControls'

/** Height of the three panels plus the gap above them: the board is fitted above this, and can slide behind it when zoomed. */
const PANEL_AREA = 348

/**
 * Overlay for the ShopEase support desk: the whole system on one board, an inbox of customer messages and a test bench
 * on the left, the play-by-play in the middle, and an inspector for any box on the right. The board can be zoomed
 * (touchpad pinch, + / -) and moved (two-finger scroll or drag), and slides behind the three panels when zoomed so a
 * slow-mo run can be followed up close. Holds no state of its own except the left tab and the view.
 */
export function SupportOverlay({ onClose }: { onClose: () => void }) {
  const snap = useSupport()
  const prompts = useSupportPrompts()
  const bench = useSupportBench()
  const [tab, setTab] = useState<'inbox' | 'bench'>('inbox')
  const status = backendLine(snap.backend)
  const defaults = prompts.defaults
  const [area, setArea] = useState<HTMLDivElement | null>(null)
  const [follow, setFollow] = useState(false)
  const zoom = useZoomPan({ contentW: SupportLayout.width, contentH: SupportLayout.height, insetBottom: PANEL_AREA, wheelTarget: area, onManual: () => setFollow(false) })

  // Follow: every time a box lights up, bring it to the middle of the visible board (zoomed in a little).
  useEffect(() => {
    if (!follow) return
    const id = Object.keys(snap.nodes).find((k) => snap.nodes[k].number === snap.counter)
    if (id) zoom.centerOn(supportSession.layout.node(id), 1.5)
  }, [follow, snap.counter]) // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="demo-overlay demo-overlay--large sup-overlay" role="dialog" aria-modal="true" aria-label="ShopEase support desk demo" data-modal>
      <header className="demo-head">
        <h2>ShopEase Support Desk, live</h2>
        <span className={`demo-status${status.warn ? ' is-warn' : ''}`}>{status.text}</span>
        <BackupControl onChanged={() => void supportSession.refreshBackend()} />
        <SlowmoControl slowmo={snap.slowmo} onChange={(next) => supportSession.setSlowmo(next)} />
        <button className="demo-btn" onClick={reset}>Reset</button>
        <button className="demo-btn demo-btn--icon" onClick={onClose} aria-label="Close">×</button>
      </header>

      {defaults ? (
        <div className="sx" ref={setArea}>
          <div ref={zoom.box} className="szoom sx__zoom" {...zoom.bind}>
            <div className={`szoom__stage${zoom.animate ? ' is-animated' : ''}`} style={{ transform: `translate(${zoom.view.x}px, ${zoom.view.y}px) scale(${zoom.view.k})` }}>
              <Board snap={snap} layout={supportSession.layout} selected={prompts.selected} />
            </div>
            <ZoomControls
              className="szoom__tools--top"
              onZoomIn={() => zoom.zoomBy(1.4)}
              onZoomOut={() => zoom.zoomBy(1 / 1.4)}
              onFit={() => { setFollow(false); zoom.fit() }}
              follow={{ on: follow, toggle: () => setFollow((f) => !f) }}
            />
          </div>
          <div className="sx__panels">
            <section className="sx__panel" data-scrollable aria-label="Inbox and test bench">
              <div className="sx__tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'inbox'} className={tab === 'inbox' ? 'is-on' : ''} onClick={() => setTab('inbox')}>Inbox</button>
                <button role="tab" aria-selected={tab === 'bench'} className={tab === 'bench' ? 'is-on' : ''} onClick={() => setTab('bench')}>Test bench</button>
              </div>
              {tab === 'inbox' ? <Inbox scenarios={defaults.scenarios} disabled={locked} /> : <BenchPanel scenarios={defaults.scenarios} bench={bench} disabled={snap.busy} />}
            </section>
            <section className="sx__panel" data-scrollable aria-label="Play-by-play"><TracePanel snap={snap} /></section>
            <section className="sx__panel" data-scrollable aria-label="Inspector"><Inspector snap={snap} layout={supportSession.layout} prompts={prompts} defaults={defaults} /></section>
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
