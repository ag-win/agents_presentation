export type StepKind = 'llm' | 'gate'

export interface GateCheck {
  readonly label: string
  readonly ok: boolean
  readonly value: string | null
}

export interface StepStartEvent {
  readonly type: 'step_start'
  readonly step: string
  readonly kind: StepKind
}

export interface StepTokenEvent {
  readonly type: 'token'
  readonly step: string
  readonly text: string
}

export interface StepEndEvent {
  readonly type: 'step_end'
  readonly step: string
}

/** The gate's verdict. On a fail, `reply` is the fixed message sent to the customer instead of continuing. */
export interface GateEvent {
  readonly type: 'gate'
  readonly step: string
  readonly passed: boolean
  readonly checks: readonly GateCheck[]
  readonly reply: string | null
}

export interface ChainDoneEvent {
  readonly type: 'done'
}

/** Everything a chain run reports, in order. Failures are thrown, not yielded. */
export type ChainEvent = StepStartEvent | StepTokenEvent | StepEndEvent | GateEvent | ChainDoneEvent
