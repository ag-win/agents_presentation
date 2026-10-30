import { useEffect, useState } from 'react'

/** What the first and last slides show, set in app/server/.env (served by GET /api/config). Everything is optional. */
export interface DeckConfig {
  readonly presenterName: string
  readonly teamName: string
  readonly teamMembers: readonly string[]
  /** Where the logo image is served from, or null when no usable logo is configured. */
  readonly logoUrl: string | null
}

const EMPTY: DeckConfig = { presenterName: '', teamName: '', teamMembers: [], logoUrl: null }

let cached: Promise<DeckConfig> | null = null

function loadDeckConfig(): Promise<DeckConfig> {
  cached ??= fetch('/api/config')
    .then((res): Promise<Partial<DeckConfig>> => (res.ok ? (res.json() as Promise<Partial<DeckConfig>>) : Promise.resolve({})))
    .then((body): DeckConfig => ({
      presenterName: typeof body.presenterName === 'string' ? body.presenterName : '',
      teamName: typeof body.teamName === 'string' ? body.teamName : '',
      teamMembers: Array.isArray(body.teamMembers) ? body.teamMembers.filter((n): n is string => typeof n === 'string') : [],
      logoUrl: typeof body.logoUrl === 'string' ? body.logoUrl : null,
    }))
    .catch(() => EMPTY)
  return cached
}

/** Read once per page load; the slides show nothing for settings that are empty or when the backend is unreachable. */
export function useDeckConfig(): DeckConfig {
  const [config, setConfig] = useState<DeckConfig>(EMPTY)
  useEffect(() => {
    let live = true
    void loadDeckConfig().then((c) => { if (live) setConfig(c) })
    return () => { live = false }
  }, [])
  return config
}
