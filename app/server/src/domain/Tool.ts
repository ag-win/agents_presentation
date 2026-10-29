/** A function the model may ask the app to run. `parameters` is a JSON Schema object (the tool's "signature"). */
export interface ToolDefinition {
  readonly name: string
  readonly description: string
  readonly parameters: Readonly<Record<string, unknown>>
}

/** The model's request to run a tool: which one, with what arguments. The model never runs it itself. */
export interface ToolCall {
  readonly id: string
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
}
