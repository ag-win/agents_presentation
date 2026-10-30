import { useEffect, useRef } from 'react'
import type { AgentSnapshot } from '../types'
import { ApprovalCard } from './ApprovalCard'

function seconds(ms: number | null): string {
  return ms === null ? '…' : `${(ms / 1000).toFixed(1)} s`
}

/** The play-by-play: the task, one row per box in the order it ran (with the model's words and each tool call and result), then the answer. */
export function AgentTrace({ snap }: { snap: AgentSnapshot }) {
  const scroller = useRef<HTMLDivElement>(null)
  const last = snap.trace[snap.trace.length - 1]
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [snap.trace.length, last?.body.length, snap.final])

  if (!snap.task) {
    return <div className="strace strace--empty"><p>Pick a task from the inbox. Every box the agent creates appears here, numbered in order.</p></div>
  }
  const llm = snap.nodes.filter((n) => n.kind === 'llm').length
  const tool = snap.nodes.filter((n) => n.kind === 'tool').length
  return (
    <div className="strace" ref={scroller}>
      <div className="strace__customer"><b>Task</b><p>{snap.task}</p></div>
      <div className="ag-stats" aria-label="Run statistics">
        <span><b>{llm}</b> LLM calls</span><span><b>{tool}</b> tool calls</span><span><b>{seconds(snap.stats.elapsedMs)}</b></span>
      </div>
      {snap.trace.map((r) => (
        <div key={r.id} className={`strace__row${r.live ? ' is-live' : ''}${r.kind === 'tool' ? ' is-tool' : ''}`}>
          <span className="strace__num">{r.number ?? '⚙'}</span>
          <div>
            <h4>{r.title}{r.verdict && <em className={`sverdict sverdict--${r.verdict.tone}`}>{r.verdict.text}</em>}</h4>
            {r.body && <p>{r.body}</p>}
          </div>
        </div>
      ))}
      {snap.approval && <ApprovalCard approval={snap.approval} />}
      {snap.error && <p className="strace__error">{snap.error}</p>}
      {snap.final && <div className="strace__reply is-sent"><h4>Answer</h4><p>{snap.final}</p></div>}
    </div>
  )
}
