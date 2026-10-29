import type { SupportEvent } from '../../domain/SupportEvent.ts'
import type { Branch, BranchOutcome } from '../Branch.ts'
import { firstJsonObject } from '../JsonText.ts'
import type { SupportContext } from '../SupportContext.ts'

const ASK_FOR_ORDER =
  'I am sorry to hear that. So we can sort it out quickly, could you reply with your order number (the 4 digits in your confirmation email) and, if you can, a photo of the problem? - ShopEase Support'

/** Prompt chain: extract facts -> gate (plain code checks the order exists) -> draft -> polish tone. */
export class ComplaintBranch implements Branch {
  readonly id = 'complaint'

  async *run(ctx: SupportContext): AsyncGenerator<SupportEvent, BranchOutcome> {
    const raw = yield* ctx.llm('facts', 'facts', ctx.message, { jsonMode: true, temperature: 0, maxTokens: 120 })
    const facts = firstJsonObject(raw) ?? {}

    yield { type: 'stage_start', stage: 'gate', kind: 'code' }
    const given = facts.orderNumber === null || facts.orderNumber === undefined ? '' : String(facts.orderNumber)
    const orders = ctx.services.orders
    const order = (given ? orders.find(given) : undefined) ?? orders.findInText(ctx.message)
    if (!order) {
      const detail = given || /\b\d{4}\b/.test(ctx.message) ? `Order ${given || 'number'} is not in our system.` : 'No order number in the message.'
      yield { type: 'decision', stage: 'gate', label: 'fail', detail }
      yield { type: 'stage_end', stage: 'gate', note: detail }
      const reply = given ? `I could not find order ${given} in our system. Could you double-check the number in your confirmation email? - ShopEase Support` : ASK_FOR_ORDER
      return { reply, evidence: detail, skipQuality: true }
    }
    const record = orders.describe(order)
    yield { type: 'decision', stage: 'gate', label: 'pass', detail: `Found order ${order.id}.` }
    yield { type: 'stage_end', stage: 'gate', note: `Found order ${order.id}` }

    const evidence = `Extracted facts: ${JSON.stringify(facts)}\nOrder record: ${record}`
    const draft = yield* ctx.llm('draft', 'draft', `CUSTOMER MESSAGE: ${ctx.message}\n\n${evidence}`, { temperature: 0.3, maxTokens: 260 })
    const polished = yield* ctx.llm('polish', 'polish', `DRAFT REPLY:\n${draft.trim()}`, { temperature: 0.4, maxTokens: 260 })
    return { reply: polished.trim() || draft.trim(), evidence }
  }
}
