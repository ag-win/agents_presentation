import type { RoutingService } from '../../application/RoutingService.ts'
import type { RequestContext } from '../RequestContext.ts'
import type { Route } from '../Route.ts'

/** GET /api/route/defaults: the default system prompts and which search service is in use. */
export class RouteDefaultsRoute implements Route {
  readonly method = 'GET'
  readonly path = '/api/route/defaults'

  private readonly service: RoutingService

  constructor(service: RoutingService) {
    this.service = service
  }

  async handle(ctx: RequestContext): Promise<void> {
    ctx.json(200, this.service.defaults())
  }
}
