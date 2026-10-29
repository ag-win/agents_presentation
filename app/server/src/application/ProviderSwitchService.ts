import type { LlmProvider } from '../llm/LlmProvider.ts'
import type { ProviderRegistry } from '../llm/ProviderRegistry.ts'
import type { SearchProvider } from '../search/SearchProvider.ts'

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

export interface ProvidersState {
  readonly llm: ProviderGroup
  readonly search: ProviderGroup
}

export interface ProvidersChange {
  readonly llm?: string
  readonly search?: string
}

/** Use case: see which model and search service are in use, and switch to a backup while the app is running. */
export class ProviderSwitchService {
  private readonly llm: ProviderRegistry<LlmProvider>
  private readonly search: ProviderRegistry<SearchProvider>

  constructor(llm: ProviderRegistry<LlmProvider>, search: ProviderRegistry<SearchProvider>) {
    this.llm = llm
    this.search = search
  }

  state(): ProvidersState {
    return { llm: this.group(this.llm), search: this.group(this.search) }
  }

  /** Applies the change, or none of it: both choices are checked before either is switched. */
  select(change: ProvidersChange): ProvidersState {
    if (change.llm !== undefined) this.check(this.llm, change.llm)
    if (change.search !== undefined) this.check(this.search, change.search)
    if (change.llm !== undefined) this.llm.select(change.llm)
    if (change.search !== undefined) this.search.select(change.search)
    return this.state()
  }

  private check<T extends { readonly isLive: boolean }>(registry: ProviderRegistry<T>, id: string): void {
    const previous = registry.active.id
    registry.select(id) // throws if unknown or not set up
    registry.select(previous)
  }

  private group<T extends { readonly isLive: boolean }>(registry: ProviderRegistry<T>): ProviderGroup {
    return {
      active: registry.active.id,
      options: registry.list().map((e) => ({ id: e.id, label: e.label, detail: e.detail, available: e.provider !== undefined })),
    }
  }
}
