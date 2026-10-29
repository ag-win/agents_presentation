import { useState } from 'react'
import { PipelineLayout } from '../layout'
import type { ChainDot, NodeId, NodeState } from '../types'

type Kind = 'io' | 'llm' | 'logic'

const META: Readonly<Record<NodeId, { kind: Kind; label: string; title?: string }>> = {
  input: { kind: 'io', label: 'INPUT' },
  extract: { kind: 'llm', label: 'LLM CALL 1', title: 'Extract the facts' },
  gate: { kind: 'logic', label: 'GATE', title: 'Order number and problem?' },
  draft: { kind: 'llm', label: 'LLM CALL 2', title: 'Draft the reply from the shop policy' },
  polish: { kind: 'llm', label: 'LLM CALL 3', title: 'Make it a short chat message' },
  output: { kind: 'io', label: 'OUTPUT' },
}

const ORDER: readonly NodeId[] = ['input', 'extract', 'gate', 'draft', 'polish', 'output']

/** One glowing dot following its lane's path. Its start offset is fixed on mount so re-renders never restart it. */
function Dot({ dot }: { dot: ChainDot }) {
  const [elapsed] = useState(() => Math.max(0, performance.now() - dot.startedAt))
  return (
    <span
      className={`chain-dot chain-dot--${dot.kind}`}
      style={{ offsetPath: `path('${PipelineLayout.lane(dot.lane).d}')`, animationDuration: `${dot.durationMs}ms`, animationDelay: `-${elapsed}ms` }}
    />
  )
}

function Body({ id, node }: { id: NodeId; node: NodeState }) {
  const meta = META[id]
  if (meta.kind === 'io') {
    const empty = id === 'input' ? 'Waiting for a customer message…' : 'Nothing yet'
    return <p className={`chain-box__text${node.text ? '' : ' is-empty'}`}>{node.text || empty}</p>
  }
  if (meta.kind === 'logic') {
    return node.checks.length === 0 ? (
      <p className="chain-box__sub">plain code, no model</p>
    ) : (
      <p className="chain-box__checks">
        {node.checks.map((c) => (
          <span key={c.label} className={c.ok ? 'ok' : 'bad'}>{c.ok ? '✓' : '✗'} {c.label}{c.value ? `: ${c.value}` : ''}</span>
        ))}
      </p>
    )
  }
  // Show what the model produced as one tidy line of text (code fences and line breaks removed).
  return <p className="chain-box__sub">{node.text ? node.text.replace(/```(?:json)?/gi, '').replace(/\s+/g, ' ').trim() : ''}</p>
}

function Box({ id, node, runStart }: { id: NodeId; node: NodeState; runStart: number }) {
  const meta = META[id]
  const b = PipelineLayout.boxes[id]
  const stale = node.number !== null && node.number <= runStart
  return (
    <div
      className={`demo-box demo-box--${meta.kind} chain-box${node.glow ? ' is-glowing' : ''}`}
      style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
    >
      {id === 'output' && node.pulse > 0 ? <span key={`pulse-${node.pulse}`} className="demo-pulse" /> : null}
      {node.number !== null && <span key={`num-${node.number}`} className={`chain-num${stale ? ' is-stale' : ''}`}>{node.number}</span>}
      <div className="chain-box__head">
        <h3>{meta.label}</h3>
        {meta.kind === 'llm' && <small>{node.tokens > 0 ? `${node.tokens} tokens` : ''}</small>}
        {id === 'output' && <small>{node.tokens > 0 ? `${node.tokens} tokens received` : ''}</small>}
      </div>
      {meta.title && <p className="chain-box__title">{meta.title}</p>}
      <Body id={id} node={node} />
    </div>
  )
}

export function ChainPipeline({ nodes, dots, runStart }: { nodes: Readonly<Record<NodeId, NodeState>>; dots: readonly ChainDot[]; runStart: number }) {
  return (
    <section className="chain" style={{ width: PipelineLayout.width, height: PipelineLayout.height }} aria-label="What happens behind the phone">
      <svg className="chain__lanes" width={PipelineLayout.width} height={PipelineLayout.height} aria-hidden>
        {PipelineLayout.lanes.map((l) => <path key={l.id} d={l.d} className={`chain-lane${l.dashed ? ' is-dashed' : ''}`} />)}
        <text x={424} y={433}>Pass</text>
        <text x={776} y={600}>Fail</text>
      </svg>
      {ORDER.map((id) => <Box key={id} id={id} node={nodes[id]} runStart={runStart} />)}
      {dots.map((d) => <Dot key={d.id} dot={d} />)}
    </section>
  )
}
