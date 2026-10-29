import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { AppError, MethodNotAllowedError, NotFoundError } from '../errors/AppError.ts'
import type { Logger } from '../logging/Logger.ts'
import { RequestContext } from './RequestContext.ts'
import type { Route } from './Route.ts'

/** Dispatches requests to routes and turns errors into JSON responses. Knows nothing about what routes do. */
export class HttpServer {
  private readonly host: string
  private readonly port: number
  private readonly routes: readonly Route[]
  private readonly logger: Logger
  private server: Server | undefined

  constructor(host: string, port: number, routes: readonly Route[], logger: Logger) {
    this.host = host
    this.port = port
    this.routes = routes
    this.logger = logger
  }

  /** Starts listening and resolves with the actual port (useful when constructed with port 0). */
  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => void this.dispatch(new RequestContext(req, res)))
      server.once('error', reject)
      server.listen(this.port, this.host, () => {
        this.server = server
        resolve((server.address() as AddressInfo).port)
      })
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) return resolve()
      this.server.closeAllConnections()
      this.server.close(() => resolve())
    })
  }

  private async dispatch(ctx: RequestContext): Promise<void> {
    try {
      const sameCase = this.routes.filter((r) => r.path === ctx.path)
      if (sameCase.length === 0) throw new NotFoundError(`No route for ${ctx.path}`)
      const route = sameCase.find((r) => r.method === ctx.method)
      if (!route) throw new MethodNotAllowedError(`${ctx.method} is not allowed on ${ctx.path}`)
      await route.handle(ctx)
    } catch (error) {
      this.respondToError(ctx, error)
    }
  }

  private respondToError(ctx: RequestContext, error: unknown): void {
    if (ctx.headersSent) return ctx.endQuietly()
    if (error instanceof AppError) {
      ctx.json(error.status, { error: { code: error.code, message: error.message } })
    } else {
      this.logger.error(`unhandled error on ${ctx.method} ${ctx.path}`, error)
      ctx.json(500, { error: { code: 'internal_error', message: 'Internal server error' } })
    }
  }
}
