import { ValidationError } from '../errors/AppError.ts'

export interface RouteLimits {
  readonly maxQuery: number
  readonly maxSystem: number
}

/** One search query plus, optionally, edited system prompts keyed by LLM id ("router", "food", ...). */
export class RouteRequest {
  readonly query: string
  /** Only the prompts the caller supplied. An empty string means "send no system prompt". */
  readonly systems: Readonly<Record<string, string>>

  private constructor(query: string, systems: Record<string, string>) {
    this.query = query
    this.systems = systems
  }

  static parse(raw: unknown, allowedIds: readonly string[], limits: RouteLimits): RouteRequest {
    const body = (raw ?? {}) as { query?: unknown; systems?: unknown }
    if (typeof body.query !== 'string' || body.query.trim() === '') throw new ValidationError('"query" must be a non-empty string')
    const query = body.query.trim()
    if (query.length > limits.maxQuery) throw new ValidationError(`"query" must be at most ${limits.maxQuery} characters`)

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
    return new RouteRequest(query, systems)
  }
}
