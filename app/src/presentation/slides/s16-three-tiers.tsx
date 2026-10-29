import { ContentSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's16', title: 'Three tiers of "using AI"' }

const tiers = [
  { icon: '→', name: 'Single Call', lines: ['One prompt, one response.', 'No tools, no loop.'], eg: 'e.g. "Summarize this."', who: 'Human designs everything', hot: false },
  { icon: '⇉', name: 'Workflow', lines: ['Multiple LLM calls chained', 'along a human-designed path.'], eg: 'e.g. Generate → Translate → Adjust tone', who: 'Human decides the route', hot: false },
  { icon: '⟳', name: 'Agent', lines: ['The LLM itself decides what happens next — which tool to use, whether to continue, when done.'], eg: 'e.g. Debug until tests pass', who: 'Model decides the next step', hot: true },
]

export default function S16() {
  return (
    <ContentSlide title={'Three tiers of "using AI"'} cite="Anthropic, Building Effective Agents (Dec 2024)">
      <div className="row" style={{ gap: 28 }}>
        {tiers.map((t) => (
          <div key={t.name} className={`card${t.hot ? ' card--accent' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="accent" style={{ fontSize: 64, lineHeight: 1 }}>{t.icon}</div>
            <h3 style={{ marginTop: 8 }}>{t.name}</h3>
            <p>{t.lines.join(' ')}</p>
            <p className="muted" style={{ fontSize: 26 }}>{t.eg}</p>
            <p style={{ marginTop: 'auto', fontWeight: 700, color: t.hot ? 'var(--accent)' : undefined }}>{t.who}</p>
          </div>
        ))}
      </div>
      <div className="callout" style={{ marginTop: 32 }}>
        <b>The single distinction: Who decides the next step?</b> Predefined by human = workflow. Decided by model = agent.
      </div>
    </ContentSlide>
  )
}
