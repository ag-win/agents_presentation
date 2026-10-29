import type { IncomingMessage, ServerResponse } from 'node:http'
import { PayloadTooLargeError, ValidationError } from '../errors/AppError.ts'
import { NdjsonStream } from './NdjsonStream.ts'

/** One HTTP exchange, wrapped so routes never touch Node's raw request/response objects. */
export class RequestContext {
  readonly method: string
  readonly path: string
  /** Aborts if the client goes away before we finish, so upstream model calls stop too. */
  readonly signal: AbortSignal

  private readonly req: IncomingMessage
  private readonly res: ServerResponse

  constructor(req: IncomingMessage, res: ServerResponse) {
    this.req = req
    this.res = res
    this.method = req.method ?? 'GET'
    this.path = new URL(req.url ?? '/', 'http://localhost').pathname
    const controller = new AbortController()
    res.on('close', () => {
      if (!res.writableFinished) controller.abort()
    })
    this.signal = controller.signal
  }

  get headersSent(): boolean {
    return this.res.headersSent
  }

  async readJson(maxBytes = 16_384): Promise<unknown> {
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of this.req) {
      const buf = chunk as Buffer
      size += buf.length
      if (size > maxBytes) throw new PayloadTooLargeError(`Request body is larger than ${maxBytes} bytes`)
      chunks.push(buf)
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      throw new ValidationError('Request body must be valid JSON')
    }
  }

  json(status: number, body: unknown): void {
    this.res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
    this.res.end(JSON.stringify(body))
  }

  ndjson(): NdjsonStream {
    return new NdjsonStream(this.res)
  }

  endQuietly(): void {
    if (!this.res.writableEnded) this.res.end()
  }
}
