import { useState } from 'react'
import { ContentSlide } from '../layouts'
import { LiveDemoButton } from '../LiveDemoButton'
import { AgentOverlay } from '../../agentdemo/ui/AgentOverlay'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's30', title: 'Same shop, same tools: now the model decides' }

const sides = [
  {
    name: 'Workflow: the ShopEase desk',
    who: 'A human drew every path',
    items: ['The route is fixed before the message arrives', 'Predictable, testable, easy to audit', 'Same number of steps every time', 'Cannot handle what nobody planned for'],
    hot: false,
  },
  {
    name: 'Agent: one model, a toolbox',
    who: 'The model chooses the next step',
    items: ['It decides which tools to call, and how many at once', 'Can start sub-agents and recover from mistakes', 'Fewer steps when the task is simple', 'Less predictable: it needs limits and checks'],
    hot: true,
  },
]

export default function S30() {
  const [demoOpen, setDemoOpen] = useState(false)
  return (
    <>
      <ContentSlide title="Same shop, same tools: now the model decides" tag="AGENT">
        <p style={{ margin: '0 0 24px', fontSize: 32 }}>Give one LLM the toolbox and the same customer messages. No router, no fixed paths.</p>
        <div className="row" style={{ gap: 28 }}>
          {sides.map((s) => (
            <div key={s.name} className={`card${s.hot ? ' card--accent' : ''}`} style={{ padding: '22px 28px' }}>
              <h3 style={{ fontSize: 36 }}>{s.name}</h3>
              <p style={{ fontWeight: 700, color: s.hot ? 'var(--accent)' : undefined, fontSize: 30, margin: '0 0 10px' }}>{s.who}</p>
              <ul className="bullets" style={{ gap: 10, fontSize: 28 }}>
                {s.items.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="callout" style={{ marginTop: 26, fontSize: 32 }}>
          A workflow is a path a human drew. <b>An agent draws its own path as it goes.</b>
        </div>
      </ContentSlide>
      <LiveDemoButton className="live-demo-btn--top" onClick={() => setDemoOpen(true)} />
      {demoOpen && <AgentOverlay onClose={() => setDemoOpen(false)} />}
    </>
  )
}
