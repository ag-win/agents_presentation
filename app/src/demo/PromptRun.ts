import type { LlmStreamClient } from './LlmStreamClient'
import type { Scheduler } from './Scheduler'
import type { Timings } from './Timings'
import { StreamBuffer } from './TokenBuffer'
import type { DotKind, Lane, PipelineState } from './types'

/** What a run needs from whoever owns the UI state. Keeps PromptRun free of React and of the session. */
export interface RunHost {
  patchPipeline(patch: Partial<PipelineState>): void
  launchDot(kind: DotKind, lane: Lane, durationMs: number): number
  removeDot(id: number): void
  /** A token's dot reached the Output box: show its text. */
  tokenLanded(text: string): void
  finished(error: string | null): void
}

/**
 * Choreography of ONE prompt, decoupled from the network:
 *   input glows -> big dot to the LLM -> LLM glows and sheds one tiny dot per token -> output pulses as each lands.
 * The request starts immediately and tokens pile up in a buffer; the animation drains the buffer at its own pace,
 * which is what makes slow-mo possible even though the real answer arrives in a fraction of a second.
 */
export class PromptRun {
  private readonly prompt: string
  private readonly timings: Timings
  private readonly client: LlmStreamClient
  private readonly scheduler: Scheduler
  private readonly host: RunHost
  private readonly signal: AbortSignal

  private readonly buffer = new StreamBuffer<string>()
  private failure: string | null = null
  private emitted = 0
  private inFlight = 0
  private emitting = false

  constructor(
    prompt: string,
    timings: Timings,
    client: LlmStreamClient,
    scheduler: Scheduler,
    host: RunHost,
    signal: AbortSignal,
  ) {
    this.prompt = prompt
    this.timings = timings
    this.client = client
    this.scheduler = scheduler
    this.host = host
    this.signal = signal
  }

  start(): void {
    this.host.patchPipeline({
      inputGlow: true, inputText: this.prompt, llmGlow: false, llmTokens: 0, outputText: '', outputTokens: 0,
    })
    void this.consume() // real request begins now, in the background
    this.scheduler.after(this.timings.inputGlowMs, () => this.sendPromptDot())
  }

  private sendPromptDot(): void {
    this.host.patchPipeline({ inputGlow: false })
    const id = this.host.launchDot('prompt', 'in', this.timings.promptTravelMs)
    this.scheduler.after(this.timings.promptTravelMs, () => {
      this.host.removeDot(id)
      this.host.patchPipeline({ llmGlow: true })
      this.emitting = true
      this.tick()
    })
  }

  /** Releases at most one token per emit gap while the LLM "glows". */
  private tick(): void {
    if (this.signal.aborted) return
    const text = this.buffer.shift()
    if (text !== undefined) {
      this.emitted += 1
      this.host.patchPipeline({ llmTokens: this.emitted })
      this.flyToken(text)
      this.scheduler.after(this.timings.emitGapMs, () => this.tick())
    } else if (this.buffer.isDone) {
      this.host.patchPipeline({ llmGlow: false })
      this.emitting = false
      this.maybeFinish()
    } else {
      this.scheduler.after(20, () => this.tick()) // waiting for the network
    }
  }

  private flyToken(text: string): void {
    this.inFlight += 1
    const id = this.host.launchDot('token', 'out', this.timings.tokenTravelMs)
    this.scheduler.after(this.timings.tokenTravelMs, () => {
      this.host.removeDot(id)
      this.host.tokenLanded(text)
      this.inFlight -= 1
      this.maybeFinish()
    })
  }

  private maybeFinish(): void {
    if (!this.emitting && this.inFlight === 0 && !this.signal.aborted) this.host.finished(this.failure)
  }

  private async consume(): Promise<void> {
    try {
      for await (const event of this.client.stream(this.prompt, this.signal)) {
        if (event.type === 'token') this.buffer.push(event.text)
        else if (event.type === 'error') this.failure = event.message
      }
    } catch (error) {
      if (!this.signal.aborted) this.failure = error instanceof Error ? error.message : String(error)
    } finally {
      this.buffer.markDone()
    }
  }
}
