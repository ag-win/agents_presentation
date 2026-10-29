import type { SystemPromptSource } from '../SystemPromptSource'
import { DEFAULT_PRESET, SYSTEM_PRESETS, type SystemPreset } from './presets'

export interface SystemPromptState {
  /** What is typed in the editor, and what will be sent. */
  readonly text: string
  /** Index of the preset the text came from; null once the text has been edited by hand. */
  readonly presetIndex: number | null
  /** The editor box between the phone and the LLM is open. */
  readonly editorOpen: boolean
  /** The LLM box's dropdown is open. */
  readonly llmExpanded: boolean
  /** True while the LLM is answering: the text can't change under a request that already used it. */
  readonly locked: boolean
}

/**
 * The system prompt being demonstrated, plus the open/closed state of the two places that show it.
 * Observable (useSyncExternalStore) and, to the run, just a SystemPromptSource.
 */
export class SystemPromptStore implements SystemPromptSource {
  private readonly listeners = new Set<() => void>()
  private state: SystemPromptState = SystemPromptStore.initial()

  readonly presets: readonly SystemPreset[] = SYSTEM_PRESETS

  private static initial(): SystemPromptState {
    return { text: DEFAULT_PRESET.text, presetIndex: 0, editorOpen: false, llmExpanded: false, locked: false }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): SystemPromptState => this.state

  // ---- SystemPromptSource ----
  current(): string {
    return this.state.text
  }

  lock(): void {
    this.patch({ locked: true })
  }

  unlock(): void {
    this.patch({ locked: false })
  }

  // ---- commands ----
  selectPreset(index: number): void {
    if (this.state.locked) return
    const n = this.presets.length
    const i = ((index % n) + n) % n
    this.patch({ presetIndex: i, text: this.presets[i].text })
  }

  /** Move through the carousel; from hand-written text, start from the first preset. */
  step(direction: 1 | -1): void {
    const from = this.state.presetIndex ?? (direction === 1 ? -1 : 0)
    this.selectPreset(from + direction)
  }

  setText(text: string): void {
    if (this.state.locked) return
    this.patch({ text, presetIndex: this.presets.findIndex((p) => p.text === text) >= 0 ? this.presets.findIndex((p) => p.text === text) : null })
  }

  toggleEditor(): void {
    this.patch({ editorOpen: !this.state.editorOpen })
  }

  toggleLlm(): void {
    this.patch({ llmExpanded: !this.state.llmExpanded })
  }

  /** Back to the default prompt with everything collapsed. */
  reset(): void {
    this.state = SystemPromptStore.initial()
    this.listeners.forEach((l) => l())
  }

  private patch(change: Partial<SystemPromptState>): void {
    this.state = { ...this.state, ...change }
    this.listeners.forEach((l) => l())
  }
}
