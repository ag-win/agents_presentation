import { useEffect, useMemo } from 'react'
import '../../demo/demo.css'
import '../../demo/systemPrompt/system.css'
import '../router.css'
import { backendLine } from '../../demo/ui/PipelinePanel'
import { SlowmoControl } from '../../demo/ui/SlowmoControl'
import { routerPrompts } from '../promptStore'
import { RouterLayout } from '../RouterLayout'
import { routerSession } from '../sharedSession'
import { usePrompts } from '../usePrompts'
import { useRouter } from '../useRouter'
import { ContextBox } from './ContextBox'
import { RouterPipeline } from './RouterPipeline'
import { SearchBrowser } from './SearchBrowser'

/**
 * Overlay for the routing demo: a browser whose address bar is the search box, a faint box that holds the
 * web search results, and the router pipeline. Each search starts from a clean slate. Holds no state of its own.
 */
export function RouterOverlay({ onClose }: { onClose: () => void }) {
  const snap = useRouter()
  const prompts = usePrompts()
  const status = backendLine(snap.backend)
  const specialistIds = prompts.defaults?.specialists.map((s) => s.id) ?? []
  const layout = useMemo(() => new RouterLayout(specialistIds), [specialistIds.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const searchLabel = prompts.defaults ? (prompts.defaults.search.live ? 'search: Brave' : 'search: mock results') : ''

  useEffect(() => {
    void routerSession.refreshBackend()
    void routerPrompts.load()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="demo-overlay demo-overlay--large" role="dialog" aria-modal="true" aria-label="Routing demo" data-modal>
      <header className="demo-head">
        <h2>Routing, live</h2>
        <span className={`demo-status${status.warn || (prompts.defaults && !prompts.defaults.search.live) ? ' is-warn' : ''}`}>
          {status.text}{searchLabel ? ` · ${searchLabel}` : ''}
        </span>
        <SlowmoControl slowmo={snap.slowmo} onChange={(next) => routerSession.setSlowmo(next)} />
        <button className="demo-btn" onClick={() => routerSession.reset()}>Reset</button>
        <button className="demo-btn demo-btn--icon" onClick={onClose} aria-label="Close">×</button>
      </header>

      <div className="rbody">
        <SearchBrowser snap={snap} />
        <div className="rbody__mid">{prompts.defaults && <ContextBox snap={snap} layout={layout} />}</div>
        <div className="rbody__right">
          {prompts.defaults ? (
            <RouterPipeline snap={snap} prompts={prompts} layout={layout} />
          ) : (
            <div className="rbody__wait">
              <p>{prompts.loadError ?? 'Loading…'}</p>
              {prompts.loadError && <button className="demo-btn" onClick={() => void routerPrompts.load()}>Try again</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
