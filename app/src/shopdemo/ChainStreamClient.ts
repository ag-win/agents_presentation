import { readNdjson } from '../demo/ndjson'
import type { ChainStreamEvent, HistoryTurn } from './types'

/** Streams one customer message through the backend's prompt chain. */
export class ChainStreamClient {
  private readonly baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  async *stream(message: string, history: readonly HistoryTurn[], signal: AbortSignal): AsyncGenerator<ChainStreamEvent> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/chain/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
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
    yield* readNdjson<ChainStreamEvent>(res.body)
  }
}
