import { RouteStreamClient } from './RouteStreamClient'
import type { RoutingDefaults } from './types'

export interface RouterPromptState {
  readonly defaults: RoutingDefaults | null
  readonly loadError: string | null
  /** The system prompt currently in each LLM's dropdown ("" = send none). */
  readonly texts: Readonly<Record<string, string>>
  /** Which LLM's dropdown panel is open. */
  readonly openId: string | null
  /** True while a query runs, so a prompt cannot change under a request that already used it. */
  readonly locked: boolean
}

/**
 * The editable system prompt of every LLM in the routing demo, plus which dropdown is open.
 * Prompts survive between queries (a query resets the run, not the configuration); reset() restores the defaults.
 */
export class RouterPromptStore {
  private readonly client: RouteStreamClient
  private readonly listeners = new Set<() => void>()
  private state: RouterPromptState = { defaults: null, loadError: null, texts: {}, openId: null, locked: false }

  constructor(client: RouteStreamClient = new RouteStreamClient()) {
    this.client = client
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): RouterPromptState => this.state

  /** Fetch the default prompts (once; call again after a failure). */
  async load(): Promise<void> {
    if (this.state.defaults) return
    try {
      const defaults = await this.client.defaults()
      this.patch({ defaults, loadError: null, texts: RouterPromptStore.textsOf(defaults) })
    } catch (error) {
      this.patch({ loadError: error instanceof Error ? error.message : String(error) })
    }
  }

  /** Router first, then the specialists, in display order. */
  get llmIds(): string[] {
    const d = this.state.defaults
    return d ? [d.router.id, ...d.specialists.map((s) => s.id)] : []
  }

  get specialistIds(): string[] {
    return this.state.defaults?.specialists.map((s) => s.id) ?? []
  }

  nameOf(id: string): string {
    const d = this.state.defaults
    return d ? [d.router, ...d.specialists].find((l) => l.id === id)?.name ?? id : id
  }

  defaultOf(id: string): string {
    const d = this.state.defaults
    return d ? [d.router, ...d.specialists].find((l) => l.id === id)?.systemPrompt ?? '' : ''
  }

  isEdited(id: string): boolean {
    return (this.state.texts[id] ?? '') !== this.defaultOf(id)
  }

  /** Every prompt as it will be sent. */
  systems(): Record<string, string> {
    return { ...this.state.texts }
  }

  setText(id: string, text: string): void {
    if (this.state.locked) return
    this.patch({ texts: { ...this.state.texts, [id]: text } })
  }

  restore(id: string): void {
    this.setText(id, this.defaultOf(id))
  }

  toggle(id: string): void {
    this.patch({ openId: this.state.openId === id ? null : id })
  }

  lock(): void {
    this.patch({ locked: true })
  }

  unlock(): void {
    this.patch({ locked: false })
  }

  /** Back to the default prompts with every dropdown closed. */
  reset(): void {
    const d = this.state.defaults
    this.patch({ texts: d ? RouterPromptStore.textsOf(d) : {}, openId: null, locked: false })
  }

  private static textsOf(d: RoutingDefaults): Record<string, string> {
    return Object.fromEntries([d.router, ...d.specialists].map((l) => [l.id, l.systemPrompt]))
  }

  private patch(change: Partial<RouterPromptState>): void {
    this.state = { ...this.state, ...change }
    this.listeners.forEach((l) => l())
  }
}
