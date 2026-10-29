import type { PromptChain } from '../chain/PromptChain.ts'
import type { ChainEvent } from '../domain/ChainEvent.ts'
import type { Conversation } from '../domain/Conversation.ts'
import type { LlmProvider } from '../llm/LlmProvider.ts'
import type { ServiceInfo } from './SingleCallService.ts'

/** Use case: answer a shop customer's message by running the support chain over the whole conversation. */
export class ChainService {
  private readonly chain: PromptChain
  private readonly provider: LlmProvider

  constructor(chain: PromptChain, provider: LlmProvider) {
    this.chain = chain
    this.provider = provider
  }

  run(conversation: Conversation, signal: AbortSignal): AsyncIterable<ChainEvent> {
    return this.chain.run(conversation, signal)
  }

  info(): ServiceInfo {
    return { provider: this.provider.name, model: this.provider.model, live: this.provider.isLive }
  }
}
