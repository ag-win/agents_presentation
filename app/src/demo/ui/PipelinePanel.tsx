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

/** io = coral pill (Input/Output), llm = green rectangle: the same shapes and colours as the augmented-LLM diagram. */
function Box({ kind, label, glow, pulse, children }: { kind: 'io' | 'llm'; label: string; glow?: boolean; pulse?: number; children: ReactNode }) {
  return (
    <div className={`demo-box demo-box--${kind}${glow ? ' is-glowing' : ''}`}>
      {pulse ? <span key={pulse} className="demo-pulse" /> : null}
      <h3>{label}</h3>
      {children}
    </div>
  )
}

function backendLine(b: BackendStatus): { text: string; warn: boolean } {
  if (b.state === 'ready') return { text: b.live ? `${b.model} · ${b.provider}` : 'offline mock model (no API key)', warn: !b.live }
  if (b.state === 'offline') return { text: 'backend not reachable — start it with ./start.sh', warn: true }
  return { text: 'checking backend…', warn: false }
}

export function PipelinePanel({ snap }: { snap: DemoSnapshot }) {
  const p = snap.pipeline
  const backend = backendLine(snap.backend)
  return (
    <section className="demo-pipe" aria-label="What happens behind the phone">
      <Box kind="io" label="INPUT" glow={p.inputGlow}>
        <p className={`demo-box__text${p.inputText ? '' : ' is-empty'}`}>{p.inputText || 'Waiting for a prompt…'}</p>
      </Box>
      <DottedLane lane="in" dots={snap.dots} />
      <Box kind="llm" label="LLM" glow={p.llmGlow}>
        <p className="demo-box__text">Large language model</p>
        <p className={`demo-box__meta${backend.warn ? ' is-warn' : ''}`}>{backend.text}</p>
        <p className="demo-box__meta">tokens sent: {p.llmTokens}</p>
      </Box>
      <DottedLane lane="out" dots={snap.dots} />
      <Box kind="io" label="OUTPUT" pulse={p.outputPulse}>
        <p className={`demo-box__text demo-box__text--scroll${p.outputText ? '' : ' is-empty'}`}>{p.outputText || 'Nothing yet'}</p>
        <p className="demo-box__meta">tokens received: {p.outputTokens}</p>
      </Box>
    </section>
  )
}
