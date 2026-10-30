import { readNdjson } from '../demo/ndjson'
import type { SupportDefaults, SupportStreamEvent } from './types'

/** Talks to the support-desk endpoints of our backend. */
export class SupportClient {
  private readonly baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  async defaults(): Promise<SupportDefaults> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/support/defaults`)
    } catch {
      throw new Error('The backend is not reachable. Is it running (./start.sh)?')
    }
    if (!res.ok) throw new Error(`The backend answered HTTP ${res.status}`)
    return (await res.json()) as SupportDefaults
  }

  /** Streams every stage of the support desk for one customer message. `routeOnly` stops after the router (test bench). */
  async *stream(message: string, systems: Readonly<Record<string, string>>, signal: AbortSignal, routeOnly = false): AsyncGenerator<SupportStreamEvent> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/support/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, systems, ...(routeOnly ? { stopAfter: 'route' } : {}) }),
        signal,
      })
    } catch (cause) {
      if (signal.aborted) throw cause
      throw new Error('The backend is not reachable. Is it running (./start.sh)?')
    }
    if (!res.ok || !res.body) {
      const detail = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      throw new Error(detail?.error?.message ?? `The backend answered HTTP ${res.status}`)
    }
    yield* readNdjson<SupportStreamEvent>(res.body)
  }
}
