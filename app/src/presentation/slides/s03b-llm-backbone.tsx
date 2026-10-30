import { ContentSlide } from '../layouts'
import { AgentBackbone } from '../diagrams'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's03b', title: 'The LLM is the backbone of every agent' }

export default function S03b() {
  return (
    <ContentSlide title="The LLM is the backbone of every agent">
      <div className="row" style={{ alignItems: 'center', gap: 56 }}>
        <div style={{ flex: 1.05 }}><AgentBackbone /></div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 20px' }}>The model provides <b className="accent">all of the intelligence</b>:</p>
          <ul className="bullets">
            <li><b>Understands</b> a goal written in plain language.</li>
            <li><b>Plans</b> the steps to reach it.</li>
            <li><b>Decides</b> which tool to use and when to stop.</li>
            <li><b>Writes</b> the answer, the code and the tool calls.</li>
          </ul>
        </div>
      </div>
      <div className="callout" style={{ marginTop: 28, fontSize: 32 }}>
        Tools, memory and loops are plumbing. <b>Swap in a better LLM and the same agent gets smarter.</b>
      </div>
    </ContentSlide>
  )
}
