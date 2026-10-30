import { useEffect, useRef } from 'react'
import type { SupportPromptState } from '../SupportPromptStore'
import type { SupportLayout } from '../SupportLayout'
import { supportPrompts } from '../sharedSession'
import { BLANK_NODE, type SupportDefaults, type SupportSnapshot } from '../types'

function PromptEditor({ promptId, prompts }: { promptId: string; prompts: SupportPromptState }) {
  const area = useRef<HTMLTextAreaElement>(null)
  const text = prompts.texts[promptId] ?? ''
  const edited = supportPrompts.isEdited(promptId)
  // Grow the text area to fit its text so the whole panel scrolls as one.
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [text])
  return (
    <div className="sinsp__prompt">
      <header>
        <b>System prompt</b>
        <em className={edited ? 'is-edited' : ''}>{text.trim() === '' ? 'blank' : edited ? 'edited' : 'default'}</em>
        <button type="button" onClick={() => supportPrompts.restore(promptId)} disabled={prompts.locked || !edited}>Restore default</button>
      </header>
      <textarea ref={area} value={text} disabled={prompts.locked} spellCheck={false} onChange={(e) => supportPrompts.setText(promptId, e.target.value)} placeholder="Blank: this LLM gets no system prompt" aria-label="System prompt text" />
      {prompts.locked && <small>Locked while a message is running.</small>}
    </div>
  )
}

interface InspectorProps {
  snap: SupportSnapshot
  layout: SupportLayout
  prompts: SupportPromptState
  defaults: SupportDefaults
}

/** Details of the box that was clicked: what it does, its (editable) system prompt, the tool signature, or what it produced. */
export function Inspector({ snap, layout, prompts, defaults }: InspectorProps) {
  const id = prompts.selected
  if (!id) return <div className="sinsp sinsp--empty"><p>Click any box on the board to see what it does, and to edit its system prompt.</p></div>
  const spec = layout.node(id)
  const node = snap.nodes[id] ?? BLANK_NODE
  const tool = defaults.tools[0]
  const kindName = { io: 'input / output', llm: 'LLM call', code: 'plain code, no model', tool: 'tool', human: 'human in the loop' }[spec.kind]
  return (
    <div className="sinsp">
      <header className="sinsp__head">
        <h3>{spec.label}</h3><span>{kindName}</span>
        <button type="button" className="sinsp__x" onClick={() => supportPrompts.toggle(id)} aria-label="Close">×</button>
      </header>
      <p className="sinsp__blurb">{spec.blurb}</p>
      {spec.promptId && <PromptEditor promptId={spec.promptId} prompts={prompts} />}
      {spec.kind === 'tool' && tool && (
        <div className="sinsp__tool">
          <h4>What the model is shown (the tool signature)</h4>
          <pre>{JSON.stringify({ name: tool.name, description: tool.description, parameters: tool.parameters }, null, 2)}</pre>
          {snap.toolLog && (
            <>
              <h4>Last call</h4>
              <pre>{`${snap.toolLog.name}(${JSON.stringify(snap.toolLog.arguments)})`}</pre>
              <h4>Result returned to the model</h4>
              <pre>{snap.toolLog.result ?? 'running…'}</pre>
            </>
          )}
        </div>
      )}
      {spec.kind === 'tool' && (
        <div className="sinsp__out">
          <h4>Orders in the shop database</h4>
          <ul className="sinsp__orders">
            {defaults.orders.map((o) => <li key={o.id}><b>{o.id}</b> {o.product} · {o.status.replace('_', ' ')}</li>)}
          </ul>
        </div>
      )}
      {spec.kind === 'tool' && !snap.toolLog && <small className="sinsp__hint">Send an order question to see a call and its result here.</small>}
      {spec.kind === 'llm' && node.text && (
        <div className="sinsp__out"><h4>Last output</h4><p>{node.text}</p></div>
      )}
      {spec.kind === 'code' && node.text && <div className="sinsp__out"><h4>Last result</h4><p>{node.text}</p></div>}
    </div>
  )
}
