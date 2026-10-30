import { useState } from 'react'
import { DiagramSlide } from '../layouts'
import { LiveDemoButton } from '../LiveDemoButton'
import { SupportOverlay } from '../../supportdemo/ui/SupportOverlay'
import { ZoomableDesk } from '../../supportdemo/ui/ZoomableDesk'
import type { SlideMeta } from '../types'

export const meta: SlideMeta = { id: 's26', title: 'ShopEase support desk: the patterns combined' }

export default function S26() {
  const [demoOpen, setDemoOpen] = useState(false)
  return (
    <>
      <DiagramSlide title="The ShopEase support desk" tag="CASE STUDY (FICTIONAL)" diagram={<ZoomableDesk />}>
        <p style={{ margin: 0, fontSize: 32 }}>One message, one path, one quality check. Click a path to zoom in.</p>
      </DiagramSlide>
      <LiveDemoButton className="live-demo-btn--top" onClick={() => setDemoOpen(true)} />
      {demoOpen && <SupportOverlay onClose={() => setDemoOpen(false)} />}
    </>
  )
}
