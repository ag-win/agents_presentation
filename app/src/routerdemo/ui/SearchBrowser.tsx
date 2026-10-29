import { useState, type FormEvent } from 'react'
import { routerSession } from '../sharedSession'
import type { RouterSnapshot } from '../types'

const TRY_THESE = [
  'easy dinner with eggs and tomatoes',
  'cheap flights to Nairobi in December',
  'why do I get headaches when I use my phone a lot',
  'how do rainbows form',
]

function AnswerCard({ snap }: { snap: RouterSnapshot }) {
  const { answer, busy } = snap
  return (
    <section className="rb-answer">
      <h4><span className="rb-spark">✦</span> ANSWER{answer.label ? <> · <b>{answer.label}</b> assistant</> : busy ? ' · choosing an assistant…' : ''}</h4>
      {answer.text ? <p>{answer.text}</p> : busy ? <p className="rb-typing"><i /><i /><i /></p> : null}
      {answer.error && <p className="rb-error">Could not get an answer: {answer.error}</p>}
    </section>
  )
}

/** A browser window whose address bar is the search box. Results are the real search results for the query. */
export function SearchBrowser({ snap }: { snap: RouterSnapshot }) {
  const [draft, setDraft] = useState(snap.query)
  const s = snap.search

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (snap.busy || !draft.trim()) return
    routerSession.run(draft)
  }
  const tryQuery = (q: string) => {
    if (snap.busy) return
    setDraft(q)
    routerSession.run(q)
  }

  return (
    <div className="rb">
      <div className="rb-tabs">
        <div className="rb-dots"><i /><i /><i /></div>
        <div className="rb-tab">{s.status === 'idle' ? 'New tab' : `${snap.query} - Searchly`}</div>
      </div>
      <form className="rb-bar" onSubmit={submit}>
        <span className="rb-nav" aria-hidden>‹ › ↻</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={snap.busy}
          placeholder="Search or type a web address"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="search"
          aria-label="Address bar"
        />
      </form>

      <div className="rb-page">
        {s.status === 'idle' ? (
          <div className="rb-start">
            <div className="rb-logo">Searchly</div>
            <p>Type in the address bar and press Enter</p>
            <div className="rb-try">
              {TRY_THESE.map((q) => <button key={q} type="button" onClick={() => tryQuery(q)}>{q}</button>)}
            </div>
          </div>
        ) : (
          <div className="rb-results">
            {s.status === 'done' && <div className="rb-count">{s.results.length > 0 ? `${s.results.length} results for “${s.query}”` : `No web results for “${s.query}”`}</div>}
            <AnswerCard snap={snap} />
            {s.status === 'loading' && <div className="rb-count">Searching the web…</div>}
            {s.status === 'done' && s.error && <div className="rb-note">Web results unavailable: {s.error}</div>}
            {s.status === 'done' && s.results.map((r) => (
              <article key={r.url} className="rb-result">
                <small>{r.host}</small>
                <h5>{r.title}</h5>
                <p>{r.description}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
