import { useState } from 'react'
import { ContentSlide } from '../layouts'
import { PhoneDemoOverlay } from '../../demo/ui/PhoneDemoOverlay'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's16', title: 'Three tiers of "using AI"' }

const tiers = [
  { icon: '→', name: 'Single Call', lines: ['One prompt, one response.', 'No tools, no loop.'], eg: 'e.g. "Summarize this."', who: 'Human designs everything', hot: false, demo: true },
  { icon: '⇉', name: 'Workflow', lines: ['Multiple LLM calls chained', 'along a human-designed path.'], eg: 'e.g. Generate → Translate → Adjust tone', who: 'Human decides the route', hot: false, demo: false },
  { icon: '⟳', name: 'Agent', lines: ['The LLM itself decides what happens next — which tool to use, whether to continue, when done.'], eg: 'e.g. Debug until tests pass', who: 'Model decides the next step', hot: true, demo: false },
]

export default function S16() {
  const [demoOpen, setDemoOpen] = useState(false)
  return (
    <>
      <ContentSlide title={'Three tiers of "using AI"'} cite="Anthropic, Building Effective Agents (Dec 2024)">
        <div className="row" style={{ gap: 28 }}>
          {tiers.map((t) => (
            <div key={t.name} className={`card${t.hot ? ' card--accent' : ''}`} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div className="accent" style={{ fontSize: 64, lineHeight: 1 }}>{t.icon}</div>
              <h3 style={{ marginTop: 8 }}>{t.name}</h3>
              <p>{t.lines.join(' ')}</p>
              <p className="muted" style={{ fontSize: 26 }}>{t.eg}</p>
              <p style={{ marginTop: 'auto', fontWeight: 700, color: t.hot ? 'var(--accent)' : undefined }}>{t.who}</p>
              {t.demo && (
                // Deliberately low-key: the audience shouldn't notice it; the presenter knows where it is.
                <button className="tier__peek" onClick={() => setDemoOpen(true)} aria-label="Open the live single-call demo" title="Live demo">
                  <svg width="16" height="24" viewBox="0 0 16 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="1" y="1" width="14" height="22" rx="3" /><line x1="6" y1="19" x2="10" y2="19" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="callout" style={{ marginTop: 32 }}>
          <b>The single distinction: Who decides the next step?</b> Predefined by human = workflow. Decided by model = agent.
        </div>
      </ContentSlide>
      {demoOpen && <PhoneDemoOverlay onClose={() => setDemoOpen(false)} />}
    </>
  )
}
