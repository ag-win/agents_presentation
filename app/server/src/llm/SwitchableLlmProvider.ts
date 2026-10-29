import type { ChatMessage } from '../domain/ChatMessage.ts'
import type { StreamEvent } from '../domain/StreamEvent.ts'
import type { GenerationOptions, LlmProvider } from './LlmProvider.ts'
import type { ProviderRegistry } from './ProviderRegistry.ts'

/** An LlmProvider that always forwards to whichever provider is active in the registry (a proxy). */
export class SwitchableLlmProvider implements LlmProvider {
  private readonly registry: ProviderRegistry<LlmProvider>

  constructor(registry: ProviderRegistry<LlmProvider>) {
    this.registry = registry
  }

  get name(): string {
    return this.registry.active.provider.name
  }

  get model(): string {
    return this.registry.active.provider.model
  }

  get isLive(): boolean {
    return this.registry.active.provider.isLive
  }

  stream(messages: readonly ChatMessage[], signal: AbortSignal, options?: GenerationOptions): AsyncIterable<StreamEvent> {
    return this.registry.active.provider.stream(messages, signal, options)
  }
}
