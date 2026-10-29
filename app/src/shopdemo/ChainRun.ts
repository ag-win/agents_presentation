import { Scheduler } from '../demo/Scheduler'
import { StreamBuffer } from '../demo/TokenBuffer'
import type { Timings } from '../demo/Timings'
import type { ChainStreamClient } from './ChainStreamClient'
import type { ChainStreamEvent, GateCheck, HistoryTurn, LaneId, NodeId } from './types'

/** What a run needs from whoever owns the UI state (kept tiny so the run never touches React). */
export interface ChainHost {
  /** Box lights up and takes the next sequence number. `text` replaces its contents. */
  activate(node: NodeId, text?: string): void
  setGlow(node: NodeId, on: boolean): void
  /** An LLM box has just emitted a token (shown in the box while its dot flies). */
  emitToken(node: NodeId, text: string): void
  showGate(checks: readonly GateCheck[]): void
  launchDot(kind: 'prompt' | 'token', lane: LaneId, durationMs: number): number
  removeDot(id: number): void
  /** Text arrives in the Output box (and in the phone). */
  deliver(text: string, countsAsToken: boolean): void
  finished(error: string | null): void
}

/** Where each LLM step's tokens fly to. */
const TOKEN_ROUTE: Readonly<Record<string, { lane: LaneId; to: NodeId }>> = {
  extract: { lane: 'extract-gate', to: 'gate' },
  draft: { lane: 'draft-polish', to: 'polish' },
  polish: { lane: 'polish-output', to: 'output' },
}

/**
 * Choreography of ONE customer message through the chain. The real request starts at once and its events pile
 * up in a buffer; the animation drains the buffer at its own pace (so slow-mo works):
 *   input glows -> big dot to LLM 1 -> LLM 1 sheds token dots to the gate -> gate checks ->
 *     pass: big dot to LLM 2 -> token dots to LLM 3 -> token dots to the output (text shows as they land)
 *     fail: big dot takes the long way round to the output with the gate's fixed question.
 */
export class ChainRun {
  private readonly message: string
  private readonly history: readonly HistoryTurn[]
  private readonly timings: Timings
  private readonly client: ChainStreamClient
  private readonly scheduler: Scheduler
  private readonly host: ChainHost
  private readonly signal: AbortSignal

  private readonly buffer = new StreamBuffer<ChainStreamEvent>()
  private inFlight = 0
  private paused = false
  private failure: string | null = null
  private outputLit = false
  private ended = false

  constructor(
    message: string,
    history: readonly HistoryTurn[],
    timings: Timings,
    client: ChainStreamClient,
    scheduler: Scheduler,
    host: ChainHost,
    signal: AbortSignal,
  ) {
    this.message = message
    this.history = history
    this.timings = timings
    this.client = client
    this.scheduler = scheduler
    this.host = host
    this.signal = signal
  }

  start(): void {
    this.host.activate('input', this.message)
    void this.consume() // the real request starts now, in the background
    this.scheduler.after(this.timings.inputGlowMs, () => {
      this.host.setGlow('input', false)
      this.flyPrompt('in-extract', this.timings.promptTravelMs, () => this.pump())
    })
  }

  private flyPrompt(lane: LaneId, durationMs: number, then: () => void): void {
    const id = this.host.launchDot('prompt', lane, durationMs)
    this.scheduler.after(durationMs, () => {
      this.host.removeDot(id)
      then()
    })
  }

  private later(ms = 20): void {
    this.scheduler.after(ms, () => this.pump())
  }

  private pump(): void {
    if (this.signal.aborted || this.paused || this.ended) return
    const event = this.buffer.peek()
    if (!event) {
      if (this.buffer.isDone) this.finish()
      else this.later()
      return
    }
    switch (event.type) {
      case 'start':
      case 'done':
        this.buffer.shift()
        return this.pump()
      case 'error':
        this.buffer.shift()
        this.failure = event.message
        return this.finish()
      case 'step_start':
        // Wait until every token of the previous step has landed: that is what hands the work on.
        if (this.inFlight > 0) return this.later()
        this.buffer.shift()
        this.host.activate(event.step as NodeId)
        return this.pump()
      case 'token':
        this.buffer.shift()
        return this.emit(event.step, event.text)
      case 'step_end':
        this.buffer.shift()
        this.host.setGlow(event.step as NodeId, false)
        return this.pump()
      case 'gate':
        this.buffer.shift()
        return this.handleGate(event)
    }
  }

  /** One token leaves its LLM box as a dot and lands (after the travel time) in the next box. */
  private emit(step: string, text: string): void {
    const route = TOKEN_ROUTE[step]
    this.host.emitToken(step as NodeId, text)
    this.inFlight += 1
    const id = this.host.launchDot('token', route.lane, this.timings.tokenTravelMs)
    this.paused = true // pace the emission
    this.scheduler.after(this.timings.tokenTravelMs, () => {
      this.host.removeDot(id)
      this.inFlight -= 1
      if (route.to === 'output') this.landInOutput(text)
    })
    this.scheduler.after(this.timings.emitGapMs, () => {
      this.paused = false
      this.pump()
    })
  }

  private landInOutput(text: string): void {
    if (!this.outputLit) {
      this.outputLit = true
      this.host.activate('output', '')
    }
    this.host.deliver(text, true)
  }

  private handleGate(event: Extract<ChainStreamEvent, { type: 'gate' }>): void {
    this.paused = true
    this.host.showGate(event.checks)
    this.scheduler.after(this.timings.gateDwellMs, () => {
      this.host.setGlow('gate', false)
      if (event.passed) {
        this.flyPrompt('gate-draft', this.timings.promptTravelMs, () => this.resume())
      } else {
        this.flyPrompt('gate-output', this.timings.bypassTravelMs, () => {
          this.outputLit = true
          this.host.activate('output', '')
          this.host.deliver(event.reply ?? '', false)
          this.resume()
        })
      }
    })
  }

  private resume(): void {
    this.paused = false
    this.pump()
  }

  private finish(): void {
    if (this.ended) return
    if (this.inFlight > 0) return this.later() // let the last dots land first
    this.ended = true
    this.host.finished(this.failure)
  }

  private async consume(): Promise<void> {
    try {
      for await (const event of this.client.stream(this.message, this.history, this.signal)) this.buffer.push(event)
    } catch (error) {
      if (!this.signal.aborted) this.buffer.push({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    } finally {
      this.buffer.markDone()
    }
  }
}
