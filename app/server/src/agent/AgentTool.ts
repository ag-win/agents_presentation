import type { AgentEvent } from '../domain/AgentEvent.ts'
import type { ToolDefinition } from '../domain/Tool.ts'

export type ToolCategory = 'shop' | 'web' | 'files' | 'agents'

/** What a tool may use while it runs: the abort signal, and ways to start a sub-agent or make a one-off model call. */
export interface ToolRunContext {
  readonly signal: AbortSignal
  readonly callId: string
  /** Run a sub-agent on a task. Its events stream out through the tool. Resolves to its final answer. */
  spawn(task: string): AsyncGenerator<AgentEvent, string>
  /** A single plain model call with no tools. */
  ask(prompt: string): Promise<string>
}

/**
 * Something an agent can do. `definition` (name, description, parameters) is all the model is shown;
 * `run` is the code the harness runs when the model asks. Most tools just return a string; a sub-agent tool streams events too.
 */
export interface AgentTool {
  readonly category: ToolCategory
  /** Short name for the palette box. */
  readonly label: string
  readonly definition: ToolDefinition
  run(args: Readonly<Record<string, unknown>>, ctx: ToolRunContext): AsyncGenerator<AgentEvent, string>
}

/** Base for the common case: a tool that is one async function. */
export abstract class SimpleTool implements AgentTool {
  abstract readonly category: ToolCategory
  abstract readonly label: string
  abstract readonly definition: ToolDefinition

  protected abstract execute(args: Readonly<Record<string, unknown>>, ctx: ToolRunContext): Promise<string>

  async *run(args: Readonly<Record<string, unknown>>, ctx: ToolRunContext): AsyncGenerator<AgentEvent, string> {
    return await this.execute(args, ctx)
  }
}

/** The tools an agent run can draw on, looked up by name. */
export class AgentToolbox {
  readonly tools: readonly AgentTool[]

  constructor(tools: readonly AgentTool[]) {
    this.tools = tools
  }

  get names(): string[] {
    return this.tools.map((t) => t.definition.name)
  }

  get(name: string): AgentTool | undefined {
    return this.tools.find((t) => t.definition.name === name)
  }

  definitions(names: readonly string[]): ToolDefinition[] {
    return this.tools.filter((t) => names.includes(t.definition.name)).map((t) => t.definition)
  }
}
