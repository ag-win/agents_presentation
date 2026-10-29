import type { ServerResponse } from 'node:http'

/** Writes newline-delimited JSON to an open response, one flushed line per value. */
export class NdjsonStream {
  private readonly res: ServerResponse
  private closed = false

  constructor(res: ServerResponse) {
    this.res = res
    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    })
    res.flushHeaders()
  }

  write(value: unknown): void {
    if (this.closed || this.res.writableEnded) return
    this.res.write(`${JSON.stringify(value)}\n`)
  }

  end(): void {
    if (this.closed) return
    this.closed = true
    if (!this.res.writableEnded) this.res.end()
  }
}
