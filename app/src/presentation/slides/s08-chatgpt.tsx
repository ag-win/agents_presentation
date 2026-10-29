import { ContentSlide } from '../layouts'
import { BigStat } from '../visuals'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's08', title: 'November 30, 2022 — ChatGPT' }

export default function S08() {
  return (
    <ContentSlide
      title="November 30, 2022 — ChatGPT"
      cite="ChatGPT launch facts — Wikipedia / OpenAI (Nov 30, 2022)  |  Growth figures per UBS / OpenAI (widely reported)"
    >
      <div className="row" style={{ gap: 40 }}>
        <BigStat value="1M" label="users in 5 days" />
        <BigStat value="100M" label="monthly users in 2 months" />
      </div>
      <p style={{ marginTop: 40, fontSize: 40, textAlign: 'center' }}>The moment the public met this technology directly.</p>
    </ContentSlide>
  )
}
