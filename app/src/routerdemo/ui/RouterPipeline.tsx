import { useState } from 'react'
import { routerPrompts } from '../promptStore'
import { RouterLayout } from '../RouterLayout'
import type { RouterPromptState } from '../RouterPromptStore'
import { BLANK_NODE, type NodeState, type RouteDot, type RouterSnapshot } from '../types'
import { PromptPanel } from './PromptPanel'

/** One glowing dot following its lane's path. Its start offset is fixed on mount so re-renders never restart it. */
function Dot({ dot, layout }: { dot: RouteDot; layout: RouterLayout }) {
  const [elapsed] = useState(() => Math.max(0, performance.now() - dot.startedAt))
  return (
    <span
      className={`rdot rdot--${dot.kind}${dot.merged ? ' rdot--merged' : ''}`}
      style={{ offsetPath: `path('${layout.lane(dot.lane).d}')`, animationDuration: `${dot.durationMs}ms`, animationDelay: `-${elapsed}ms` }}
    />
  )
}

function Chevron({ open, onClick, label }: { open: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" className={`demo-chev${open ? ' is-open' : ''}`} onClick={onClick} aria-expanded={open} aria-label={label}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
}

interface BoxFrameProps {
  id: string
  layout: RouterLayout
  node: NodeState
  kind: 'io' | 'llm'
  small?: boolean
  dim?: boolean
  open?: boolean
  children: React.ReactNode
}

function BoxFrame({ id, layout, node, kind, small, dim, open, children }: BoxFrameProps) {
  const b = layout.boxes[id]
  return (
    <div
      className={`rbox rbox--${kind}${small ? ' rbox--sm' : ''}${node.glow ? ' is-glowing' : ''}${dim ? ' is-dim' : ''}${open ? ' is-open' : ''}`}
      style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
    >
      {id === 'output' && node.pulse > 0 ? <span key={`pulse-${node.pulse}`} className="demo-pulse" /> : null}
      {node.number !== null && <span key={`num-${node.number}`} className="rnum">{node.number}</span>}
      {children}
    </div>
  )
}

interface PipelineProps {
  snap: RouterSnapshot
  prompts: RouterPromptState
  layout: RouterLayout
}

/** Input -> Router -> one of the specialists -> Output, with the system-prompt dropdown below. */
export function RouterPipeline({ snap, prompts, layout }: PipelineProps) {
  const defaults = prompts.defaults
  if (!defaults) return null
  const specialists = defaults.specialists
  const open = prompts.openId
  const openName = open ? routerPrompts.nameOf(open) : ''
  const nodeOf = (id: string): NodeState => snap.nodes[id] ?? BLANK_NODE

  return (
    <section className="rp" style={{ width: RouterLayout.width, height: layout.height }} aria-label="What happens behind the browser">
      <svg className="rp__lanes" width={RouterLayout.width} height={layout.height} aria-hidden>
        {layout.structure.map((d, i) => <path key={i} d={d} className="rp-thin" />)}
        {snap.thick.map((id) => <path key={id} d={layout.lane(id).d} className="rp-thick" />)}
        {snap.contextLaneFor && <path key={snap.contextLaneFor} d={layout.lane(`ctx-${snap.contextLaneFor}`).d} className="rp-ctx" />}
      </svg>

      <BoxFrame id="input" layout={layout} node={nodeOf('input')} kind="io">
        <div className="rbox__head"><h3>INPUT</h3></div>
        <p className={`rbox__text${snap.query ? '' : ' is-empty'}`}>{snap.query || 'Waiting for a search…'}</p>
      </BoxFrame>

      <BoxFrame id="router" layout={layout} node={nodeOf('router')} kind="llm" open={open === 'router'}>
        <div className="rbox__head">
          <h3>ROUTER · LLM</h3>
          <Chevron open={open === 'router'} onClick={() => routerPrompts.toggle('router')} label="Show the router's system prompt" />
        </div>
        <p className="rbox__title">Picks the right assistant</p>
        <p className="rbox__sub">Replies with one word: <b>{nodeOf('router').text.trim() || '…'}</b></p>
      </BoxFrame>

      {specialists.map((s) => (
        <BoxFrame
          key={s.id}
          id={s.id}
          layout={layout}
          node={nodeOf(s.id)}
          kind="llm"
          small
          dim={snap.routed !== null && snap.routed !== s.id}
          open={open === s.id}
        >
          <div className="rbox__head">
            <h3>{s.name}</h3>
            <Chevron open={open === s.id} onClick={() => routerPrompts.toggle(s.id)} label={`Show the ${s.name} assistant's system prompt`} />
          </div>
          <p className="rbox__sub">{nodeOf(s.id).tokens > 0 ? `${nodeOf(s.id).tokens} tokens` : snap.routed === s.id ? 'answering…' : 'assistant'}</p>
        </BoxFrame>
      ))}

      <BoxFrame id="output" layout={layout} node={nodeOf('output')} kind="io">
        <div className="rbox__head">
          <h3>OUTPUT</h3>
          <small>{nodeOf('output').tokens > 0 ? `${nodeOf('output').tokens} tokens received` : ''}</small>
        </div>
        <p className={`rbox__text rbox__text--answer${nodeOf('output').text ? '' : ' is-empty'}`}>{nodeOf('output').text.trim() || 'Nothing yet'}</p>
      </BoxFrame>

      {snap.dots.map((d) => <Dot key={d.id} dot={d} layout={layout} />)}

      {open && (
        <div className="rpanel-wrap" style={{ left: layout.panel.x, top: layout.panel.y, width: layout.panel.w, height: layout.panel.h }}>
          <PromptPanel
            name={openName}
            text={prompts.texts[open] ?? ''}
            edited={routerPrompts.isEdited(open)}
            locked={prompts.locked}
            appended={snap.appendedFor === open && snap.search.status === 'done' ? snap.search.context : null}
            onChange={(t) => routerPrompts.setText(open, t)}
            onRestore={() => routerPrompts.restore(open)}
            onClose={() => routerPrompts.toggle(open)}
          />
        </div>
      )}
    </section>
  )
}
