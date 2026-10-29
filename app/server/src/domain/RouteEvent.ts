import type { ChainDoneEvent, StepEndEvent, StepStartEvent, StepTokenEvent } from './ChainEvent.ts'
import type { SearchResult } from './Search.ts'

/** The web search finished. `context` is the text appended to the chosen specialist's system prompt. */
export interface SearchEvent {
  readonly type: 'search'
  readonly query: string
  readonly results: readonly SearchResult[]
  readonly context: string
  /** Set when the search failed; the run carries on without web context. */
  readonly error: string | null
}

/** The router has decided which specialist handles the query. */
export interface RouteChosenEvent {
  readonly type: 'route'
  readonly label: string
}

export type RouteEvent = SearchEvent | StepStartEvent | StepTokenEvent | StepEndEvent | RouteChosenEvent | ChainDoneEvent
