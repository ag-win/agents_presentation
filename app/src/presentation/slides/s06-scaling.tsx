import { ContentSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's06', title: '2019–2020 — Same recipe, bigger every time' }

const models = [
  { name: 'GPT-1', year: '2018', params: '117M params' },
  { name: 'GPT-2', year: '2019', params: '~1.5B params' },
  { name: 'GPT-3', year: '2020', params: '175B params' },
]

export default function S06() {
  return (
    <ContentSlide
      title="2019–2020 — Same recipe, bigger every time"
      cite="Brown et al., 2020 — arXiv:2005.14165  |  GPT-2 staged release: TechCrunch, 2019"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
        {models.map((m, i) => (
          <div key={m.name} style={{ display: 'contents' }}>
            <div className="card card--accent" style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 40, fontWeight: 700 }}>{m.name}</div>
              <div className="muted" style={{ fontSize: 26 }}>{m.year}</div>
              <div className="accent" style={{ fontSize: 34, fontWeight: 700 }}>{m.params}</div>
            </div>
            {i < models.length - 1 && <span className="accent" style={{ fontSize: 48 }}>→</span>}
          </div>
        ))}
      </div>
      <ul className="bullets" style={{ fontSize: 30, gap: 14 }}>
        <li><b>GPT-2:</b> ~10× scale over GPT-1 → surprisingly general text generation without task-specific fine-tuning.</li>
        <li>OpenAI initially withheld the full GPT-2 model, citing potential misuse — an early, real debate about responsible AI publication.</li>
        <li><b>GPT-3</b> (Brown et al., 2020): 175B parameters. Key result: in-context / few-shot learning — the model generalizes from a handful of prompt examples, no gradient updates required.</li>
        <li>Same architecture, same basic recipe — they just kept scaling it, and capability kept jumping in ways that weren't fully predicted.</li>
      </ul>
    </ContentSlide>
  )
}
