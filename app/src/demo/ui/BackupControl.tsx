import { useEffect, useState } from 'react'
import { providers } from '../providers/sharedProviders'
import type { ProviderGroup } from '../providers/ProviderStore'
import { useProviders } from '../providers/useProviders'

function Group({ title, group, onPick, disabled }: { title: string; group: ProviderGroup; onPick: (id: string) => void; disabled: boolean }) {
  return (
    <div className="bk__group">
      <h4>{title}</h4>
      {group.options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`bk__opt${o.id === group.active ? ' is-active' : ''}`}
          aria-pressed={o.id === group.active}
          disabled={disabled || !o.available}
          onClick={() => onPick(o.id)}
        >
          <b>{o.label}</b>
          <small>{o.available ? o.detail : 'not set up (add its key to .env)'}</small>
        </button>
      ))}
    </div>
  )
}

/**
 * The "Backup" button in a demo's header. If the model or the search key fails during the talk, open it and
 * switch to another model (e.g. AWS Bedrock, or the offline one) or to the backup search results.
 * `onChanged` lets the demo refresh the model name it shows.
 */
export function BackupControl({ showSearch = false, onChanged }: { showSearch?: boolean; onChanged?: () => void }) {
  const { data, error, busy } = useProviders()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    void providers.load()
  }, [])

  // Amber when anything other than the first (primary) choice is in use.
  const onBackup = data ? data.llm.active !== data.llm.options[0].id || (showSearch && data.search.active !== data.search.options[0].id) : false

  const pick = async (change: { llm?: string; search?: string }) => {
    if (await providers.select(change)) onChanged?.()
  }

  return (
    <div className="bk">
      <button
        type="button"
        className={`demo-btn bk__btn${onBackup ? ' is-backup' : ''}${open ? ' is-on' : ''}`}
        aria-expanded={open}
        onClick={() => {
          if (!open) void providers.refresh()
          setOpen((v) => !v)
        }}
      >
        <span className="bk__dot" aria-hidden /> Backup
      </button>
      {open && (
        <div className="bk__pop" role="dialog" aria-label="Backup mode">
          {data ? (
            <>
              <Group title="Language model" group={data.llm} disabled={busy} onPick={(id) => void pick({ llm: id })} />
              {showSearch && <Group title="Web search" group={data.search} disabled={busy} onPick={(id) => void pick({ search: id })} />}
            </>
          ) : (
            <p className="bk__msg">{error ?? 'Loading…'}</p>
          )}
          {data && error && <p className="bk__msg is-warn">{error}</p>}
          <p className="bk__hint">Switching takes effect on the next request.</p>
        </div>
      )}
    </div>
  )
}
