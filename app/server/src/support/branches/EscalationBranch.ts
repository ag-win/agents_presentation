import type { SupportEvent } from '../../domain/SupportEvent.ts'
import type { Branch, BranchOutcome } from '../Branch.ts'
import type { SupportContext } from '../SupportContext.ts'

/** Human in the loop: the model writes case notes and a holding reply, then a person must approve before anything is sent. */
export class EscalationBranch implements Branch {
  readonly id = 'escalate'

  async *run(ctx: SupportContext): AsyncGenerator<SupportEvent, BranchOutcome> {
    const text = yield* ctx.llm('escalation', 'escalation', ctx.message, { temperature: 0.3, maxTokens: 260 })
    const { summary, reply } = EscalationBranch.split(text, ctx.message)
    yield { type: 'stage_start', stage: 'human', kind: 'human' }
    yield { type: 'stage_end', stage: 'human', note: 'Waiting for a person to approve' }
    return { reply, summary, evidence: summary, needsHuman: true, skipQuality: true }
  }

  /** Splits "SUMMARY: ... REPLY: ..." and copes with a model that ignores the format. */
  static split(text: string, message: string): { summary: string; reply: string } {
    const match = /summary:\s*([\s\S]*?)\s*reply:\s*([\s\S]*)/i.exec(text)
    if (match) return { summary: match[1].trim(), reply: match[2].trim() }
    return { summary: `Customer message: ${message}`, reply: text.trim() }
  }
}
