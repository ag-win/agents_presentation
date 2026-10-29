import type { ChainService } from '../../application/ChainService.ts'
import type { ServiceInfo } from '../../application/SingleCallService.ts'
import { Conversation, type ConversationLimits } from '../../domain/Conversation.ts'
import type { Logger } from '../../logging/Logger.ts'
import { NdjsonStreamRoute } from './NdjsonStreamRoute.ts'

/**
 * POST /api/chain/stream {"message": "...", "history": [{"role":"user"|"assistant","content":"..."}]}
 * Streams the prompt chain step by step: step_start, token..., step_end, gate verdict, ..., then {"type":"done"}.
 */
export class ChainStreamRoute extends NdjsonStreamRoute<Conversation> {
  readonly path = '/api/chain/stream'

  private readonly service: ChainService
  private readonly limits: ConversationLimits

  constructor(service: ChainService, limits: ConversationLimits, logger: Logger) {
    super(logger)
    this.service = service
    this.limits = limits
  }

  protected parse(body: unknown): Conversation {
    return Conversation.parse(body, this.limits)
  }

  protected describe(): ServiceInfo {
    return this.service.info()
  }

  protected events(conversation: Conversation, signal: AbortSignal): AsyncIterable<unknown> {
    return this.service.run(conversation, signal)
  }
}
