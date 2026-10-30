import { useMemo, useState } from 'react'
import '../../demo/demo.css'
import '../support.css'
import { BLANK_SNAPSHOT } from '../blankSnapshot'
import { SupportLayout } from '../SupportLayout'
import { Board } from './Board'
import { useZoomPan } from './useZoomPan'
import { ZoomControls } from './ZoomControls'

interface Caption { readonly title: string; readonly text: string }

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
  const zoom = useZoomPan({ contentW: SupportLayout.width, contentH: SupportLayout.height, onManual: () => setCaption(null) })
  const [caption, setCaption] = useState<Caption | null>(null)

  const focusBranch = (branch: string) => {
    const card = layout.cards.find((c) => c.branch === branch)
    if (!card) return
    setCaption(BRANCH_CAPTIONS[branch] ?? null)
    zoom.zoomToRect(card, 60)
  }

  const focusNode = (id: string) => {
    const spec = layout.node(id)
    if (spec.branch) return focusBranch(spec.branch)
    const group = id === 'quality' || id === 'revise' ? [layout.node('quality'), layout.node('revise')] : [spec]
    const x = Math.min(...group.map((n) => n.x)), y = Math.min(...group.map((n) => n.y))
    const w = Math.max(...group.map((n) => n.x + n.w)) - x, h = Math.max(...group.map((n) => n.y + n.h)) - y
    setCaption({ title: id === 'quality' || id === 'revise' ? 'Evaluator-optimizer' : spec.label, text: spec.blurb })
    zoom.zoomToRect({ x, y, w, h }, 150)
  }

  const fit = () => { setCaption(null); zoom.fit() }

  return (
    <div
      ref={zoom.box}
      className="szoom"
      {...zoom.bind}
      onClick={(e) => { if (!(e.target as HTMLElement).closest('.sb-card, .sb-node, .szoom__ui')) fit() }}
    >
      <div className={`szoom__stage${zoom.animate ? ' is-animated' : ''}`} style={{ transform: `translate(${zoom.view.x}px, ${zoom.view.y}px) scale(${zoom.view.k})` }}>
        <Board snap={BLANK_SNAPSHOT} layout={layout} selected={null} onNodeClick={focusNode} onCardClick={focusBranch} />
      </div>

      {caption && (
        <div className="szoom__caption szoom__ui">
          <h3>{caption.title}</h3>
          <p>{caption.text}</p>
        </div>
      )}
      <ZoomControls onZoomIn={() => zoom.zoomBy(1.4)} onZoomOut={() => zoom.zoomBy(1 / 1.4)} onFit={fit} />
      {!caption && <div className="szoom__hint szoom__ui">Click a path to zoom in · pinch or ctrl + scroll to zoom · scroll or drag to move</div>}
    </div>
  )
}
