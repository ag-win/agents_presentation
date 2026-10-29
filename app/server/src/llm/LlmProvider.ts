import type { ChatMessage } from '../domain/ChatMessage.ts'
import type { StreamEvent } from '../domain/StreamEvent.ts'

/** Per-call tweaks. Everything is optional; providers fall back to their own defaults. */
export interface GenerationOptions {
  /** Ask the model to answer with a single JSON object. */
  readonly jsonMode?: boolean
  readonly temperature?: number
  readonly maxTokens?: number
}

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
  stream(messages: readonly ChatMessage[], signal: AbortSignal, options?: GenerationOptions): AsyncIterable<StreamEvent>
}
