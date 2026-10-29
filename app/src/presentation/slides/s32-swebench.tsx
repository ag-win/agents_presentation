import { ContentSlide } from '../layouts'
import { Legend } from '../visuals'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's32', title: 'SWE-bench Verified: the gap opens up' }

// Values reproduce the original deck's bar heights (% of axis). Per the deck notes the top of
// the curve has moved (frontier ~97% as of Aug 2026) and mid-series values still need re-pulling.
const data = [
  { label: '2023', non: 2, agent: 4 },
  { label: 'Mid 2024', non: 20, agent: 33 },
  { label: 'Late 2024', non: 20, agent: 53 },
  { label: 'Mid 2025', non: 20, agent: 72 },
  { label: '2026', non: 20, agent: 80 },
]
const H = 400

export default function S32() {
  return (
    <ContentSlide
      title="SWE-bench Verified: the gap opens up"
      cite="SWE-bench: Jimenez et al., arXiv:2310.06770  |  Frontier scores now ~97% as of Aug 2026 (vals.ai)"
    >
      <p className="muted" style={{ margin: '0 0 12px', fontSize: 28 }}>Resolve real GitHub issues, checked against real test suites.</p>
      <div style={{ display: 'flex', gap: 48 }}>
        <div style={{ display: 'flex' }}>
          <div style={{ position: 'relative', width: 70, height: H, fontSize: 24 }}>
            {[0, 25, 50, 75, 100].map((v) => (
              <span key={v} style={{ position: 'absolute', right: 8, bottom: (v / 100) * H - 10 }}>{v}%</span>
            ))}
          </div>
          <div>
            <div style={{ position: 'relative', height: H, width: 1000, borderBottom: '2px solid var(--ink-muted)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around' }}>
              {[25, 50, 75, 100].map((v) => (
                <div key={v} style={{ position: 'absolute', left: 0, right: 0, bottom: (v / 100) * H, borderTop: '1px solid var(--grid)' }} />
              ))}
              {data.map((d) => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, zIndex: 1 }}>
                  <div style={{ width: 66, height: (d.non / 100) * H, background: 'var(--ink-muted)' }} />
                  <div style={{ width: 66, height: (d.agent / 100) * H, background: 'var(--accent)' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 26, marginTop: 8 }}>
              {data.map((d) => <span key={d.label}>{d.label}</span>)}
            </div>
          </div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 22, marginBottom: 10 }}>% tasks resolved</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <Legend items={[{ color: 'var(--ink-muted)', label: 'Non-agentic (~20% plateau)' }]} />
            <Legend items={[{ color: 'var(--accent)', label: 'Agentic systems' }]} />
          </div>
        </div>
      </div>
      <p style={{ marginTop: 28, fontSize: 30 }}>
        <b>Why agents win:</b> ground-truth feedback (tests pass or fail) the agent can act on mid-task — the "Observation" step in the loop, at production scale.
      </p>
    </ContentSlide>
  )
}
