import type { BackendStatus, Slowmo } from '../demo/types'

export interface SearchResult {
  readonly title: string
  readonly url: string
  readonly host: string
  readonly description: string
  readonly snippets: readonly string[]
}

export interface LlmInfo {
  readonly id: string
  readonly name: string
  readonly systemPrompt: string
}

/** What GET /api/route/defaults returns. */
export interface RoutingDefaults {
  readonly search: { readonly provider: string; readonly live: boolean }
  readonly router: LlmInfo
  readonly specialists: readonly LlmInfo[]
}

export interface SearchEvent {
  readonly type: 'search'
  readonly query: string
  readonly results: readonly SearchResult[]
  /** The text appended to the chosen specialist's system prompt. */
  readonly context: string
  readonly error: string | null
}

/** Lines streamed by POST /api/route/stream (see app/server). */
export type RouteStreamEvent =
  | { readonly type: 'start'; readonly provider: string; readonly model: string; readonly live: boolean }
  | SearchEvent
  | { readonly type: 'step_start'; readonly step: string; readonly kind: 'llm' }
  | { readonly type: 'token'; readonly step: string; readonly text: string }
  | { readonly type: 'step_end'; readonly step: string }
  | { readonly type: 'route'; readonly label: string }
  | { readonly type: 'done' }
  | { readonly type: 'error'; readonly message: string }

export interface NodeState {
  readonly glow: boolean
  /** Order this box lit up in the current query (null = not yet). Every query starts again from 1. */
  readonly number: number | null
  readonly text: string
  readonly tokens: number
  readonly pulse: number
}

/** A box that has not lit up yet. */
export const BLANK_NODE: NodeState = { glow: false, number: null, text: '', tokens: 0, pulse: 0 }

/** prompt = the query being handed on (big); token = one streamed token (small); context = the search results (teal). */
export type DotKind = 'prompt' | 'token' | 'context'

export interface RouteDot {
  readonly id: number
  readonly kind: DotKind
  readonly lane: string
  readonly startedAt: number
  readonly durationMs: number
  /** The search results have joined this prompt dot. */
  readonly merged?: boolean
}

export type SearchState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading'; readonly query: string }
  | { readonly status: 'done'; readonly query: string; readonly results: readonly SearchResult[]; readonly context: string; readonly error: string | null }

export interface RouterSnapshot {
  readonly query: string
  readonly busy: boolean
  readonly nodes: Readonly<Record<string, NodeState>>
  readonly counter: number
  /** Lanes drawn thick: the path this query has taken so far. */
  readonly thick: readonly string[]
  /** The specialist the router chose (null until it has decided). */
  readonly routed: string | null
  /** The search-results connector is shown, attached to this specialist's lane. */
  readonly contextLaneFor: string | null
  /** The specialist whose dropdown shows the appended search results. */
  readonly appendedFor: string | null
  readonly search: SearchState
  readonly answer: { readonly text: string; readonly label: string | null; readonly error: string | null }
  readonly dots: readonly RouteDot[]
  readonly slowmo: Slowmo
  readonly backend: BackendStatus
}
