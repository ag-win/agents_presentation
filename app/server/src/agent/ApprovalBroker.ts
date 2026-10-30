interface Pending {
  readonly resolve: (approved: boolean) => void
  readonly timer: ReturnType<typeof setTimeout>
}

/**
 * Where a paused tool waits for a person. `wait` is called by the tool (on the agent's side); `decide` is called when the
 * person presses Approve or Decline in the browser (a separate request). If nobody answers in time, or the run is
 * stopped, the wait ends as a decline so a run can never hang.
 */
export class ApprovalBroker {
  private readonly pending = new Map<string, Pending>()
  private readonly timeoutMs: number

  constructor(timeoutMs = 120_000) {
    this.timeoutMs = timeoutMs
  }

  wait(runId: string, callId: string, signal: AbortSignal): Promise<boolean> {
    const key = `${runId}:${callId}`
    return new Promise<boolean>((resolve) => {
      const finish = (approved: boolean) => {
        const entry = this.pending.get(key)
        if (!entry) return
        clearTimeout(entry.timer)
        this.pending.delete(key)
        signal.removeEventListener('abort', onAbort)
        resolve(approved)
      }
      const onAbort = () => finish(false)
      const timer = setTimeout(() => finish(false), this.timeoutMs)
      this.pending.set(key, { resolve: finish, timer })
      if (signal.aborted) finish(false)
      else signal.addEventListener('abort', onAbort, { once: true })
    })
  }

  /** Answer a waiting request. Returns false if there is nothing waiting (already answered, timed out or stopped). */
  decide(runId: string, callId: string, approved: boolean): boolean {
    const entry = this.pending.get(`${runId}:${callId}`)
    if (!entry) return false
    entry.resolve(approved)
    return true
  }

  get waiting(): number {
    return this.pending.size
  }
}
