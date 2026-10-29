import type { LlmStreamClient } from './LlmStreamClient'
import type { SystemPromptSource } from './SystemPromptSource'
import type { Scheduler } from './Scheduler'
import type { Timings } from './Timings'
import { StreamBuffer } from './TokenBuffer'
import type { DotKind, Lane, PipelineState } from './types'

/** What a run needs from whoever owns the UI state. Keeps PromptRun free of React and of the session. */
export interface RunHost {
  patchPipeline(patch: Partial<PipelineState>): void
  launchDot(kind: DotKind, lane: Lane, durationMs: number): number
  removeDot(id: number): void
  /** The system prompt has joined this prompt dot. */
  mergeDot(id: number): void
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
  private readonly systemSource: SystemPromptSource | null

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
    systemSource: SystemPromptSource | null = null,
  ) {
    this.prompt = prompt
    this.timings = timings
    this.client = client
    this.scheduler = scheduler
    this.host = host
    this.signal = signal
    this.systemSource = systemSource
  }

  start(): void {
    this.host.patchPipeline({
      inputGlow: true, inputText: this.prompt, llmGlow: false, llmTokens: 0, outputText: '', outputTokens: 0,
    })
    // Normally the real request begins now, in the background. With a system prompt source it waits until the
    // prompt reaches the LLM, so a system prompt edited while the dot is still travelling is the one that is used.
    if (!this.systemSource) void this.consume()
    this.scheduler.after(this.timings.inputGlowMs, () => this.sendPromptDot())
  }

  private sendPromptDot(): void {
    this.host.patchPipeline({ inputGlow: false })
    const travel = this.timings.promptTravelMs
    const id = this.host.launchDot('prompt', 'in', travel)

    // The system prompt does not go to the LLM directly: it runs to the Input -> LLM line and joins the prompt
    // half-way along it, timed to meet the prompt dot there. It is read (and then locked) at that moment, and
    // the real request is made when the combined prompt reaches the LLM.
    let system: string | undefined
    if (this.systemSource) {
      const source = this.systemSource
      const systemDot = this.host.launchDot('system', 'sys', travel / 2)
      this.scheduler.after(travel / 2, () => {
        this.host.removeDot(systemDot)
        this.host.mergeDot(id)
        system = source.current()
        source.lock()
      })
    }

    this.scheduler.after(travel, () => {
      this.host.removeDot(id)
      if (this.systemSource) void this.consume(system)
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

  private async consume(system?: string): Promise<void> {
    try {
      for await (const event of this.client.stream(this.prompt, this.signal, system)) {
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
