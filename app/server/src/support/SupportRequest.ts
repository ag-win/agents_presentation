import { ValidationError } from '../errors/AppError.ts'

export interface SupportLimits {
  readonly maxMessage: number
  readonly maxSystem: number
}

/** One customer message, optional edited system prompts keyed by prompt id, and optionally "stop after routing" (test bench). */
export class SupportRequest {
  readonly message: string
  readonly systems: Readonly<Record<string, string>>
  readonly stopAfterRoute: boolean

  private constructor(message: string, systems: Record<string, string>, stopAfterRoute: boolean) {
    this.message = message
    this.systems = systems
    this.stopAfterRoute = stopAfterRoute
  }

  static parse(raw: unknown, allowedIds: readonly string[], limits: SupportLimits): SupportRequest {
    const body = (raw ?? {}) as { message?: unknown; systems?: unknown; stopAfter?: unknown }
    if (typeof body.message !== 'string' || body.message.trim() === '') throw new ValidationError('"message" must be a non-empty string')
    const message = body.message.trim()
    if (message.length > limits.maxMessage) throw new ValidationError(`"message" must be at most ${limits.maxMessage} characters`)
    if (body.stopAfter !== undefined && body.stopAfter !== 'route') throw new ValidationError('"stopAfter" can only be "route"')

    const systems: Record<string, string> = {}
    if (body.systems !== undefined && body.systems !== null) {
      if (typeof body.systems !== 'object' || Array.isArray(body.systems)) throw new ValidationError('"systems" must be an object')
      for (const [id, text] of Object.entries(body.systems)) {
        if (!allowedIds.includes(id)) throw new ValidationError(`unknown system prompt "${id}"`)
        if (typeof text !== 'string') throw new ValidationError(`system prompt "${id}" must be a string`)
        if (text.length > limits.maxSystem) throw new ValidationError(`system prompt "${id}" must be at most ${limits.maxSystem} characters`)
        systems[id] = text.trim()
      }
    }
    return new SupportRequest(message, systems, body.stopAfter === 'route')
  }
}
