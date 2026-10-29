import { ChatMessage } from '../domain/ChatMessage.ts'
import type { StageEndEvent, StageStartEvent, StageTokenEvent, SupportEvent } from '../domain/SupportEvent.ts'
import type { GenerationOptions, LlmProvider } from '../llm/LlmProvider.ts'
import type { OrderDatabase } from '../shop/OrderDatabase.ts'
import type { ProductCatalog } from '../shop/ProductCatalog.ts'
import type { ToolLoop } from '../tools/ToolLoop.ts'
import type { SupportPromptCatalog } from './SupportPromptCatalog.ts'
import type { SupportRequest } from './SupportRequest.ts'

/** The long-lived collaborators every stage uses. */
export interface SupportServices {
  readonly provider: LlmProvider
  readonly prompts: SupportPromptCatalog
  readonly orders: OrderDatabase
  readonly products: ProductCatalog
  readonly toolLoop: ToolLoop
}

type LlmStepEvent = StageStartEvent | StageTokenEvent | StageEndEvent

/** A system message only when there is text for it; a blank system prompt means none at all. */
export function withSystem(system: string, user: string): ChatMessage[] {
  return system.trim() ? [ChatMessage.system(system), ChatMessage.user(user)] : [ChatMessage.user(user)]
}

/** Everything one customer message needs while it moves through the pipeline. */
export class SupportContext {
  readonly services: SupportServices
  readonly request: SupportRequest
  readonly signal: AbortSignal

  constructor(services: SupportServices, request: SupportRequest, signal: AbortSignal) {
    this.services = services
    this.request = request
    this.signal = signal
  }

  get message(): string {
    return this.request.message
  }

  /** The prompt as edited in the UI (even blank), otherwise the default. */
  prompt(id: string): string {
    return this.request.systems[id] ?? this.services.prompts.defaultText(id)
  }

  /** One streamed model call shown as a stage. Returns what the model said. */
  async *llm(stage: string, promptId: string, user: string, options: GenerationOptions = {}, extraSystem = ''): AsyncGenerator<LlmStepEvent, string> {
    const system = [this.prompt(promptId), extraSystem].filter((part) => part.trim()).join('\n\n')
    yield { type: 'stage_start', stage, kind: 'llm' }
    let text = ''
    for await (const event of this.services.provider.stream(withSystem(system, user), this.signal, options)) {
      if (event.type === 'token') {
        text += event.text
        yield { type: 'token', stage, text: event.text }
      }
    }
    yield { type: 'stage_end', stage }
    return text
  }

  /** A plain-code stage: no model, just a note about what it did. */
  *code<T>(stage: string, work: () => { note: string; value: T }): Generator<SupportEvent, T> {
    yield { type: 'stage_start', stage, kind: 'code' }
    const { note, value } = work()
    yield { type: 'stage_end', stage, note }
    return value
  }
}
