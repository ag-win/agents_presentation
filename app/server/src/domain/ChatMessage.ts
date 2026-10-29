import type { ToolCall } from './Tool.ts'

export type Role = 'system' | 'user' | 'assistant' | 'tool'

interface Extras {
  readonly toolCalls?: readonly ToolCall[]
  readonly toolCallId?: string
  readonly toolName?: string
}

export class ChatMessage {
  readonly role: Role
  readonly content: string
  /** Set on an assistant message that asked for tools to be run. */
  readonly toolCalls: readonly ToolCall[]
  /** Set on a tool message: which call this is the result of. */
  readonly toolCallId: string | undefined
  readonly toolName: string | undefined

  constructor(role: Role, content: string, extras: Extras = {}) {
    this.role = role
    this.content = content
    this.toolCalls = extras.toolCalls ?? []
    this.toolCallId = extras.toolCallId
    this.toolName = extras.toolName
  }

  static system(content: string): ChatMessage {
    return new ChatMessage('system', content)
  }

  static user(content: string): ChatMessage {
    return new ChatMessage('user', content)
  }

  /** What the model said when it decided to call tools (and any text it wrote first). */
  static assistantCalling(calls: readonly ToolCall[], content = ''): ChatMessage {
    return new ChatMessage('assistant', content, { toolCalls: calls })
  }

  /** The app's answer to a tool call, sent back to the model. */
  static toolResult(call: ToolCall, content: string): ChatMessage {
    return new ChatMessage('tool', content, { toolCallId: call.id, toolName: call.name })
  }
}
