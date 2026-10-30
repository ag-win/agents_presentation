import { useState } from 'react'
import { SupportLayout, type NodeSpec } from '../SupportLayout'
import { supportPrompts } from '../sharedSession'
import { BLANK_NODE, type NodeState, type SupportDot, type SupportSnapshot } from '../types'

/** One glowing dot following its line's path. Its start offset is fixed on mount so re-renders never restart it. */
function Dot({ dot, layout }: { dot: SupportDot; layout: SupportLayout }) {
  const [elapsed] = useState(() => Math.max(0, performance.now() - dot.startedAt))
  const edge = layout.edge(dot.edge)
  if (!edge) return null
  return <span className="sdot" style={{ offsetPath: `path('${edge.d}')`, animationDuration: `${dot.durationMs}ms`, animationDelay: `-${elapsed}ms` }} />
}

function label(spec: NodeSpec, node: NodeState): string {
  if (!spec.id.startsWith('worker') || !node.caption) return spec.label
  return node.caption
}

interface BoardProps {
  snap: SupportSnapshot
  layout: SupportLayout
  selected: string | null
}

/**
 * The whole support desk on one board: Message -> Guard -> Router, seven branch cards, the quality check and the reply.
 * Boxes glow and take the next number as they run; the lines the message has travelled turn thick amber.
 */
export function Board({ snap, layout, selected }: BoardProps) {
  const nodeOf = (id: string): NodeState => snap.nodes[id] ?? BLANK_NODE
  const dimBranch = (branch: string | null) => snap.routed !== null && branch !== null && branch !== snap.routed

  return (
    <div className="sb" style={{ width: SupportLayout.width, height: SupportLayout.height }}>
      {layout.cards.map((c) => (
        <div key={c.branch} className={`sb-card${dimBranch(c.branch) ? ' is-dim' : ''}${snap.routed === c.branch ? ' is-chosen' : ''}`} style={{ left: c.x, top: c.y, width: c.w, height: c.h }}>
          <span>{c.title}</span>
        </div>
      ))}

      <svg className="sb__lanes" width={SupportLayout.width} height={SupportLayout.height} aria-hidden>
        {layout.edges.filter((e) => e.visible).map((e) => <path key={e.id} d={e.d} className={`sb-thin${dimBranch(layout.node(e.from).branch) && dimBranch(layout.node(e.to).branch ?? layout.node(e.from).branch) ? ' is-dim' : ''}`} />)}
        {snap.thick.map((id) => { const e = layout.edge(id); return e ? <path key={id} d={e.d} className="sb-thick" /> : null })}
      </svg>

      {layout.nodes.map((spec) => {
        const node = nodeOf(spec.id)
        const open = selected === spec.id
        const cls = ['sb-node', `sb-node--${spec.kind}`, node.glow ? 'is-glowing' : '', dimBranch(spec.branch) || node.caption === 'unused' ? 'is-dim' : '', open ? 'is-open' : ''].filter(Boolean).join(' ')
        return (
          <button key={spec.id} type="button" className={cls} style={{ left: spec.x, top: spec.y, width: spec.w, height: spec.h, ...(spec.w < 130 ? { padding: '0 3px' } : {}) }} onClick={() => supportPrompts.toggle(spec.id)} aria-pressed={open} aria-label={`${spec.label}: show details`}>
            {spec.id === 'output' ? (
              <>
                <span className="sb-node__head">REPLY TO THE CUSTOMER</span>
                <span className={`sb-node__reply${node.text ? '' : ' is-empty'}`}>{node.text.trim() || 'Nothing sent yet'}</span>
                {node.pulse > 0 && <span key={`pulse-${node.pulse}`} className="demo-pulse" />}
              </>
            ) : (
              <span className="sb-node__label">{label(spec, node)}{spec.kind === 'llm' && spec.w >= 130 && <i aria-hidden>▾</i>}</span>
            )}
            {node.number !== null && <span key={`num-${node.number}`} className="snum">{node.number}</span>}
            {node.verdict && <span className={`sverdict sverdict--${node.verdict.tone}`}>{node.verdict.text}</span>}
            {node.usedTool && <span className="stool" title="used the order tool">⚙</span>}
          </button>
        )
      })}

      {snap.dots.map((d) => <Dot key={d.id} dot={d} layout={layout} />)}
    </div>
  )
}
