import type { SupportEvent } from '../domain/SupportEvent.ts'
import type { ToolDefinition } from '../domain/Tool.ts'
import type { LlmProvider } from '../llm/LlmProvider.ts'
import type { OrderDatabase, OrderRecord } from '../shop/OrderDatabase.ts'
import type { Scenario, ScenarioCatalog } from '../support/ScenarioCatalog.ts'
import type { SupportPipeline } from '../support/SupportPipeline.ts'
import type { SupportPrompt, SupportPromptCatalog } from '../support/SupportPromptCatalog.ts'
import type { SupportRequest } from '../support/SupportRequest.ts'
import type { ToolRegistry } from '../tools/ToolRegistry.ts'
import type { ServiceInfo } from './SingleCallService.ts'

export interface SupportDefaults {
  readonly prompts: readonly SupportPrompt[]
  readonly scenarios: readonly Scenario[]
  readonly tools: readonly ToolDefinition[]
  readonly orders: readonly OrderRecord[]
  readonly routes: readonly string[]
}

/** Use case: handle one customer message with the whole ShopEase support desk. */
export class SupportService {
  private readonly pipeline: SupportPipeline
  private readonly provider: LlmProvider
  private readonly prompts: SupportPromptCatalog
  private readonly scenarios: ScenarioCatalog
  private readonly tools: ToolRegistry
  private readonly orders: OrderDatabase

  constructor(pipeline: SupportPipeline, provider: LlmProvider, prompts: SupportPromptCatalog, scenarios: ScenarioCatalog, tools: ToolRegistry, orders: OrderDatabase) {
    this.pipeline = pipeline
    this.provider = provider
    this.prompts = prompts
    this.scenarios = scenarios
    this.tools = tools
    this.orders = orders
  }

  run(request: SupportRequest, signal: AbortSignal): AsyncIterable<SupportEvent> {
    return this.pipeline.run(request, signal)
  }

  info(): ServiceInfo {
    return { provider: this.provider.name, model: this.provider.model, live: this.provider.isLive }
  }

  get allowedIds(): string[] {
    return this.prompts.ids
  }

  /** What the UI shows before anything is sent: prompts for each dropdown, the Inbox messages, the tool signature and the order table. */
  defaults(): SupportDefaults {
    return {
      prompts: this.prompts.prompts,
      scenarios: this.scenarios.scenarios,
      tools: this.tools.definitions(),
      orders: this.orders.all(),
      routes: this.pipeline.routes,
    }
  }
}
