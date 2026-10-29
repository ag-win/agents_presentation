import type { SearchResult } from '../domain/Search.ts'

/** Anything that can turn a query into web results (the real Brave API, an offline mock...). */
export interface SearchProvider {
  readonly name: string
  /** True when results come from a real search service rather than canned data. */
  readonly isLive: boolean
  search(query: string, signal: AbortSignal): Promise<readonly SearchResult[]>
}
