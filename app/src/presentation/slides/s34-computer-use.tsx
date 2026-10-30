import { DiagramSlide } from '../layouts'
import { ObserveReasonAct } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's34', title: 'Same loop, different hands: Computer Use', optional: true, backup: true }

export default function S34() {
  return (
    <DiagramSlide
      title="Same loop, different hands: Computer Use"
      tag="OPTIONAL — CUT FIRST"
      diagram={<ObserveReasonAct />}
      cite="Anthropic Computer Use API announcement"
    >
      <p style={{ margin: '0 0 8px' }}>Instead of files and terminal commands, the tool is a screenshot and a cursor.</p>
      <p className="muted" style={{ margin: 0, fontSize: 30 }}>Architecturally identical to the ReAct loop.</p>
    </DiagramSlide>
  )
}
