import { ContentSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's36', title: 'The best system is the simplest one that works' }

export default function S36() {
  return (
    <ContentSlide title="The best system is the simplest one that works" cite="Anthropic, Building Effective Agents (Dec 2024)">
      <ul className="bullets">
        <li>Find the simplest solution first; add complexity only when it demonstrably improves outcomes.</li>
        <li>Agentic systems trade latency, cost, and predictability for capability and flexibility — that trade isn't always worth making.</li>
      </ul>
      {/* Quote is paraphrased from secondary sources — verify wording against the original before presenting. */}
      <div className="callout" style={{ marginTop: 44 }}>
        “If you can write down the steps in advance, write down the steps. Only reach for an agent when the path genuinely can't be known ahead of time.”
      </div>
    </ContentSlide>
  )
}
