import type { ChatMessage } from '../domain/ChatMessage.ts'
import type { StreamEvent } from '../domain/StreamEvent.ts'
import type { LlmProvider } from './LlmProvider.ts'

/** Offline stand-in: streams canned text word by word. Lets the demo run with no key and no network. */
export class MockProvider implements LlmProvider {
  readonly name = 'mock'
  readonly model = 'mock-model'
  readonly isLive = false

  private readonly delayMs: number

  constructor(delayMs = 35) {
    this.delayMs = delayMs
  }

  async *stream(messages: readonly ChatMessage[], signal: AbortSignal): AsyncIterable<StreamEvent> {
    const asked = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
    const reply =
      `This is the offline mock model, so this is canned text. You asked: "${asked}". ` +
      `Add OLLAMA_API_KEY to app/server/.env to get a real answer from Ollama Cloud.`
    const tokens = reply.match(/\s*\S+/g) ?? []
    for (const text of tokens) {
      if (signal.aborted) return
      await new Promise((resolve) => setTimeout(resolve, this.delayMs))
      yield { type: 'token', text }
    }
    yield { type: 'done', stats: { tokens: tokens.length, finishReason: 'stop' } }
  }
}
