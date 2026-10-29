import { ContentSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's14', title: '[BACKUP] Section 2 condensed', backup: true }

export default function S14() {
  return (
    <ContentSlide title="Adoption: where things stand" tag="BACKUP">
      <ul className="bullets">
        <li><b>53%</b> population-level genAI adoption within 3 years (Stanford HAI 2026)</li>
        <li><b>88%</b> of organizations use AI in at least one function; <b>79%</b> use gen AI specifically (McKinsey 2025)</li>
        <li><b>Agent deployment:</b> still single-digit percentages for scaled use in nearly every business function</li>
      </ul>
      <div className="callout" style={{ marginTop: 48 }}>
        That gap between broad AI adoption and thin agent adoption is <b>what the rest of this talk is about.</b>
      </div>
    </ContentSlide>
  )
}
