import { LlmStreamClient } from '../demo/LlmStreamClient'
import { Scheduler } from '../demo/Scheduler'
import type { Slowmo } from '../demo/types'
import { BLANK_NODE, type NodeState, type TraceRow } from '../supportdemo/types'
import { AgentClient } from './AgentClient'
import type { AgentConfigStore } from './AgentConfigStore'
import { AgentLayout, type Laid } from './AgentLayout'
import { AgentRun, type AgentHost } from './AgentRun'
import type { AgentInfo, AgentSnapshot, GraphNode } from './types'

const DEFAULT_SLOWMO: Slowmo = { enabled: false, factor: 8 }

/**
 * The agent demo's state. Every task starts from a clean slate (boxes, numbers, lines, trace); only the toolbox settings,
 * the system prompts and slow-mo persist. One shared instance (sharedSession.ts) lives outside React.
 */
export class AgentSession {
  private readonly stream: AgentClient
  private readonly health: LlmStreamClient
  private readonly config: AgentConfigStore
  private readonly scheduler = new Scheduler()
  private readonly listeners = new Set<() => void>()
  private snapshot: AgentSnapshot
  private nextId = 1
  private nextRow = 1
  private abort: AbortController | null = null
  private layoutCache: { key: string; laid: Laid } | null = null

  constructor(config: AgentConfigStore, stream: AgentClient = new AgentClient(), health: LlmStreamClient = new LlmStreamClient()) {
    this.config = config
    this.stream = stream
    this.health = health
    this.snapshot = this.initial(DEFAULT_SLOWMO, { state: 'unknown' })
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): AgentSnapshot => this.snapshot

  /** Where every box is right now (cached until the boxes, the toolbox or the switches change). */
  layout(): Laid {
    const defaults = this.config.getSnapshot().defaults
    const enabled = this.config.enabled()
    const key = `${this.snapshot.nodes.length}|${this.snapshot.agents.length}|${this.snapshot.nodes.map((n) => (n.kind === 'llm' ? n.calls : '')).join(',')}|${enabled.join(',')}|${defaults ? defaults.tools.length : 0}`
    if (!this.layoutCache || this.layoutCache.key !== key) {
      this.layoutCache = { key, laid: AgentLayout.compute(defaults?.tools ?? [], this.snapshot.nodes, this.snapshot.agents, new Set(enabled)) }
    }
    return this.layoutCache.laid
  }

  // ---- commands ----
  /** Run one task. Resets everything from the previous task. */
  send(raw: string): void {
    const task = raw.trim()
    if (!task || this.snapshot.busy) return
    this.abort = new AbortController()
    this.scheduler.clear()
    this.snapshot = { ...this.initial(this.snapshot.slowmo, this.snapshot.backend), task, busy: true, stats: { startedAt: performance.now(), elapsedMs: null } }
    this.emit()
    this.config.lock()
    const { slowmo } = this.snapshot
    new AgentRun(task, this.config.enabled(), this.config.systems(), slowmo.enabled ? slowmo.factor : 1, this.stream, this.scheduler, this.host(), this.abort.signal).start()
  }

  /** The person presses Approve or Decline on a paused tool: the run carries on with their answer. */
  decide(approved: boolean): void {
    const { approval, runId } = this.snapshot
    if (!approval || approval.status !== 'waiting' || !runId) return
    this.update({ approval: { ...approval, status: approved ? 'approved' : 'declined' } })
    void this.stream.decide(runId, approval.id, approved)
  }

  /** Stop anything running, clear the board, restore the toolbox and default prompts, and empty the workspace. */
  reset(): void {
    this.abort?.abort()
    this.abort = null
    this.scheduler.clear()
    this.snapshot = this.initial(this.snapshot.slowmo, this.snapshot.backend)
    this.config.reset()
    void this.config.clearWorkspace()
    this.emit()
  }

  /** Stop the current task but keep what is on the board. */
  stop(): void {
    if (!this.snapshot.busy) return
    this.abort?.abort()
    this.scheduler.clear()
    this.host().finished('Stopped.')
  }

  setSlowmo(slowmo: Slowmo): void {
    this.update({ slowmo })
  }

  async refreshBackend(): Promise<void> {
    this.update({ backend: await this.health.health() })
  }

  // ---- internals ----
  private initial(slowmo: Slowmo, backend: AgentSnapshot['backend']): AgentSnapshot {
    this.nextRow = 1
    this.layoutCache = null
    return {
      task: '', runId: null, approval: null, busy: false, nodes: [], agents: [], states: {}, counter: 0, thick: [], dots: [], used: {}, glowing: {}, trace: [],
      final: null, error: null, stats: { startedAt: null, elapsedMs: null }, slowmo, backend,
    }
  }

  private update(patch: Partial<AgentSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    this.emit()
  }

  private emit(): void {
    this.listeners.forEach((l) => l())
  }

  private stateOf(id: string): NodeState {
    return this.snapshot.states[id] ?? BLANK_NODE
  }

  private patchState(id: string, change: (n: NodeState) => Partial<NodeState>): void {
    this.update({ states: { ...this.snapshot.states, [id]: { ...this.stateOf(id), ...change(this.stateOf(id)) } } })
  }

  private patchRow(id: string, change: (r: TraceRow) => Partial<TraceRow>): void {
    const trace = [...this.snapshot.trace]
    for (let i = trace.length - 1; i >= 0; i--) {
      if (trace[i].stage === id) {
        trace[i] = { ...trace[i], ...change(trace[i]) }
        this.update({ trace })
        return
      }
    }
  }

  private patchNode(id: string, change: (n: GraphNode) => GraphNode): void {
    this.update({ nodes: this.snapshot.nodes.map((n) => (n.id === id ? change(n) : n)) })
  }

  private labelOf(tool: string): string {
    return this.config.getSnapshot().defaults?.tools.find((t) => t.name === tool)?.label ?? tool
  }

  /** "Sub-agent 2 · " in front of the name of a box that belongs to a sub-agent. */
  private prefixOf(agent: string): string {
    const info = this.snapshot.agents.find((a) => a.id === agent)
    return info && info.parent !== null ? `Sub-agent ${info.order} · ` : ''
  }

  private titleOf(id: string): string {
    const node = this.snapshot.nodes.find((n) => n.id === id)
    if (!node) return id === 'input' ? 'Task' : id === 'output' ? 'Reply' : id
    if (node.kind === 'llm') return `${this.prefixOf(node.agent)}LLM call ${node.step}`
    if (node.kind === 'tool') return `${this.prefixOf(node.agent)}${this.labelOf(node.name)}`
    return 'Reply'
  }

  /** The session's side of an AgentRun. */
  private host(): AgentHost {
    return {
      edges: () => this.layout().edges,
      isLit: (id) => this.stateOf(id).number !== null,
      light: (id) => {
        const number = this.snapshot.counter + 1
        this.update({ counter: number })
        this.patchState(id, (n) => ({ glow: true, number, pulse: id === 'output' ? n.pulse + 1 : n.pulse }))
        if (id === 'input' || id === 'output') return
        const node = this.snapshot.nodes.find((n) => n.id === id)
        const row: TraceRow = { id: this.nextRow++, stage: id, number, kind: node?.kind === 'tool' ? 'tool' : 'stage', title: this.titleOf(id), body: node?.kind === 'tool' ? JSON.stringify(node.arguments) : '', verdict: null, live: true }
        this.update({ trace: [...this.snapshot.trace, row] })
      },
      unlight: (id) => {
        this.patchState(id, () => ({ glow: false }))
        this.patchRow(id, () => ({ live: false }))
      },
      setRun: (runId) => this.update({ runId }),
      approvalRequest: (id, summary) => {
        this.update({ approval: { id, summary, status: 'waiting' } })
        const verdict = { text: 'waiting', tone: 'info' as const }
        this.patchState(id, () => ({ verdict }))
        this.patchRow(id, () => ({ verdict }))
      },
      addAgent: (agent, parent, task) => {
        const info: AgentInfo = { id: agent, parent, task, order: parent === null ? 0 : this.snapshot.agents.filter((a) => a.parent !== null).length + 1 }
        this.update({ agents: [...this.snapshot.agents, info] })
      },
      addLlm: (agent, id, step, context) => this.update({ nodes: [...this.snapshot.nodes, { kind: 'llm', id, agent, step, context, calls: null }] }),
      endLlm: (id, calls) => {
        this.patchNode(id, (n) => (n.kind === 'llm' ? { ...n, calls } : n))
        const verdict = calls === 0 ? { text: 'final answer', tone: 'good' as const } : { text: calls === 1 ? '1 tool' : `${calls} tools`, tone: 'info' as const }
        this.patchState(id, () => ({ verdict }))
        this.patchRow(id, () => ({ verdict }))
      },
      addTool: (id, llm, name, args) => {
        const agent = this.snapshot.nodes.find((n) => n.id === llm && n.kind === 'llm')
        this.update({ nodes: [...this.snapshot.nodes, { kind: 'tool', id, agent: agent && agent.kind === 'llm' ? agent.agent : 'a0', llm, index: Number(id.split('.c')[1]) || 1, name, arguments: args, result: null, error: false }] })
      },
      toolResult: (id, result, error) => {
        this.patchNode(id, (n) => (n.kind === 'tool' ? { ...n, result, error } : n))
        // A tool that waited for a person: if no answer ever came (timeout or Stop), say so.
        const pending = this.snapshot.approval
        if (pending && pending.id === id && pending.status === 'waiting') this.update({ approval: { ...pending, status: 'timeout' } })
        const after = this.snapshot.approval && this.snapshot.approval.id === id ? this.snapshot.approval.status : null
        const verdict = after === 'declined' ? { text: 'declined', tone: 'bad' as const } : after === 'timeout' ? { text: 'no answer', tone: 'bad' as const } : { text: error ? 'error' : 'ok', tone: error ? ('bad' as const) : ('good' as const) }
        this.patchState(id, () => ({ verdict, text: result }))
        this.patchRow(id, (r) => ({ body: `${r.body}\n→ ${result}`, verdict, live: false }))
        const node = this.snapshot.nodes.find((n) => n.id === id)
        if (node && node.kind === 'tool') this.update({ glowing: { ...this.snapshot.glowing, [node.name]: false } })
      },
      token: (id, text) => {
        this.patchState(id, (n) => ({ text: n.text + text, tokens: n.tokens + 1 }))
        this.patchRow(id, (r) => ({ body: r.body + text }))
      },
      addOutput: (text) => {
        this.update({ nodes: [...this.snapshot.nodes, { kind: 'output', id: 'output' }] })
        this.patchState('output', () => ({ text }))
      },
      setFinal: (text) => this.update({ final: text }),
      paletteGlow: (names, on) => this.update({ glowing: { ...this.snapshot.glowing, ...Object.fromEntries(names.map((n) => [n, on])) } }),
      paletteUsed: (name) => this.update({ used: { ...this.snapshot.used, [name]: (this.snapshot.used[name] ?? 0) + 1 } }),
      enabledTools: () => this.config.enabled(),
      thick: (edge) => {
        if (!this.snapshot.thick.includes(edge)) this.update({ thick: [...this.snapshot.thick, edge] })
      },
      launchDot: (edge, durationMs, tools) => {
        const id = this.nextId++
        this.update({ dots: [...this.snapshot.dots, { id, edge, startedAt: performance.now(), durationMs, tools }] })
        return id
      },
      mergeDot: (id) => this.update({ dots: this.snapshot.dots.map((d) => (d.id === id ? { ...d, merged: true } : d)) }),
      removeDot: (id) => this.update({ dots: this.snapshot.dots.filter((d) => d.id !== id) }),
      finished: (error) => {
        this.abort = null
        this.config.unlock()
        void this.config.refreshFiles()
        const states = Object.fromEntries(Object.entries(this.snapshot.states).map(([id, n]) => [id, n.glow ? { ...n, glow: false } : n]))
        const trace = this.snapshot.trace.map((r) => (r.live ? { ...r, live: false } : r))
        const started = this.snapshot.stats.startedAt
        this.update({ busy: false, error, states, trace, glowing: {}, dots: [], stats: { startedAt: started, elapsedMs: started === null ? null : performance.now() - started } })
      },
    }
  }
}
