import { ValidationError } from '../errors/AppError.ts'
import { ChatMessage } from './ChatMessage.ts'

export interface ConversationLimits {
  readonly maxChars: number
  readonly maxTurns: number
}

/** One new customer message plus the earlier turns of the chat. Immutable and validated on creation. */
export class Conversation {
  readonly message: string
  /** Earlier turns, oldest first. Only 'user' and 'assistant' roles. */
  readonly history: readonly ChatMessage[]

  private constructor(message: string, history: readonly ChatMessage[]) {
    this.message = message
    this.history = history
  }

  static parse(raw: unknown, limits: ConversationLimits): Conversation {
    const body = (raw ?? {}) as { message?: unknown; history?: unknown }
    if (typeof body.message !== 'string' || body.message.trim() === '') throw new ValidationError('"message" must be a non-empty string')
    if (body.message.length > limits.maxChars) throw new ValidationError(`"message" must be at most ${limits.maxChars} characters`)

    const rawHistory = body.history ?? []
    if (!Array.isArray(rawHistory)) throw new ValidationError('"history" must be an array')
    const turns = rawHistory.map((turn: unknown) => {
      const t = turn as { role?: unknown; content?: unknown }
      if ((t?.role !== 'user' && t?.role !== 'assistant') || typeof t.content !== 'string') {
        throw new ValidationError('each history item needs a role of "user" or "assistant" and a string "content"')
      }
      return new ChatMessage(t.role, t.content.trim().slice(0, limits.maxChars))
    })
    return new Conversation(body.message.trim(), turns.slice(-limits.maxTurns))
  }

  /** The whole chat as plain text, ending with the new message. */
  transcript(): string {
    const lines = this.history.map((m) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`)
    return [...lines, `Customer: ${this.message}`].join('\n')
  }
}
