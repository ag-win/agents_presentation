import { useState } from 'react'
import { agentSession } from '../sharedSession'
import type { AgentDefaults } from '../types'

/** Ready-made tasks: ShopEase customer messages (the same ones the workflow desk handles) and general tasks, or write your own. */
export function AgentInbox({ defaults, disabled }: { defaults: AgentDefaults; disabled: boolean }) {
  const [draft, setDraft] = useState('')
  const [tab, setTab] = useState<'shop' | 'tasks'>('shop')
  const send = (text: string) => {
    if (disabled || !text.trim()) return
    agentSession.send(text)
    setDraft('')
  }
  const items = tab === 'shop' ? defaults.shopMessages : defaults.tasks
  return (
    <div className="sinbox">
      <form className="sinbox__write" onSubmit={(e) => { e.preventDefault(); send(draft) }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Give the agent a task…" disabled={disabled} aria-label="Task" maxLength={600} />
        <button type="submit" disabled={disabled || !draft.trim()}>Go</button>
      </form>
      <div className="ag-subtabs" role="tablist">
        <button role="tab" aria-selected={tab === 'shop'} className={tab === 'shop' ? 'is-on' : ''} onClick={() => setTab('shop')}>ShopEase messages</button>
        <button role="tab" aria-selected={tab === 'tasks'} className={tab === 'tasks' ? 'is-on' : ''} onClick={() => setTab('tasks')}>Other tasks</button>
      </div>
      <div className="sinbox__grid" data-scrollable>
        {items.map((s) => (
          <button key={s.id} type="button" className="sinbox__card" disabled={disabled} onClick={() => send(s.message)} title={s.message}>{s.title}</button>
        ))}
      </div>
    </div>
  )
}
