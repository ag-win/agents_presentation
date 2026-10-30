import type { AppConfig } from '../../config/AppConfig.ts'
import type { RequestContext } from '../RequestContext.ts'
import type { Route } from '../Route.ts'

/** GET /api/config: the few settings the slides show (never anything secret). */
export class ConfigRoute implements Route {
  readonly method = 'GET'
  readonly path = '/api/config'

  private readonly config: AppConfig

  constructor(config: AppConfig) {
    this.config = config
  }

  async handle(ctx: RequestContext): Promise<void> {
    ctx.json(200, { presenterName: this.config.presenterName })
  }
}
