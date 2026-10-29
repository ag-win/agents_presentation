import type { ChainEvent } from '../domain/ChainEvent.ts'
import type { ChatMessage } from '../domain/ChatMessage.ts'
import type { GenerationOptions, LlmProvider } from '../llm/LlmProvider.ts'
import type { ChainContext } from './ChainContext.ts'
import type { ChainStep } from './ChainStep.ts'

/**
 * Template method for every step that calls the model: subclasses say WHAT to ask
 * (messages, options); this class does the streaming, event reporting and bookkeeping.
 */
export abstract class LlmStep implements ChainStep {
  readonly kind = 'llm'
  abstract readonly id: string

  protected readonly provider: LlmProvider

  constructor(provider: LlmProvider) {
    this.provider = provider
  }

  protected abstract messages(context: ChainContext): ChatMessage[]

  protected options(): GenerationOptions {
    return {}
  }

  async *execute(context: ChainContext, signal: AbortSignal): AsyncIterable<ChainEvent> {
    yield { type: 'step_start', step: this.id, kind: 'llm' }
    let text = ''
    for await (const event of this.provider.stream(this.messages(context), signal, this.options())) {
      if (event.type === 'token') {
        text += event.text
        yield { type: 'token', step: this.id, text: event.text }
      }
    }
    context.setOutput(this.id, text)
    yield { type: 'step_end', step: this.id }
  }
}
