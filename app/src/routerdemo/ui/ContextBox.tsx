import { useState } from 'react'
import type { RouterLayout } from '../RouterLayout'
import type { RouterSnapshot } from '../types'

/**
 * The faint box between the browser and the pipeline that holds the web search results. Its line to the
 * pipeline only appears once the router has chosen, and it joins the chosen specialist's lane. Click it to look inside.
 */
export function ContextBox({ snap, layout }: { snap: RouterSnapshot; layout: RouterLayout }) {
  const [open, setOpen] = useState(false)
  const s = snap.search
  const feeding = snap.contextLaneFor !== null

  const status =
    s.status === 'idle' ? 'none yet' :
    s.status === 'loading' ? 'searching…' :
    s.error ? 'unavailable' :
    `${s.results.length} results · ${s.context.length} characters`

  return (
    <div className={`cbox${open ? ' is-open' : ''}${feeding ? ' is-feeding' : ''}`} style={{ top: layout.attachY - 56 }}>
      <button type="button" className="cbox__top" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="cbox__label">SEARCH RESULTS</span>
        <span className="cbox__name">{status}</span>
        <span className="cbox__hint">{open ? 'click to close' : 'click to look inside'}</span>
      </button>
      {open && (
        <div className="cbox__list">
          {s.status !== 'done' || s.results.length === 0 ? (
            <p className="cbox__empty">{s.status === 'done' && s.error ? s.error : 'Run a search to see what the app finds.'}</p>
          ) : (
            s.results.map((r, i) => (
              <div key={r.url} className="cbox__item">
                <b>[{i + 1}] {r.title}</b>
                <small>{r.host}</small>
                <p>{r.description}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
