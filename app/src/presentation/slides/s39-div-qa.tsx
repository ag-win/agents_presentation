import { Bookend } from '../Bookend'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's39', title: '08 · Q & A' }

// Same look as the title slide, with the team and logo from app/server/.env.
export default function S39() {
  return (
    <Bookend title="Q & A">
      <div className="bookend__topic">
        <p>Thank you. What would you like to ask?</p>
      </div>
    </Bookend>
  )
}
