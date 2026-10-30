import { StreamBuffer } from '../demo/TokenBuffer'
import { Scheduler } from '../demo/Scheduler'
import { Timings } from '../demo/Timings'
import type { SupportClient } from './SupportClient'
import type { SupportLayout } from './SupportLayout'
import type { PlanTask, SupportStreamEvent, Tone } from './types'

/** What a run needs from the session. Small, specific callbacks instead of handing over the whole session. */
export interface SupportHost {
  readonly layout: SupportLayout
  isLit(node: string): boolean
  light(node: string, kind: 'io' | 'llm' | 'code' | 'human' | 'tool'): void
  unlight(node: string): void
  token(stage: string, text: string): void
  note(stage: string, note: string): void
  verdict(stage: string, text: string, tone: Tone, detail?: string): void
  routed(branch: string): void
  plan(tasks: readonly PlanTask[]): void
  toolCall(stage: string, name: string, args: Readonly<Record<string, unknown>>): void
  toolResult(stage: string, name: string, result: string): void
  thick(edge: string): void
  launchDot(edge: string, durationMs: number): number
  removeDot(id: number): void
  showReply(text: string, branch: string, status: 'sent' | 'waiting', summary: string | null): void
  finished(error: string | null): void
}

const VERDICT_TONE: Record<string, Tone> = { ok: 'good', pass: 'good', block: 'bad', fail: 'bad' }

/**
 * Plays one customer message through the board. The network delivers events in bursts; this puts them in a queue and
 * replays them at a watchable pace: a dot travels each line, the next box lights (and takes the next number),
 * tokens stream into it, and it goes dark again when it finishes. A slow-mo factor stretches every pause equally.
 */
export class SupportRun {
  private readonly message: string
  private readonly systems: Readonly<Record<string, string>>
  private readonly timings: Timings
  private readonly client: SupportClient
  private readonly scheduler: Scheduler
  private readonly host: SupportHost
  private readonly signal: AbortSignal
  private readonly queue = new StreamBuffer<SupportStreamEvent>()
  private wake: (() => void) | null = null
  private networkError: string | null = null
  private lastEnded = 'input'

  constructor(message: string, systems: Readonly<Record<string, string>>, factor: number, client: SupportClient, scheduler: Scheduler, host: SupportHost, signal: AbortSignal) {
    this.message = message
    this.systems = systems
    this.timings = new Timings(factor)
    this.client = client
    this.scheduler = scheduler
    this.host = host
    this.signal = signal
  }

  start(): void {
    void this.consume()
    void this.play()
  }

  private async consume(): Promise<void> {
    try {
      for await (const event of this.client.stream(this.message, this.systems, this.signal)) {
        this.queue.push(event)
        this.wake?.()
      }
    } catch (error) {
      if (!this.signal.aborted) this.networkError = error instanceof Error ? error.message : String(error)
    } finally {
      this.queue.markDone()
      this.wake?.()
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => this.scheduler.after(ms, resolve))
  }

  private async nextEvent(): Promise<SupportStreamEvent | undefined> {
    while (this.queue.isEmpty && !this.queue.isDone) await new Promise<void>((resolve) => { this.wake = resolve })
    this.wake = null
    return this.queue.shift()
  }

  private async play(): Promise<void> {
    this.host.light('input', 'io')
    await this.sleep(this.timings.inputGlowMs)
    this.host.unlight('input')

    let error: string | null = null
    for (;;) {
      const event = await this.nextEvent()
      if (!event) break
      if (event.type === 'error') { error = event.message; break }
      await this.handle(event)
    }
    this.host.finished(error ?? this.networkError)
  }

  /** A dot runs along each of these lines at once; resolves when they have all arrived. */
  private async travel(edges: readonly string[], ms: number): Promise<void> {
    if (edges.length === 0) return
    const dots = edges.map((edge) => { this.host.thick(edge); return this.host.launchDot(edge, ms) })
    await this.sleep(ms)
    dots.forEach((id) => this.host.removeDot(id))
  }

  private async handle(event: SupportStreamEvent): Promise<void> {
    const h = this.host
    const t = this.timings
    switch (event.type) {
      case 'stage_start': {
        const incoming = h.layout.edgesInto(event.stage).filter((e) => h.isLit(e.from)).map((e) => e.id)
        await this.travel(incoming, t.promptTravelMs)
        h.light(event.stage, event.kind)
        await this.sleep(event.kind === 'llm' ? t.inputGlowMs : t.gateDwellMs)
        return
      }
      case 'token':
        h.token(event.stage, event.text)
        await this.sleep(t.emitGapMs / 2)
        return
      case 'stage_end':
        if (event.note) h.note(event.stage, event.note)
        h.unlight(event.stage)
        this.lastEnded = event.stage
        return
      case 'tool_call': {
        h.toolCall(event.stage, event.name, event.arguments)
        const edge = `${event.stage}>tool`
        if (h.layout.edge(edge)) {
          await this.travel([edge], t.promptTravelMs)
          h.light('tool', 'tool')
          await this.sleep(t.inputGlowMs)
        }
        return
      }
      case 'tool_result': {
        h.toolResult(event.stage, event.name, event.result)
        const edge = `tool>${event.stage}`
        if (h.layout.edge(edge)) {
          await this.sleep(t.inputGlowMs)
          h.unlight('tool')
          await this.travel([edge], t.promptTravelMs)
        }
        return
      }
      case 'decision': {
        const tone = VERDICT_TONE[event.label] ?? (event.stage === 'router' ? 'info' : 'info')
        h.verdict(event.stage, event.label, tone, event.detail)
        if (event.stage === 'router') h.routed(event.label)
        return
      }
      case 'plan':
        h.plan(event.tasks)
        return
      case 'reply': {
        if (event.needsHuman) {
          h.showReply(event.text, event.branch, 'waiting', event.summary ?? null)
          return
        }
        await this.travel([`${event.branch === 'guard' ? 'guard' : this.lastEnded}>output`], t.promptTravelMs)
        h.light('output', 'io')
        h.showReply(event.text, event.branch, 'sent', null)
        await this.sleep(t.inputGlowMs)
        h.unlight('output')
        return
      }
      default:
        return
    }
  }
}
