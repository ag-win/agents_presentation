import { useEffect, useMemo } from 'react'
import '../../demo/demo.css'
import '../../demo/systemPrompt/system.css'
import '../router.css'
import { backendLine } from '../../demo/ui/PipelinePanel'
import { BackupControl } from '../../demo/ui/BackupControl'
import { SlowmoControl } from '../../demo/ui/SlowmoControl'
import { useProviders } from '../../demo/providers/useProviders'
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
  const { data: providerData } = useProviders()
  const activeSearch = providerData?.search.options.find((o) => o.id === providerData.search.active)
  const searchLabel = activeSearch ? `search: ${activeSearch.label}` : ''
  const onBackupSearch = providerData ? providerData.search.active !== providerData.search.options[0].id : false

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
        <span className={`demo-status${status.warn || onBackupSearch ? ' is-warn' : ''}`}>
          {status.text}{searchLabel ? ` · ${searchLabel}` : ''}
        </span>
        <BackupControl showSearch onChanged={() => void routerSession.refreshBackend()} />
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
