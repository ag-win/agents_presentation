import { ContentSlide } from '../layouts'
import { BigStat } from '../visuals'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's11', title: "It's not just business — everyone's using this" }

// Bar lengths reproduce the original deck's proportions; the PC/Internet values were
// never re-verified (see notes). Treat them as illustrative until checked.
const faster = [
  { name: 'Personal Computer', w: 1.71, hot: false },
  { name: 'Internet', w: 2.47, hot: false },
  { name: 'Generative AI', w: 4.5, hot: true },
]

export default function S11() {
  return (
    <ContentSlide
      title="It's not just business — everyone's using this"
      cite="Stanford HAI, The 2026 AI Index Report, Chapter 4 (Economy) — hai.stanford.edu"
    >
      <div className="row" style={{ gap: 48, alignItems: 'flex-start' }}>
        <div style={{ flex: 0.8 }}>
          <BigStat value="53%" label="population-level adoption" sub="within 3 years of mass-market launch" />
        </div>
        <div style={{ flex: 1.4 }}>
          <div className="muted" style={{ fontSize: 28, marginBottom: 14 }}>Faster than:</div>
          {faster.map((f) => (
            <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 14 }}>
              <div style={{ width: 640, flex: 'none' }}>
                <div style={{ height: 40, width: `${(f.w / 4.5) * 100}%`, background: f.hot ? 'var(--accent)' : 'var(--ink-muted)' }} />
              </div>
              <span style={{ fontSize: 30 }}>{f.name}</span>
            </div>
          ))}
          <div className="muted" style={{ fontSize: 28, margin: '28px 0 10px' }}>Country adoption (GDP outliers):</div>
          <div style={{ fontSize: 32, display: 'grid', gap: 6 }}>
            <span>Singapore <b>61%</b></span>
            <span>UAE <b>64%</b></span>
            <span>US <b>28.3%</b> <span className="muted">(ranked 24th)</span></span>
          </div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 22, marginTop: 24 }}>
        Verified against Stanford HAI's own Ch. 4 PDF and hai.stanford.edu (some secondary write-ups say 54% — the primary source says 64%).
      </p>
    </ContentSlide>
  )
}
