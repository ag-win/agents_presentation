import { ContentSlide } from '../layouts'
import { Legend, StackBar } from '../visuals'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's13', title: 'But agent adoption? Still early.' }

// Segment widths reproduce the original deck's bars (no agent / piloting / scaled).
// Per the deck notes these per-function values were NOT re-verified against McKinsey.
const rows: [string, number, number, number][] = [
  ['IT', 4.55, 1.75, 0.7],
  ['Knowledge Mgmt', 4.9, 1.54, 0.56],
  ['Marketing', 5.46, 1.19, 0.35],
  ['Product Dev', 5.11, 1.54, 0.35],
  ['HR', 5.95, 0.84, 0.21],
]
const C = { none: 'var(--grid)', pilot: 'var(--ink-muted)', scaled: 'var(--accent)' }

export default function S13() {
  return (
    <ContentSlide
      title="But agent adoption? Still early."
      cite="McKinsey State of AI 2025 via Stanford HAI 2026 Ch.4  |  Anthropic Economic Index (Jan & Mar 2026)"
    >
      <div className="muted" style={{ fontSize: 26, marginBottom: 14 }}>AI agent deployment by business function — share of organizations:</div>
      {rows.map(([name, a, b, c]) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 10 }}>
          <span style={{ width: 240, fontSize: 28 }}>{name}</span>
          <div style={{ flex: 1, maxWidth: 1000 }}><StackBar parts={[{ w: a, color: C.none }, { w: b, color: C.pilot }, { w: c, color: C.scaled }]} /></div>
        </div>
      ))}
      <div style={{ margin: '18px 0 30px' }}>
        <Legend items={[{ color: C.none, label: 'No agent use' }, { color: C.pilot, label: 'Piloting' }, { color: C.scaled, label: 'Scaled (single digits)' }]} />
      </div>
      <div className="muted" style={{ fontSize: 26, marginBottom: 10 }}>Automation vs. augmentation (Claude.ai conversations):</div>
      <div className="row" style={{ gap: 20, fontSize: 28 }}>
        {[["Jan '25", 41, 55], ["Aug '25", 49, 47], ["Nov '25", 45, 52]].map(([d, a, g]) => (
          <div key={d} className="card" style={{ padding: '14px 22px' }}>
            <b>{d}</b><br />automation <b className="accent">{a}%</b> / augmentation <b>{g}%</b>
          </div>
        ))}
      </div>
    </ContentSlide>
  )
}
