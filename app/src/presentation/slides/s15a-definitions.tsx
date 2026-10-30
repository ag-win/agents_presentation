import { ContentSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's15a', title: 'Agent, agentic AI, agency' }

const terms = [
  {
    word: 'Agent',
    role: 'the thing',
    text: 'A system built around an LLM that decides what to do next, uses tools, and acts to reach a goal.',
    flex: 1,
  },
  {
    word: 'Agentic AI',
    role: 'the approach',
    text: 'AI that pursues goals on its own. Unlike a chatbot that only generates text, it plans steps, calls real tools (APIs, files, browsers, code), watches what happens, and adjusts, looping until the task is done.',
    flex: 1.45,
  },
  {
    word: 'Agency',
    role: 'the degree',
    text: 'The capacity to choose and act: how much of the deciding is left to the model rather than to a script a human wrote.',
    flex: 1,
  },
]

export default function S15a() {
  return (
    <ContentSlide title="Agent, agentic AI, agency">
      <div className="row" style={{ gap: 28, alignItems: 'stretch' }}>
        {terms.map((t, i) => (
          <div key={t.word} className={`card${i === 1 ? ' card--accent' : ''}`} style={{ flex: t.flex, padding: '26px 30px' }}>
            <div className="muted" style={{ fontSize: 24, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>{t.role}</div>
            <h3 style={{ fontSize: 46, margin: '4px 0 14px' }}>{t.word}</h3>
            <p style={{ fontSize: 30, lineHeight: 1.35, margin: 0 }}>{t.text}</p>
          </div>
        ))}
      </div>
      <div className="callout" style={{ marginTop: 32, fontSize: 32 }}>
        An agent is the thing. <b>Agentic is how it behaves. Agency is how much freedom it has.</b>
      </div>
    </ContentSlide>
  )
}
