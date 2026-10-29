import { LiveDemo } from '../layouts'
import Embed from '../../shared/Embed'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's30', title: 'Live demo: a full agent' }

export default function S30() {
  return (
    <LiveDemo title="Live demo: a full agent">
      <p className="muted mono" style={{ fontSize: 28 }}>Model: Qwen2.5-Coder-7B-Instruct via Ollama — tool use enabled</p>
      <p>Same task family as workflow demo, but the model chooses its own path rather than following a predefined one.</p>
      <Embed name="demo-agent" />
    </LiveDemo>
  )
}
