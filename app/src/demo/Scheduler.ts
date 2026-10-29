/** setTimeout with a "cancel everything" switch, so Reset can stop a half-finished animation cleanly. */
export class Scheduler {
  private readonly handles = new Set<ReturnType<typeof setTimeout>>()

  after(ms: number, task: () => void): void {
    const handle = setTimeout(() => {
      this.handles.delete(handle)
      task()
    }, ms)
    this.handles.add(handle)
  }

  clear(): void {
    for (const h of this.handles) clearTimeout(h)
    this.handles.clear()
  }
}
