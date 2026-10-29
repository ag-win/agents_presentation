const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Runs tasks strictly one at a time, and waits `minIntervalMs` after each one before the next may start.
 * For services with a "one request at a time" rule (Brave's free plan): callers just `run` and are queued.
 */
export class RequestGate {
  private readonly minIntervalMs: number
  private tail: Promise<unknown> = Promise.resolve()

  constructor(minIntervalMs: number) {
    this.minIntervalMs = minIntervalMs
  }

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task) // start once the previous task has settled, whatever its outcome
    this.tail = result.then(() => sleep(this.minIntervalMs), () => sleep(this.minIntervalMs))
    return result
  }
}
