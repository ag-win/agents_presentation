/** The scripted friends in the group chat. Their look lives in people.ts. */
export type FriendId = 'john' | 'deborah' | 'blessing'

export type Author = FriendId | 'me' | 'ai' | 'system'

export interface ChatMessage {
  readonly id: number
  readonly author: Author
  readonly text: string
}

/** idle: nothing chosen yet; planned: scripted group chat; free: plain chatbot where every prompt needs @AI. */
export type Mode = 'idle' | 'planned' | 'free'

export type DotKind = 'prompt' | 'token'
/** 'in' runs from the Input box to the LLM, 'out' from the LLM to the Output box. */
export type Lane = 'in' | 'out'

/** One glowing dot on a dotted line. Position is derived from startedAt/duration, so it survives re-renders. */
export interface FlightDot {
  readonly id: number
  readonly kind: DotKind
  readonly lane: Lane
  readonly startedAt: number
  readonly durationMs: number
  readonly offsetPx: number
}

export interface PipelineState {
  readonly inputGlow: boolean
  readonly inputText: string
  readonly llmGlow: boolean
  /** Tokens the LLM box has emitted so far. */
  readonly llmTokens: number
  readonly outputText: string
  /** Tokens that have reached the Output box. */
  readonly outputTokens: number
  /** Increments each time a token lands; used to retrigger the pulse animation. */
  readonly outputPulse: number
}

export type BackendStatus =
  | { readonly state: 'unknown' }
  | { readonly state: 'offline' }
  | { readonly state: 'ready'; readonly provider: string; readonly model: string; readonly live: boolean }

export interface Slowmo {
  readonly enabled: boolean
  /** How many times slower than real time (1 = real time). */
  readonly factor: number
}

export interface DemoSnapshot {
  readonly mode: Mode
  readonly messages: readonly ChatMessage[]
  /** A model call is in progress (the whole visual run, not just the network request). */
  readonly busy: boolean
  /** The scripted friends are still "typing" their lines. */
  readonly scriptPlaying: boolean
  readonly typing: Author | null
  readonly pipeline: PipelineState
  readonly dots: readonly FlightDot[]
  readonly slowmo: Slowmo
  readonly backend: BackendStatus
}

export type LlmStreamEvent =
  | { readonly type: 'start'; readonly provider: string; readonly model: string; readonly live: boolean }
  | { readonly type: 'token'; readonly text: string }
  | { readonly type: 'done'; readonly stats: { readonly tokens?: number; readonly durationMs?: number; readonly finishReason?: string } }
  | { readonly type: 'error'; readonly message: string }
