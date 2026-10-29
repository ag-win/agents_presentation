import { ContentSlide } from '../layouts'
import { Flow } from '../visuals'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's38', title: 'How does an agent actually reach a tool? — MCP' }

export default function S38() {
  return (
    <ContentSlide
      title="How does an agent actually reach a tool?"
      tag="MODEL CONTEXT PROTOCOL"
      cite="Anthropic, Introducing the Model Context Protocol (Nov 2024)"
    >
      <p style={{ margin: '0 0 32px' }}>Without a standard: every agent needs custom glue code for every tool — an <b>N×M</b> integration problem.</p>
      <Flow steps={[
        { title: 'Host Application', sub: '(Claude, IDE, etc.)' },
        { title: 'MCP Client', sub: 'Protocol layer' },
        { title: 'MCP Server', sub: 'Tool / Data Source (files, APIs, DBs…)' },
      ]} />
      <div className="callout" style={{ marginTop: 36 }}>
        Standardized protocol — replaces N×M custom glue with <b>1 standard.</b> <span style={{ opacity: 0.7 }}>Anthropic, Nov 2024 (open standard)</span>
      </div>
      <p className="muted" style={{ fontSize: 26, marginTop: 20 }}>
        Optional tie-back: this is the standardized socket that the "Tools" box in the Augmented LLM diagram plugs into in practice.
      </p>
    </ContentSlide>
  )
}
