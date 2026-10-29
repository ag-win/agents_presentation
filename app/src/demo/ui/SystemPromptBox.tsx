import { systemPromptStore as store } from '../systemPrompt/sharedStore'
import { useSystemPrompt } from '../systemPrompt/useSystemPrompt'

/**
 * The faint box between the phone and the LLM. Click it to open an editor with a carousel of system prompts
 * that change the model's style drastically; whatever is selected or typed here is what the LLM box's
 * dropdown shows and what is attached to the prompt just before it reaches the LLM.
 */
export function SystemPromptBox() {
  const st = useSystemPrompt()
  const n = store.presets.length
  const preset = st.presetIndex === null ? null : store.presets[st.presetIndex]
  const name = st.text.trim() === '' ? 'None' : preset ? preset.name : 'Custom'

  return (
    <div className={`sysbox${st.editorOpen ? ' is-open' : ''}`}>
      <button type="button" className="sysbox__top" onClick={() => store.toggleEditor()} aria-expanded={st.editorOpen}>
        <span className="sysbox__label">SYSTEM PROMPT</span>
        <span className="sysbox__name">{name}</span>
        <span className="sysbox__hint">{st.editorOpen ? 'click to close' : 'click to edit'}</span>
      </button>

      {st.editorOpen && (
        <div className="sysbox__editor">
          <div className="sysbox__carousel">
            <button type="button" onClick={() => store.step(-1)} disabled={st.locked} aria-label="Previous system prompt">‹</button>
            <div className="sysbox__current">
              <b>{preset ? preset.name : 'Custom'}</b>
              <small>{preset ? `${(st.presetIndex ?? 0) + 1} / ${n}` : 'edited by hand'}</small>
            </div>
            <button type="button" onClick={() => store.step(1)} disabled={st.locked} aria-label="Next system prompt">›</button>
          </div>
          <div className="sysbox__dots">
            {store.presets.map((p, i) => (
              <button key={p.id} type="button" aria-label={p.name} aria-current={i === st.presetIndex} disabled={st.locked} onClick={() => store.selectPreset(i)} />
            ))}
          </div>
          <textarea
            value={st.text}
            onChange={(e) => store.setText(e.target.value)}
            disabled={st.locked}
            spellCheck={false}
            rows={6}
            aria-label="System prompt text"
            placeholder="Type a system prompt, or leave this empty to send none"
          />
          <p className="sysbox__note">{st.locked ? 'Locked while the LLM is answering.' : 'Added to the prompt on its way to the LLM.'}</p>
        </div>
      )}
    </div>
  )
}
