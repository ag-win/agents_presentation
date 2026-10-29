import { DiagramSlide } from '../layouts'
import { EvaluatorOptimizer } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's23', title: '4.1e Evaluator–Optimizer' }

export default function S23() {
  return (
    <DiagramSlide title="Evaluator–Optimizer" tag="4.1e" diagram={<EvaluatorOptimizer />} cite="Anthropic, Building Effective Agents (Dec 2024)">
      <p style={{ margin: '0 0 10px' }}>One LLM generates, a second critiques, looping until the evaluator is satisfied.</p>
      <p className="muted" style={{ margin: 0, fontSize: 30 }}>Example: Literary translation with a critic pass checking nuance and tone</p>
    </DiagramSlide>
  )
}
