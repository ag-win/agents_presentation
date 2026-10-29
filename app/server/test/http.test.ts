import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { PromptComposer } from '../src/application/PromptComposer.ts'
import { SingleCallService } from '../src/application/SingleCallService.ts'
import type { ChatMessage } from '../src/domain/ChatMessage.ts'
import type { StreamEvent } from '../src/domain/StreamEvent.ts'
import { UpstreamError } from '../src/errors/AppError.ts'
import { HttpServer } from '../src/http/HttpServer.ts'
import { HealthRoute } from '../src/http/routes/HealthRoute.ts'
import { StreamRoute } from '../src/http/routes/StreamRoute.ts'
import type { LlmProvider } from '../src/llm/LlmProvider.ts'
import { MockProvider } from '../src/llm/MockProvider.ts'
import { SilentLogger } from '../src/logging/Logger.ts'

/** A provider that yields one token and then fails, to check mid-stream error reporting. */
class FailingProvider implements LlmProvider {
  readonly name = 'failing'
  readonly model = 'x'
  readonly isLive = true
  async *stream(_m: readonly ChatMessage[], _s: AbortSignal): AsyncIterable<StreamEvent> {
    yield { type: 'token', text: 'partial' }
    throw new UpstreamError('boom')
  }
}

async function start(provider: LlmProvider) {
  const service = new SingleCallService(provider, new PromptComposer())
  const server = new HttpServer('127.0.0.1', 0, [new HealthRoute(service), new StreamRoute(service, 100, new SilentLogger())], new SilentLogger())
  const port = await server.start()
  return { server, base: `http://127.0.0.1:${port}` }
}

const post = (base: string, body: unknown) =>
  fetch(`${base}/api/llm/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

async function lines(res: Response): Promise<any[]> {
  return (await res.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l))
}

describe('HTTP API with the mock provider', () => {
  let ctx: Awaited<ReturnType<typeof start>>
  before(async () => { ctx = await start(new MockProvider(0)) })
  after(async () => { await ctx.server.stop() })

  it('GET /api/health reports the provider', async () => {
    const body: unknown = await (await fetch(`${ctx.base}/api/health`)).json()
    assert.deepEqual(body, { status: 'ok', provider: 'mock', model: 'mock-model', live: false })
  })

  it('streams start, tokens, then done', async () => {
    const res = await post(ctx.base, { prompt: 'hello there' })
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /x-ndjson/)
    const events = await lines(res)
    assert.equal(events[0].type, 'start')
    assert.equal(events.at(-1).type, 'done')
    const tokens = events.filter((e) => e.type === 'token')
    assert.ok(tokens.length > 5)
    assert.match(tokens.map((t) => t.text).join(''), /hello there/)
  })

  it('rejects bad input before streaming', async () => {
    assert.equal((await post(ctx.base, { prompt: '' })).status, 400)
    assert.equal((await post(ctx.base, { prompt: 'x'.repeat(101) })).status, 400)
    assert.equal((await post(ctx.base, { nope: 1 })).status, 400)
    const bad = await fetch(`${ctx.base}/api/llm/stream`, { method: 'POST', body: '{oops' })
    assert.equal(bad.status, 400)
    assert.equal(((await bad.json()) as { error: { code: string } }).error.code, 'invalid_request')
  })

  it('answers 404 and 405 for unknown paths and wrong methods', async () => {
    assert.equal((await fetch(`${ctx.base}/api/nothing`)).status, 404)
    assert.equal((await fetch(`${ctx.base}/api/llm/stream`)).status, 405)
  })
})

describe('HTTP API when the provider fails mid-stream', () => {
  it('ends the stream with an error line', async () => {
    const { server, base } = await start(new FailingProvider())
    try {
      const events = await lines(await post(base, { prompt: 'hi' }))
      assert.deepEqual(events.map((e) => e.type), ['start', 'token', 'error'])
      assert.equal(events[2].message, 'boom')
    } finally {
      await server.stop()
    }
  })
})
