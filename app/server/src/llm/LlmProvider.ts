import type { ChatMessage } from '../domain/ChatMessage.ts'
import type { StreamEvent } from '../domain/StreamEvent.ts'

/**
 * The one thing the application needs from a language model: turn messages into a stream of tokens.
 * Anything that satisfies this can be swapped in (cloud model, local model, mock) without touching callers.
 */
export interface LlmProvider {
  /** Short label shown in the UI, e.g. "ollama-cloud". */
  readonly name: string
  readonly model: string
  /** True when answers come from a real model rather than canned text. */
  readonly isLive: boolean
  stream(messages: readonly ChatMessage[], signal: AbortSignal): AsyncIterable<StreamEvent>
}
