import { useEffect } from 'react'
import { backendLine } from '../../demo/ui/PipelinePanel'
import { BackupControl } from '../../demo/ui/BackupControl'
import { SlowmoControl } from '../../demo/ui/SlowmoControl'
import '../../demo/demo.css'
import '../shop.css'
import { shopSession } from '../shopSession'
import { useShopDemo } from '../useShopDemo'
import { ChainPipeline } from './ChainPipeline'
import { ShopPhone } from './ShopPhone'

/**
 * Full-slide overlay for the prompt-chaining demo: the shop's products page on a phone (with the assistant
 * button floating in the corner) on the left, the chain's boxes on the right. Holds no state of its own, so
 * closing it never resets anything (see ShopDemoSession).
 */
export function ShopDemoOverlay({ onClose }: { onClose: () => void }) {
  const snap = useShopDemo()
  const status = backendLine(snap.backend)

  useEffect(() => {
    void shopSession.refreshBackend()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="demo-overlay demo-overlay--large" role="dialog" aria-modal="true" aria-label="Prompt chaining demo" data-modal>
      <header className="demo-head">
        <h2>Prompt chaining, live</h2>
        <span className={`demo-status${status.warn ? ' is-warn' : ''}`}>{status.text}</span>
        <BackupControl onChanged={() => void shopSession.refreshBackend()} />
        <SlowmoControl slowmo={snap.slowmo} onChange={(next) => shopSession.setSlowmo(next)} />
        <button className="demo-btn" onClick={() => shopSession.reset()}>Reset</button>
        <button className="demo-btn demo-btn--icon" onClick={onClose} aria-label="Close">×</button>
      </header>

      <div className="demo-body shop-body">
        <div className="demo-left">
          <ShopPhone snap={snap} />
          <p className="shop-caption">Tap the assistant button in the corner of the phone</p>
        </div>
        <div className="demo-right">
          <ChainPipeline nodes={snap.nodes} dots={snap.dots} runStart={snap.runStart} />
        </div>
      </div>
    </div>
  )
}
