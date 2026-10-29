import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PRODUCTS, type Product } from '../catalog'
import { shopSession } from '../shopSession'
import type { ShopSnapshot } from '../types'

const IMAGE_BASE = `${import.meta.env.BASE_URL}images/shop/`

function RobotIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <line x1="24" y1="5" x2="24" y2="11" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="4.5" r="3" fill="#fff" />
      <rect x="7" y="11" width="34" height="27" rx="9" fill="#fff" />
      <circle cx="17" cy="24" r="4.2" fill="#2563eb" />
      <circle cx="31" cy="24" r="4.2" fill="#2563eb" />
      <rect x="17" y="31" width="14" height="3" rx="1.5" fill="#2563eb" />
      <rect x="2" y="20" width="4" height="10" rx="2" fill="#fff" />
      <rect x="42" y="20" width="4" height="10" rx="2" fill="#fff" />
    </svg>
  )
}

function ProductCard({ p }: { p: Product }) {
  return (
    <article className="shop-card">
      <img src={`${IMAGE_BASE}${p.image}`} alt={p.name} loading="lazy" draggable={false} />
      <h4>{p.name}</h4>
      <div className="shop-rating"><span>★</span> {p.rating.toFixed(1)} <small>({p.reviews.toLocaleString()})</small></div>
      <div className="shop-price">${p.price}</div>
      <button type="button" className="shop-add" tabIndex={-1}>Add to cart</button>
    </article>
  )
}

/** The fake shop's products page. Scrolls with the mouse wheel or touch. */
function ProductsPage() {
  return (
    <div className="shop-page">
      <div className="shop-topbar">
        <b>ShopEase</b>
        <span className="shop-cart" aria-hidden>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6" />
          </svg>
          <i>2</i>
        </span>
      </div>
      <div className="shop-search">Search for phones, shoes, watches…</div>
      <div className="shop-chips"><span className="on">All</span><span>Phones</span><span>Audio</span><span>Shoes</span><span>Watches</span><span>Laptops</span></div>
      <div className="shop-strip">Free delivery on orders over $50</div>
      <h3 className="shop-heading">Popular right now</h3>
      <div className="shop-grid">{PRODUCTS.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      <div className="shop-spacer" />
    </div>
  )
}

function AssistantSheet({ snap }: { snap: ShopSnapshot }) {
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const stick = useRef(true)
  const open = snap.assistantOpen
  const last = snap.messages[snap.messages.length - 1]
  const typing = snap.busy && last?.author === 'me' // the customer spoke and nothing has come back yet

  useEffect(() => {
    const el = listRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [snap.messages, typing, open])

  useEffect(() => {
    if (open && !snap.busy) inputRef.current?.focus({ preventScroll: true })
  }, [open, snap.busy])

  const onScroll = () => {
    const el = listRef.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (snap.busy || !draft.trim()) return
    stick.current = true
    shopSession.send(draft)
    setDraft('')
  }

  return (
    <>
      <div className={`shop-scrim${open ? ' is-open' : ''}`} onClick={() => shopSession.setAssistantOpen(false)} />
      <section className={`shop-sheet${open ? ' is-open' : ''}`} aria-hidden={!open} aria-label="ShopEase assistant">
        <header>
          <span className="shop-avatar"><RobotIcon size={30} /></span>
          <div><b>ShopEase Assistant</b><small>Online</small></div>
          <button type="button" onClick={() => shopSession.setAssistantOpen(false)} aria-label="Close the assistant">×</button>
        </header>
        <div className="shop-msgs" ref={listRef} onScroll={onScroll}>
          <div className="shop-bubble shop-bubble--bot">Hi! I'm the ShopEase assistant. How can I help you today?</div>
          {snap.messages.map((m) =>
            m.author === 'system' ? (
              <div key={m.id} className="shop-sys">{m.text}</div>
            ) : (
              <div key={m.id} className={`shop-bubble shop-bubble--${m.author}`}>{m.text}</div>
            ),
          )}
          {typing && <div className="shop-bubble shop-bubble--bot shop-typing"><i /><i /><i /></div>}
        </div>
        <form className="shop-input" onSubmit={submit}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message"
            disabled={snap.busy}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
            aria-label="Message the assistant"
          />
          <button type="submit" disabled={snap.busy || !draft.trim()} aria-label="Send">➤</button>
        </form>
      </section>
    </>
  )
}

/** A phone showing the shop's products page, with the assistant button floating in the bottom-right corner. */
export function ShopPhone({ snap }: { snap: ShopSnapshot }) {
  return (
    <div className="demo-phone">
      <div className="demo-screen shop-screen">
        <ProductsPage />
        {!snap.assistantOpen && (
          <>
            {snap.messages.length === 0 && <div className="shop-hint-bubble">Need help?</div>}
            <button type="button" className="shop-fab" onClick={() => shopSession.setAssistantOpen(true)} aria-label="Open the shop assistant">
              <RobotIcon />
            </button>
          </>
        )}
        <AssistantSheet snap={snap} />
      </div>
    </div>
  )
}
