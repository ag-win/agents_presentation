import { DiagramSlide } from '../layouts'
import { AugmentedLLM } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's17', title: 'The augmented LLM' }

export default function S17() {
  return (
    <DiagramSlide
      title="The augmented LLM — the atomic unit under all three tiers"
      cite="Anthropic, Building Effective Agents (Dec 2024) — diagram structure based on source"
      diagram={<AugmentedLLM />}
    >
      <p style={{ margin: '0 0 8px' }}><b>This is not a fourth tier — it's the shared substrate.</b></p>
      <p className="muted" style={{ margin: 0 }}>Single call, workflow, or agent: all run on an augmented LLM.</p>
    </DiagramSlide>
  )
}
