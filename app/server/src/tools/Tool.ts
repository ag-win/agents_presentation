import type { ToolDefinition } from '../domain/Tool.ts'

/** Something the app can run on the model's behalf. `definition` is what the model is shown; `execute` is what runs. */
export interface Tool {
  readonly definition: ToolDefinition
  execute(args: Readonly<Record<string, unknown>>): Promise<string>
}
