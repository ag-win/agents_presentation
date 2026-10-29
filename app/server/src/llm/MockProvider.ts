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
    const tool = options.tools?.[0]
    if (tool && !messages.some((m) => m.role === 'tool')) {
      // Offline stand-in for a model that decides to use its tool: pick the first number out of the question as the order id.
      const id = /\b(\d{3,8})\b/.exec(asked)?.[1]
      if (id) {
        yield { type: 'tool_call', call: { id: 'mock_call_1', name: tool.name, arguments: { order_id: id } } }
        yield { type: 'done', stats: { finishReason: 'tool_use' } }
        return
      }
    }
    const toolResult = [...messages].reverse().find((m) => m.role === 'tool')?.content
    const system = messages.find((m) => m.role === 'system')?.content ?? ''
    const tokens = this.tokenize(toolResult ? `Here is what I found in our system: ${toolResult.slice(0, 160)}` : this.reply(asked, options, system))
    for (const text of tokens) {
      if (signal.aborted) return
      await new Promise((resolve) => setTimeout(resolve, this.delayMs))
      yield { type: 'token', text }
    }
    yield { type: 'done', stats: { tokens: tokens.length, finishReason: 'stop' } }
  }

  private reply(asked: string, options: GenerationOptions, system: string): string {
    if (options.purpose === 'guard') return /ignore (all )?(your )?(previous|prior)|system prompt|password/i.test(asked) ? 'BLOCK: tries to change instructions' : 'OK'
    if (options.purpose === 'support_route') return this.fakeSupportRoute(asked)
    if (options.purpose === 'plan') return this.fakePlan(asked)
    if (options.purpose === 'quality') return 'PASS'
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

  private fakeSupportRoute(asked: string): string {
    if (/(lawyer|furious|legal|charged (my card )?twice|fraud|speak to a (real )?(person|human))/i.test(asked)) return 'escalate'
    if (this.fakeParts(asked).length > 1) return 'multi'
    return this.fakePartLabel(asked)
  }

  private fakePartLabel(text: string): string {
    if (/(cracked|broken|damaged|faulty|stopped working|split|refund|replacement)/i.test(text)) return 'complaint'
    if (/(where is|order \d|not arrived|hasn't arrived|tracking|package|delivery status|\blate\b)/i.test(text)) return 'order'
    if (/(does the|how long does the battery|which is better|reviews?|spec|waterproof|any good)/i.test(text)) return 'product'
    if (/(thanks|thank you|great service|love|please fix|suggest)/i.test(text)) return 'feedback'
    return 'other'
  }

  /** Splits a message into sentences that each look like a different kind of request. */
  private fakeParts(asked: string): { label: string; request: string }[] {
    const parts = (asked.match(/[^.?!]+[.?!]*/g) ?? []).map((p) => p.trim()).filter(Boolean)
    const tasks: { label: string; request: string }[] = []
    for (const part of parts) {
      const label = this.fakePartLabel(part)
      if (label !== 'other' && !tasks.some((t) => t.label === label)) tasks.push({ label, request: part })
    }
    return tasks.slice(0, 3)
  }

  private fakePlan(asked: string): string {
    const tasks = this.fakeParts(asked)
    return JSON.stringify({ tasks: tasks.length ? tasks : [{ label: 'order', request: asked }] })
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
