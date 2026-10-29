import { DiagramSlide } from '../layouts'
import { Routing } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's20', title: '4.1b Routing' }

export default function S20() {
  return (
    <DiagramSlide title="Routing" tag="4.1b" diagram={<Routing />} cite="Anthropic, Building Effective Agents (Dec 2024)">
      <p style={{ margin: '0 0 10px' }}>Classify the input first, then send it down a specialized path.</p>
      <p className="muted" style={{ margin: 0, fontSize: 30 }}>Example: Customer support triage — refund vs. technical vs. general → specialized handling</p>
    </DiagramSlide>
  )
}
