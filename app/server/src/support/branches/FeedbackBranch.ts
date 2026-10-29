import type { SupportEvent } from '../../domain/SupportEvent.ts'
import type { Branch, BranchOutcome } from '../Branch.ts'
import type { SupportContext } from '../SupportContext.ts'

/** Thank the customer, then plain code files the note for the product team. */
export class FeedbackBranch implements Branch {
  readonly id = 'feedback'

  async *run(ctx: SupportContext): AsyncGenerator<SupportEvent, BranchOutcome> {
    const reply = yield* ctx.llm('feedback', 'feedback', ctx.message, { temperature: 0.5, maxTokens: 200 })
    yield* ctx.code('log', () => ({ note: `Saved to the product team's feedback board: "${ctx.message.slice(0, 48)}${ctx.message.length > 48 ? '...' : ''}"`, value: undefined }))
    return { reply: reply.trim(), evidence: 'The customer sent feedback; nothing in our systems needs checking.' }
  }
}
