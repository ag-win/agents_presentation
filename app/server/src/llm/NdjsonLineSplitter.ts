/** Turns arbitrarily chunked text into complete, non-empty lines. Stateful: holds the unfinished tail. */
export class NdjsonLineSplitter {
  private tail = ''

  push(chunk: string): string[] {
    this.tail += chunk
    const parts = this.tail.split('\n')
    this.tail = parts.pop() ?? ''
    return parts.map((p) => p.trim()).filter((p) => p.length > 0)
  }

  /** Call once at end of stream to get a final line that had no trailing newline. */
  flush(): string[] {
    const rest = this.tail.trim()
    this.tail = ''
    return rest.length > 0 ? [rest] : []
  }
}
