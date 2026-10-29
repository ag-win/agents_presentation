import type { AppConfig } from '../config/AppConfig.ts'
import { BraveSearchProvider } from './BraveSearchProvider.ts'
import { MockSearchProvider } from './MockSearchProvider.ts'
import type { SearchProvider } from './SearchProvider.ts'

/** Brave when a key is configured (and mock mode is not forced), otherwise the offline mock. */
export class SearchProviderFactory {
  static create(config: AppConfig): SearchProvider {
    if (config.provider === 'mock' || !config.braveApiKey) return new MockSearchProvider()
    return new BraveSearchProvider({ apiKey: config.braveApiKey, baseUrl: config.braveBaseUrl, count: config.searchResultCount })
  }
}
