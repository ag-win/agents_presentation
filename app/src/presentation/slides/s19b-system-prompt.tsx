import { useState } from 'react'
import { DiagramSlide } from '../layouts'
import { SystemPromptFlow } from '../diagrams'
import { LiveDemoButton } from '../LiveDemoButton'
import { SystemPromptOverlay } from '../../demo/ui/SystemPromptOverlay'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's19b', title: 'The system prompt' }

export default function S19b() {
  const [demoOpen, setDemoOpen] = useState(false)
  return (
    <>
      <DiagramSlide title="The system prompt" diagram={<SystemPromptFlow />}>
        <p style={{ margin: '0 0 10px' }}>A hidden instruction, written by the app, that is added to your prompt before the model sees it.</p>
        <p className="muted" style={{ margin: 0, fontSize: 30 }}>It sets the role, tone and rules. The user never types it and usually never sees it.</p>
      </DiagramSlide>
      <LiveDemoButton className="live-demo-btn--top" onClick={() => setDemoOpen(true)} />
      {demoOpen && <SystemPromptOverlay onClose={() => setDemoOpen(false)} />}
    </>
  )
}
