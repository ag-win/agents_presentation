import type { ProviderSwitchService, ProvidersChange } from '../../application/ProviderSwitchService.ts'
import { ValidationError } from '../../errors/AppError.ts'
import type { RequestContext } from '../RequestContext.ts'
import type { Route } from '../Route.ts'

/** GET /api/providers: which model and search service are active, and which backups are set up. */
export class ProvidersStateRoute implements Route {
  readonly method = 'GET'
  readonly path = '/api/providers'

  private readonly service: ProviderSwitchService

  constructor(service: ProviderSwitchService) {
    this.service = service
  }

  async handle(ctx: RequestContext): Promise<void> {
    ctx.json(200, this.service.state())
  }
}

/** POST /api/providers {"llm": "bedrock", "search": "backup"}: switch (either field optional). Answers with the new state. */
export class ProvidersSelectRoute implements Route {
  readonly method = 'POST'
  readonly path = '/api/providers'

  private readonly service: ProviderSwitchService

  constructor(service: ProviderSwitchService) {
    this.service = service
  }

  async handle(ctx: RequestContext): Promise<void> {
    const body = ((await ctx.readJson()) ?? {}) as { llm?: unknown; search?: unknown }
    const change: { llm?: string; search?: string } = {}
    for (const key of ['llm', 'search'] as const) {
      if (body[key] === undefined) continue
      if (typeof body[key] !== 'string') throw new ValidationError(`"${key}" must be a string`)
      change[key] = body[key]
    }
    ctx.json(200, this.service.select(change satisfies ProvidersChange))
  }
}
