import type { ChainEvent, GateCheck } from '../../domain/ChainEvent.ts'
import { FactsParser } from '../../domain/Facts.ts'
import type { ChainContext } from '../ChainContext.ts'
import type { ChainStep } from '../ChainStep.ts'

/**
 * The checkpoint between LLM call 1 and LLM call 2. Plain code, no model: without an order number and a
 * described problem there is nothing safe to draft, so the chain stops and asks the customer for them.
 */
export class OrderGate implements ChainStep {
  readonly id = 'gate'
  readonly kind = 'gate'

  async *execute(context: ChainContext): AsyncIterable<ChainEvent> {
    yield { type: 'step_start', step: this.id, kind: 'gate' }

    const facts = FactsParser.parse(context.output('extract'))
    if (facts) context.facts = facts
    const known = context.facts
    const checks: GateCheck[] = [
      { label: 'Order number', ok: known.orderNumber !== null, value: known.orderNumber },
      { label: 'Problem described', ok: known.issue !== null, value: known.issue },
    ]
    const passed = checks.every((c) => c.ok)

    if (!passed) context.halt()
    yield { type: 'gate', step: this.id, passed, checks, reply: passed ? null : this.askForMissing(known.orderNumber, known.issue) }
    yield { type: 'step_end', step: this.id }
  }

  private askForMissing(orderNumber: string | null, issue: string | null): string {
    if (!orderNumber && !issue) {
      return "Hello! I'm happy to help with your order. Could you send me your order number and tell me what went wrong?"
    }
    if (!orderNumber) return 'Thanks for letting me know. Please send me your order number so I can check it.'
    return `Thanks. Please tell me what went wrong with order ${orderNumber}.`
  }
}
