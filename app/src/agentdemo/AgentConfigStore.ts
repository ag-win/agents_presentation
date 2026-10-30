import { AgentClient } from './AgentClient'
import type { AgentDefaults } from './types'

export interface AgentConfigState {
  readonly defaults: AgentDefaults | null
  readonly loadError: string | null
  /** The system prompt in each editor ("" = send none), keyed by prompt id ("agent", "subagent"). */
  readonly texts: Readonly<Record<string, string>>
  /** Tools switched off in the palette. Everything else is offered to the model. */
  readonly disabled: readonly string[]
  /** What the inspector shows: a box id, or "pal:<tool name>" for a palette box. */
  readonly selected: string | null
  /** True while a task runs, so the toolbox and prompts cannot change under a request that already used them. */
  readonly locked: boolean
  /** Files the agent has written (shown for the file tools). */
  readonly files: readonly string[]
}

/**
 * What the agent is configured with: which tools are on, its system prompts, and which box is open in the inspector.
 * It survives between tasks (a task resets the run, not the configuration); reset() puts everything back.
 */
export class AgentConfigStore {
  private readonly client: AgentClient
  private readonly listeners = new Set<() => void>()
  private state: AgentConfigState = { defaults: null, loadError: null, texts: {}, disabled: [], selected: null, locked: false, files: [] }

  constructor(client: AgentClient = new AgentClient()) {
    this.client = client
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): AgentConfigState => this.state

  async load(): Promise<void> {
    if (this.state.defaults) return
    try {
      const defaults = await this.client.defaults()
      this.patch({ defaults, loadError: null, texts: Object.fromEntries(defaults.prompts.map((p) => [p.id, p.text])), files: defaults.files })
    } catch (error) {
      this.patch({ loadError: error instanceof Error ? error.message : String(error) })
    }
  }

  /** Re-read the workspace file list (after a run). */
  async refreshFiles(): Promise<void> {
    try {
      this.patch({ files: (await this.client.defaults()).files })
    } catch {
      // keep the old list
    }
  }

  async clearWorkspace(): Promise<void> {
    await this.client.clearWorkspace()
    this.patch({ files: [] })
  }

  enabled(): string[] {
    return (this.state.defaults?.tools ?? []).map((t) => t.name).filter((n) => !this.state.disabled.includes(n))
  }

  isEnabled(name: string): boolean {
    return !this.state.disabled.includes(name)
  }

  toggleTool(name: string): void {
    if (this.state.locked) return
    this.patch({ disabled: this.isEnabled(name) ? [...this.state.disabled, name] : this.state.disabled.filter((n) => n !== name) })
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

  select(id: string | null): void {
    if (this.state.selected !== id) this.patch({ selected: id })
  }

  toggleSelect(id: string): void {
    this.patch({ selected: this.state.selected === id ? null : id })
  }

  lock(): void {
    this.patch({ locked: true })
  }

  unlock(): void {
    this.patch({ locked: false })
  }

  /** Every tool back on, default prompts, nothing selected. */
  reset(): void {
    const d = this.state.defaults
    this.patch({ texts: d ? Object.fromEntries(d.prompts.map((p) => [p.id, p.text])) : {}, disabled: [], selected: null, locked: false })
  }

  private patch(change: Partial<AgentConfigState>): void {
    this.state = { ...this.state, ...change }
    this.listeners.forEach((l) => l())
  }
}
