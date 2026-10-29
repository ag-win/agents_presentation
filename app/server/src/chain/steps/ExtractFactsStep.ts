import { ChatMessage } from '../../domain/ChatMessage.ts'
import type { GenerationOptions } from '../../llm/LlmProvider.ts'
import type { ChainContext } from '../ChainContext.ts'
import { LlmStep } from '../LlmStep.ts'

const SYSTEM_PROMPT = [
  "You read a customer's conversation with an online shop's support assistant and extract facts.",
  'Reply with ONLY a JSON object with exactly these keys: orderNumber, product, issue, request.',
  'Use null for anything the customer has not clearly stated. Never invent or guess a value.',
  'orderNumber is the order number or reference the customer gave (digits, possibly after #).',
  'issue is a short phrase for what went wrong. request is what the customer wants (for example refund, replacement, information).',
].join(' ')

/** LLM call 1: turn a messy conversation into structured facts. */
export class ExtractFactsStep extends LlmStep {
  readonly id = 'extract'

  protected messages(context: ChainContext): ChatMessage[] {
    return [ChatMessage.system(SYSTEM_PROMPT), ChatMessage.user(`CONVERSATION:\n${context.conversation.transcript()}`)]
  }

  protected override options(): GenerationOptions {
    return { jsonMode: true, temperature: 0.1, maxTokens: 160 }
  }
}
