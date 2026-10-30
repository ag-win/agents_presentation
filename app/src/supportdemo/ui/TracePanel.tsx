import { useEffect, useRef } from 'react'
import { supportSession } from '../sharedSession'
import type { SupportSnapshot } from '../types'

/** The play-by-play: the customer's message, then one row per box in the order it ran, then the reply (and Approve/Decline for escalations). */
export function TracePanel({ snap }: { snap: SupportSnapshot }) {
  const scroller = useRef<HTMLDivElement>(null)
  const last = snap.trace[snap.trace.length - 1]
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [snap.trace.length, last?.body.length, snap.reply?.status])

  if (!snap.message) {
    return <div className="strace strace--empty"><p>Pick a message from the inbox. Each box that runs appears here, numbered in order.</p></div>
  }
  const reply = snap.reply
  return (
    <div className="strace" ref={scroller}>
      <div className="strace__customer"><b>Customer</b><p>{snap.message}</p></div>
      {snap.trace.map((r) => (
        <div key={r.id} className={`strace__row${r.live ? ' is-live' : ''}${r.kind === 'tool' ? ' is-tool' : ''}`}>
          <span className="strace__num">{r.number ?? '⚙'}</span>
          <div>
            <h4>{r.title}{r.verdict && <em className={`sverdict sverdict--${r.verdict.tone}`}>{r.verdict.text}</em>}</h4>
            {r.body && <p>{r.body}</p>}
          </div>
        </div>
      ))}
      {snap.error && <p className="strace__error">{snap.error}</p>}
      {reply && (
        <div className={`strace__reply is-${reply.status}`}>
          {reply.status === 'waiting' || reply.status === 'approved' || reply.status === 'declined' ? (
            <>
              {reply.summary && <><h4>Case notes for the human agent</h4><p>{reply.summary}</p></>}
              <h4>Draft reply (not sent yet)</h4>
              <p>{reply.text}</p>
              {reply.status === 'waiting' ? (
                <div className="strace__buttons">
                  <button type="button" className="demo-btn is-on" onClick={() => supportSession.approve()}>Approve and send</button>
                  <button type="button" className="demo-btn" onClick={() => supportSession.decline()}>Decline</button>
                </div>
              ) : <small>{reply.status === 'approved' ? '✓ Approved by a human and sent' : '✗ Declined by a human: not sent'}</small>}
            </>
          ) : (
            <><h4>Reply sent to the customer</h4><p>{reply.text}</p></>
          )}
        </div>
      )}
    </div>
  )
}
