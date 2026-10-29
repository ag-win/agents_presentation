import type { RequestContext } from './RequestContext.ts'

/** One endpoint. Add a new feature by adding a Route; HttpServer never has to change. */
export interface Route {
  readonly method: 'GET' | 'POST'
  readonly path: string
  handle(ctx: RequestContext): Promise<void>
}
