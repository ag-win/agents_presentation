import { useState } from 'react'
import { DiagramSlide } from '../layouts'
import { ShopEaseDesk } from '../diagrams'
import { LiveDemoButton } from '../LiveDemoButton'
import { SupportOverlay } from '../../supportdemo/ui/SupportOverlay'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's26', title: 'ShopEase support desk: the patterns combined' }

export default function S26() {
  const [demoOpen, setDemoOpen] = useState(false)
  return (
    <>
      <DiagramSlide title="The ShopEase support desk" tag="CASE STUDY (FICTIONAL)" diagram={<ShopEaseDesk />}>
        <p style={{ margin: 0, fontSize: 32 }}>One message, one path, one quality check. Every box is a pattern we have already met.</p>
      </DiagramSlide>
      <LiveDemoButton className="live-demo-btn--top" onClick={() => setDemoOpen(true)} />
      {demoOpen && <SupportOverlay onClose={() => setDemoOpen(false)} />}
    </>
  )
}
