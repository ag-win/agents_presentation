import { Scheduler } from '../demo/Scheduler'
import { StreamBuffer } from '../demo/TokenBuffer'
import { Timings } from '../demo/Timings'
import type { RouteStreamClient } from './RouteStreamClient'
import type { RouterLayout } from './RouterLayout'
import type { DotKind, RouteStreamEvent, SearchEvent } from './types'

/** What a run needs from whoever owns the UI state (kept small so the run never touches React). */
export interface RouteHost {
  /** The box lights up and takes the next number of this query. `text` replaces its contents. */
  activate(node: string, text?: string): void
  setGlow(node: string, on: boolean): void
  /** An LLM box has emitted a token (shown in the box as its dot flies). */
  emitToken(node: string, text: string): void
  /** Draw this lane thick: the request has taken it. */
  markThick(lane: string): void
  /** The search finished: show the results on the page and in the results box. */
  showSearch(event: SearchEvent): void
  setRouted(label: string): void
  /** The line from the search-results box appears, attached to this specialist's lane. */
  showContextLane(label: string): void
  /** The search results have been appended to this specialist's system prompt. */
  appendContext(label: string): void
  launchDot(kind: DotKind, lane: string, durationMs: number): number
  removeDot(id: number): void
  mergeDot(id: number): void
  /** Text arrives in the Output box (and on the page). */
  deliver(text: string): void
  finished(error: string | null): void
  /** The current geometry (it changes when a dropdown panel is opened). */
  layout(): RouterLayout
}

/**
 * Choreography of ONE search query. The real request starts at once and its events pile up in a buffer;
 * the animation drains the buffer at its own pace (so slow-mo works):
 *   input glows -> big dot to the router -> router sheds label tokens -> the route lights up thick ->
 *   the query's dot runs to the chosen specialist while the search results run in along their own line and
 *   join it halfway -> the specialist glows and sheds token dots to the output.
 */
export class RouteRun {
  private readonly query: string
  private readonly systems: Readonly<Record<string, string>>
  private readonly factor: number
  private readonly timings: Timings
  private readonly client: RouteStreamClient
  private readonly scheduler: Scheduler
  private readonly host: RouteHost
  private readonly signal: AbortSignal

  private readonly buffer = new StreamBuffer<RouteStreamEvent>()
  private search: SearchEvent | null = null
  private inFlight = 0
  private paused = false
  private outputLit = false
  private failure: string | null = null
  private ended = false

  constructor(
    query: string,
    systems: Readonly<Record<string, string>>,
    factor: number,
    client: RouteStreamClient,
    scheduler: Scheduler,
    host: RouteHost,
    signal: AbortSignal,
  ) {
    this.query = query
    this.systems = systems
    this.factor = Math.max(1, factor)
    this.timings = new Timings(this.factor)
    this.client = client
    this.scheduler = scheduler
    this.host = host
    this.signal = signal
  }

  start(): void {
    this.host.activate('input', this.query)
    void this.consume()
    this.scheduler.after(this.timings.inputGlowMs, () => {
      this.host.setGlow('input', false)
      this.host.markThick('in-router')
      this.flyPrompt('in-router', () => this.pump())
    })
  }

  // Dot speeds in px per millisecond at real time; slow-mo stretches every duration by the same factor.
  private promptMs(length: number): number {
    return (length / 0.25) * this.factor
  }

  private tokenMs(length: number): number {
    return Math.max(320, length / 0.22) * this.factor
  }

  private flyPrompt(lane: string, then: () => void): void {
    const duration = this.promptMs(this.host.layout().lane(lane).length)
    const id = this.host.launchDot('prompt', lane, duration)
    this.scheduler.after(duration, () => {
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
      case 'search':
      case 'done':
        this.buffer.shift()
        return this.pump()
      case 'error':
        this.buffer.shift()
        this.failure = event.message
        return this.finish()
      case 'step_start':
        if (event.step === 'router') {
          this.buffer.shift()
          this.host.activate('router')
          this.host.markThick('router-bus')
        } else {
          this.buffer.shift() // the specialist lit up when the query reached it
        }
        return this.pump()
      case 'token':
        this.buffer.shift()
        return this.emit(event.step, event.text)
      case 'step_end':
        this.buffer.shift()
        this.host.setGlow(event.step, false)
        return this.pump()
      case 'route':
        if (this.inFlight > 0) return this.later() // the router's last token must land first
        this.buffer.shift()
        return this.dispatch(event.label)
    }
  }

  /** One token leaves its LLM box as a dot. The router's go to the route bus; a specialist's go to the output. */
  private emit(step: string, text: string): void {
    const lane = step === 'router' ? 'router-bus' : `out-${step}`
    this.host.emitToken(step, text)
    this.inFlight += 1
    const duration = this.tokenMs(this.host.layout().lane(lane).length)
    const id = this.host.launchDot('token', lane, duration)
    this.paused = true // pace the emission
    this.scheduler.after(duration, () => {
      this.host.removeDot(id)
      this.inFlight -= 1
      if (step !== 'router') this.landInOutput(text)
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
    this.host.deliver(text)
  }

  /** The query's dot runs to the chosen specialist; the search results run in on their own line and join it. */
  private dispatch(label: string): void {
    this.paused = true
    this.host.setRouted(label)
    this.host.markThick(`route-${label}`)
    const layout = this.host.layout()
    const total = this.promptMs(layout.lane(`route-${label}`).length)
    const promptDot = this.host.launchDot('prompt', `route-${label}`, total)

    if (this.search && this.search.context !== '') {
      const meet = layout.attachFraction(label) * total
      this.host.showContextLane(label)
      const contextDot = this.host.launchDot('context', `ctx-${label}`, meet)
      this.scheduler.after(meet, () => {
        this.host.removeDot(contextDot)
        this.host.mergeDot(promptDot)
        this.host.appendContext(label)
      })
    }

    this.scheduler.after(total, () => {
      this.host.removeDot(promptDot)
      this.host.markThick(`out-${label}`)
      this.host.activate(label)
      this.paused = false
      this.pump()
    })
  }

  private finish(): void {
    if (this.ended) return
    if (this.inFlight > 0) return this.later() // let the last dots land first
    this.ended = true
    this.host.finished(this.failure)
  }

  private async consume(): Promise<void> {
    try {
      for await (const event of this.client.stream(this.query, this.systems, this.signal)) {
        if (event.type === 'search') {
          this.search = event
          this.host.showSearch(event) // results appear at once, even when the animation is slowed down
        } else {
          this.buffer.push(event)
        }
      }
    } catch (error) {
      if (!this.signal.aborted) this.buffer.push({ type: 'error', message: error instanceof Error ? error.message : String(error) })
    } finally {
      this.buffer.markDone()
    }
  }
}
