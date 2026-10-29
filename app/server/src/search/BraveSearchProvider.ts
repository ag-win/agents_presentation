import type { SearchResult } from '../domain/Search.ts'
import { UpstreamError } from '../errors/AppError.ts'
import type { FetchLike } from '../net/FetchLike.ts'
import { RequestGate } from '../net/RequestGate.ts'
import { htmlToText } from './htmlText.ts'
import type { SearchProvider } from './SearchProvider.ts'

export interface BraveOptions {
  readonly apiKey: string
  readonly baseUrl: string
  readonly count: number
  readonly fetch?: FetchLike
  /** Minimum pause between requests. The free plan allows one request at a time, about one per second. */
  readonly minIntervalMs?: number
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
  private readonly gate: RequestGate
  private readonly pauseMs: number

  constructor(options: BraveOptions) {
    this.options = options
    this.fetchFn = options.fetch ?? ((url, init) => fetch(url, init))
    this.pauseMs = options.minIntervalMs ?? 1100
    this.gate = new RequestGate(this.pauseMs)
  }

  /** Searches go through a gate, so concurrent callers are queued: only one request is ever in flight. */
  search(query: string, signal: AbortSignal): Promise<readonly SearchResult[]> {
    return this.gate.run(() => this.attempt(query, signal, true))
  }

  private async attempt(query: string, signal: AbortSignal, mayRetry: boolean): Promise<readonly SearchResult[]> {
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
    if (response.status === 429 && mayRetry) {
      await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs(response)))
      return this.attempt(query, signal, false) // once; a second 429 is reported
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

  /** How long to wait after a 429: what Brave says (Retry-After, or the first X-RateLimit-Reset value), at least our pause, at most 3 s. */
  private retryDelayMs(response: Response): number {
    const said = Number(response.headers.get('retry-after') ?? response.headers.get('x-ratelimit-reset')?.split(',')[0])
    const ms = Number.isFinite(said) && said > 0 ? said * 1000 : this.pauseMs
    return Math.min(Math.max(ms, this.pauseMs), 3000)
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
