import { useEffect, useState } from 'react'

let cached: Promise<string> | null = null

/** The presenter's name from PRESENTER_NAME in app/server/.env, read once through the backend ("" if unset or unreachable). */
function loadPresenterName(): Promise<string> {
  cached ??= fetch('/api/config')
    .then((res) => (res.ok ? (res.json() as Promise<{ presenterName?: string }>) : { presenterName: '' }))
    .then((body) => (typeof body.presenterName === 'string' ? body.presenterName : ''))
    .catch(() => '')
  return cached
}

export function usePresenterName(): string {
  const [name, setName] = useState('')
  useEffect(() => {
    let live = true
    void loadPresenterName().then((n) => { if (live) setName(n) })
    return () => { live = false }
  }, [])
  return name
}
