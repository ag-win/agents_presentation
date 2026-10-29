/** What kind of box a stage is on the board: a model call, plain code, or a person. */
export type StageKind = 'llm' | 'code' | 'human'

export interface StageStartEvent {
  readonly type: 'stage_start'
  readonly stage: string
  readonly kind: StageKind
}

export interface StageTokenEvent {
  readonly type: 'token'
  readonly stage: string
  readonly text: string
}

/** `note` is a one-line result for code stages (what the lookup found, what the gate decided). */
export interface StageEndEvent {
  readonly type: 'stage_end'
  readonly stage: string
  readonly note?: string
}

/** The model asked the harness to run a tool. */
export interface StageToolCallEvent {
  readonly type: 'tool_call'
  readonly stage: string
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
}

/** The harness ran the tool and is handing the result back to the model. */
export interface StageToolResultEvent {
  readonly type: 'tool_result'
  readonly stage: string
  readonly name: string
  readonly result: string
}

/** A verdict: guard ok/block, router label, gate pass/fail, quality pass/fail. */
export interface DecisionEvent {
  readonly type: 'decision'
  readonly stage: string
  readonly label: string
  readonly detail?: string
}

/** The orchestrator split the message into tasks and gave each to a worker. */
export interface PlanEvent {
  readonly type: 'plan'
  readonly tasks: readonly { readonly stage: string; readonly label: string; readonly request: string }[]
}

/** The message that would be sent to the customer. `needsHuman` means a person must approve it first. */
export interface ReplyEvent {
  readonly type: 'reply'
  readonly text: string
  readonly branch: string
  readonly needsHuman: boolean
  /** Case notes for the human agent, present on escalations. */
  readonly summary?: string
}

export interface SupportDoneEvent {
  readonly type: 'done'
}

export type SupportEvent =
  | StageStartEvent
  | StageTokenEvent
  | StageEndEvent
  | StageToolCallEvent
  | StageToolResultEvent
  | DecisionEvent
  | PlanEvent
  | ReplyEvent
  | SupportDoneEvent
