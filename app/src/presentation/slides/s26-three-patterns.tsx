import { FullDiagram } from '../layouts'
import { ThreePatterns } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's26', title: 'Router agent + evaluator loop (diagram)' }

export default function S26() {
  return <FullDiagram><ThreePatterns /></FullDiagram>
}
