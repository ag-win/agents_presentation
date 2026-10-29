import { DiagramSlide } from '../layouts'
import { AgentLoop } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's29', title: 'What an agent actually is' }

export default function S29() {
  return (
    <DiagramSlide
      title="What an agent actually is"
      diagram={<AgentLoop />}
      cite="ReAct: Yao et al., 2022/2023 — arXiv:2210.03629  |  Anthropic, Building Effective Agents (Dec 2024)"
    >
      <p style={{ margin: 0 }}>The LLM decides the next action, calls a tool, observes the result, decides again — for as many turns as needed.</p>
    </DiagramSlide>
  )
}
