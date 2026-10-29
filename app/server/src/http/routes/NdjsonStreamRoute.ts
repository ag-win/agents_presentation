import type { ServiceInfo } from '../../application/SingleCallService.ts'
import { AppError } from '../../errors/AppError.ts'
import type { Logger } from '../../logging/Logger.ts'
import type { RequestContext } from '../RequestContext.ts'
import type { Route } from '../Route.ts'

/**
 * Template method for POST endpoints that stream newline-delimited JSON:
 *   {"type":"start",...}  then each event the subclass produces  then (on failure) {"type":"error","message":...}.
 * Subclasses only say how to read the request and what events to stream.
 */
export abstract class NdjsonStreamRoute<TInput> implements Route {
  readonly method = 'POST'
  abstract readonly path: string

  protected readonly logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  /** Validate the body. Throwing here answers with a normal JSON error, before any streaming starts. */
  protected abstract parse(body: unknown): TInput
  protected abstract describe(): ServiceInfo
  protected abstract events(input: TInput, signal: AbortSignal): AsyncIterable<unknown>

  async handle(ctx: RequestContext): Promise<void> {
    const input = this.parse(await ctx.readJson())

    const stream = ctx.ndjson()
    const info = this.describe()
    stream.write({ type: 'start', provider: info.provider, model: info.model, live: info.live })
    try {
      for await (const event of this.events(input, ctx.signal)) stream.write(event)
    } catch (error) {
      if (!ctx.signal.aborted) {
        this.logger.warn(`stream failed on ${this.path}: ${error instanceof Error ? error.message : String(error)}`)
        const message = error instanceof AppError ? error.message : 'Something went wrong while generating the answer.'
        stream.write({ type: 'error', message })
      }
    } finally {
      stream.end()
    }
  }
}
