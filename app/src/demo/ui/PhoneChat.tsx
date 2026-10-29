import { useEffect, useRef, useState, type FormEvent } from 'react'
import { demoSession } from '../demoSession'
import type { Author, ChatMessage, DemoSnapshot } from '../types'

const NAMES: Record<Author, string> = { sam: 'Sam', leo: 'Leo', me: 'You', ai: 'AI', system: '' }

/** Highlights "@AI" wherever it appears in a message. */
function WithMentions({ text }: { text: string }) {
  return (
    <>
      {text.split(/(@AI\b)/i).map((part, i) => (/^@ai$/i.test(part) ? <b key={i} className="demo-mention">{part}</b> : part))}
    </>
  )
}

function Bubble({ m }: { m: ChatMessage }) {
  if (m.author === 'system') return <div className="demo-sys">{m.text}</div>
  return (
    <div className={`demo-bubble demo-bubble--${m.author}`}>
      {m.author !== 'me' && <small>{m.author === 'ai' ? '✦ AI' : NAMES[m.author]}</small>}
      <WithMentions text={m.text} />
    </div>
  )
}

function header(snap: DemoSnapshot): { title: string; sub: string } {
  if (snap.typing) return { title: snap.mode === 'planned' ? 'Birthday plans' : 'Chat', sub: `${NAMES[snap.typing]} is typing…` }
  if (snap.mode === 'planned') return { title: 'Birthday plans', sub: 'Sam, Leo, You' }
  if (snap.mode === 'free') return { title: 'Assistant chat', sub: 'Start every message with @AI' }
  return { title: 'Group chat', sub: 'Choose a scenario below' }
}

export function PhoneChat({ snap }: { snap: DemoSnapshot }) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const stick = useRef(true) // keep following new messages unless the user scrolled up

  const locked = snap.mode === 'idle' || snap.busy || snap.scriptPlaying
  const waitingForAi = snap.busy && snap.pipeline.outputTokens === 0

  // Follow the conversation, unless the user has scrolled up to read something.
  useEffect(() => {
    const el = listRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [snap.messages, waitingForAi])

  // Hand the keyboard back to the textbox whenever it becomes usable again.
  useEffect(() => {
    if (!locked) inputRef.current?.focus({ preventScroll: true })
  }, [locked, snap.mode])

  const onScroll = () => {
    const el = listRef.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (locked || !draft.trim()) return
    stick.current = true
    demoSession.send(draft)
    setDraft('')
  }

  const { title, sub } = header(snap)
  const placeholder =
    snap.mode === 'idle' ? 'Pick a scenario below' : snap.mode === 'free' ? 'Type @AI and your question' : 'Message'

  return (
    <div className="demo-phone">
      <div className="demo-screen">
        <div className="demo-phead">
          <div className="demo-avatar">{snap.mode === 'free' ? 'AI' : 'BP'}</div>
          <div>
            <b>{title}</b>
            <small>{sub}</small>
          </div>
        </div>
        <div className="demo-msgs" ref={listRef} onScroll={onScroll}>
          {snap.messages.length === 0 && <div className="demo-empty">No messages yet</div>}
          {snap.messages.map((m) => <Bubble key={m.id} m={m} />)}
          {waitingForAi && (
            <div className="demo-bubble demo-bubble--ai demo-typing"><small>✦ AI</small><i /><i /><i /></div>
          )}
        </div>
        <form className="demo-input" onSubmit={submit}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            disabled={locked}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="send"
            aria-label="Message"
          />
          <button type="submit" disabled={locked || !draft.trim()} aria-label="Send">➤</button>
        </form>
      </div>
    </div>
  )
}
