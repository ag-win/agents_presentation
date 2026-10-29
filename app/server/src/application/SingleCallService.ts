import type { Prompt } from '../domain/Prompt.ts'
import type { StreamEvent } from '../domain/StreamEvent.ts'
import type { LlmProvider } from '../llm/LlmProvider.ts'
import type { PromptComposer } from './PromptComposer.ts'

export interface ServiceInfo {
  readonly provider: string
  readonly model: string
  readonly live: boolean
}

/** Use case: answer one prompt with exactly one model call. Depends only on the LlmProvider abstraction. */
export class SingleCallService {
  private readonly provider: LlmProvider
  private readonly composer: PromptComposer

  constructor(provider: LlmProvider, composer: PromptComposer) {
    this.provider = provider
    this.composer = composer
  }

  stream(prompt: Prompt, signal: AbortSignal): AsyncIterable<StreamEvent> {
    return this.provider.stream(this.composer.compose(prompt), signal)
  }

  info(): ServiceInfo {
    return { provider: this.provider.name, model: this.provider.model, live: this.provider.isLive }
  }
}
