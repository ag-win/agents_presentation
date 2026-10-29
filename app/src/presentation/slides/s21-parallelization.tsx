import { DiagramSlide } from '../layouts'
import { Parallelization } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's21', title: '4.1c Parallelization' }

export default function S21() {
  return (
    <DiagramSlide title="Parallelization" tag="4.1c" diagram={<Parallelization />} cite="Anthropic, Building Effective Agents (Dec 2024)">
      <p style={{ margin: '0 0 10px' }}>Split work across simultaneous calls, aggregate programmatically. Flavors: Sectioning (independent subtasks) or Voting (same task × N, compare for consensus).</p>
      <p className="muted" style={{ margin: 0, fontSize: 30 }}>Example: One call drafts while another screens for policy violations</p>
    </DiagramSlide>
  )
}
