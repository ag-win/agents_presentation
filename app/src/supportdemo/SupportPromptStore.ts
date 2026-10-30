import { SupportClient } from './SupportClient'
import type { SupportDefaults } from './types'

export interface SupportPromptState {
  readonly defaults: SupportDefaults | null
  readonly loadError: string | null
  /** The system prompt currently in each LLM's editor ("" = send none), keyed by prompt id. */
  readonly texts: Readonly<Record<string, string>>
  /** The board box whose details (prompt, tool signature, last output) the inspector shows. */
  readonly selected: string | null
  /** True while a message or the test bench runs, so a prompt cannot change under a request that already used it. */
  readonly locked: boolean
}

/**
 * The editable system prompt of every LLM in the support desk, plus which box is open in the inspector.
 * Prompts survive between messages (a message resets the run, not the configuration); reset() restores the defaults.
 */
export class SupportPromptStore {
  private readonly client: SupportClient
  private readonly listeners = new Set<() => void>()
  private state: SupportPromptState = { defaults: null, loadError: null, texts: {}, selected: null, locked: false }

  constructor(client: SupportClient = new SupportClient()) {
    this.client = client
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): SupportPromptState => this.state

  /** Fetch the defaults (once; call again after a failure). */
  async load(): Promise<void> {
    if (this.state.defaults) return
    try {
      const defaults = await this.client.defaults()
      this.patch({ defaults, loadError: null, texts: Object.fromEntries(defaults.prompts.map((p) => [p.id, p.text])) })
    } catch (error) {
      this.patch({ loadError: error instanceof Error ? error.message : String(error) })
    }
  }

  nameOf(id: string): string {
    return this.state.defaults?.prompts.find((p) => p.id === id)?.name ?? id
  }

  defaultOf(id: string): string {
    return this.state.defaults?.prompts.find((p) => p.id === id)?.text ?? ''
  }

  isEdited(id: string): boolean {
    return (this.state.texts[id] ?? '') !== this.defaultOf(id)
  }

  /** Only the prompts that differ from the defaults; the server fills in the rest. */
  systems(): Record<string, string> {
    return Object.fromEntries(Object.entries(this.state.texts).filter(([id]) => this.isEdited(id)))
  }

  setText(id: string, text: string): void {
    if (this.state.locked) return
    this.patch({ texts: { ...this.state.texts, [id]: text } })
  }

  restore(id: string): void {
    this.setText(id, this.defaultOf(id))
  }

  /** Open this box in the inspector, or close it if it is already open. */
  toggle(nodeId: string): void {
    this.patch({ selected: this.state.selected === nodeId ? null : nodeId })
  }

  select(nodeId: string): void {
    if (this.state.selected !== nodeId) this.patch({ selected: nodeId })
  }

  lock(): void {
    this.patch({ locked: true })
  }

  unlock(): void {
    this.patch({ locked: false })
  }

  /** Back to the default prompts with the inspector closed. */
  reset(): void {
    const d = this.state.defaults
    this.patch({ texts: d ? Object.fromEntries(d.prompts.map((p) => [p.id, p.text])) : {}, selected: null, locked: false })
  }

  private patch(change: Partial<SupportPromptState>): void {
    this.state = { ...this.state, ...change }
    this.listeners.forEach((l) => l())
  }
}
