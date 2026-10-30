import { useEffect, useMemo, useState } from 'react'
import '../../demo/demo.css'
import '../../supportdemo/support.css'
import '../agent.css'
import { backendLine } from '../../demo/ui/PipelinePanel'
import { BackupControl } from '../../demo/ui/BackupControl'
import { SlowmoControl } from '../../demo/ui/SlowmoControl'
import { useZoomPan } from '../../supportdemo/ui/useZoomPan'
import { ZoomControls } from '../../supportdemo/ui/ZoomControls'
import { AgentLayout } from '../AgentLayout'
import { useAgent, useAgentConfig } from '../hooks'
import { agentConfig, agentSession } from '../sharedSession'
import { AgentBoard } from './AgentBoard'
import { AgentInbox } from './Inbox'
import { AgentInspector } from './Inspector'
import { AgentTrace } from './AgentTrace'

/** Height of the three panels plus the gap above them: the board is fitted above this, and slides behind it when zoomed. */
const PANEL_AREA = 348

/**
 * Overlay for the agent demo: the toolbox on the left of one board that grows as the model decides what to do, with an inbox,
 * the play-by-play and an inspector underneath. The board zooms and moves like the support desk's, and Follow (on by default)
 * keeps the box that is running in view, which is what makes a slow-mo run easy to follow.
 */
export function AgentOverlay({ onClose }: { onClose: () => void }) {
  const snap = useAgent()
  const config = useAgentConfig()
  const status = backendLine(snap.backend)
  const defaults = config.defaults
  const [area, setArea] = useState<HTMLDivElement | null>(null)
  const [follow, setFollow] = useState(true)

  // The layout is a pure function of what exists so far; recompute when boxes, switches or the toolbox change.
  const laid = useMemo(
    () => AgentLayout.compute(defaults?.tools ?? [], snap.nodes, snap.agents, new Set(agentConfig.enabled())),
    [defaults, snap.nodes, snap.agents, config.disabled], // eslint-disable-line react-hooks/exhaustive-deps
  )
  const zoom = useZoomPan({ contentW: laid.width, contentH: laid.height, insetBottom: PANEL_AREA, wheelTarget: area, onManual: () => setFollow(false) })

  useEffect(() => {
    void agentSession.refreshBackend()
    void agentConfig.load()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Follow: each time a box lights up, bring it to the middle of the visible board.
  useEffect(() => {
    if (!follow) return
    const id = Object.keys(snap.states).find((k) => snap.states[k].number === snap.counter)
    const rect = id ? laid.rects[id] : undefined
    if (rect) zoom.centerOn(rect, 1)
  }, [follow, snap.counter]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="demo-overlay demo-overlay--large sup-overlay" role="dialog" aria-modal="true" aria-label="Agent demo" data-modal>
      <header className="demo-head">
        <h2>An agent, live</h2>
        <span className={`demo-status${status.warn ? ' is-warn' : ''}`}>{status.text}</span>
        {snap.busy && <button className="demo-btn" onClick={() => agentSession.stop()}>Stop</button>}
        <BackupControl showSearch onChanged={() => void agentSession.refreshBackend()} />
        <SlowmoControl slowmo={snap.slowmo} onChange={(next) => agentSession.setSlowmo(next)} />
        <button className="demo-btn" onClick={() => agentSession.reset()}>Reset</button>
        <button className="demo-btn demo-btn--icon" onClick={onClose} aria-label="Close">×</button>
      </header>

      {defaults ? (
        <div className="sx" ref={setArea}>
          <div ref={zoom.box} className="szoom sx__zoom" {...zoom.bind}>
            <div className={`szoom__stage${zoom.animate ? ' is-animated' : ''}`} style={{ transform: `translate(${zoom.view.x}px, ${zoom.view.y}px) scale(${zoom.view.k})` }}>
              <AgentBoard snap={snap} laid={laid} tools={defaults.tools} disabled={config.disabled} locked={config.locked} selected={config.selected} />
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
            <section className="sx__panel" data-scrollable aria-label="Tasks"><AgentInbox defaults={defaults} disabled={snap.busy} /></section>
            <section className="sx__panel" data-scrollable aria-label="Play-by-play"><AgentTrace snap={snap} /></section>
            <section className="sx__panel" data-scrollable aria-label="Inspector"><AgentInspector snap={snap} config={config} /></section>
          </div>
        </div>
      ) : (
        <div className="sx__wait">
          <p>{config.loadError ?? 'Loading…'}</p>
          {config.loadError && <button className="demo-btn" onClick={() => void agentConfig.load()}>Try again</button>}
        </div>
      )}
    </div>
  )
}
