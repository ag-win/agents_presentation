import type { ServiceInfo, SingleCallService } from '../../application/SingleCallService.ts'
import { Prompt } from '../../domain/Prompt.ts'
import type { Logger } from '../../logging/Logger.ts'
import { NdjsonStreamRoute } from './NdjsonStreamRoute.ts'

/**
 * POST /api/llm/stream {"prompt": "..."}  ->  start, many {"type":"token","text":...}, then {"type":"done","stats":{...}}.
 * One prompt, one model call.
 */
export class StreamRoute extends NdjsonStreamRoute<Prompt> {
  readonly path = '/api/llm/stream'

  private readonly service: SingleCallService
  private readonly maxPromptChars: number

  constructor(service: SingleCallService, maxPromptChars: number, logger: Logger) {
    super(logger)
    this.service = service
    this.maxPromptChars = maxPromptChars
  }

  protected parse(body: unknown): Prompt {
    return Prompt.parse((body as { prompt?: unknown } | null)?.prompt, this.maxPromptChars)
  }

  protected describe(): ServiceInfo {
    return this.service.info()
  }

  protected events(prompt: Prompt, signal: AbortSignal): AsyncIterable<unknown> {
    return this.service.stream(prompt, signal)
  }
}
