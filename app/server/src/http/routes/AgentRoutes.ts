import type { ServiceInfo } from '../../application/SingleCallService.ts'
import type { AgentService } from '../../application/AgentService.ts'
import { AgentRequest, type AgentRequestLimits } from '../../agent/AgentRequest.ts'
import { ValidationError } from '../../errors/AppError.ts'
import type { Logger } from '../../logging/Logger.ts'
import type { RequestContext } from '../RequestContext.ts'
import type { Route } from '../Route.ts'
import { NdjsonStreamRoute } from './NdjsonStreamRoute.ts'

/**
 * POST /api/agent/stream {"task": "...", "tools": ["web_search"]?, "systems": {"agent": "..."}?}
 * Streams every box the agent creates (agent_start, llm_start, token, tool_call, tool_result, ...), then final and done.
 */
export class AgentStreamRoute extends NdjsonStreamRoute<AgentRequest> {
  readonly path = '/api/agent/stream'

  private readonly service: AgentService
  private readonly limits: AgentRequestLimits

  constructor(service: AgentService, limits: AgentRequestLimits, logger: Logger) {
    super(logger)
    this.service = service
    this.limits = limits
  }

  protected parse(body: unknown): AgentRequest {
    return AgentRequest.parse(body, this.service.toolNames, this.service.promptIds, this.limits)
  }

  protected describe(): ServiceInfo {
    return this.service.info()
  }

  protected events(request: AgentRequest, signal: AbortSignal): AsyncIterable<unknown> {
    return this.service.run(request, signal)
  }
}

/** GET /api/agent/defaults: the toolbox, system prompts, starter messages and the files in the workspace. */
export class AgentDefaultsRoute implements Route {
  readonly method = 'GET'
  readonly path = '/api/agent/defaults'

  private readonly service: AgentService

  constructor(service: AgentService) {
    this.service = service
  }

  async handle(ctx: RequestContext): Promise<void> {
    ctx.json(200, await this.service.defaults())
  }
}

/** POST /api/agent/workspace/clear: delete the files the agent has written. */
export class AgentWorkspaceClearRoute implements Route {
  readonly method = 'POST'
  readonly path = '/api/agent/workspace/clear'

  private readonly service: AgentService

  constructor(service: AgentService) {
    this.service = service
  }

  async handle(ctx: RequestContext): Promise<void> {
    await this.service.clearWorkspace()
    ctx.json(200, { ok: true })
  }
}

/** POST /api/agent/decision {"run": "...", "call": "a0.s1.c1", "approved": true}: a person's answer to a paused tool. */
export class AgentDecisionRoute implements Route {
  readonly method = 'POST'
  readonly path = '/api/agent/decision'

  private readonly service: AgentService

  constructor(service: AgentService) {
    this.service = service
  }

  async handle(ctx: RequestContext): Promise<void> {
    const body = (await ctx.readJson()) as { run?: unknown; call?: unknown; approved?: unknown } | null
    if (typeof body?.run !== 'string' || typeof body.call !== 'string' || typeof body.approved !== 'boolean') {
      throw new ValidationError('"run" and "call" must be strings and "approved" must be true or false')
    }
    ctx.json(200, { ok: this.service.decide(body.run, body.call, body.approved) })
  }
}
