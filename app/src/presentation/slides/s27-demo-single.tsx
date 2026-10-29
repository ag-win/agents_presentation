import { LiveDemo } from '../layouts'
import Embed from '../../shared/Embed'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's27', title: 'Live demo: a single call' }

export default function S27() {
  return (
    <LiveDemo title="Live demo: a single call">
      <p className="muted mono" style={{ fontSize: 28 }}>Model: llama3.2-1B or Gemma-3-4B via llama.cpp / SYCL</p>
      <p>Task: ask the model something it cannot verify (e.g. current date / recent event) → raw prediction, no tools, no loop.</p>
      <Embed name="demo-single-call" />
    </LiveDemo>
  )
}
