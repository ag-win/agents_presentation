import { ContentSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's07', title: '2022 — Teaching the model to be helpful' }

const steps = [
  { n: '1', t: 'Supervised Fine-Tuning', d: 'Human-written example responses' },
  { n: '2', t: 'Reward Model', d: 'Train on human preference rankings' },
  { n: '3', t: 'RL / PPO', d: 'Optimize against the reward model' },
]

export default function S07() {
  return (
    <ContentSlide
      title="2022 — Teaching the model to be helpful"
      cite="Ouyang et al., 2022 — Training language models to follow instructions with human feedback (InstructGPT)"
    >
      <p style={{ margin: '0 0 36px' }}>
        <b>Problem:</b> a raw language model predicts plausible text — it doesn't necessarily do what a user wants.
      </p>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 20, marginBottom: 40 }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{ display: 'contents' }}>
            <div className="card" style={{ flex: 1 }}>
              <div className="accent" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>{s.n}</div>
              <h3 style={{ marginTop: 10 }}>{s.t}</h3>
              <p className="muted">{s.d}</p>
            </div>
            {i < steps.length - 1 && <span className="accent" style={{ fontSize: 48, alignSelf: 'center' }}>→</span>}
          </div>
        ))}
      </div>
      <div className="callout">
        Everything from "chatbot" to "agent" depends on this shift: <b>from predicts text → does what was asked.</b>
      </div>
    </ContentSlide>
  )
}
