import type { ServiceInfo, SingleCallService } from '../../application/SingleCallService.ts'
import { Prompt } from '../../domain/Prompt.ts'
import { SystemPrompt } from '../../domain/SystemPrompt.ts'
import type { Logger } from '../../logging/Logger.ts'
import { NdjsonStreamRoute } from './NdjsonStreamRoute.ts'

interface SingleCallInput {
  readonly prompt: Prompt
  /** Absent = use the built-in system prompt. */
  readonly system: SystemPrompt | undefined
}

/**
 * POST /api/llm/stream {"prompt": "...", "system": "..."?}  ->  start, many {"type":"token","text":...},
 * then {"type":"done","stats":{...}}. One prompt, one model call. `system` optionally replaces the built-in
 * system prompt for this call (an empty string sends none).
 */
export class StreamRoute extends NdjsonStreamRoute<SingleCallInput> {
  readonly path = '/api/llm/stream'

  private readonly service: SingleCallService
  private readonly maxPromptChars: number
  private readonly maxSystemChars: number

  constructor(service: SingleCallService, maxPromptChars: number, logger: Logger, maxSystemChars = 1500) {
    super(logger)
    this.service = service
    this.maxPromptChars = maxPromptChars
    this.maxSystemChars = maxSystemChars
  }

  protected parse(body: unknown): SingleCallInput {
    const b = (body ?? {}) as { prompt?: unknown; system?: unknown }
    return { prompt: Prompt.parse(b.prompt, this.maxPromptChars), system: SystemPrompt.parse(b.system, this.maxSystemChars) }
  }

  protected describe(): ServiceInfo {
    return this.service.info()
  }

  protected events(input: SingleCallInput, signal: AbortSignal): AsyncIterable<unknown> {
    return this.service.stream(input.prompt, signal, input.system)
  }
}
