import type { AppConfig } from '../config/AppConfig.ts'
import { ProviderRegistry } from '../llm/ProviderRegistry.ts'
import { BraveSearchProvider } from './BraveSearchProvider.ts'
import { MockSearchProvider } from './MockSearchProvider.ts'
import type { SearchProvider } from './SearchProvider.ts'

/** Builds the set of web search services: Brave when a key is configured, plus an always-available backup. */
export class SearchProviderFactory {
  static createRegistry(config: AppConfig): ProviderRegistry<SearchProvider> {
    const brave = config.braveApiKey
      ? new BraveSearchProvider({ apiKey: config.braveApiKey, baseUrl: config.braveBaseUrl, count: config.searchResultCount })
      : undefined
    return new ProviderRegistry<SearchProvider>(
      [
        { id: 'brave', label: 'Brave Search', detail: 'live web results', provider: brave },
        { id: 'backup', label: 'Backup results', detail: 'sample results, no network', provider: new MockSearchProvider() },
      ],
      config.llmPreference === 'mock' ? 'backup' : undefined,
    )
  }
}
