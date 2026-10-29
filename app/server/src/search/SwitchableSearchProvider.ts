import type { SearchResult } from '../domain/Search.ts'
import type { ProviderRegistry } from '../llm/ProviderRegistry.ts'
import type { SearchProvider } from './SearchProvider.ts'

/** A SearchProvider that always forwards to whichever provider is active in the registry (a proxy). */
export class SwitchableSearchProvider implements SearchProvider {
  private readonly registry: ProviderRegistry<SearchProvider>

  constructor(registry: ProviderRegistry<SearchProvider>) {
    this.registry = registry
  }

  get name(): string {
    return this.registry.active.provider.name
  }

  get isLive(): boolean {
    return this.registry.active.provider.isLive
  }

  search(query: string, signal: AbortSignal): Promise<readonly SearchResult[]> {
    return this.registry.active.provider.search(query, signal)
  }
}
