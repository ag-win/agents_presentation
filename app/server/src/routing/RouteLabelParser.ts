/** Reads the router's answer. Anything that is not a known label falls back, so a bad router never breaks the run. */
export class RouteLabelParser {
  private readonly ids: readonly string[]
  private readonly fallback: string

  constructor(ids: readonly string[], fallback: string) {
    this.ids = ids
    this.fallback = fallback
  }

  parse(text: string): string {
    const words = text.toLowerCase().match(/[a-z]+/g) ?? []
    return words.find((w) => this.ids.includes(w)) ?? this.fallback
  }
}
