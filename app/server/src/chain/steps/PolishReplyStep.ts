import { ChatMessage } from '../../domain/ChatMessage.ts'
import type { GenerationOptions } from '../../llm/LlmProvider.ts'
import type { ChainContext } from '../ChainContext.ts'
import { LlmStep } from '../LlmStep.ts'

const SYSTEM_PROMPT = [
  'Rewrite the draft reply as a short, warm chat message: at most 3 short sentences, plain words, no markdown, no emoji.',
  "Write in the same language and style as the customer's latest message.",
  'Keep every fact and instruction from the draft and add nothing new.',
].join(' ')

/** LLM call 3: adjust tone and language so it reads like a real chat message. */
export class PolishReplyStep extends LlmStep {
  readonly id = 'polish'

  protected messages(context: ChainContext): ChatMessage[] {
    return [
      ChatMessage.system(SYSTEM_PROMPT),
      ChatMessage.user(`DRAFT:\n${context.output('draft')}\n\nCUSTOMER'S LATEST MESSAGE:\n${context.conversation.message}`),
    ]
  }

  protected override options(): GenerationOptions {
    return { temperature: 0.4, maxTokens: 120 }
  }
}
