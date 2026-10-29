import { ContentSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's09', title: '[BACKUP] Section 1 condensed', backup: true }

const items = [
  ['2017', 'Transformer', 'Parallelizable self-attention'],
  ['2018', 'GPT-1', '117M params · Pretrain → fine-tune'],
  ['2019', 'GPT-2', '~10× scale · General text gen'],
  ['2020', 'GPT-3', '175B params · Few-shot learning'],
  ['2022', 'InstructGPT', 'RLHF · Predicts → obeys'],
  ['2022', 'ChatGPT', 'Nov 30 · 1M users / 5 days'],
]

export default function S09() {
  return (
    <ContentSlide title="Section 1 condensed — 15-min path" tag="BACKUP">
      <p className="muted" style={{ margin: '0 0 28px' }}>GPT-1 → GPT-2 → GPT-3 → InstructGPT → ChatGPT</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }}>
        {items.map(([y, t, d]) => (
          <div key={t} className="card" style={{ padding: '22px 18px' }}>
            <div className="accent" style={{ fontSize: 40, fontWeight: 700 }}>{y}</div>
            <div style={{ fontSize: 30, fontWeight: 700, margin: '6px 0' }}>{t}</div>
            <div className="muted" style={{ fontSize: 22 }}>{d}</div>
          </div>
        ))}
      </div>
    </ContentSlide>
  )
}
