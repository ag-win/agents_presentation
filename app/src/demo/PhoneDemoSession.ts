import { LlmStreamClient } from './LlmStreamClient'
import { PromptRun, type RunHost } from './PromptRun'
import { ScriptedConversation, type ScriptLine } from './ScriptedConversation'
import { Scheduler } from './Scheduler'
import { Timings } from './Timings'
import type { Author, ChatMessage, DemoSnapshot, DotKind, Lane, PipelineState, Slowmo } from './types'

const EMPTY_PIPELINE: PipelineState = {
  inputGlow: false, inputText: '', llmGlow: false, llmTokens: 0, outputText: '', outputTokens: 0, outputPulse: 0,
}

const DEFAULT_SLOWMO: Slowmo = { enabled: false, factor: 8 }

/**
 * Everything the phone demo remembers. It lives outside React (one shared instance, see demoSession.ts) so
 * closing the overlay, or even leaving the slide, keeps the chat; only `reset()` clears it.
 * React subscribes with useSyncExternalStore: `subscribe` + `getSnapshot` (snapshots are immutable).
 */
export class PhoneDemoSession {
  private readonly client: LlmStreamClient
  private readonly scheduler = new Scheduler()
  private readonly script: ScriptedConversation
  private readonly listeners = new Set<() => void>()
  private snapshot: DemoSnapshot
  private nextId = 1
  private aiMessageId: number | null = null
  private abort: AbortController | null = null

  constructor(client: LlmStreamClient = new LlmStreamClient(), script: ScriptedConversation = ScriptedConversation.birthdayToast()) {
    this.client = client
    this.script = script
    this.snapshot = this.initial(DEFAULT_SLOWMO)
  }

  // ---- observable ----
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): DemoSnapshot => this.snapshot

  // ---- commands ----
  /** Fresh chat, then the scripted friends talk until it is the presenter's turn to type @AI. */
  startPlanned(): void {
    this.reset()
    this.update({ mode: 'planned' })
    this.playLines(this.script.before)
  }

  /** Fresh chat as a plain chatbot: every message must start with @AI to get an answer. */
  startFree(): void {
    this.reset()
    this.update({ mode: 'free' })
  }

  /** Stops anything in flight and empties the phone. Slow-mo settings and backend status are kept. */
  reset(): void {
    this.abort?.abort()
    this.abort = null
    this.scheduler.clear()
    this.aiMessageId = null
    this.snapshot = this.initial(this.snapshot.slowmo, this.snapshot.backend)
    this.emit()
  }

  setSlowmo(slowmo: Slowmo): void {
    this.update({ slowmo })
  }

  async refreshBackend(): Promise<void> {
    this.update({ backend: await this.client.health() })
  }

  /** The user pressed send in the phone. */
  send(raw: string): void {
    const text = raw.trim()
    const s = this.snapshot
    if (!text || s.mode === 'idle' || s.busy || s.scriptPlaying) return

    this.addMessage('me', text)
    const match = /^@ai\b[\s:,-]*/i.exec(text)
    if (!match) {
      if (s.mode === 'free') this.addMessage('system', 'Start your message with @AI to ask the assistant.')
      return
    }
    const prompt = text.slice(match[0].length).trim()
    if (!prompt) {
      this.addMessage('system', 'Add your request after @AI.')
      return
    }
    this.startRun(prompt)
  }

  // ---- internals ----
  private initial(slowmo: Slowmo, backend: DemoSnapshot['backend'] = { state: 'unknown' }): DemoSnapshot {
    return {
      mode: 'idle', messages: [], busy: false, scriptPlaying: false, typing: null,
      pipeline: EMPTY_PIPELINE, dots: [], slowmo, backend,
    }
  }

  private update(patch: Partial<DemoSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch }
    this.emit()
  }

  private emit(): void {
    this.listeners.forEach((l) => l())
  }

  private addMessage(author: Author, text: string): number {
    const message: ChatMessage = { id: this.nextId++, author, text }
    this.update({ messages: [...this.snapshot.messages, message] })
    return message.id
  }

  private playLines(lines: readonly ScriptLine[], onDone?: () => void): void {
    const [line, ...rest] = lines
    if (!line) {
      this.update({ scriptPlaying: false, typing: null })
      onDone?.()
      return
    }
    this.update({ scriptPlaying: true, typing: line.author })
    this.scheduler.after(line.pauseMs, () => {
      this.update({ typing: null })
      this.addMessage(line.author, line.text)
      this.scheduler.after(350, () => this.playLines(rest, onDone))
    })
  }

  private startRun(prompt: string): void {
    const { slowmo } = this.snapshot
    const timings = new Timings(slowmo.enabled ? slowmo.factor : 1)
    this.abort = new AbortController()
    this.aiMessageId = null
    this.update({ busy: true })
    new PromptRun(prompt, timings, this.client, this.scheduler, this.runHost(), this.abort.signal).start()
  }

  /** The session's view for a PromptRun: small, specific callbacks instead of handing over `this`. */
  private runHost(): RunHost {
    return {
      patchPipeline: (patch: Partial<PipelineState>) => this.update({ pipeline: { ...this.snapshot.pipeline, ...patch } }),
      launchDot: (kind: DotKind, lane: Lane, durationMs: number) => {
        const id = this.nextId++
        const offsetPx = 0
        this.update({ dots: [...this.snapshot.dots, { id, kind, lane, startedAt: performance.now(), durationMs, offsetPx }] })
        return id
      },
      removeDot: (id: number) => this.update({ dots: this.snapshot.dots.filter((d) => d.id !== id) }),
      tokenLanded: (text: string) => this.landToken(text),
      finished: (error: string | null) => this.finishRun(error),
    }
  }

  private landToken(text: string): void {
    const p = this.snapshot.pipeline
    if (this.aiMessageId === null) {
      this.aiMessageId = this.addMessage('ai', text.trimStart())
    } else {
      const id = this.aiMessageId
      this.update({ messages: this.snapshot.messages.map((m) => (m.id === id ? { ...m, text: m.text + text } : m)) })
    }
    this.update({ pipeline: { ...p, outputText: p.outputText + text, outputTokens: p.outputTokens + 1, outputPulse: p.outputPulse + 1 } })
  }

  private finishRun(error: string | null): void {
    this.abort = null
    const continueScript = !error && this.snapshot.mode === 'planned'
    // Keep the textbox locked across the pause before the friends reply, so it doesn't flicker open.
    this.update({ busy: false, scriptPlaying: continueScript })
    if (error) {
      this.addMessage('system', `Could not get an answer: ${error}`)
      return
    }
    if (continueScript) this.scheduler.after(900, () => this.playLines(this.script.after))
  }
}

