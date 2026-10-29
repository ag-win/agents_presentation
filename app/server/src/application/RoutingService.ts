import type { RouteEvent } from '../domain/RouteEvent.ts'
import type { LlmProvider } from '../llm/LlmProvider.ts'
import type { RouteRequest } from '../routing/RouteRequest.ts'
import type { RoutingPipeline } from '../routing/RoutingPipeline.ts'
import type { SpecialistCatalog } from '../routing/SpecialistCatalog.ts'
import type { SearchProvider } from '../search/SearchProvider.ts'
import type { ServiceInfo } from './SingleCallService.ts'

export interface RoutingDefaults {
  readonly search: { readonly provider: string; readonly live: boolean }
  readonly router: { readonly id: string; readonly name: string; readonly systemPrompt: string }
  readonly specialists: readonly { readonly id: string; readonly name: string; readonly systemPrompt: string }[]
}

/** Use case: answer a search query by routing it to the right specialist. */
export class RoutingService {
  private readonly pipeline: RoutingPipeline
  private readonly provider: LlmProvider
  private readonly search: SearchProvider
  private readonly catalog: SpecialistCatalog

  constructor(pipeline: RoutingPipeline, provider: LlmProvider, search: SearchProvider, catalog: SpecialistCatalog) {
    this.pipeline = pipeline
    this.provider = provider
    this.search = search
    this.catalog = catalog
  }

  run(request: RouteRequest, signal: AbortSignal): AsyncIterable<RouteEvent> {
    return this.pipeline.run(request, signal)
  }

  info(): ServiceInfo {
    return { provider: this.provider.name, model: this.provider.model, live: this.provider.isLive }
  }

  get allowedIds(): string[] {
    return ['router', ...this.catalog.ids]
  }

  /** What the UI shows in each LLM's system-prompt dropdown before anything is edited. */
  defaults(): RoutingDefaults {
    return {
      search: { provider: this.search.name, live: this.search.isLive },
      router: { id: 'router', name: 'Router', systemPrompt: this.catalog.routerPrompt() },
      specialists: this.catalog.specialists.map((s) => ({ id: s.id, name: s.name, systemPrompt: s.systemPrompt })),
    }
  }
}
