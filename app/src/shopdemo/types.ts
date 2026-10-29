import type { BackendStatus, Slowmo } from '../demo/types'

export type NodeId = 'input' | 'extract' | 'gate' | 'draft' | 'polish' | 'output'

/** The dotted paths between boxes. 'gate-output' is the long way round taken when the gate says no. */
export type LaneId = 'in-extract' | 'extract-gate' | 'gate-draft' | 'draft-polish' | 'polish-output' | 'gate-output'

export type ShopAuthor = 'me' | 'bot' | 'system'

export interface ShopMessage {
  readonly id: number
  readonly author: ShopAuthor
  readonly text: string
}

export interface GateCheck {
  readonly label: string
  readonly ok: boolean
  readonly value: string | null
}

export interface NodeState {
  readonly glow: boolean
  /** The sequence number from the latest time this box lit up (null = never). Keeps counting across prompts. */
  readonly number: number | null
  /** What the box shows: the prompt, the LLM's output so far, or the reply. */
  readonly text: string
  readonly tokens: number
  /** Increments each time something lands, to retrigger the pulse animation. */
  readonly pulse: number
  readonly checks: readonly GateCheck[]
}

export interface ChainDot {
  readonly id: number
  /** prompt = a whole message handed on (big dot); token = one streamed token (small dot). */
  readonly kind: 'prompt' | 'token'
  readonly lane: LaneId
  readonly startedAt: number
  readonly durationMs: number
}

export interface ShopSnapshot {
  readonly assistantOpen: boolean
  readonly messages: readonly ShopMessage[]
  readonly busy: boolean
  readonly nodes: Readonly<Record<NodeId, NodeState>>
  /** Last sequence number handed out. */
  readonly counter: number
  /** Value of `counter` when the current prompt started; numbers at or below it are from earlier prompts. */
  readonly runStart: number
  readonly dots: readonly ChainDot[]
  readonly slowmo: Slowmo
  readonly backend: BackendStatus
}

export interface HistoryTurn {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

/** Lines streamed by POST /api/chain/stream (see app/server). */
export type ChainStreamEvent =
  | { readonly type: 'start'; readonly provider: string; readonly model: string; readonly live: boolean }
  | { readonly type: 'step_start'; readonly step: string; readonly kind: 'llm' | 'gate' }
  | { readonly type: 'token'; readonly step: string; readonly text: string }
  | { readonly type: 'step_end'; readonly step: string }
  | { readonly type: 'gate'; readonly step: string; readonly passed: boolean; readonly checks: readonly GateCheck[]; readonly reply: string | null }
  | { readonly type: 'done' }
  | { readonly type: 'error'; readonly message: string }
