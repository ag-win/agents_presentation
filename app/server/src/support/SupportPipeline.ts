import type { SupportEvent } from '../domain/SupportEvent.ts'
import type { Branch } from './Branch.ts'
import { ComplaintBranch } from './branches/ComplaintBranch.ts'
import { EscalationBranch } from './branches/EscalationBranch.ts'
import { FeedbackBranch } from './branches/FeedbackBranch.ts'
import { MultiIssueBranch } from './branches/MultiIssueBranch.ts'
import { OrderBranch } from './branches/OrderBranch.ts'
import { OtherBranch } from './branches/OtherBranch.ts'
import { ProductBranch } from './branches/ProductBranch.ts'
import { QualityLoop } from './QualityLoop.ts'
import { RouteLabelParser } from '../routing/RouteLabelParser.ts'
import { SupportContext, type SupportServices } from './SupportContext.ts'
import type { SupportRequest } from './SupportRequest.ts'

export const BLOCKED_REPLY = 'Sorry, I can only help with ShopEase orders, products and feedback. - ShopEase Support'

/**
 * The whole support desk:
 *   guard -> router -> one branch (complaint chain | order tool call | product parallel | feedback | multi-issue workers | escalation | other)
 *   -> quality loop (evaluator-optimizer) -> reply.
 */
export class SupportPipeline {
  private readonly services: SupportServices
  private readonly branches: readonly Branch[]
  private readonly parser: RouteLabelParser
  private readonly quality = new QualityLoop()

  constructor(services: SupportServices) {
    this.services = services
    this.branches = [new ComplaintBranch(), new OrderBranch(), new ProductBranch(), new FeedbackBranch(), new MultiIssueBranch(), new EscalationBranch(), new OtherBranch()]
    this.parser = new RouteLabelParser(this.branches.map((b) => b.id), 'other')
  }

  get routes(): string[] {
    return this.branches.map((b) => b.id)
  }

  async *run(request: SupportRequest, signal: AbortSignal): AsyncGenerator<SupportEvent, void> {
    const ctx = new SupportContext(this.services, request, signal)

    const verdict = yield* ctx.llm('guard', 'guard', ctx.message, { purpose: 'guard', temperature: 0, maxTokens: 24 })
    const blocked = /\bblock/i.test(verdict)
    yield { type: 'decision', stage: 'guard', label: blocked ? 'block' : 'ok', detail: blocked ? verdict.replace(/^\W*block\W*/i, '').trim() || undefined : undefined }
    if (blocked) {
      yield { type: 'reply', text: BLOCKED_REPLY, branch: 'guard', needsHuman: false }
      yield { type: 'done' }
      return
    }

    const label = this.parser.parse(yield* ctx.llm('router', 'router', ctx.message, { purpose: 'support_route', temperature: 0, maxTokens: 12 }))
    yield { type: 'decision', stage: 'router', label }
    if (request.stopAfterRoute) {
      yield { type: 'done' }
      return
    }

    const branch = this.branches.find((b) => b.id === label) ?? this.branches[this.branches.length - 1]
    const outcome = yield* branch.run(ctx)
    const text = outcome.skipQuality ? outcome.reply : yield* this.quality.run(ctx, outcome)
    yield { type: 'reply', text, branch: branch.id, needsHuman: outcome.needsHuman === true, summary: outcome.summary }
    yield { type: 'done' }
  }
}
