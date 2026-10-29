import { ValidationError } from '../errors/AppError.ts'

/**
 * An optional instruction block sent ahead of the user's prompt. An empty one is valid and means
 * "send no system prompt at all". Immutable; the only way to get one is through `SystemPrompt.parse`.
 */
export class SystemPrompt {
  readonly text: string

  private constructor(text: string) {
    this.text = text
  }

  /** Returns undefined when the caller did not supply one (so the caller's default applies). */
  static parse(raw: unknown, maxLength: number): SystemPrompt | undefined {
    if (raw === undefined || raw === null) return undefined
    if (typeof raw !== 'string') throw new ValidationError('"system" must be a string')
    const text = raw.trim()
    if (text.length > maxLength) throw new ValidationError(`"system" must be at most ${maxLength} characters`)
    return new SystemPrompt(text)
  }

  get isEmpty(): boolean {
    return this.text.length === 0
  }
}
