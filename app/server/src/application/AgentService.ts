import type { AgentEvent } from '../domain/AgentEvent.ts'
import type { LlmProvider } from '../llm/LlmProvider.ts'
import { AgentBudget, AgentLoop } from '../agent/AgentLoop.ts'
import type { AgentPromptCatalog } from '../agent/AgentPrompts.ts'
import type { AgentRequest } from '../agent/AgentRequest.ts'
import type { AgentTaskCatalog } from '../agent/AgentTaskCatalog.ts'
import type { AgentToolbox } from '../agent/AgentTool.ts'
import type { FileSandbox } from '../agent/FileSandbox.ts'
import type { ScenarioCatalog } from '../support/ScenarioCatalog.ts'
import type { ServiceInfo } from './SingleCallService.ts'

/** Use case: let an agent work on a task with a toolbox, streaming every step it takes. */
export class AgentService {
  private readonly loop: AgentLoop
  private readonly provider: LlmProvider
  private readonly toolbox: AgentToolbox
  private readonly prompts: AgentPromptCatalog
  private readonly tasks: AgentTaskCatalog
  private readonly scenarios: ScenarioCatalog
  private readonly files: FileSandbox

  constructor(loop: AgentLoop, provider: LlmProvider, toolbox: AgentToolbox, prompts: AgentPromptCatalog, tasks: AgentTaskCatalog, scenarios: ScenarioCatalog, files: FileSandbox) {
    this.loop = loop
    this.provider = provider
    this.toolbox = toolbox
    this.prompts = prompts
    this.tasks = tasks
    this.scenarios = scenarios
    this.files = files
  }

  async *run(request: AgentRequest, signal: AbortSignal): AsyncGenerator<AgentEvent> {
    const budget = new AgentBudget()
    const systems = {
      agent: request.systems.agent ?? this.prompts.defaultText('agent'),
      subagent: request.systems.subagent ?? this.prompts.defaultText('subagent'),
    }
    const answer = yield* this.loop.run({ signal, budget, systems, enabled: request.tools }, 'a0', null, request.task, 0)
    yield { type: 'final', text: answer }
    yield { type: 'done', llmCalls: budget.llmCalls, toolCalls: budget.toolCalls }
  }

  info(): ServiceInfo {
    return { provider: this.provider.name, model: this.provider.model, live: this.provider.isLive }
  }

  get toolNames(): string[] {
    return this.toolbox.names
  }

  get promptIds(): string[] {
    return this.prompts.ids
  }

  async clearWorkspace(): Promise<void> {
    await this.files.clear()
  }

  /** What the UI shows before anything is sent: the toolbox, prompts, starter messages and the workspace files. */
  async defaults() {
    return {
      tools: this.toolbox.tools.map((t) => ({ name: t.definition.name, label: t.label, category: t.category, description: t.definition.description, parameters: t.definition.parameters })),
      prompts: this.prompts.prompts,
      shopMessages: this.scenarios.scenarios.map((s) => ({ id: s.id, title: s.title, message: s.message })),
      tasks: this.tasks.tasks,
      files: await this.files.list(),
    }
  }
}
