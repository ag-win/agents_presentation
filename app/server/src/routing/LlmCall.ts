import type { RouteEvent } from '../domain/RouteEvent.ts'
import type { ChatMessage } from '../domain/ChatMessage.ts'
import type { GenerationOptions, LlmProvider } from '../llm/LlmProvider.ts'

/** One streamed model call that reports itself as step events and keeps the text it produced. */
export class LlmCall {
  readonly step: string
  private readonly provider: LlmProvider
  private produced = ''

  constructor(provider: LlmProvider, step: string) {
    this.provider = provider
    this.step = step
  }

  /** Everything the model has said so far (complete once `run` has finished). */
  get text(): string {
    return this.produced
  }

  async *run(messages: readonly ChatMessage[], signal: AbortSignal, options: GenerationOptions): AsyncIterable<RouteEvent> {
    yield { type: 'step_start', step: this.step, kind: 'llm' }
    for await (const event of this.provider.stream(messages, signal, options)) {
      if (event.type === 'token') {
        this.produced += event.text
        yield { type: 'token', step: this.step, text: event.text }
      }
    }
    yield { type: 'step_end', step: this.step }
  }
}
