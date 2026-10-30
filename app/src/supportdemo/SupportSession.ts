import { LlmStreamClient } from '../demo/LlmStreamClient'
import { Scheduler } from '../demo/Scheduler'
import { Timings } from '../demo/Timings'
import type { Slowmo } from '../demo/types'
import { SupportClient } from './SupportClient'
import { SupportLayout } from './SupportLayout'
import type { SupportPromptStore } from './SupportPromptStore'
import { SupportRun, type SupportHost } from './SupportRun'
import { BLANK_NODE, type NodeState, type PlanTask, type SupportSnapshot, type Tone, type TraceRow } from './types'

const DEFAULT_SLOWMO: Slowmo = { enabled: false, factor: 8 }
const DECLINED_TEXT = 'Not sent. A human colleague will write to the customer personally.'

/**
 * The support desk's state. Every message starts from a clean slate: boxes, numbers, lines and the trace all reset
 * (there is no conversation). Only the system prompts (SupportPromptStore) and slow-mo persist.
 * One shared instance (sharedSession.ts) lives outside React, so closing the overlay changes nothing.
 */
export class SupportSession {
  readonly layout = new SupportLayout()

  private readonly stream: SupportClient
  private readonly health: LlmStreamClient
  private readonly prompts: SupportPromptStore
  private readonly scheduler = new Scheduler()
  private readonly listeners = new Set<() => void>()
  private snapshot: SupportSnapshot
  private nextId = 1
  private nextRow = 1
  private abort: AbortController | null = null

  constructor(prompts: SupportPromptStore, stream: SupportClient = new SupportClient(), health: LlmStreamClient = new LlmStreamClient()) {
    this.prompts = prompts
    this.stream = stream
    this.health = health
    this.snapshot = this.initial(DEFAULT_SLOWMO, { state: 'unknown' })
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): SupportSnapshot => this.snapshot

  // ---- commands ----
  /** Run one customer message through the desk. Resets everything from the previous message. */
  send(raw: string): void {
    const message = raw.trim()
    if (!message || this.snapshot.busy) return
    this.abort = new AbortController()
    this.scheduler.clear()
    this.snapshot = { ...this.initial(this.snapshot.slowmo, this.snapshot.backend), message, busy: true, startedAt: performance.now() }
    this.emit()
    this.prompts.lock()
    const { slowmo } = this.snapshot
    new SupportRun(message, this.prompts.systems(), slowmo.enabled ? slowmo.factor : 1, this.stream, this.scheduler, this.host(), this.abort.signal).start()
  }

  /** The human presses Approve on an escalation: the reply travels to the customer. */
  approve(): void {
    const reply = this.snapshot.reply
    if (!reply || reply.status !== 'waiting') return
    const travel = new Timings(this.factor()).promptTravelMs
    const edge = 'human>output'
    const host = this.host()
    host.thick(edge)
    const dot = host.launchDot(edge, travel)
    this.scheduler.after(travel, () => {
      host.removeDot(dot)
      host.light('output', 'io')
      this.update({ reply: { ...reply, status: 'approved' } })
      this.patchNode('output', () => ({ text: reply.text }))
      this.scheduler.after(new Timings(this.factor()).inputGlowMs, () => host.unlight('output'))
    })
  }

  /** The human presses Decline: nothing is sent. */
  decline(): void {
    const reply = this.snapshot.reply
    if (!reply || reply.status !== 'waiting') return
    this.update({ reply: { ...reply, status: 'declined' } })
    this.patchNode('output', () => ({ text: DECLINED_TEXT }))
  }

  /** Stop anything running, clear the board and restore the default system prompts. */
  reset(): void {
    this.abort?.abort()
    this.abort = null
    this.scheduler.clear()
    this.snapshot = this.initial(this.snapshot.slowmo, this.snapshot.backend)
    this.prompts.reset()
    this.emit()
  }

  setSlowmo(slowmo: Slowmo): void {
    this.update({ slowmo })
  }

  async refreshBackend(): Promise<void> {
    this.update({ backend: await this.health.health() })
  }

  // ---- internals ----
  private factor(): number {
    const { slowmo } = this.snapshot
    return slowmo.enabled ? slowmo.factor : 1
  }

  private initial(slowmo: Slowmo, backend: SupportSnapshot['backend']): SupportSnapshot {
    this.nextRow = 1
    return {
      message: '', busy: false, nodes: {}, counter: 0, thick: [], routed: null, trace: [], reply: null, toolLog: null,
      error: null, startedAt: null, elapsedMs: null, dots: [], slowmo, backend,
    }
  }

  private update(patch: Partial<SupportSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    this.emit()
  }

  private emit(): void {
    this.listeners.forEach((l) => l())
  }

  private nodeOf(id: string): NodeState {
    return this.snapshot.nodes[id] ?? BLANK_NODE
  }

  private patchNode(id: string, change: (n: NodeState) => Partial<NodeState>): void {
    const node = this.nodeOf(id)
    this.update({ nodes: { ...this.snapshot.nodes, [id]: { ...node, ...change(node) } } })
  }

  /** Change the newest trace row for a stage. */
  private patchRow(stage: string, change: (r: TraceRow) => Partial<TraceRow>, kind: TraceRow['kind'] = 'stage'): void {
    const trace = [...this.snapshot.trace]
    for (let i = trace.length - 1; i >= 0; i--) {
      if (trace[i].stage === stage && trace[i].kind === kind) {
        trace[i] = { ...trace[i], ...change(trace[i]) }
        this.update({ trace })
        return
      }
    }
  }

  private titleOf(stage: string): string {
    const base = this.layout.node(stage)?.label ?? stage
    const caption = this.nodeOf(stage).caption
    return caption && caption !== 'unused' ? `${base} · ${caption}` : base
  }

  /** The session's side of a SupportRun. */
  private host(): SupportHost {
    return {
      layout: this.layout,
      isLit: (node) => this.nodeOf(node).number !== null,
      light: (node, kind) => {
        const number = this.snapshot.counter + 1
        this.update({ counter: number })
        this.patchNode(node, (n) => ({ glow: true, number, pulse: node === 'output' ? n.pulse + 1 : n.pulse }))
        if (node === 'input' || node === 'output' || kind === 'tool') return
        const row: TraceRow = { id: this.nextRow++, stage: node, number, kind: 'stage', title: this.titleOf(node), body: '', verdict: null, live: true }
        this.update({ trace: [...this.snapshot.trace, row] })
      },
      unlight: (node) => {
        this.patchNode(node, () => ({ glow: false }))
        this.patchRow(node, () => ({ live: false }))
      },
      token: (stage, text) => {
        this.patchNode(stage, (n) => ({ text: n.text + text, tokens: n.tokens + 1 }))
        this.patchRow(stage, (r) => ({ body: r.body + text }))
      },
      note: (stage, note) => {
        this.patchNode(stage, () => ({ text: note }))
        this.patchRow(stage, () => ({ body: note }))
      },
      verdict: (stage, text, tone: Tone, detail) => {
        this.patchNode(stage, () => ({ verdict: { text, tone } }))
        this.patchRow(stage, (r) => ({ verdict: { text, tone }, body: detail ?? r.body }))
      },
      routed: (branch) => this.update({ routed: branch }),
      plan: (tasks: readonly PlanTask[]) => {
        const nodes = { ...this.snapshot.nodes }
        for (let i = 1; i <= 3; i++) {
          const task = tasks.find((t) => t.stage === `worker${i}`)
          nodes[`worker${i}`] = { ...(nodes[`worker${i}`] ?? BLANK_NODE), caption: task ? task.label : 'unused' }
        }
        this.update({ nodes })
        this.patchRow('planner', () => ({ body: tasks.map((t, i) => `${i + 1}. ${t.label}: ${t.request}`).join('\n') }))
      },
      toolCall: (stage, name, args) => {
        this.patchNode(stage, () => ({ usedTool: true }))
        const call = `${name}(${Object.entries(args).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')})`
        const row: TraceRow = { id: this.nextRow++, stage, number: null, kind: 'tool', title: `${this.titleOf(stage)} asks to run a tool`, body: call, verdict: null, live: true }
        this.update({ trace: [...this.snapshot.trace, row], toolLog: { name, arguments: args, result: null } })
      },
      toolResult: (stage, name, result) => {
        this.patchRow(stage, (r) => ({ body: `${r.body}\n→ ${result}`, live: false }), 'tool')
        const log = this.snapshot.toolLog
        this.update({ toolLog: { name, arguments: log?.arguments ?? {}, result } })
      },
      thick: (edge) => {
        if (!this.snapshot.thick.includes(edge)) this.update({ thick: [...this.snapshot.thick, edge] })
      },
      launchDot: (edge, durationMs) => {
        const id = this.nextId++
        this.update({ dots: [...this.snapshot.dots, { id, edge, startedAt: performance.now(), durationMs }] })
        return id
      },
      removeDot: (id) => this.update({ dots: this.snapshot.dots.filter((d) => d.id !== id) }),
      showReply: (text, branch, status, summary) => {
        this.update({ reply: { text, branch, status, summary } })
        if (status === 'sent') this.patchNode('output', () => ({ text }))
      },
      finished: (error) => {
        this.abort = null
        this.prompts.unlock()
        const trace = this.snapshot.trace.map((r) => (r.live ? { ...r, live: false } : r))
        const nodes = Object.fromEntries(Object.entries(this.snapshot.nodes).map(([id, n]) => [id, n.glow ? { ...n, glow: false } : n]))
        const started = this.snapshot.startedAt
        this.update({ busy: false, error, trace, nodes, elapsedMs: started === null ? null : performance.now() - started })
      },
    }
  }
}
