import type { SearchResult } from '../domain/Search.ts'
import { UpstreamError } from '../errors/AppError.ts'
import type { FetchLike } from '../net/FetchLike.ts'
import { htmlToText } from './htmlText.ts'
import type { SearchProvider } from './SearchProvider.ts'

export interface BraveOptions {
  readonly apiKey: string
  readonly baseUrl: string
  readonly count: number
  readonly fetch?: FetchLike
}

interface BraveResponse {
  web?: { results?: { title?: string; url?: string; description?: string; extra_snippets?: string[] }[] }
}

/** Real web search through the Brave Search API (https://api.search.brave.com, key in X-Subscription-Token). */
export class BraveSearchProvider implements SearchProvider {
  readonly name = 'brave'
  readonly isLive = true

  private readonly options: BraveOptions
  private readonly fetchFn: FetchLike

  constructor(options: BraveOptions) {
    this.options = options
    this.fetchFn = options.fetch ?? ((url, init) => fetch(url, init))
  }

  async search(query: string, signal: AbortSignal): Promise<readonly SearchResult[]> {
    const params = new URLSearchParams({ q: query, count: String(this.options.count), extra_snippets: 'true', text_decorations: 'false' })
    let response: Response
    try {
      response = await this.fetchFn(`${this.options.baseUrl}/res/v1/web/search?${params}`, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': this.options.apiKey },
        signal,
      })
    } catch (cause) {
      if (signal.aborted) throw cause
      throw new UpstreamError('Could not reach Brave Search (network problem?)', { cause })
    }
    if (!response.ok) throw this.describeFailure(response.status)

    const body = (await response.json()) as BraveResponse
    return (body.web?.results ?? [])
      .filter((r) => r.url && r.title)
      .slice(0, this.options.count)
      .map((r) => ({
        title: htmlToText(r.title ?? ''),
        url: r.url ?? '',
        host: BraveSearchProvider.hostOf(r.url ?? ''),
        description: htmlToText(r.description ?? ''),
        snippets: (r.extra_snippets ?? []).map(htmlToText).filter((s) => s.length > 0),
      }))
  }

  private describeFailure(status: number): UpstreamError {
    if (status === 401 || status === 403) return new UpstreamError('Brave Search rejected the API key. Check BRAVE_API_KEY in app/server/.env.')
    if (status === 429) return new UpstreamError('Brave Search rate limit reached. Wait a moment and try again.')
    return new UpstreamError(`Brave Search returned HTTP ${status}`)
  }

  private static hostOf(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }
}
