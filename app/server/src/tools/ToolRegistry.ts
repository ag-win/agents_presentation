import type { ToolCall, ToolDefinition } from '../domain/Tool.ts'
import type { Tool } from './Tool.ts'

/** The tools a harness offers the model, and the code that runs them. The model only ever sees the definitions. */
export class ToolRegistry {
  private readonly tools: readonly Tool[]

  constructor(tools: readonly Tool[]) {
    this.tools = tools
  }

  definitions(): readonly ToolDefinition[] {
    return this.tools.map((t) => t.definition)
  }

  /** Runs the requested tool. Problems come back as text for the model to read, they do not crash the run. */
  async execute(call: ToolCall): Promise<string> {
    const tool = this.tools.find((t) => t.definition.name === call.name)
    if (!tool) return JSON.stringify({ error: `Unknown tool "${call.name}"` })
    try {
      return await tool.execute(call.arguments)
    } catch (error) {
      return JSON.stringify({ error: error instanceof Error ? error.message : 'The tool failed' })
    }
  }
}
