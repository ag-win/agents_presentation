import { DiagramSlide } from '../layouts'
import { PromptChain } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's19', title: '4.1a Prompt Chaining' }

export default function S19() {
  return (
    <DiagramSlide title="Prompt Chaining" tag="4.1a" diagram={<PromptChain />} cite="Anthropic, Building Effective Agents (Dec 2024)">
      <p style={{ margin: '0 0 10px' }}>Decompose into fixed sequential steps; each call processes the prior call's output.</p>
      <p className="muted" style={{ margin: 0, fontSize: 30 }}>Example: Generate marketing copy → Translate it → Adjust tone for target market</p>
    </DiagramSlide>
  )
}
