import type { SingleCallService } from '../../application/SingleCallService.ts'
import { Prompt } from '../../domain/Prompt.ts'
import { AppError } from '../../errors/AppError.ts'
import type { Logger } from '../../logging/Logger.ts'
import type { RequestContext } from '../RequestContext.ts'
import type { Route } from '../Route.ts'

/**
 * POST /api/llm/stream {"prompt": "..."}  ->  NDJSON lines:
 *   {"type":"start","provider":...,"model":...}  then many {"type":"token","text":...}
 *   then {"type":"done","stats":{...}}  or  {"type":"error","message":...}
 */
export class StreamRoute implements Route {
  readonly method = 'POST'
  readonly path = '/api/llm/stream'

  private readonly service: SingleCallService
  private readonly maxPromptChars: number
  private readonly logger: Logger

  constructor(service: SingleCallService, maxPromptChars: number, logger: Logger) {
    this.service = service
    this.maxPromptChars = maxPromptChars
    this.logger = logger
  }

  async handle(ctx: RequestContext): Promise<void> {
    const body = (await ctx.readJson()) as { prompt?: unknown } | null
    const prompt = Prompt.parse(body?.prompt, this.maxPromptChars) // a bad request fails here, before streaming starts

    const stream = ctx.ndjson()
    const info = this.service.info()
    stream.write({ type: 'start', provider: info.provider, model: info.model, live: info.live })
    try {
      for await (const event of this.service.stream(prompt, ctx.signal)) stream.write(event)
    } catch (error) {
      if (!ctx.signal.aborted) {
        this.logger.warn(`stream failed: ${error instanceof Error ? error.message : String(error)}`)
        const message = error instanceof AppError ? error.message : 'Something went wrong while generating the answer.'
        stream.write({ type: 'error', message })
      }
    } finally {
      stream.end()
    }
  }
}
