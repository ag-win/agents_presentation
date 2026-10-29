import type { SupportEvent } from '../../domain/SupportEvent.ts'
import type { Branch, BranchOutcome } from '../Branch.ts'
import { withSystem, type SupportContext } from '../SupportContext.ts'
import { tap } from '../tap.ts'

/** Tool calling: the model decides to call get_order_status, the harness runs it, the model explains the result. */
export class OrderBranch implements Branch {
  readonly id = 'order'

  async *run(ctx: SupportContext): AsyncGenerator<SupportEvent, BranchOutcome> {
    const results: string[] = []
    const loop = ctx.services.toolLoop.run('order', withSystem(ctx.prompt('order'), ctx.message), ctx.signal, { temperature: 0.2, maxTokens: 260 })
    const reply = yield* tap(loop, (event) => {
      if (event.type === 'tool_result') results.push(event.result)
    })
    return { reply: reply.trim(), evidence: results.length ? `Tool result: ${results.join(' ')}` : 'The tool was not called (no order number given).' }
  }
}
