export type Role = 'system' | 'user' | 'assistant'

export class ChatMessage {
  readonly role: Role
  readonly content: string

  constructor(role: Role, content: string) {
    this.role = role
    this.content = content
  }

  static system(content: string): ChatMessage {
    return new ChatMessage('system', content)
  }

  static user(content: string): ChatMessage {
    return new ChatMessage('user', content)
  }
}
