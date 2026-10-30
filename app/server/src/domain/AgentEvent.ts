/**
 * What a streamed agent run reports. Unlike the support desk (a fixed graph), the shape of an agent run is decided
 * by the model, so every box is announced as it appears: agents, their LLM calls, and the tool calls each call makes.
 * Ids are hierarchical: agent "a0", its second LLM call "a0.s2", that call's first tool call "a0.s2.c1".
 */
export interface AgentStartEvent {
  readonly type: 'agent_start'
  readonly agent: string
  /** The tool-call id that spawned this agent (null for the main agent). */
  readonly parent: string | null
  readonly task: string
}

export interface AgentLlmStartEvent {
  readonly type: 'llm_start'
  readonly agent: string
  readonly id: string
  readonly step: number
  /** How many messages this call is sent (the whole history so far). */
  readonly context: number
}

export interface AgentTokenEvent {
  readonly type: 'token'
  readonly id: string
  readonly text: string
}

/** `calls` is how many tools the model asked for; 0 means this was the final answer. */
export interface AgentLlmEndEvent {
  readonly type: 'llm_end'
  readonly id: string
  readonly calls: number
}

export interface AgentToolCallEvent {
  readonly type: 'tool_call'
  readonly id: string
  readonly llm: string
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
}

export interface AgentToolResultEvent {
  readonly type: 'tool_result'
  readonly id: string
  readonly result: string
  readonly error: boolean
}

export interface AgentEndEvent {
  readonly type: 'agent_end'
  readonly agent: string
  readonly answer: string
}

export interface AgentFinalEvent {
  readonly type: 'final'
  readonly text: string
}

export interface AgentDoneEvent {
  readonly type: 'done'
  readonly llmCalls: number
  readonly toolCalls: number
}

export type AgentEvent =
  | AgentStartEvent
  | AgentLlmStartEvent
  | AgentTokenEvent
  | AgentLlmEndEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentEndEvent
  | AgentFinalEvent
  | AgentDoneEvent
