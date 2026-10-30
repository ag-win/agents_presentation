import { readNdjson } from '../demo/ndjson'
import type { AgentDefaults, AgentStreamEvent } from './types'

/** Talks to the agent endpoints of our backend. */
export class AgentClient {
  private readonly baseUrl: string

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  async defaults(): Promise<AgentDefaults> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/agent/defaults`)
    } catch {
      throw new Error('The backend is not reachable. Is it running (./start.sh)?')
    }
    if (!res.ok) throw new Error(`The backend answered HTTP ${res.status}`)
    return (await res.json()) as AgentDefaults
  }

  async clearWorkspace(): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/api/agent/workspace/clear`, { method: 'POST' })
    } catch {
      // The files are only a convenience; a failed clear must not break Reset.
    }
  }

  /** Streams every box the agent creates, in order. `tools` is the list switched on in the palette. */
  async *stream(task: string, tools: readonly string[], systems: Readonly<Record<string, string>>, signal: AbortSignal): AsyncGenerator<AgentStreamEvent> {
    let res: Response
    try {
      res = await fetch(`${this.baseUrl}/api/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, tools, systems }),
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
    yield* readNdjson<AgentStreamEvent>(res.body)
  }
}
