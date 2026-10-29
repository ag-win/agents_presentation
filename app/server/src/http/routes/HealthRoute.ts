import type { SingleCallService } from '../../application/SingleCallService.ts'
import type { RequestContext } from '../RequestContext.ts'
import type { Route } from '../Route.ts'

/** Lets the UI show which model answers (or that the offline mock is in use). */
export class HealthRoute implements Route {
  readonly method = 'GET'
  readonly path = '/api/health'

  private readonly service: SingleCallService

  constructor(service: SingleCallService) {
    this.service = service
  }

  async handle(ctx: RequestContext): Promise<void> {
    ctx.json(200, { status: 'ok', ...this.service.info() })
  }
}
