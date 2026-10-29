import { Scheduler } from '../demo/Scheduler'
import { Timings } from '../demo/Timings'
import type { BackendStatus, Slowmo } from '../demo/types'
import { LlmStreamClient } from '../demo/LlmStreamClient'
import { ChainRun, type ChainHost } from './ChainRun'
import { ChainStreamClient } from './ChainStreamClient'
import type { ChainDot, GateCheck, HistoryTurn, LaneId, NodeId, NodeState, ShopAuthor, ShopSnapshot } from './types'

const NODE_IDS: readonly NodeId[] = ['input', 'extract', 'gate', 'draft', 'polish', 'output']
const BLANK_NODE: NodeState = { glow: false, number: null, text: '', tokens: 0, pulse: 0, checks: [] }
const DEFAULT_SLOWMO: Slowmo = { enabled: false, factor: 8 }

function blankNodes(): Record<NodeId, NodeState> {
  return Object.fromEntries(NODE_IDS.map((id) => [id, BLANK_NODE])) as Record<NodeId, NodeState>
}

/**
 * Everything the shop demo remembers: the chat, the pipeline boxes and the running sequence number.
 * One shared instance (shopSession.ts) lives outside React, so closing the overlay keeps the conversation;
 * only reset() clears it. The earlier turns are sent with each new message while the demo is not reset.
 */
export class ShopDemoSession {
  private readonly chain: ChainStreamClient
  private readonly health: LlmStreamClient
  private readonly scheduler = new Scheduler()
  private readonly listeners = new Set<() => void>()
  private snapshot: ShopSnapshot
  private nextId = 1
  private botMessageId: number | null = null
  private abort: AbortController | null = null

  constructor(chain: ChainStreamClient = new ChainStreamClient(), health: LlmStreamClient = new LlmStreamClient()) {
    this.chain = chain
    this.health = health
    this.snapshot = this.initial(DEFAULT_SLOWMO, { state: 'unknown' })
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): ShopSnapshot => this.snapshot

  // ---- commands ----
  setAssistantOpen(open: boolean): void {
    this.update({ assistantOpen: open })
  }

  /** Clears the chat, the boxes and the numbering. Slow-mo and backend status are kept. */
  reset(): void {
    this.abort?.abort()
    this.abort = null
    this.scheduler.clear()
    this.botMessageId = null
    this.snapshot = this.initial(this.snapshot.slowmo, this.snapshot.backend)
    this.emit()
  }

  setSlowmo(slowmo: Slowmo): void {
    this.update({ slowmo })
  }

  async refreshBackend(): Promise<void> {
    this.update({ backend: await this.health.health() })
  }

  send(raw: string): void {
    const text = raw.trim()
    if (!text || this.snapshot.busy) return

    const history = this.historyTurns() // everything said so far, before this message
    this.addMessage('me', text)
    this.botMessageId = null
    this.abort = new AbortController()

    const { slowmo } = this.snapshot
    // New run: clear what the boxes show, but keep their numbers so the count visibly continues.
    const nodes = Object.fromEntries(
      NODE_IDS.map((id): [NodeId, NodeState] => [id, { ...this.snapshot.nodes[id], glow: false, text: '', tokens: 0, checks: [] }]),
    ) as Record<NodeId, NodeState>
    this.update({ busy: true, nodes, dots: [], runStart: this.snapshot.counter })

    const timings = new Timings(slowmo.enabled ? slowmo.factor : 1)
    new ChainRun(text, history, timings, this.chain, this.scheduler, this.host(), this.abort.signal).start()
  }

  // ---- internals ----
  private initial(slowmo: Slowmo, backend: BackendStatus): ShopSnapshot {
    return {
      assistantOpen: false, messages: [], busy: false, nodes: blankNodes(), counter: 0, runStart: 0, dots: [], slowmo, backend,
    }
  }

  private update(patch: Partial<ShopSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    this.emit()
  }

  private emit(): void {
    this.listeners.forEach((l) => l())
  }

  private patchNode(id: NodeId, patch: (n: NodeState) => Partial<NodeState>): void {
    const node = this.snapshot.nodes[id]
    this.update({ nodes: { ...this.snapshot.nodes, [id]: { ...node, ...patch(node) } } })
  }

  private addMessage(author: ShopAuthor, text: string): number {
    const id = this.nextId++
    this.update({ messages: [...this.snapshot.messages, { id, author, text }] })
    return id
  }

  /** The chat so far as the backend wants it: the customer's lines and the assistant's replies (no system notes). */
  private historyTurns(): HistoryTurn[] {
    return this.snapshot.messages
      .filter((m) => m.author !== 'system' && m.text.trim() !== '')
      .map((m) => ({ role: m.author === 'me' ? 'user' : 'assistant', content: m.text }))
  }

  /** The session's side of a ChainRun: small, specific callbacks instead of handing over `this`. */
  private host(): ChainHost {
    return {
      activate: (node: NodeId, text?: string) => {
        const number = this.snapshot.counter + 1
        this.update({ counter: number })
        this.patchNode(node, () => ({ glow: true, number, ...(text === undefined ? {} : { text }) }))
      },
      setGlow: (node: NodeId, on: boolean) => this.patchNode(node, () => ({ glow: on })),
      emitToken: (node: NodeId, text: string) => this.patchNode(node, (n) => ({ text: n.text + text, tokens: n.tokens + 1 })),
      showGate: (checks: readonly GateCheck[]) => this.patchNode('gate', () => ({ checks })),
      launchDot: (kind: ChainDot['kind'], lane: LaneId, durationMs: number) => {
        const id = this.nextId++
        this.update({ dots: [...this.snapshot.dots, { id, kind, lane, startedAt: performance.now(), durationMs }] })
        return id
      },
      removeDot: (id: number) => this.update({ dots: this.snapshot.dots.filter((d) => d.id !== id) }),
      deliver: (text: string, countsAsToken: boolean) => {
        this.patchNode('output', (n) => ({ text: n.text + text, tokens: countsAsToken ? n.tokens + 1 : n.tokens, pulse: n.pulse + 1 }))
        this.appendBotText(text)
      },
      finished: (error: string | null) => {
        this.abort = null
        this.update({ busy: false })
        if (error) this.addMessage('system', `Could not get an answer: ${error}`)
      },
    }
  }

  private appendBotText(text: string): void {
    if (this.botMessageId === null) {
      this.botMessageId = this.addMessage('bot', text.trimStart())
      return
    }
    const id = this.botMessageId
    this.update({ messages: this.snapshot.messages.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)) })
  }
}
