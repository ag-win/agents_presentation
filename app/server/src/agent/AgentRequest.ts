import { ValidationError } from '../errors/AppError.ts'

export interface AgentRequestLimits {
  readonly maxTask: number
  readonly maxSystem: number
}

/** One task, which tools are switched on (all if not given), and optionally edited system prompts (blank allowed). */
export class AgentRequest {
  readonly task: string
  readonly tools: readonly string[]
  readonly systems: Readonly<Record<string, string>>

  private constructor(task: string, tools: readonly string[], systems: Record<string, string>) {
    this.task = task
    this.tools = tools
    this.systems = systems
  }

  static parse(raw: unknown, toolNames: readonly string[], promptIds: readonly string[], limits: AgentRequestLimits): AgentRequest {
    const body = (raw ?? {}) as { task?: unknown; tools?: unknown; systems?: unknown }
    if (typeof body.task !== 'string' || body.task.trim() === '') throw new ValidationError('"task" must be a non-empty string')
    const task = body.task.trim()
    if (task.length > limits.maxTask) throw new ValidationError(`"task" must be at most ${limits.maxTask} characters`)

    let tools = toolNames
    if (body.tools !== undefined && body.tools !== null) {
      if (!Array.isArray(body.tools) || body.tools.some((t) => typeof t !== 'string')) throw new ValidationError('"tools" must be a list of tool names')
      const unknown = (body.tools as string[]).find((t) => !toolNames.includes(t))
      if (unknown) throw new ValidationError(`unknown tool "${unknown}"`)
      tools = body.tools as string[]
    }

    const systems: Record<string, string> = {}
    if (body.systems !== undefined && body.systems !== null) {
      if (typeof body.systems !== 'object' || Array.isArray(body.systems)) throw new ValidationError('"systems" must be an object')
      for (const [id, text] of Object.entries(body.systems)) {
        if (!promptIds.includes(id)) throw new ValidationError(`unknown system prompt "${id}"`)
        if (typeof text !== 'string') throw new ValidationError(`system prompt "${id}" must be a string`)
        if (text.length > limits.maxSystem) throw new ValidationError(`system prompt "${id}" must be at most ${limits.maxSystem} characters`)
        systems[id] = text.trim()
      }
    }
    return new AgentRequest(task, tools, systems)
  }
}
