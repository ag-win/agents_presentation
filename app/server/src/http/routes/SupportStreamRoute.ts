import type { ServiceInfo } from '../../application/SingleCallService.ts'
import type { SupportService } from '../../application/SupportService.ts'
import type { Logger } from '../../logging/Logger.ts'
import { SupportRequest, type SupportLimits } from '../../support/SupportRequest.ts'
import { NdjsonStreamRoute } from './NdjsonStreamRoute.ts'

/**
 * POST /api/support/stream {"message": "...", "systems": {"router": "..."}?, "stopAfter": "route"?}
 * Streams every stage of the support desk (stage_start, token, tool_call, decision, ...), then the reply and {"type":"done"}.
 */
export class SupportStreamRoute extends NdjsonStreamRoute<SupportRequest> {
  readonly path = '/api/support/stream'

  private readonly service: SupportService
  private readonly limits: SupportLimits

  constructor(service: SupportService, limits: SupportLimits, logger: Logger) {
    super(logger)
    this.service = service
    this.limits = limits
  }

  protected parse(body: unknown): SupportRequest {
    return SupportRequest.parse(body, this.service.allowedIds, this.limits)
  }

  protected describe(): ServiceInfo {
    return this.service.info()
  }

  protected events(request: SupportRequest, signal: AbortSignal): AsyncIterable<unknown> {
    return this.service.run(request, signal)
  }
}
