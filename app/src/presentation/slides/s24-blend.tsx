import { ContentSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's24', title: 'Real systems blend these' }

const steps = [
  { t: '1. Route', d: '(classify category)' },
  { t: '2. Orchestrator–Workers', d: '(technical: multi-subsystem)' },
  { t: '3. Evaluator–Optimizer', d: '(critique before sending)' },
  { t: 'Final Response', d: '' },
]

export default function S24() {
  return (
    <ContentSlide title="Real systems blend these" cite="Anthropic, Building Effective Agents (Dec 2024)">
      <p style={{ margin: '0 0 28px' }}>The five patterns are a vocabulary, not a rigid menu. Production systems commonly combine two or three.</p>
      <div className="muted" style={{ fontSize: 28, marginBottom: 12 }}>Example: Customer-support agent</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
        {steps.map((s, i) => (
          <div key={s.t} style={{ display: 'contents' }}>
            <div className={`card${i === steps.length - 1 ? ' card--accent' : ''}`} style={{ flex: 1, textAlign: 'center', padding: '22px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 30 }}>{s.t}</div>
              {s.d && <div className="muted" style={{ fontSize: 24 }}>{s.d}</div>}
            </div>
            {i < steps.length - 1 && <span className="accent" style={{ fontSize: 44 }}>→</span>}
          </div>
        ))}
      </div>
      <div className="callout">
        This entire combined system is still a workflow — a human designed every step of this path.
        <br /><b>The tier boundary is crossed when the model, not the human, decides what happens next.</b>
      </div>
    </ContentSlide>
  )
}
