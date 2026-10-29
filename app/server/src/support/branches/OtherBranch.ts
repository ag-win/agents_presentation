import type { SupportEvent } from '../../domain/SupportEvent.ts'
import type { Branch, BranchOutcome } from '../Branch.ts'
import { SHOP_POLICY } from '../ShopPolicy.ts'
import type { SupportContext } from '../SupportContext.ts'

/** Everything else: policies, hours, shipping, off-topic. One call, answering only from the policy. */
export class OtherBranch implements Branch {
  readonly id = 'other'

  async *run(ctx: SupportContext): AsyncGenerator<SupportEvent, BranchOutcome> {
    const reply = yield* ctx.llm('other', 'other', ctx.message, { temperature: 0.3, maxTokens: 200 })
    return { reply: reply.trim(), evidence: SHOP_POLICY }
  }
}
