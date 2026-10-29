export interface ProviderOption {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly available: boolean
}

export interface ProviderGroup {
  readonly active: string
  readonly options: readonly ProviderOption[]
}

/** What GET /api/providers returns: the active model / search service and which backups are set up. */
export interface ProvidersData {
  readonly llm: ProviderGroup
  readonly search: ProviderGroup
}

export interface ProviderState {
  readonly data: ProvidersData | null
  readonly error: string | null
  readonly busy: boolean
}

/** Observable view of the backend's provider selection, with commands to switch to a backup. */
export class ProviderStore {
  private readonly baseUrl: string
  private readonly listeners = new Set<() => void>()
  private state: ProviderState = { data: null, error: null, busy: false }

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): ProviderState => this.state

  /** Read the current selection from the backend. */
  async refresh(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/api/providers`)
      if (!res.ok) throw new Error(`The backend answered HTTP ${res.status}`)
      this.patch({ data: (await res.json()) as ProvidersData, error: null })
    } catch {
      this.patch({ error: 'The backend is not reachable.' })
    }
  }

  async load(): Promise<void> {
    if (!this.state.data) await this.refresh()
  }

  /** Switch the model and/or the search service. Resolves true on success; the error is kept in the state. */
  async select(change: { llm?: string; search?: string }): Promise<boolean> {
    this.patch({ busy: true, error: null })
    try {
      const res = await fetch(`${this.baseUrl}/api/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      })
      const body = (await res.json()) as ProvidersData & { error?: { message?: string } }
      if (!res.ok) throw new Error(body.error?.message ?? `The backend answered HTTP ${res.status}`)
      this.patch({ data: body, busy: false })
      return true
    } catch (error) {
      this.patch({ busy: false, error: error instanceof Error ? error.message : String(error) })
      return false
    }
  }

  private patch(change: Partial<ProviderState>): void {
    this.state = { ...this.state, ...change }
    this.listeners.forEach((l) => l())
  }
}
