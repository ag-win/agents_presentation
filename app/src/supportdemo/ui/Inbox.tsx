import { useState } from 'react'
import { supportSession } from '../sharedSession'
import type { Scenario } from '../types'

/** The support inbox: pick a ready-made customer message (or write one) and it runs through the desk. */
export function Inbox({ scenarios, disabled }: { scenarios: readonly Scenario[]; disabled: boolean }) {
  const [draft, setDraft] = useState('')
  const send = (text: string) => {
    if (disabled || !text.trim()) return
    supportSession.send(text)
    setDraft('')
  }
  return (
    <div className="sinbox">
      <form className="sinbox__write" onSubmit={(e) => { e.preventDefault(); send(draft) }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a customer message…" disabled={disabled} aria-label="Customer message" maxLength={600} />
        <button type="submit" disabled={disabled || !draft.trim()}>Send</button>
      </form>
      <div className="sinbox__grid">
        {scenarios.map((s) => (
          <button key={s.id} type="button" className="sinbox__card" disabled={disabled} onClick={() => send(s.message)} title={s.message}>
            {s.title}
          </button>
        ))}
      </div>
    </div>
  )
}
