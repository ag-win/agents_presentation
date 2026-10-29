/** Tokens arrive from the network faster than we animate them; this holds them until their dot leaves the LLM. */
export class TokenBuffer {
  private readonly queue: string[] = []
  private finished = false

  push(text: string): void {
    this.queue.push(text)
  }

  shift(): string | undefined {
    return this.queue.shift()
  }

  markDone(): void {
    this.finished = true
  }

  get isDone(): boolean {
    return this.finished
  }

  get isEmpty(): boolean {
    return this.queue.length === 0
  }
}
