/**
 * First-in-first-out hold for items that arrive from the network faster than we animate them
 * (tokens, chain events). Generic so every demo can reuse it.
 */
export class StreamBuffer<T> {
  private readonly queue: T[] = []
  private finished = false

  push(item: T): void {
    this.queue.push(item)
  }

  peek(): T | undefined {
    return this.queue[0]
  }

  shift(): T | undefined {
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
