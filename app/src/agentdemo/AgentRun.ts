import { Scheduler } from '../demo/Scheduler'
import { StreamBuffer } from '../demo/TokenBuffer'
import { Timings } from '../demo/Timings'
import type { AgentClient } from './AgentClient'
import type { AgentEdge } from './AgentLayout'
import type { AgentStreamEvent } from './types'

/** What a run needs from the session. Small, specific callbacks instead of handing over the whole session. */
export interface AgentHost {
  edges(): readonly AgentEdge[]
  isLit(id: string): boolean
  light(id: string): void
  unlight(id: string): void
  setRun(runId: string): void
  approvalRequest(id: string, summary: string): void
  addAgent(agent: string, parent: string | null, task: string): void
  addLlm(agent: string, id: string, step: number, context: number): void
  endLlm(id: string, calls: number): void
  addTool(id: string, llm: string, name: string, args: Readonly<Record<string, unknown>>): void
  toolResult(id: string, result: string, error: boolean): void
  token(id: string, text: string): void
  addOutput(text: string): void
  setFinal(text: string): void
  paletteGlow(names: readonly string[], on: boolean): void
  paletteUsed(name: string): void
  enabledTools(): readonly string[]
  thick(edge: string): void
  launchDot(edge: string, durationMs: number, tools: boolean): number
  mergeDot(id: number): void
  removeDot(id: number): void
  finished(error: string | null): void
}

/**
 * Plays one agent run on the board. The model decides what exists, so boxes are created as events arrive; this replays
 * them at a watchable pace: the task and the toolbox join and run into the first LLM call, then each box lights up
 * (taking the next number) as the model reaches it, with a dot running along every line. A slow-mo factor stretches all pauses.
 */
export class AgentRun {
  private readonly task: string
  private readonly tools: readonly string[]
  private readonly systems: Readonly<Record<string, string>>
  private readonly timings: Timings
  private readonly client: AgentClient
  private readonly scheduler: Scheduler
  private readonly host: AgentHost
  private readonly signal: AbortSignal
  private readonly queue = new StreamBuffer<AgentStreamEvent>()
  private wake: (() => void) | null = null
  private networkError: string | null = null

  constructor(task: string, tools: readonly string[], systems: Readonly<Record<string, string>>, factor: number, client: AgentClient, scheduler: Scheduler, host: AgentHost, signal: AbortSignal) {
    this.task = task
    this.tools = tools
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
      for await (const event of this.client.stream(this.task, this.tools, this.systems, this.signal)) {
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

  private async nextEvent(): Promise<AgentStreamEvent | undefined> {
    while (this.queue.isEmpty && !this.queue.isDone) await new Promise<void>((resolve) => { this.wake = resolve })
    this.wake = null
    return this.queue.shift()
  }

  /** The task lights up, its dot runs towards the first LLM call, and the toolbox's lines join it half-way. */
  private async sendTask(): Promise<void> {
    const h = this.host
    const t = this.timings
    h.light('input')
    await this.sleep(t.inputGlowMs)
    h.unlight('input')

    const tools = h.enabledTools()
    const edges = h.edges()
    const lead = edges.find((e) => e.from === 'input')
    if (!lead) return
    const total = t.promptTravelMs * 2
    h.thick(lead.id)
    h.paletteGlow(tools, true)
    const prompt = h.launchDot(lead.id, total, false)
    const joining = tools.filter((name) => edges.some((e) => e.id === `pal:${name}`)).map((name) => {
      h.thick(`pal:${name}`)
      return h.launchDot(`pal:${name}`, total / 2, true)
    })
    await this.sleep(total / 2)
    h.mergeDot(prompt)
    joining.forEach((id) => h.removeDot(id))
    h.paletteGlow(tools, false)
    await this.sleep(total / 2)
    h.removeDot(prompt)
  }

  private async play(): Promise<void> {
    await this.sendTask()
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
  private async travel(edgeIds: readonly string[], ms: number): Promise<void> {
    const known = new Set(this.host.edges().map((e) => e.id))
    const present = edgeIds.filter((id) => known.has(id))
    if (present.length === 0) return
    const dots = present.map((id) => { this.host.thick(id); return this.host.launchDot(id, ms, false) })
    await this.sleep(ms)
    dots.forEach((id) => this.host.removeDot(id))
  }

  private async handle(event: AgentStreamEvent): Promise<void> {
    const h = this.host
    const t = this.timings
    switch (event.type) {
      case 'run':
        h.setRun(event.runId)
        return
      case 'approval_request':
        h.approvalRequest(event.id, event.summary)
        return
      case 'agent_start':
        h.addAgent(event.agent, event.parent, event.task)
        return
      case 'llm_start': {
        h.addLlm(event.agent, event.id, event.step, event.context)
        // Everything that feeds this call (the results of the previous tool calls, or the spawning tool) sends a dot in.
        const incoming = h.edges().filter((e) => e.to === event.id && e.from !== 'input' && h.isLit(e.from)).map((e) => e.id)
        await this.travel(incoming, t.promptTravelMs)
        h.light(event.id)
        await this.sleep(t.inputGlowMs)
        return
      }
      case 'token':
        h.token(event.id, event.text)
        await this.sleep(t.emitGapMs / 2)
        return
      case 'llm_end':
        h.endLlm(event.id, event.calls)
        h.unlight(event.id)
        return
      case 'tool_call': {
        // The calls of one step arrive together: they all appear, and all their dots run, at the same time.
        const batch = [event]
        for (let next = this.queue.peek(); next?.type === 'tool_call' && next.llm === event.llm; next = this.queue.peek()) {
          batch.push(this.queue.shift() as typeof event)
        }
        batch.forEach((c) => h.addTool(c.id, c.llm, c.name, c.arguments))
        await this.travel(batch.map((c) => `${c.llm}>${c.id}`), t.promptTravelMs)
        batch.forEach((c) => { h.light(c.id); h.paletteUsed(c.name); h.paletteGlow([c.name], true) })
        await this.sleep(t.inputGlowMs)
        return
      }
      case 'tool_result':
        h.toolResult(event.id, event.result, event.error)
        h.unlight(event.id)
        return
      case 'agent_end':
        return
      case 'final': {
        h.setFinal(event.text)
        h.addOutput(event.text)
        const into = h.edges().filter((e) => e.to === 'output').map((e) => e.id)
        await this.travel(into, t.promptTravelMs)
        h.light('output')
        await this.sleep(t.inputGlowMs)
        h.unlight('output')
        return
      }
      default:
        return
    }
  }
}
