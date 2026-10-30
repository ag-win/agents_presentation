import type { BackendStatus, Slowmo } from '../demo/types'
import type { NodeState, TraceRow } from '../supportdemo/types'

export type ToolCategory = 'shop' | 'web' | 'files' | 'agents'

export interface ToolInfo {
  readonly name: string
  readonly label: string
  readonly category: ToolCategory
  readonly description: string
  readonly parameters: unknown
}

export interface AgentPrompt {
  readonly id: string
  readonly name: string
  readonly text: string
}

export interface StarterMessage {
  readonly id: string
  readonly title: string
  readonly message: string
}

/** What GET /api/agent/defaults returns. */
export interface AgentDefaults {
  readonly tools: readonly ToolInfo[]
  readonly prompts: readonly AgentPrompt[]
  readonly shopMessages: readonly StarterMessage[]
  readonly tasks: readonly (StarterMessage & { readonly watch: string })[]
  readonly files: readonly string[]
}

/** Lines streamed by POST /api/agent/stream (see app/server). */
export type AgentStreamEvent =
  | { readonly type: 'start'; readonly provider: string; readonly model: string; readonly live: boolean }
  | { readonly type: 'run'; readonly runId: string }
  | { readonly type: 'approval_request'; readonly id: string; readonly summary: string }
  | { readonly type: 'agent_start'; readonly agent: string; readonly parent: string | null; readonly task: string }
  | { readonly type: 'llm_start'; readonly agent: string; readonly id: string; readonly step: number; readonly context: number }
  | { readonly type: 'token'; readonly id: string; readonly text: string }
  | { readonly type: 'llm_end'; readonly id: string; readonly calls: number }
  | { readonly type: 'tool_call'; readonly id: string; readonly llm: string; readonly name: string; readonly arguments: Readonly<Record<string, unknown>> }
  | { readonly type: 'tool_result'; readonly id: string; readonly result: string; readonly error: boolean }
  | { readonly type: 'agent_end'; readonly agent: string; readonly answer: string }
  | { readonly type: 'final'; readonly text: string }
  | { readonly type: 'done'; readonly llmCalls: number; readonly toolCalls: number }
  | { readonly type: 'error'; readonly message: string }

/** The boxes that exist so far. They are created by the model's choices, so this list grows during a run. */
export type GraphNode =
  | { readonly kind: 'llm'; readonly id: string; readonly agent: string; readonly step: number; readonly context: number; readonly calls: number | null }
  | {
      readonly kind: 'tool'; readonly id: string; readonly agent: string; readonly llm: string; readonly index: number
      readonly name: string; readonly arguments: Readonly<Record<string, unknown>>; readonly result: string | null; readonly error: boolean
    }
  | { readonly kind: 'output'; readonly id: 'output' }

export interface AgentInfo {
  readonly id: string
  /** The tool-call box that spawned it (null for the main agent). */
  readonly parent: string | null
  readonly task: string
  /** 0 = main agent, otherwise the order it was started in. */
  readonly order: number
}

export interface AgentDot {
  readonly id: number
  readonly edge: string
  readonly startedAt: number
  readonly durationMs: number
  /** The palette's tool signatures, drawn in teal, as opposed to the prompt/result dot in amber. */
  readonly tools?: boolean
  /** The tool signatures have joined this dot (it is drawn with a teal ring from then on). */
  readonly merged?: boolean
}

export interface RunStats {
  readonly startedAt: number | null
  readonly elapsedMs: number | null
}

/** A tool is paused waiting for a person (the run does not continue until they answer). */
export interface Approval {
  readonly id: string
  readonly summary: string
  readonly status: 'waiting' | 'approved' | 'declined' | 'timeout'
}

export interface AgentSnapshot {
  readonly task: string
  readonly runId: string | null
  readonly approval: Approval | null
  readonly busy: boolean
  readonly nodes: readonly GraphNode[]
  readonly agents: readonly AgentInfo[]
  readonly states: Readonly<Record<string, NodeState>>
  readonly counter: number
  readonly thick: readonly string[]
  readonly dots: readonly AgentDot[]
  /** How many times each tool was called in this run (palette badges), and which palette boxes are glowing. */
  readonly used: Readonly<Record<string, number>>
  readonly glowing: Readonly<Record<string, boolean>>
  readonly trace: readonly TraceRow[]
  readonly final: string | null
  readonly error: string | null
  readonly stats: RunStats
  readonly slowmo: Slowmo
  readonly backend: BackendStatus
}
