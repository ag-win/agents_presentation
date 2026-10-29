import { ValidationError } from '../errors/AppError.ts'

/** One choice in a registry. `provider` is absent when it is not configured (e.g. no API key), so it cannot be selected. */
export interface RegistryEntry<T> {
  readonly id: string
  readonly label: string
  /** Short description shown next to the choice (model name, region...). */
  readonly detail: string
  readonly provider: T | undefined
}

/**
 * A set of interchangeable providers of one kind (language models, or web search) with one of them active.
 * The active one can change while the app runs; anything that holds a SwitchableProvider follows it.
 */
export class ProviderRegistry<T extends { readonly isLive: boolean }> {
  private readonly entries: readonly RegistryEntry<T>[]
  private activeId: string

  /** `preferredId` is used if it is available; otherwise the first available entry. */
  constructor(entries: readonly RegistryEntry<T>[], preferredId?: string) {
    const preferred = entries.find((e) => e.id === preferredId && e.provider)
    const first = entries.find((e) => e.provider)
    if (!preferred && !first) throw new Error('a registry needs at least one available provider')
    this.entries = entries
    this.activeId = (preferred ?? (first as RegistryEntry<T>)).id
  }

  get active(): RegistryEntry<T> & { readonly provider: T } {
    return this.entries.find((e) => e.id === this.activeId) as RegistryEntry<T> & { readonly provider: T }
  }

  list(): readonly RegistryEntry<T>[] {
    return this.entries
  }

  select(id: string): void {
    const entry = this.entries.find((e) => e.id === id)
    if (!entry) throw new ValidationError(`unknown choice "${id}"`)
    if (!entry.provider) throw new ValidationError(`"${entry.label}" is not set up. Add its key to app/server/.env and restart.`)
    this.activeId = id
  }
}
