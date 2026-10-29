import type { Conversation } from '../domain/Conversation.ts'
import { Facts } from '../domain/Facts.ts'

/** Shared notebook for one chain run: each step reads what earlier steps wrote and may stop the chain. */
export class ChainContext {
  readonly conversation: Conversation
  facts: Facts = Facts.empty()

  private readonly outputs = new Map<string, string>()
  private stopped = false

  constructor(conversation: Conversation) {
    this.conversation = conversation
  }

  setOutput(step: string, text: string): void {
    this.outputs.set(step, text)
  }

  output(step: string): string {
    return this.outputs.get(step) ?? ''
  }

  /** Ends the chain after the current step (used by a gate that says "do not continue"). */
  halt(): void {
    this.stopped = true
  }

  get isHalted(): boolean {
    return this.stopped
  }
}
