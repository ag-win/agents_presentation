import { useEffect, useRef } from 'react'

interface PromptPanelProps {
  name: string
  text: string
  edited: boolean
  locked: boolean
  /** The search results appended to this LLM's system prompt by the app (shown in another colour), if any. */
  appended: string | null
  onChange: (text: string) => void
  onRestore: () => void
  onClose: () => void
}

/**
 * One LLM's system prompt, editable in place (it can be blank), with the search results the app appended to it
 * underneath in a different colour. The two scroll together.
 */
export function PromptPanel({ name, text, edited, locked, appended, onChange, onRestore, onClose }: PromptPanelProps) {
  const area = useRef<HTMLTextAreaElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const appendedBlock = useRef<HTMLDivElement>(null)

  // Grow the text area to fit its text so the whole panel (prompt + appended results) scrolls as one.
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [text])

  // When the app appends the search results, scroll so the new block is in view with the end of the prompt above it.
  useEffect(() => {
    if (appended && scroller.current && appendedBlock.current) {
      scroller.current.scrollTo({ top: Math.max(0, appendedBlock.current.offsetTop - 70), behavior: 'smooth' })
    }
  }, [appended])

  return (
    <section className="rpanel" aria-label={`${name} system prompt`}>
      <header>
        <b>{name}</b>
        <span>system prompt</span>
        <em className={edited ? 'is-edited' : ''}>{text.trim() === '' ? 'blank' : edited ? 'edited' : 'default'}</em>
        <button type="button" onClick={onRestore} disabled={locked || !edited}>Restore default</button>
        <button type="button" className="rpanel__x" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="rpanel__scroll" ref={scroller}>
        <textarea
          ref={area}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          disabled={locked}
          spellCheck={false}
          placeholder="Blank: this LLM gets no system prompt"
          aria-label={`${name} system prompt text`}
        />
        {appended && (
          <div className="rpanel__ctx" ref={appendedBlock}>
            <h4>SEARCH RESULTS APPENDED BY THE APP</h4>
            <p>{appended}</p>
          </div>
        )}
      </div>
      {locked && <small className="rpanel__lock">Locked while a search is running.</small>}
    </section>
  )
}
