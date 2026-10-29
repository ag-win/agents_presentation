import type { ChatMessage } from '../domain/ChatMessage.ts'
import type { StreamEvent } from '../domain/StreamEvent.ts'
import type { GenerationOptions, LlmProvider } from './LlmProvider.ts'

const ISSUE_WORDS = /(broken|cracked|damaged|faulty|not working|stopped working|late|missing|wrong)/i

/**
 * Offline stand-in: streams canned text token by token. Lets the demos run with no key and no network.
 * It plays along with the shop chain well enough to show the gate pass and fail: when asked for JSON it
 * "extracts" an order number and problem from the conversation with simple patterns.
 */
export class MockProvider implements LlmProvider {
  readonly name = 'mock'
  readonly model = 'mock-model'
  readonly isLive = false

  private readonly delayMs: number

  constructor(delayMs = 35) {
    this.delayMs = delayMs
  }

  async *stream(messages: readonly ChatMessage[], signal: AbortSignal, options: GenerationOptions = {}): AsyncIterable<StreamEvent> {
    const asked = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
    const system = messages.find((m) => m.role === 'system')?.content ?? ''
    const tokens = this.tokenize(this.reply(asked, options, system))
    for (const text of tokens) {
      if (signal.aborted) return
      await new Promise((resolve) => setTimeout(resolve, this.delayMs))
      yield { type: 'token', text }
    }
    yield { type: 'done', stats: { tokens: tokens.length, finishReason: 'stop' } }
  }

  private reply(asked: string, options: GenerationOptions, system: string): string {
    if (options.jsonMode) return this.fakeExtraction(asked)
    if (options.purpose === 'classify') return this.fakeLabel(asked)
    if (asked.startsWith('FACTS:')) {
      return 'Sorry about the problem with your order. Items that arrive damaged can be refunded or replaced within 14 days. Please send a photo of the damage and we will sort it out.'
    }
    if (asked.startsWith('DRAFT:')) {
      return "So sorry about that! We can refund or replace it, just send us a photo of the damage. (offline mock reply)"
    }
    return (
      `This is the offline mock model, so this is canned text. You asked: "${asked}". ` +
      'Add OLLAMA_API_KEY to app/server/.env to get a real answer from Ollama Cloud.' +
      (system ? ` (System prompt in use: "${system.slice(0, 60)}")` : '')
    )
  }

  private fakeLabel(asked: string): string {
    if (/(recipe|cook|food|eat|dinner|lunch|breakfast|restaurant|rice|chicken|egg|soup|bake)/i.test(asked)) return 'food'
    if (/(flight|travel|trip|hotel|visa|beach|city|tour|holiday|airport)/i.test(asked)) return 'travel'
    if (/(headache|pain|sleep|health|doctor|fever|symptom|exercise|medicine|cough)/i.test(asked)) return 'health'
    return 'general'
  }

  private fakeExtraction(asked: string): string {
    const text = asked.replace(/^CONVERSATION:\s*/, '')
    const order = /\b(\d{3,10})\b/.exec(text)?.[1] ?? null
    const issue = ISSUE_WORDS.exec(text)?.[1] ?? null
    const request = /refund|money back/i.test(text) ? 'refund' : /replace/i.test(text) ? 'replacement' : null
    return JSON.stringify({ orderNumber: order, product: null, issue, request })
  }

  private tokenize(text: string): string[] {
    return text.match(/\s*\S+/g) ?? []
  }
}
