import { useState, type ReactNode } from 'react'
import type { BackendStatus, DemoSnapshot, FlightDot, Lane } from '../types'

/** One glowing dot. Its start offset is fixed on mount, so re-renders never restart the animation. */
function Dot({ dot }: { dot: FlightDot }) {
  const [elapsed] = useState(() => Math.max(0, performance.now() - dot.startedAt))
  return (
    <span
      className={`demo-dot demo-dot--${dot.kind}`}
      style={{ left: `calc(50% + ${dot.offsetPx}px)`, animationDuration: `${dot.durationMs}ms`, animationDelay: `-${elapsed}ms` }}
    />
  )
}

function DottedLane({ lane, dots }: { lane: Lane; dots: readonly FlightDot[] }) {
  return (
    <div className="demo-lane" aria-hidden>
      {dots.filter((d) => d.lane === lane).map((d) => <Dot key={d.id} dot={d} />)}
    </div>
  )
}

/** The system prompt joining the prompt on its way into the LLM, drawn along the short connector. */
function ConnectorDot({ dot }: { dot: FlightDot }) {
  const [elapsed] = useState(() => Math.max(0, performance.now() - dot.startedAt))
  return <span className="demo-dot demo-dot--system demo-dot--x" style={{ animationDuration: `${dot.durationMs}ms`, animationDelay: `-${elapsed}ms` }} />
}

interface BoxProps {
  kind: 'io' | 'llm'
  label: string
  glow?: boolean
  pulse?: number
  /** Extra controls on the label row (e.g. a dropdown arrow). */
  head?: ReactNode
  /** Something drawn to the left of the box and joined to it by a dotted connector. */
  aside?: { content: ReactNode; dots: readonly FlightDot[] }
  children: ReactNode
}

/** io = coral pill (Input/Output), llm = green rectangle: the same shapes and colours as the augmented-LLM diagram. */
function Box({ kind, label, glow, pulse, head, aside, children }: BoxProps) {
  return (
    <div className={`demo-box demo-box--${kind}${glow ? ' is-glowing' : ''}`}>
      {pulse ? <span key={pulse} className="demo-pulse" /> : null}
      {aside && (
        <>
          <div className="demo-conn" aria-hidden>{aside.dots.filter((d) => d.lane === 'sys').map((d) => <ConnectorDot key={d.id} dot={d} />)}</div>
          <div className="demo-aside">{aside.content}</div>
        </>
      )}
      {head ? <div className="demo-box__head"><h3>{label}</h3>{head}</div> : <h3>{label}</h3>}
      {children}
    </div>
  )
}

/** Optional additions for the LLM box: a dropdown that reveals the system prompt, and a box beside it. */
export interface LlmExtras {
  systemText: string
  expanded: boolean
  onToggle: () => void
  aside: ReactNode
}

function Chevron({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`demo-chev${expanded ? ' is-open' : ''}`} onClick={onToggle} aria-expanded={expanded} aria-label="Show the system prompt">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
}

export function backendLine(b: BackendStatus): { text: string; warn: boolean } {
  if (b.state === 'ready') return { text: b.live ? `${b.model} · ${b.provider}` : 'offline mock model (no API key)', warn: !b.live }
  if (b.state === 'offline') return { text: 'backend not reachable — start it with ./start.sh', warn: true }
  return { text: 'checking backend…', warn: false }
}

export function PipelinePanel({ snap, llm, className = '' }: { snap: DemoSnapshot; llm?: LlmExtras; className?: string }) {
  const p = snap.pipeline
  const backend = backendLine(snap.backend)
  return (
    <section className={`demo-pipe ${className}`} aria-label="What happens behind the phone">
      <Box kind="io" label="INPUT" glow={p.inputGlow}>
        <p className={`demo-box__text${p.inputText ? '' : ' is-empty'}`}>{p.inputText || 'Waiting for a prompt…'}</p>
      </Box>
      <DottedLane lane="in" dots={snap.dots} />
      <Box
        kind="llm"
        label="LLM"
        glow={p.llmGlow}
        head={llm && <Chevron expanded={llm.expanded} onToggle={llm.onToggle} />}
        aside={llm && { content: llm.aside, dots: snap.dots }}
      >
        <p className="demo-box__text">Large language model</p>
        <p className={`demo-box__meta${backend.warn ? ' is-warn' : ''}`}>{backend.text}</p>
        <p className="demo-box__meta">tokens sent: {p.llmTokens}</p>
        {llm && (
          <div className={`demo-sysblock${llm.expanded ? ' is-open' : ''}`}>
            <div>
              <h4>SYSTEM PROMPT</h4>
              <p className={llm.systemText.trim() ? '' : 'is-empty'}>{llm.systemText.trim() || '(none: the model gets only the user prompt)'}</p>
            </div>
          </div>
        )}
      </Box>
      <DottedLane lane="out" dots={snap.dots} />
      <Box kind="io" label="OUTPUT" pulse={p.outputPulse}>
        <p className={`demo-box__text demo-box__text--scroll${p.outputText ? '' : ' is-empty'}`}>{p.outputText || 'Nothing yet'}</p>
        <p className="demo-box__meta">tokens received: {p.outputTokens}</p>
      </Box>
    </section>
  )
}
