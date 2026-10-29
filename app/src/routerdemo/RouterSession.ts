import { LlmStreamClient } from '../demo/LlmStreamClient'
import { Scheduler } from '../demo/Scheduler'
import type { Slowmo } from '../demo/types'
import { RouteRun, type RouteHost } from './RouteRun'
import { RouteStreamClient } from './RouteStreamClient'
import { RouterLayout } from './RouterLayout'
import type { RouterPromptStore } from './RouterPromptStore'
import { BLANK_NODE, type DotKind, type NodeState, type RouterSnapshot, type SearchEvent } from './types'

const DEFAULT_SLOWMO: Slowmo = { enabled: false, factor: 8 }

/**
 * The routing demo's state. Every query starts from a clean slate: boxes, numbers, lines and the page all
 * reset (there is no conversation). Only the system prompts (RouterPromptStore) and slow-mo persist.
 * One shared instance (routerSession.ts) lives outside React, so closing the overlay changes nothing.
 */
export class RouterSession {
  private readonly stream: RouteStreamClient
  private readonly health: LlmStreamClient
  private readonly prompts: RouterPromptStore
  private readonly scheduler = new Scheduler()
  private readonly listeners = new Set<() => void>()
  private snapshot: RouterSnapshot
  private nextId = 1
  private abort: AbortController | null = null

  constructor(prompts: RouterPromptStore, stream: RouteStreamClient = new RouteStreamClient(), health: LlmStreamClient = new LlmStreamClient()) {
    this.prompts = prompts
    this.stream = stream
    this.health = health
    this.snapshot = this.initial(DEFAULT_SLOWMO, { state: 'unknown' })
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): RouterSnapshot => this.snapshot

  // ---- commands ----
  /** Run one search query through the router. Resets everything from the previous query. */
  run(raw: string): void {
    const query = raw.trim()
    if (!query || this.snapshot.busy) return
    this.abort = new AbortController()
    this.scheduler.clear()
    this.snapshot = { ...this.initial(this.snapshot.slowmo, this.snapshot.backend), query, busy: true, search: { status: 'loading', query } }
    this.emit()
    this.prompts.lock()
    const { slowmo } = this.snapshot
    new RouteRun(query, this.prompts.systems(), slowmo.enabled ? slowmo.factor : 1, this.stream, this.scheduler, this.host(), this.abort.signal).start()
  }

  /** Stop anything running, clear the page and restore the default system prompts. */
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
  private initial(slowmo: Slowmo, backend: RouterSnapshot['backend']): RouterSnapshot {
    const nodes: Record<string, NodeState> = { input: BLANK_NODE, router: BLANK_NODE, output: BLANK_NODE }
    for (const id of this.prompts.specialistIds) nodes[id] = BLANK_NODE
    return {
      query: '', busy: false, nodes, counter: 0, thick: [], routed: null, contextLaneFor: null, appendedFor: null,
      search: { status: 'idle' }, answer: { text: '', label: null, error: null }, dots: [], slowmo, backend,
    }
  }

  private update(patch: Partial<RouterSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    this.emit()
  }

  private emit(): void {
    this.listeners.forEach((l) => l())
  }

  private patchNode(id: string, change: (n: NodeState) => Partial<NodeState>): void {
    const node = this.snapshot.nodes[id] ?? BLANK_NODE
    this.update({ nodes: { ...this.snapshot.nodes, [id]: { ...node, ...change(node) } } })
  }

  private currentLayout(): RouterLayout {
    return new RouterLayout(this.prompts.specialistIds)
  }

  /** The session's side of a RouteRun: small, specific callbacks instead of handing over `this`. */
  private host(): RouteHost {
    return {
      activate: (node: string, text?: string) => {
        const number = this.snapshot.counter + 1
        this.update({ counter: number })
        this.patchNode(node, () => ({ glow: true, number, ...(text === undefined ? {} : { text }) }))
      },
      setGlow: (node: string, on: boolean) => this.patchNode(node, () => ({ glow: on })),
      emitToken: (node: string, text: string) => this.patchNode(node, (n) => ({ text: n.text + text, tokens: n.tokens + 1 })),
      markThick: (lane: string) => {
        if (!this.snapshot.thick.includes(lane)) this.update({ thick: [...this.snapshot.thick, lane] })
      },
      showSearch: (event: SearchEvent) =>
        this.update({ search: { status: 'done', query: event.query, results: event.results, context: event.context, error: event.error } }),
      setRouted: (label: string) => this.update({ routed: label, answer: { ...this.snapshot.answer, label: this.prompts.nameOf(label) } }),
      showContextLane: (label: string) => this.update({ contextLaneFor: label }),
      appendContext: (label: string) => this.update({ appendedFor: label }),
      launchDot: (kind: DotKind, lane: string, durationMs: number) => {
        const id = this.nextId++
        this.update({ dots: [...this.snapshot.dots, { id, kind, lane, startedAt: performance.now(), durationMs }] })
        return id
      },
      removeDot: (id: number) => this.update({ dots: this.snapshot.dots.filter((d) => d.id !== id) }),
      mergeDot: (id: number) => this.update({ dots: this.snapshot.dots.map((d) => (d.id === id ? { ...d, merged: true } : d)) }),
      deliver: (text: string) => {
        this.patchNode('output', (n) => ({ text: n.text + text, tokens: n.tokens + 1, pulse: n.pulse + 1 }))
        this.update({ answer: { ...this.snapshot.answer, text: this.snapshot.answer.text + text } })
      },
      finished: (error: string | null) => {
        this.abort = null
        this.prompts.unlock()
        this.update({ busy: false, answer: { ...this.snapshot.answer, error } })
      },
      layout: () => this.currentLayout(),
    }
  }
}
