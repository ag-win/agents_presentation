import { TitleSlide } from '../layouts'
import { usePresenterName } from '../../shared/usePresenterName'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's01', title: 'Title' }

// The byline comes from PRESENTER_NAME in app/server/.env (served by /api/config); without it no byline is shown.
export default function S01() {
  const name = usePresenterName()
  return <TitleSlide title="AI: From Attention to Agents" subtitle={name ? `By: ${name}` : undefined} />
}
