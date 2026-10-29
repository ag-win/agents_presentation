import { ChatMessage } from '../../domain/ChatMessage.ts'
import type { GenerationOptions } from '../../llm/LlmProvider.ts'
import type { ChainContext } from '../ChainContext.ts'
import { LlmStep } from '../LlmStep.ts'

const SYSTEM_PROMPT = [
  'You are a support agent for ShopEase, an online shop. Write a reply to the customer using the facts and the policy.',
  'POLICY: damaged or faulty items can be refunded or replaced within 14 days of delivery.',
  'Ask the customer to send a photo of the damage. Refunds go back to the original payment method in 3 to 5 working days.',
  'Do not promise anything outside the policy. Keep the reply under 80 words.',
].join(' ')

/** LLM call 2: write a correct, policy-based reply from the facts. */
export class DraftReplyStep extends LlmStep {
  readonly id = 'draft'

  protected messages(context: ChainContext): ChatMessage[] {
    const facts = JSON.stringify(context.facts)
    return [
      ChatMessage.system(SYSTEM_PROMPT),
      ChatMessage.user(`FACTS:\n${facts}\n\nLATEST CUSTOMER MESSAGE:\n${context.conversation.message}`),
    ]
  }

  protected override options(): GenerationOptions {
    return { temperature: 0.3, maxTokens: 160 }
  }
}
