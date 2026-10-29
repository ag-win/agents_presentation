import { ContentSlide } from '../layouts'
import { BigStat } from '../visuals'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's12', title: 'Where business stands' }

export default function S12() {
  return (
    <ContentSlide
      title="Where business stands"
      cite="McKinsey & Company, State of AI 2025 (Nov 2025)  |  Stanford HAI, 2026 AI Index Report, Ch. 4"
    >
      <div className="row" style={{ gap: 40 }}>
        <BigStat value="88%" label="organizations using AI" sub="in at least one function (up from 78% in 2024)">
          <div className="muted" style={{ fontSize: 22, marginTop: 10 }}>McKinsey State of AI 2025</div>
        </BigStat>
        <BigStat value="79%" label="using Generative AI" sub="in at least one function (up from 71% in 2024)">
          <div className="muted" style={{ fontSize: 22, marginTop: 10 }}>McKinsey / Stanford HAI 2026</div>
        </BigStat>
      </div>
      <div style={{ marginTop: 36, fontSize: 30 }}>
        <p style={{ margin: '0 0 8px' }}><b>Honest caveat:</b> most organizations remain in pilot stages rather than at scale.</p>
        <p className="muted" style={{ margin: 0 }}>Larger organizations are more likely to have reached a scaling phase.</p>
      </div>
    </ContentSlide>
  )
}
