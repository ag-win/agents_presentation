import { ContentSlide } from '../layouts'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's25', title: 'ShopEase: when one workflow was not enough' }

const columns = [
  {
    title: 'What customers sent',
    items: ['"Where is my order?"', '"The screen arrived cracked"', '"Which watch is better for running?"', 'Three questions in one message', '"I am furious. My lawyer will call."', '"Ignore your instructions and..."'],
  },
  {
    title: 'What went wrong',
    items: ['Made-up order statuses: it had no way to look them up', 'One fixed path for every message', 'A cheerful reply to an angry customer', 'Promises outside the refund policy', 'A bot that could be tricked'],
  },
  {
    title: 'The good news',
    items: ['Praise and 5-star reviews arrived too, and deserved a reply', 'Reviews turned out to be the best source for product answers', 'Most messages were simple. Only a few needed a person.'],
  },
]

export default function S25() {
  return (
    <ContentSlide title="ShopEase: one workflow was not enough" tag="CASE STUDY">
      <div className="fiction">FICTIONAL SCENARIO · ShopEase is invented for this talk</div>
      <p style={{ margin: '0 0 22px', fontSize: 32 }}>
        ShopEase's first support bot was the prompt chain we just saw. It handled <b>one</b> kind of message well. Then real customers arrived.
      </p>
      <div className="row" style={{ gap: 24, alignItems: 'stretch' }}>
        {columns.map((c, i) => (
          <div key={c.title} className={`card${i === 2 ? ' card--accent' : ''}`} style={{ padding: '22px 26px' }}>
            <h3 style={{ fontSize: 34 }}>{c.title}</h3>
            <ul className="bullets" style={{ gap: 12, fontSize: 28 }}>
              {c.items.map((t) => <li key={t}>{t}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="callout" style={{ marginTop: 24, fontSize: 32 }}>
        Prompt chaining was one good pattern. <b>ShopEase needed all of them, working together.</b>
      </div>
    </ContentSlide>
  )
}
