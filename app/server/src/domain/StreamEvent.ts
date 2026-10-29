/** Numbers a provider reports when generation finishes. All optional: not every provider knows them. */
export interface GenerationStats {
  readonly tokens?: number
  readonly durationMs?: number
  readonly finishReason?: string
}

export interface TokenEvent {
  readonly type: 'token'
  readonly text: string
}

export interface DoneEvent {
  readonly type: 'done'
  readonly stats: GenerationStats
}

/** What a provider yields while generating. Failures are thrown (as AppError), not yielded. */
export type StreamEvent = TokenEvent | DoneEvent
