import type { SupportEvent } from '../../domain/SupportEvent.ts'
import type { Branch, BranchOutcome } from '../Branch.ts'
import { runParallel } from '../runParallel.ts'
import type { SupportContext } from '../SupportContext.ts'

const NOT_FOUND =
  'I could not tell which product you mean. Could you send its full name, for example "Tecno Spark 20" or "Sony WI-XB400"? - ShopEase Support'

/** Parallelization: one model reads the specs while another reads the reviews, then a third combines the two. */
export class ProductBranch implements Branch {
  readonly id = 'product'

  async *run(ctx: SupportContext): AsyncGenerator<SupportEvent, BranchOutcome> {
    const catalog = ctx.services.products
    const found = yield* ctx.code('lookup', () => {
      const products = catalog.search(ctx.message)
      return { note: products.length ? products.map((p) => p.name).join(' and ') : 'No product matched', value: products }
    })
    if (found.length === 0) return { reply: NOT_FOUND, evidence: 'No product matched.', skipQuality: true }

    const specs = found.map((p) => catalog.describe(p)).join('\n')
    const reviews = found.map((p) => `${p.name}:\n${catalog.reviewsOf(p)}`).join('\n\n')
    const evidence = `Specifications:\n${specs}\n\nReviews:\n${reviews}`

    const [specSummary, reviewSummary] = yield* runParallel([
      ctx.llm('specs', 'specs', `QUESTION: ${ctx.message}\n\nSPECIFICATIONS:\n${specs}`, { temperature: 0.2, maxTokens: 200 }),
      ctx.llm('reviews', 'reviews', `QUESTION: ${ctx.message}\n\nREVIEWS:\n${reviews}`, { temperature: 0.2, maxTokens: 200 }),
    ])

    const answer = yield* ctx.llm('compare', 'compare', `QUESTION: ${ctx.message}\n\nSPEC SUMMARY: ${specSummary.trim()}\n\nREVIEW SUMMARY: ${reviewSummary.trim()}`, { temperature: 0.3, maxTokens: 300 })
    return { reply: answer.trim(), evidence }
  }
}
