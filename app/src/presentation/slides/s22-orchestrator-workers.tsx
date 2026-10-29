import { DiagramSlide } from '../layouts'
import { OrchestratorWorkers } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's22', title: '4.1d Orchestrator–Workers' }

export default function S22() {
  return (
    <DiagramSlide title="Orchestrator–Workers" tag="4.1d" diagram={<OrchestratorWorkers />} cite="Anthropic, Building Effective Agents (Dec 2024)">
      <p style={{ margin: '0 0 10px' }}>A central LLM breaks the task down dynamically and delegates to worker LLMs, then synthesizes.</p>
      <p className="muted" style={{ margin: 0, fontSize: 30 }}>Example: Coding task where changed files can't be known in advance — orchestrator decides subtasks per-input</p>
    </DiagramSlide>
  )
}
