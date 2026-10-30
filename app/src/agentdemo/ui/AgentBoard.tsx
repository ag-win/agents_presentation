import { useState } from 'react'
import { BLANK_NODE, type NodeState } from '../../supportdemo/types'
import type { Laid } from '../AgentLayout'
import { agentConfig } from '../sharedSession'
import { ApprovalCard } from './ApprovalCard'
import type { AgentDot, AgentSnapshot, GraphNode, ToolInfo } from '../types'

/** One glowing dot following its line's path. Its start offset is fixed on mount so re-renders never restart it. */
function Dot({ dot, laid }: { dot: AgentDot; laid: Laid }) {
  const [elapsed] = useState(() => Math.max(0, performance.now() - dot.startedAt))
  const edge = laid.edges.find((e) => e.id === dot.edge)
  if (!edge) return null
  return (
    <span
      className={`sdot${dot.tools ? ' sdot--tools' : ''}${dot.merged ? ' sdot--merged' : ''}`}
      style={{ offsetPath: `path('${edge.d}')`, animationDuration: `${dot.durationMs}ms`, animationDelay: `-${elapsed}ms` }}
    />
  )
}

function brief(value: unknown, max: number): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

/** The second line of a tool box: its first argument, so the audience sees what was asked. */
function argLine(node: Extract<GraphNode, { kind: 'tool' }>): string {
  const first = Object.values(node.arguments)[0]
  return first === undefined ? 'no arguments' : brief(first, 26)
}

interface BoardProps {
  snap: AgentSnapshot
  laid: Laid
  tools: readonly ToolInfo[]
  disabled: readonly string[]
  locked: boolean
  selected: string | null
}

/**
 * The agent on one board. The toolbox is on the left; the task and the toolbox's signatures join and run into the first
 * LLM call; after that every box is created by the model's own choices (tool calls, parallel calls, sub-agents) until
 * the answer goes to the reply. Boxes glow and take the next number as they run; the path taken turns thick amber.
 */
export function AgentBoard({ snap, laid, tools, disabled, locked, selected }: BoardProps) {
  const stateOf = (id: string): NodeState => snap.states[id] ?? BLANK_NODE
  const labelOf = (name: string) => tools.find((t) => t.name === name)?.label ?? name
  const pick = (id: string) => agentConfig.toggleSelect(id)

  const nodeBox = (id: string, className: string, children: React.ReactNode, ariaLabel: string) => {
    const r = laid.rects[id]
    const st = stateOf(id)
    if (!r) return null
    return (
      <button key={id} type="button" className={`sb-node ag-node ${className}${st.glow ? ' is-glowing' : ''}${selected === id ? ' is-open' : ''}`} style={{ left: r.x, top: r.y, width: r.w, height: r.h }} onClick={() => pick(id)} aria-label={ariaLabel}>
        {children}
        {st.number !== null && <span key={`num-${st.number}`} className="snum">{st.number}</span>}
        {st.verdict && <span className={`sverdict sverdict--${st.verdict.tone}`}>{st.verdict.text}</span>}
      </button>
    )
  }

  return (
    <div className="sb ag-board" style={{ width: laid.width, height: laid.height }}>
      {laid.groups.map((g) => (
        <div key={g.category} className="sb-card ag-group" style={{ left: g.x, top: g.y, width: g.w, height: g.h }}><span>{g.title}</span></div>
      ))}
      {laid.cards.map((c) => (
        <div key={c.agent} className="sb-card ag-subcard is-chosen" style={{ left: c.x, top: c.y, width: c.w, height: c.h }}><span>{c.title}</span></div>
      ))}

      <svg className="sb__lanes" width={laid.width} height={laid.height} aria-hidden>
        {laid.edges.filter((e) => e.visible).map((e) => <path key={e.id} d={e.d} className={`sb-thin${e.id.startsWith('pal:') ? ' ag-thin-tool' : ''}`} />)}
        {snap.thick.map((id) => { const e = laid.edges.find((x) => x.id === id); return e ? <path key={id} d={e.d} className={`sb-thick${id.startsWith('pal:') ? ' ag-thick-tool' : ''}`} /> : null })}
      </svg>

      {laid.palette.map((p) => {
        const off = disabled.includes(p.name)
        const used = snap.used[p.name] ?? 0
        return (
          <button
            key={p.name}
            type="button"
            className={`ag-pal ag-pal--${p.category}${off ? ' is-off' : ''}${snap.glowing[p.name] ? ' is-glowing' : ''}${selected === `pal:${p.name}` ? ' is-open' : ''}`}
            style={{ left: p.x, top: p.y, width: p.w, height: p.h }}
            onClick={() => pick(`pal:${p.name}`)}
            aria-label={`${p.label}: show details`}
          >
            <span className="ag-pal__label">{p.label}</span>
            <span
              role="switch"
              aria-checked={!off}
              aria-label={`${p.label} available to the agent`}
              className={`ag-pal__switch${locked ? ' is-locked' : ''}`}
              onClick={(e) => { e.stopPropagation(); agentConfig.toggleTool(p.name) }}
            >{off ? '' : '✓'}</span>
            {used > 0 && <span key={`used-${used}`} className="ag-pal__used">×{used}</span>}
          </button>
        )
      })}

      {nodeBox('input', 'sb-node--io', <span className="sb-node__label">Task</span>, 'The task: show details')}

      {laid.ghost && laid.rects['a0.s1'] && (
        <span className="ag-ghost" style={{ left: laid.rects['a0.s1'].x, top: laid.rects['a0.s1'].y, width: laid.rects['a0.s1'].w, height: laid.rects['a0.s1'].h }}>LLM call 1</span>
      )}
      {laid.ghost && laid.rects.output && (
        <span className="ag-ghost ag-ghost--out" style={{ left: laid.rects.output.x, top: laid.rects.output.y, width: laid.rects.output.w, height: laid.rects.output.h }}>Reply</span>
      )}

      {snap.nodes.map((n) => {
        if (n.kind === 'llm') {
          return nodeBox(n.id, 'sb-node--llm ag-appear ag-chip-below', (
            <>
              <span className="sb-node__label">LLM call {n.step}</span>
              <small>{n.context} messages in</small>
            </>
          ), `LLM call ${n.step}: show details`)
        }
        if (n.kind === 'tool') {
          const spawn = n.name === 'spawn_agent'
          return nodeBox(n.id, `${spawn ? 'ag-node--spawn' : 'sb-node--tool'} ag-appear`, (
            <>
              <span className="sb-node__label">{labelOf(n.name)}</span>
              <small>{argLine(n)}</small>
            </>
          ), `${labelOf(n.name)}: show details`)
        }
        const r = laid.rects.output
        const st = stateOf('output')
        if (!r) return null
        return (
          <button key="output" type="button" className={`sb-node sb-node--io ag-appear${st.glow ? ' is-glowing' : ''}${selected === 'output' ? ' is-open' : ''}`} style={{ left: r.x, top: r.y, width: r.w, height: r.h }} onClick={() => pick('output')} aria-label="Reply: show details">
            <span className="sb-node__head">REPLY</span>
            <span className={`sb-node__reply${st.text ? '' : ' is-empty'}`}>{st.text.trim() || 'Nothing yet'}</span>
            {st.pulse > 0 && <span key={`pulse-${st.pulse}`} className="demo-pulse" />}
            {st.number !== null && <span key={`num-${st.number}`} className="snum">{st.number}</span>}
          </button>
        )
      })}

      {snap.approval && laid.rects[snap.approval.id] && (
        // sits just under the tool box that is waiting, so it moves and zooms with the board
        <div className="ag-approval-anchor" style={{ left: laid.rects[snap.approval.id].x, top: laid.rects[snap.approval.id].y + laid.rects[snap.approval.id].h + 16 }}>
          <ApprovalCard approval={snap.approval} />
        </div>
      )}

      {snap.dots.map((d) => <Dot key={d.id} dot={d} laid={laid} />)}
    </div>
  )
}
