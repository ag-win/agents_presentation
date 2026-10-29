import type { LlmProvider } from '../llm/LlmProvider.ts'
import { PromptChain } from './PromptChain.ts'
import { DraftReplyStep } from './steps/DraftReplyStep.ts'
import { ExtractFactsStep } from './steps/ExtractFactsStep.ts'
import { OrderGate } from './steps/OrderGate.ts'
import { PolishReplyStep } from './steps/PolishReplyStep.ts'

/** Assembles the shop-support chain: extract facts -> gate -> draft reply -> polish tone. */
export class SupportChainFactory {
  static create(provider: LlmProvider): PromptChain {
    return new PromptChain([
      new ExtractFactsStep(provider),
      new OrderGate(),
      new DraftReplyStep(provider),
      new PolishReplyStep(provider),
    ])
  }
}
