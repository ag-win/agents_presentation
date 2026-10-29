import type { SupportEvent } from '../domain/SupportEvent.ts'
import type { SupportContext } from './SupportContext.ts'

/** What a branch hands back to the pipeline. */
export interface BranchOutcome {
  readonly reply: string
  /** Facts the branch used, shown to the quality checker so it can catch invented details. */
  readonly evidence: string
  /** The reply must be approved by a person before it is sent. */
  readonly needsHuman?: boolean
  readonly summary?: string
  /** Fixed replies and human hand-overs are not sent through the quality loop. */
  readonly skipQuality?: boolean
}

/** One path through the support desk. The router picks the branch by its id. */
export interface Branch {
  readonly id: string
  run(ctx: SupportContext): AsyncGenerator<SupportEvent, BranchOutcome>
}
