import type { ChainEvent } from '../domain/ChainEvent.ts'
import type { Conversation } from '../domain/Conversation.ts'
import { ChainContext } from './ChainContext.ts'
import type { ChainStep } from './ChainStep.ts'

/** Runs steps strictly in order, passing a shared context along, and stops early if a step halts it. */
export class PromptChain {
  private readonly steps: readonly ChainStep[]

  constructor(steps: readonly ChainStep[]) {
    this.steps = steps
  }

  async *run(conversation: Conversation, signal: AbortSignal): AsyncIterable<ChainEvent> {
    const context = new ChainContext(conversation)
    for (const step of this.steps) {
      if (signal.aborted) return
      yield* step.execute(context, signal)
      if (context.isHalted) break
    }
    yield { type: 'done' }
  }
}
