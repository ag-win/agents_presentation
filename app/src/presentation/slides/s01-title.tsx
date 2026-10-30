import { Bookend } from '../Bookend'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's01', title: 'Title' }

// The team, presenter and logo come from app/server/.env (TEAM_NAME, TEAM_MEMBERS, PRESENTER_NAME, LOGO_PATH).
export default function S01() {
  return (
    <Bookend title="Agentic AI">
      <div className="bookend__topic">
        <b>Topic:</b>
        <p>Discover how autonomous AI agents reason, plan, use tools and execute tasks.</p>
      </div>
    </Bookend>
  )
}
