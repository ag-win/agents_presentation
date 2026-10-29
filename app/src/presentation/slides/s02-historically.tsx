import { StatementSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's02', title: 'AI, Historically' }

export default function S02() {
  return <StatementSlide lines={['Nobody fully understands how AI works.', 'But we can trace how it got here.']} />
}
