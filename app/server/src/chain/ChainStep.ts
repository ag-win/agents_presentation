import type { ChainEvent, StepKind } from '../domain/ChainEvent.ts'
import type { ChainContext } from './ChainContext.ts'

/** One link in a prompt chain. Steps never know about each other, only about the shared context. */
export interface ChainStep {
  readonly id: string
  readonly kind: StepKind
  execute(context: ChainContext, signal: AbortSignal): AsyncIterable<ChainEvent>
}
