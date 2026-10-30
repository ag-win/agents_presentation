import { useEffect, useRef } from 'react'
import type { AgentConfigState } from '../AgentConfigStore'
import { BLANK_NODE } from '../../supportdemo/types'
import { agentConfig } from '../sharedSession'
import type { AgentSnapshot } from '../types'

function PromptEditor({ promptId, config }: { promptId: string; config: AgentConfigState }) {
  const area = useRef<HTMLTextAreaElement>(null)
  const text = config.texts[promptId] ?? ''
  const edited = agentConfig.isEdited(promptId)
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [text])
  return (
    <div className="sinsp__prompt">
      <header>
        <b>{promptId === 'subagent' ? 'Sub-agent system prompt' : 'Agent system prompt'}</b>
        <em className={edited ? 'is-edited' : ''}>{text.trim() === '' ? 'blank' : edited ? 'edited' : 'default'}</em>
        <button type="button" onClick={() => agentConfig.restore(promptId)} disabled={config.locked || !edited}>Restore default</button>
      </header>
      <textarea ref={area} value={text} disabled={config.locked} spellCheck={false} onChange={(e) => agentConfig.setText(promptId, e.target.value)} placeholder="Blank: the agent gets no system prompt" aria-label="System prompt text" />
      {config.locked && <small>Locked while a task is running.</small>}
    </div>
  )
}

const pretty = (value: unknown) => JSON.stringify(value, null, 2)

/** Details of the box that was clicked: a tool in the toolbox (with its on/off switch), an LLM call (with its editable system prompt), a tool call (arguments and result), the task or the reply. */
export function AgentInspector({ snap, config }: { snap: AgentSnapshot; config: AgentConfigState }) {
  const id = config.selected
  const defaults = config.defaults
  if (!id || !defaults) return <div className="sinsp sinsp--empty"><p>Click any box to see what it is. Click a tool in the toolbox to see its signature, or tick it off to take it away from the agent.</p></div>
  const close = <button type="button" className="sinsp__x" onClick={() => agentConfig.toggleSelect(id)} aria-label="Close">×</button>

  if (id.startsWith('pal:')) {
    const tool = defaults.tools.find((t) => t.name === `${id.slice(4)}`)
    if (!tool) return null
    const on = agentConfig.isEnabled(tool.name)
    return (
      <div className="sinsp" data-scrollable>
        <header className="sinsp__head"><h3>{tool.label}</h3><span>tool in the toolbox</span>{close}</header>
        <p className="sinsp__blurb">{tool.description}</p>
        <button type="button" className={`demo-btn${on ? ' is-on' : ''} ag-toggle`} disabled={config.locked} onClick={() => agentConfig.toggleTool(tool.name)}>
          {on ? 'Available to the agent: ON' : 'Available to the agent: OFF'}
        </button>
        <div className="sinsp__tool">
          <h4>What the model is shown (the tool signature)</h4>
          <pre>{pretty({ name: tool.name, description: tool.description, parameters: tool.parameters })}</pre>
        </div>
        {tool.category === 'files' && (
          <div className="sinsp__out"><h4>Files in the workspace</h4><p>{config.files.length ? config.files.join(', ') : 'none yet'}</p></div>
        )}
      </div>
    )
  }

  const node = snap.nodes.find((n) => n.id === id)
  const st = snap.states[id] ?? BLANK_NODE
  if (id === 'input') return <div className="sinsp" data-scrollable><header className="sinsp__head"><h3>Task</h3><span>input</span>{close}</header><p className="sinsp__blurb">{snap.task || 'The task you give the agent. It is sent to the first LLM call together with the signatures of every tool that is switched on.'}</p></div>
  if (id === 'output' || node?.kind === 'output') return <div className="sinsp" data-scrollable><header className="sinsp__head"><h3>Reply</h3><span>output</span>{close}</header><p className="sinsp__blurb">{snap.final ?? 'The final answer appears here when the model stops asking for tools.'}</p></div>
  if (!node) return null

  if (node.kind === 'llm') {
    const promptId = node.agent === 'a0' ? 'agent' : 'subagent'
    return (
      <div className="sinsp" data-scrollable>
        <header className="sinsp__head"><h3>LLM call {node.step}</h3><span>{node.agent === 'a0' ? 'main agent' : 'sub-agent'}</span>{close}</header>
        <p className="sinsp__blurb">The model is sent the whole history so far ({node.context} messages) plus the tool signatures. It either asks for tools or gives the final answer.</p>
        <PromptEditor promptId={promptId} config={config} />
        {st.text && <div className="sinsp__out"><h4>What it said</h4><p>{st.text}</p></div>}
      </div>
    )
  }
  const tool = defaults.tools.find((t) => t.name === node.name)
  return (
    <div className="sinsp" data-scrollable>
      <header className="sinsp__head"><h3>{tool?.label ?? node.name}</h3><span>tool call</span>{close}</header>
      <p className="sinsp__blurb">The model asked for this. The app ran it and sent the result back to the model.</p>
      <div className="sinsp__tool">
        <h4>The call</h4><pre>{`${node.name}(${pretty(node.arguments)})`}</pre>
        <h4>Result returned to the model</h4><pre>{node.result ?? 'running…'}</pre>
        {tool && <><h4>Signature the model was shown</h4><pre>{pretty({ name: tool.name, description: tool.description, parameters: tool.parameters })}</pre></>}
      </div>
    </div>
  )
}
