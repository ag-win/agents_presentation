import { SupportClient } from './SupportClient'
import type { SupportPromptStore } from './SupportPromptStore'
import type { Scenario } from './types'

export interface BenchRow {
  readonly scenarioId: string
  /** What the guard and router decided ("guard" if the guard blocked it); null while it has not run. */
  readonly got: string | null
  readonly ok: boolean | null
  readonly error: string | null
}

export interface BenchSnapshot {
  readonly running: boolean
  readonly rows: Readonly<Record<string, BenchRow>>
  /** How many scenarios have finished in the current run. */
  readonly finished: number
  readonly total: number
}

/**
 * The test bench: sends every scenario through the guard and router only (no replies), one at a time,
 * and compares the route chosen with the route we expect. Quick to run, and it shows how an edited prompt changes routing.
 */
export class SupportBench {
  private readonly prompts: SupportPromptStore
  private readonly client: SupportClient
  private readonly listeners = new Set<() => void>()
  private abort: AbortController | null = null
  private state: BenchSnapshot = { running: false, rows: {}, finished: 0, total: 0 }

  constructor(prompts: SupportPromptStore, client: SupportClient = new SupportClient()) {
    this.prompts = prompts
    this.client = client
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): BenchSnapshot => this.state

  async run(scenarios: readonly Scenario[]): Promise<void> {
    if (this.state.running) return
    this.abort = new AbortController()
    const { signal } = this.abort
    this.prompts.lock()
    this.patch({ running: true, rows: {}, finished: 0, total: scenarios.length })
    try {
      for (const scenario of scenarios) {
        if (signal.aborted) break
        const row = await this.check(scenario, signal)
        if (signal.aborted) break
        this.patch({ rows: { ...this.state.rows, [scenario.id]: row }, finished: this.state.finished + 1 })
      }
    } finally {
      this.abort = null
      this.prompts.unlock()
      this.patch({ running: false })
    }
  }

  stop(): void {
    this.abort?.abort()
  }

  reset(): void {
    this.abort?.abort()
    this.state = { running: false, rows: {}, finished: 0, total: 0 }
    this.listeners.forEach((l) => l())
  }

  private async check(scenario: Scenario, signal: AbortSignal): Promise<BenchRow> {
    let guard: string | null = null
    let route: string | null = null
    try {
      for await (const event of this.client.stream(scenario.message, this.prompts.systems(), signal, true)) {
        if (event.type === 'decision' && event.stage === 'guard') guard = event.label
        if (event.type === 'decision' && event.stage === 'router') route = event.label
        if (event.type === 'error') return { scenarioId: scenario.id, got: null, ok: null, error: event.message }
      }
    } catch (error) {
      if (signal.aborted) return { scenarioId: scenario.id, got: null, ok: null, error: null }
      return { scenarioId: scenario.id, got: null, ok: null, error: error instanceof Error ? error.message : String(error) }
    }
    const got = guard === 'block' ? 'guard' : route
    return { scenarioId: scenario.id, got, ok: got === scenario.expect, error: got ? null : 'No decision came back' }
  }

  private patch(change: Partial<BenchSnapshot>): void {
    this.state = { ...this.state, ...change }
    this.listeners.forEach((l) => l())
  }
}
