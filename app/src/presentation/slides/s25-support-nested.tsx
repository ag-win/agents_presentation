import { FullDiagram } from '../layouts'
import { SupportNested } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's25', title: 'Customer support, nested (diagram)' }

export default function S25() {
  return <FullDiagram><SupportNested /></FullDiagram>
}
