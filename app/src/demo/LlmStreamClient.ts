import { readNdjson } from './ndjson'
import type { BackendStatus, LlmStreamEvent } from './types'

/** Talks to our backend (never to Ollama directly, so the key stays on the server). */
export class LlmStreamClient {
  private readonly baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  async health(signal?: AbortSignal): Promise<BackendStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/api/health`, { signal })
      if (!res.ok) return { state: 'offline' }
      const body = (await res.json()) as { provider: string; model: string; live: boolean }
      return { state: 'ready', provider: body.provider, model: body.model, live: body.live }
    } catch {
      return { state: 'offline' }
    }
  }

  /** Yields start, token..., done (or error) as the backend produces them. */
  async *stream(prompt: string, signal: AbortSignal): AsyncGenerator<LlmStreamEvent> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/llm/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal,
      })
    } catch (cause) {
      if (signal.aborted) throw cause
      throw new Error('The backend is not reachable. Is it running (./start.sh)?')
    }
    if (!res.ok || !res.body) {
      const detail = await res.json().catch(() => null) as { error?: { message?: string } } | null
      throw new Error(detail?.error?.message ?? `The backend answered HTTP ${res.status}`)
    }

    yield* readNdjson<LlmStreamEvent>(res.body)
  }
}
