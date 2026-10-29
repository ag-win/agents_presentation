import { LiveDemo } from '../layouts'
import Embed from '../../shared/Embed'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's28', title: 'Live demo: a workflow' }

export default function S28() {
  return (
    <LiveDemo title="Live demo: a workflow">
      <p className="muted mono" style={{ fontSize: 28 }}>Model: Qwen2.5-Coder-7B-Instruct via Ollama</p>
      <p>Task: fixed two-step chain — generate → self-review against a checklist. Predefined path; the model follows, doesn't choose.</p>
      <Embed name="demo-workflow" />
    </LiveDemo>
  )
}
