import { readNdjson } from '../demo/ndjson'
import type { RouteStreamEvent, RoutingDefaults } from './types'

/** Talks to the routing endpoints of our backend. */
export class RouteStreamClient {
  private readonly baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  async defaults(): Promise<RoutingDefaults> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/route/defaults`)
    } catch {
      throw new Error('The backend is not reachable. Is it running (./start.sh)?')
    }
    if (!res.ok) throw new Error(`The backend answered HTTP ${res.status}`)
    return (await res.json()) as RoutingDefaults
  }

  /** Streams search results, the router, the chosen route and the specialist's answer. */
  async *stream(query: string, systems: Readonly<Record<string, string>>, signal: AbortSignal): AsyncGenerator<RouteStreamEvent> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/route/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, systems }),
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
    yield* readNdjson<RouteStreamEvent>(res.body)
  }
}
