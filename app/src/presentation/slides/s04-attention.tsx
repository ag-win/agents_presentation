import { ContentSlide } from '../layouts'
import { AttentionDiagram } from '../visuals'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's04', title: '2017 — Attention Is All You Need' }

export default function S04() {
  return (
    <ContentSlide title="2017 — Attention Is All You Need" cite="Vaswani et al., 2017 — arXiv:1706.03762">
      <div className="row" style={{ alignItems: 'center', gap: 56 }}>
        <div style={{ flex: 1.05 }}><AttentionDiagram /></div>
        <ul className="bullets" style={{ flex: 1 }}>
          <li><b>Before:</b> RNNs processed text one token at a time — slow, hard to parallelize.</li>
          <li><b>The idea:</b> every token attends to every other token directly, in parallel.</li>
          <li><b>Result:</b> dramatically faster training at scale.</li>
          <li>This architecture underlies every model in this talk.</li>
        </ul>
      </div>
    </ContentSlide>
  )
}
