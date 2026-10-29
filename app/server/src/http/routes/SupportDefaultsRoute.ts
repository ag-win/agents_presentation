import type { SupportService } from '../../application/SupportService.ts'
import type { RequestContext } from '../RequestContext.ts'
import type { Route } from '../Route.ts'

/** GET /api/support/defaults: system prompts, Inbox scenarios, the tool signature and the order table. */
export class SupportDefaultsRoute implements Route {
  readonly method = 'GET'
  readonly path = '/api/support/defaults'

  private readonly service: SupportService

  constructor(service: SupportService) {
    this.service = service
  }

  async handle(ctx: RequestContext): Promise<void> {
    ctx.json(200, this.service.defaults())
  }
}
