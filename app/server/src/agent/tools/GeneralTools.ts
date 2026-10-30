import type { ToolDefinition } from '../../domain/Tool.ts'
import type { SearchProvider } from '../../search/SearchProvider.ts'
import { Calculator } from '../Calculator.ts'
import { FileSandbox } from '../FileSandbox.ts'
import { SimpleTool, type AgentTool, type ToolCategory, type ToolRunContext } from '../AgentTool.ts'
import type { AgentEvent } from '../../domain/AgentEvent.ts'

const str = (value: unknown): string => (typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value))
const object = (properties: Record<string, unknown>, required: string[]) => ({ type: 'object', properties, required })

export class WebSearchTool extends SimpleTool {
  readonly category: ToolCategory = 'web'
  readonly label = 'Web search'
  readonly definition: ToolDefinition = {
    name: 'web_search',
    description: 'Search the web and get the top results (title, site and a short description).',
    parameters: object({ query: { type: 'string', description: 'What to search for.' } }, ['query']),
  }
  private readonly search: SearchProvider

  constructor(search: SearchProvider) {
    super()
    this.search = search
  }

  protected async execute(args: Readonly<Record<string, unknown>>, ctx: ToolRunContext): Promise<string> {
    const results = (await this.search.search(str(args.query), ctx.signal)).slice(0, 5)
    if (results.length === 0) return 'No results.'
    return results.map((r, i) => `${i + 1}. ${r.title} (${r.host}): ${r.description.slice(0, 260)}`).join('\n')
  }
}

export class CalculatorTool extends SimpleTool {
  readonly category: ToolCategory = 'web'
  readonly label = 'Calculator'
  readonly definition: ToolDefinition = {
    name: 'calculator',
    description: 'Evaluate an arithmetic expression exactly. Supports + - * / % ^ and brackets, for example "(3 * 499 + 5 * 99) * 0.85". Use it for any sum instead of working it out yourself.',
    parameters: object({ expression: { type: 'string', description: 'The arithmetic expression.' } }, ['expression']),
  }

  protected async execute(args: Readonly<Record<string, unknown>>): Promise<string> {
    try {
      return Calculator.format(Calculator.evaluate(str(args.expression)))
    } catch (error) {
      return JSON.stringify({ error: error instanceof Error ? error.message : 'Could not evaluate that' })
    }
  }
}

export class WriteFileTool extends SimpleTool {
  readonly category: ToolCategory = 'files'
  readonly label = 'Write file'
  readonly definition: ToolDefinition = {
    name: 'write_file',
    description: 'Create or overwrite a text file in the agent\'s workspace folder.',
    parameters: object({ filename: { type: 'string', description: 'A simple file name such as "notes.txt" (no folders).' }, content: { type: 'string', description: 'The text to save.' } }, ['filename', 'content']),
  }
  private readonly files: FileSandbox

  constructor(files: FileSandbox) {
    super()
    this.files = files
  }

  protected async execute(args: Readonly<Record<string, unknown>>): Promise<string> {
    try {
      const size = await this.files.write(str(args.filename), str(args.content))
      return `Saved ${str(args.filename)} (${size} characters).`
    } catch (error) {
      return JSON.stringify({ error: error instanceof Error ? error.message : 'Could not write the file' })
    }
  }
}

export class ReadFileTool extends SimpleTool {
  readonly category: ToolCategory = 'files'
  readonly label = 'Read file'
  readonly definition: ToolDefinition = {
    name: 'read_file',
    description: 'Read a text file from the agent\'s workspace folder.',
    parameters: object({ filename: { type: 'string', description: 'The file name, for example "notes.txt".' } }, ['filename']),
  }
  private readonly files: FileSandbox

  constructor(files: FileSandbox) {
    super()
    this.files = files
  }

  protected async execute(args: Readonly<Record<string, unknown>>): Promise<string> {
    try {
      return await this.files.read(str(args.filename))
    } catch (error) {
      return JSON.stringify({ error: error instanceof Error ? error.message : 'Could not read the file' })
    }
  }
}

/** A one-off model call with no tools and no history: "ask a model", for summarising or rewording. */
export class AskModelTool extends SimpleTool {
  readonly category: ToolCategory = 'agents'
  readonly label = 'Ask a model'
  readonly definition: ToolDefinition = {
    name: 'ask_model',
    description: 'Make a single separate call to a language model with a self-contained prompt (include any text it needs) and get its answer. Good for summarising or rewording.',
    parameters: object({ prompt: { type: 'string', description: 'The full prompt, including the text to work on.' } }, ['prompt']),
  }

  protected async execute(args: Readonly<Record<string, unknown>>, ctx: ToolRunContext): Promise<string> {
    return (await ctx.ask(str(args.prompt))).trim() || 'The model returned nothing.'
  }
}

/** Starts a sub-agent: another run of the same loop on a focused task, with its own steps. */
export class SpawnAgentTool implements AgentTool {
  readonly category: ToolCategory = 'agents'
  readonly label = 'Sub-agent'
  readonly definition: ToolDefinition = {
    name: 'spawn_agent',
    description: 'Start a sub-agent to complete one focused task on its own (it has the same tools except this one) and return its short answer. Start several at once for independent tasks.',
    parameters: object({ task: { type: 'string', description: 'A self-contained task, including every detail the sub-agent needs.' } }, ['task']),
  }

  async *run(args: Readonly<Record<string, unknown>>, ctx: ToolRunContext): AsyncGenerator<AgentEvent, string> {
    const task = str(args.task).trim()
    if (!task) return JSON.stringify({ error: 'A task is required' })
    return yield* ctx.spawn(task)
  }
}
