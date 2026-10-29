import { ChatMessage } from '../domain/ChatMessage.ts'
import type { RouteEvent } from '../domain/RouteEvent.ts'
import type { SearchResult } from '../domain/Search.ts'
import type { LlmProvider } from '../llm/LlmProvider.ts'
import type { SearchContextFormatter } from '../search/SearchContextFormatter.ts'
import type { SearchProvider } from '../search/SearchProvider.ts'
import { LlmCall } from './LlmCall.ts'
import { RouteLabelParser } from './RouteLabelParser.ts'
import type { RouteRequest } from './RouteRequest.ts'
import type { SpecialistCatalog } from './SpecialistCatalog.ts'

/** A system message only when there is text for it; a blank system prompt means none at all. */
function withSystem(system: string, user: string): ChatMessage[] {
  return system.trim() ? [ChatMessage.system(system), ChatMessage.user(user)] : [ChatMessage.user(user)]
}

/**
 * Search-engine routing:
 *   1. search the web (plain code),
 *   2. a router LLM picks one specialist,
 *   3. that specialist answers, with the search results appended to its system prompt.
 * Every system prompt can be overridden per request (and can be blank).
 */
export class RoutingPipeline {
  private readonly provider: LlmProvider
  private readonly search: SearchProvider
  private readonly catalog: SpecialistCatalog
  private readonly formatter: SearchContextFormatter
  private readonly parser: RouteLabelParser

  constructor(provider: LlmProvider, search: SearchProvider, catalog: SpecialistCatalog, formatter: SearchContextFormatter) {
    this.provider = provider
    this.search = search
    this.catalog = catalog
    this.formatter = formatter
    this.parser = new RouteLabelParser(catalog.ids, catalog.fallback.id)
  }

  async *run(request: RouteRequest, signal: AbortSignal): AsyncIterable<RouteEvent> {
    const { results, error } = await this.searchSafely(request.query, signal)
    const context = this.formatter.format(request.query, results)
    yield { type: 'search', query: request.query, results, context, error }

    const router = new LlmCall(this.provider, 'router')
    const routerSystem = request.systems.router ?? this.catalog.routerPrompt()
    yield* router.run(withSystem(routerSystem, request.query), signal, { temperature: 0, maxTokens: 12, purpose: 'classify' })
    const specialist = this.catalog.byId(this.parser.parse(router.text))
    yield { type: 'route', label: specialist.id }

    // The search results are appended to the specialist's own system prompt (which may have been edited or blanked).
    const ownSystem = request.systems[specialist.id] ?? specialist.systemPrompt
    const fullSystem = [ownSystem, context].filter((part) => part.trim()).join('\n\n')
    const answer = new LlmCall(this.provider, specialist.id)
    yield* answer.run(withSystem(fullSystem, request.query), signal, { temperature: 0.5, maxTokens: 260 })

    yield { type: 'done' }
  }

  private async searchSafely(query: string, signal: AbortSignal): Promise<{ results: readonly SearchResult[]; error: string | null }> {
    try {
      return { results: await this.search.search(query, signal), error: null }
    } catch (error) {
      if (signal.aborted) throw error
      return { results: [], error: error instanceof Error ? error.message : 'The search failed.' }
    }
  }
}
