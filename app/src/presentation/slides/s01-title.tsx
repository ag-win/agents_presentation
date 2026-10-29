import { TitleSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's01', title: 'Title' }

// TODO: replace the placeholder byline with the presenter's name.
export default function S01() {
  return <TitleSlide title="AI: From Attention to Agents" subtitle="By: [name]" />
}
