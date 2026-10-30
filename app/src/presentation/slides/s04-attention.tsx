import { FullBleed } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's04', title: '2017 — Attention Is All You Need' }

// The whole slide (title, word-attention diagram, bullets and citation) is one designed image.
export default function S04() {
  return <FullBleed src="attention-2017.png" alt="2017: Attention Is All You Need. Each word draws on the others, near or far. Before: one word at a time, and early words fade. The idea: drop recurrence, keep attention. The catch: no sense of word order, so add position to each word. Result: much faster training, and it beat the best RNNs." />
}
