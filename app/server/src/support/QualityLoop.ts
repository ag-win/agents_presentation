import type { SupportEvent } from '../domain/SupportEvent.ts'
import type { BranchOutcome } from './Branch.ts'
import type { SupportContext } from './SupportContext.ts'

/** Evaluator-optimizer: a checker grades the reply; on a fail, one revision is made using the checker's feedback. */
export class QualityLoop {
  async *run(ctx: SupportContext, outcome: BranchOutcome): AsyncGenerator<SupportEvent, string> {
    const verdict = yield* ctx.llm(
      'quality',
      'quality',
      `CUSTOMER MESSAGE: ${ctx.message}\n\nFACTS FROM OUR SYSTEMS:\n${outcome.evidence || 'none'}\n\nPROPOSED REPLY:\n${outcome.reply}`,
      { purpose: 'quality', temperature: 0, maxTokens: 90 },
    )
    const failed = /^\W*fail/i.test(verdict.trim())
    const detail = verdict.replace(/^\W*(pass|fail)\W*/i, '').trim()
    yield { type: 'decision', stage: 'quality', label: failed ? 'fail' : 'pass', detail: detail || undefined }
    if (!failed) return outcome.reply

    const revised = yield* ctx.llm('revise', 'revise', `CUSTOMER MESSAGE: ${ctx.message}\n\nREPLY TO IMPROVE:\n${outcome.reply}\n\nCHECKER FEEDBACK: ${detail || verdict.trim()}`, { temperature: 0.3, maxTokens: 400 })
    return revised.trim() || outcome.reply
  }
}
