import { ValidationError } from '../errors/AppError.ts'

/** A validated user prompt. Immutable; the only way to get one is through `Prompt.parse`. */
export class Prompt {
  readonly text: string

  private constructor(text: string) {
    this.text = text
  }

  static parse(raw: unknown, maxLength: number): Prompt {
    if (typeof raw !== 'string') throw new ValidationError('"prompt" must be a string')
    const text = raw.trim()
    if (text.length === 0) throw new ValidationError('"prompt" must not be empty')
    if (text.length > maxLength) throw new ValidationError(`"prompt" must be at most ${maxLength} characters`)
    return new Prompt(text)
  }
}
