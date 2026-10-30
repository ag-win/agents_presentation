import type { BackendStatus, Slowmo } from '../demo/types'

export interface SupportPrompt {
  readonly id: string
  readonly name: string
  readonly text: string
}

export interface Scenario {
  readonly id: string
  readonly title: string
  readonly message: string
  /** The route the router should choose ("guard" when the guard should block it). */
  readonly expect: string
  readonly watch: string
}

export interface ToolDefinition {
  readonly name: string
  readonly description: string
  readonly parameters: unknown
}

export interface OrderRow {
  readonly id: string
  readonly customer: string
  readonly product: string
  readonly price: number
  readonly status: string
  readonly lastScan: string
}

/** What GET /api/support/defaults returns. */
export interface SupportDefaults {
  readonly prompts: readonly SupportPrompt[]
  readonly scenarios: readonly Scenario[]
  readonly tools: readonly ToolDefinition[]
  readonly orders: readonly OrderRow[]
  readonly routes: readonly string[]
}

export interface PlanTask {
  readonly stage: string
  readonly label: string
  readonly request: string
}

/** Lines streamed by POST /api/support/stream (see app/server). */
export type SupportStreamEvent =
  | { readonly type: 'start'; readonly provider: string; readonly model: string; readonly live: boolean }
  | { readonly type: 'stage_start'; readonly stage: string; readonly kind: 'llm' | 'code' | 'human' }
  | { readonly type: 'token'; readonly stage: string; readonly text: string }
  | { readonly type: 'stage_end'; readonly stage: string; readonly note?: string }
  | { readonly type: 'tool_call'; readonly stage: string; readonly name: string; readonly arguments: Readonly<Record<string, unknown>> }
  | { readonly type: 'tool_result'; readonly stage: string; readonly name: string; readonly result: string }
  | { readonly type: 'decision'; readonly stage: string; readonly label: string; readonly detail?: string }
  | { readonly type: 'plan'; readonly tasks: readonly PlanTask[] }
  | { readonly type: 'reply'; readonly text: string; readonly branch: string; readonly needsHuman: boolean; readonly summary?: string }
  | { readonly type: 'done' }
  | { readonly type: 'error'; readonly message: string }

export type Tone = 'good' | 'bad' | 'info'

export interface NodeState {
  readonly glow: boolean
  /** The order this box lit up in the current message (null = not yet). Every message starts again from 1. */
  readonly number: number | null
  readonly text: string
  readonly tokens: number
  /** Short verdict shown under the label: ok / block / pass / fail / the chosen route. */
  readonly verdict: { readonly text: string; readonly tone: Tone } | null
  /** The box has called its tool (workers show a small wrench). */
  readonly usedTool: boolean
  /** A worker's task label once the planner has decided ("order", "product", ...); "unused" if it got no task. */
  readonly caption: string | null
  readonly pulse: number
}

export const BLANK_NODE: NodeState = { glow: false, number: null, text: '', tokens: 0, verdict: null, usedTool: false, caption: null, pulse: 0 }

export interface TraceRow {
  readonly id: number
  readonly stage: string
  readonly number: number | null
  readonly kind: 'stage' | 'tool'
  readonly title: string
  readonly body: string
  readonly verdict: { readonly text: string; readonly tone: Tone } | null
  readonly live: boolean
}

export type ReplyStatus = 'sent' | 'waiting' | 'approved' | 'declined'

export interface ReplyView {
  readonly text: string
  readonly branch: string
  readonly status: ReplyStatus
  /** Case notes for the human agent (escalations). */
  readonly summary: string | null
}

export interface ToolLog {
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
  readonly result: string | null
}

export interface SupportDot {
  readonly id: number
  readonly edge: string
  readonly startedAt: number
  readonly durationMs: number
}

export interface SupportSnapshot {
  readonly message: string
  readonly busy: boolean
  readonly nodes: Readonly<Record<string, NodeState>>
  readonly counter: number
  /** Edges drawn thick: the path this message has taken so far. */
  readonly thick: readonly string[]
  /** The branch the router chose (null until it decides, or if the guard blocked the message). */
  readonly routed: string | null
  readonly trace: readonly TraceRow[]
  readonly reply: ReplyView | null
  readonly toolLog: ToolLog | null
  readonly error: string | null
  readonly dots: readonly SupportDot[]
  readonly slowmo: Slowmo
  readonly backend: BackendStatus
}
