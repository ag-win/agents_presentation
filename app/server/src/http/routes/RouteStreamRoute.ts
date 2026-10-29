import type { RoutingService } from '../../application/RoutingService.ts'
import type { ServiceInfo } from '../../application/SingleCallService.ts'
import type { Logger } from '../../logging/Logger.ts'
import { RouteRequest, type RouteLimits } from '../../routing/RouteRequest.ts'
import { NdjsonStreamRoute } from './NdjsonStreamRoute.ts'

/**
 * POST /api/route/stream {"query": "...", "systems": {"router": "...", "food": "..."}?}
 * Streams: search results, the router step, the chosen route, the specialist's answer, then {"type":"done"}.
 */
export class RouteStreamRoute extends NdjsonStreamRoute<RouteRequest> {
  readonly path = '/api/route/stream'

  private readonly service: RoutingService
  private readonly limits: RouteLimits

  constructor(service: RoutingService, limits: RouteLimits, logger: Logger) {
    super(logger)
    this.service = service
    this.limits = limits
  }

  protected parse(body: unknown): RouteRequest {
    return RouteRequest.parse(body, this.service.allowedIds, this.limits)
  }

  protected describe(): ServiceInfo {
    return this.service.info()
  }

  protected events(request: RouteRequest, signal: AbortSignal): AsyncIterable<unknown> {
    return this.service.run(request, signal)
  }
}
