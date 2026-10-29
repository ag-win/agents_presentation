import assert from 'node:assert/strict'
import { crc32 } from 'node:zlib'
import { after, before, describe, it } from 'node:test'
import { ProviderSwitchService } from '../src/application/ProviderSwitchService.ts'
import { AppConfig } from '../src/config/AppConfig.ts'
import { ChatMessage } from '../src/domain/ChatMessage.ts'
import type { StreamEvent } from '../src/domain/StreamEvent.ts'
import { UpstreamError, ValidationError } from '../src/errors/AppError.ts'
import { HttpServer } from '../src/http/HttpServer.ts'
import { ProvidersSelectRoute, ProvidersStateRoute } from '../src/http/routes/ProvidersRoute.ts'
import { BearerTokenAuth, SigV4Auth, bedrockAuthFor, type BedrockAuth } from '../src/llm/aws/BedrockAuth.ts'
import { EventStreamDecoder } from '../src/llm/aws/EventStreamDecoder.ts'
import { SigV4Signer } from '../src/llm/aws/SigV4Signer.ts'
import { BedrockProvider } from '../src/llm/BedrockProvider.ts'
import type { LlmProvider } from '../src/llm/LlmProvider.ts'
import { MockProvider } from '../src/llm/MockProvider.ts'
import { ProviderFactory } from '../src/llm/ProviderFactory.ts'
import { ProviderRegistry } from '../src/llm/ProviderRegistry.ts'
import { SwitchableLlmProvider } from '../src/llm/SwitchableLlmProvider.ts'
import { SilentLogger } from '../src/logging/Logger.ts'
import { RequestGate } from '../src/net/RequestGate.ts'
import { BraveSearchProvider } from '../src/search/BraveSearchProvider.ts'
import { MockSearchProvider } from '../src/search/MockSearchProvider.ts'
import type { SearchProvider } from '../src/search/SearchProvider.ts'
import { SearchProviderFactory } from '../src/search/SearchProviderFactory.ts'
import { SwitchableSearchProvider } from '../src/search/SwitchableSearchProvider.ts'

const signal = () => new AbortController().signal
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('RequestGate', () => {
  it('runs one task at a time and pauses between them, even when started together', async () => {
    const gate = new RequestGate(40)
    const spans: [number, number][] = []
    const task = () => async () => { const s = Date.now(); await sleep(20); spans.push([s, Date.now()]); return 1 }
    await Promise.all([gate.run(task()), gate.run(task()), gate.run(task())])
    spans.sort((a, b) => a[0] - b[0])
    for (let i = 1; i < spans.length; i++) assert.ok(spans[i][0] >= spans[i - 1][1] + 35, `task ${i} started too early`)
  })
  it('keeps going after a task fails', async () => {
    const gate = new RequestGate(5)
    await assert.rejects(gate.run(async () => { throw new Error('boom') }), /boom/)
    assert.equal(await gate.run(async () => 'ok'), 'ok')
  })
})

describe('BraveSearchProvider rate limit (free plan: one request at a time)', () => {
  const body = { web: { results: [{ title: 'T', url: 'https://x.example/a', description: 'D' }] } }
  it('queues concurrent searches so requests never overlap', async () => {
    let inFlight = 0, peak = 0
    const brave = new BraveSearchProvider({ apiKey: 'k', baseUrl: 'https://b', count: 3, minIntervalMs: 30, fetch: async () => {
      inFlight++; peak = Math.max(peak, inFlight); await sleep(20); inFlight--; return Response.json(body)
    } })
    const results = await Promise.all([brave.search('a', signal()), brave.search('b', signal()), brave.search('c', signal())])
    assert.equal(peak, 1)
    assert.ok(results.every((r) => r.length === 1))
  })
  it('retries once after a 429 and then succeeds', async () => {
    let calls = 0
    const brave = new BraveSearchProvider({ apiKey: 'k', baseUrl: 'https://b', count: 3, minIntervalMs: 20, fetch: async () => (++calls === 1 ? new Response('', { status: 429 }) : Response.json(body)) })
    assert.equal((await brave.search('q', signal())).length, 1)
    assert.equal(calls, 2)
  })
  it('reports a rate-limit error if it is still limited after the retry', async () => {
    let calls = 0
    const brave = new BraveSearchProvider({ apiKey: 'k', baseUrl: 'https://b', count: 3, minIntervalMs: 20, fetch: async () => { calls++; return new Response('', { status: 429 }) } })
    await assert.rejects(brave.search('q', signal()), (e: Error) => e instanceof UpstreamError && /rate limit/.test(e.message))
    assert.equal(calls, 2)
  })
})

/** Builds one AWS event-stream message (string headers, JSON payload) for the decoder tests. */
function frame(headers: Record<string, string>, payload: unknown): Uint8Array {
  const enc = new TextEncoder()
  const hdr: number[] = []
  for (const [k, v] of Object.entries(headers)) {
    const kb = enc.encode(k), vb = enc.encode(v)
    hdr.push(kb.length, ...kb, 7, (vb.length >> 8) & 255, vb.length & 255, ...vb)
  }
  const body = enc.encode(JSON.stringify(payload))
  const total = 12 + hdr.length + body.length + 4
  const out = new Uint8Array(total)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, total); dv.setUint32(4, hdr.length); dv.setUint32(8, crc32(out.subarray(0, 8)))
  out.set(hdr, 12); out.set(body, 12 + hdr.length)
  dv.setUint32(total - 4, crc32(out.subarray(0, total - 4)))
  return out
}
const event = (type: string, payload: unknown) => frame({ ':event-type': type, ':message-type': 'event', ':content-type': 'application/json' }, payload)

describe('EventStreamDecoder', () => {
  it('decodes messages split across arbitrary chunks', () => {
    const bytes = new Uint8Array([...event('contentBlockDelta', { delta: { text: 'Hi' } }), ...event('messageStop', { stopReason: 'end_turn' })])
    const d = new EventStreamDecoder()
    const seen: string[] = []
    for (let i = 0; i < bytes.length; i += 7) for (const m of d.push(bytes.subarray(i, i + 7))) seen.push(`${m.headers[':event-type']}:${new TextDecoder().decode(m.payload)}`)
    assert.deepEqual(seen, ['contentBlockDelta:{"delta":{"text":"Hi"}}', 'messageStop:{"stopReason":"end_turn"}'])
  })
  it('rejects corrupted data', () => {
    const bad = event('metadata', {})
    bad[bad.length - 6] ^= 0xff
    assert.throws(() => new EventStreamDecoder().push(bad), UpstreamError)
  })
})

describe('SigV4Signer', () => {
  it('matches the AWS "get-vanilla" test vector', () => {
    const signer = new SigV4Signer({ accessKeyId: 'AKIDEXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY' }, 'us-east-1', 'service')
    const h = signer.sign('GET', new URL('https://example.amazonaws.com/'), '', new Date('2015-08-30T12:36:00Z'))
    assert.equal(h['x-amz-date'], '20150830T123600Z')
    assert.equal(h.Authorization, 'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31')
  })
  it('signs a session token and encodes model ids with ":" twice in the canonical path', () => {
    const signer = new SigV4Signer({ accessKeyId: 'A', secretAccessKey: 'S', sessionToken: 'TOKEN' }, 'us-east-1', 'bedrock')
    const h = signer.sign('POST', new URL('https://bedrock-runtime.us-east-1.amazonaws.com/model/amazon.nova-2-lite-v1%3A0/converse-stream'), '{}', new Date('2026-01-01T00:00:00Z'))
    assert.equal(h['x-amz-security-token'], 'TOKEN')
    assert.match(h.Authorization, /SignedHeaders=host;x-amz-date;x-amz-security-token/)
  })
})

describe('BedrockProvider', () => {
  const streamOf = (frames: Uint8Array[]) => new Response(new ReadableStream<Uint8Array>({ start(c) { frames.forEach((f) => c.enqueue(f)); c.close() } }), { status: 200 })
  const make = (fetch: (url: string, init: RequestInit) => Promise<Response>, auth: BedrockAuth = new BearerTokenAuth('secret')) =>
    new BedrockProvider({ region: 'us-east-1', model: 'global.amazon.nova-2-lite-v1:0', auth, temperature: 0.5, maxTokens: 100, fetch })
  const collect = async (it: AsyncIterable<StreamEvent>) => { const out: StreamEvent[] = []; for await (const e of it) out.push(e); return out }

  it('posts the Converse request and streams text deltas, ignoring reasoning and reporting stats', async () => {
    let seen: { url: string; init: RequestInit } | undefined
    const p = make(async (url, init) => {
      seen = { url, init }
      return streamOf([
        event('messageStart', { role: 'assistant' }),
        event('contentBlockDelta', { contentBlockIndex: 0, delta: { reasoningContent: { text: 'thinking...' } } }),
        event('contentBlockDelta', { contentBlockIndex: 0, delta: { text: 'Hel' } }),
        event('contentBlockDelta', { contentBlockIndex: 0, delta: { text: 'lo' } }),
        event('messageStop', { stopReason: 'end_turn' }),
        event('metadata', { usage: { outputTokens: 2 }, metrics: { latencyMs: 321 } }),
      ])
    })
    const events = await collect(p.stream([ChatMessage.system('Be brief.'), ChatMessage.user('hi')], signal(), { temperature: 0.1, maxTokens: 50 }))
    assert.deepEqual(events, [{ type: 'token', text: 'Hel' }, { type: 'token', text: 'lo' }, { type: 'done', stats: { tokens: 2, durationMs: 321, finishReason: 'end_turn' } }])

    assert.equal(seen?.url, 'https://bedrock-runtime.us-east-1.amazonaws.com/model/global.amazon.nova-2-lite-v1%3A0/converse-stream')
    const headers = seen?.init.headers as Record<string, string>
    assert.equal(headers.Authorization, 'Bearer secret')
    const body = JSON.parse(String(seen?.init.body))
    assert.deepEqual(body.system, [{ text: 'Be brief.' }])
    assert.deepEqual(body.messages, [{ role: 'user', content: [{ text: 'hi' }] }])
    assert.deepEqual(body.inferenceConfig, { maxTokens: 50, temperature: 0.1 })
  })
  it('sends no system block when there is no system message, and asks for JSON in JSON mode', async () => {
    const bodies: { system?: { text: string }[] }[] = []
    const p = make(async (_u, init) => { bodies.push(JSON.parse(String(init.body))); return streamOf([event('messageStop', {})]) })
    await collect(p.stream([ChatMessage.user('x')], signal()))
    await collect(p.stream([ChatMessage.system('S'), ChatMessage.user('x')], signal(), { jsonMode: true }))
    assert.equal(bodies[0].system, undefined)
    assert.match(bodies[1].system?.[0].text ?? '', /^S\n\nRespond with a single JSON object/)
  })
  it('signs the request with SigV4 when access keys are used', async () => {
    let headers: Record<string, string> = {}
    const auth = new SigV4Auth(new SigV4Signer({ accessKeyId: 'A', secretAccessKey: 'S' }, 'us-east-1', 'bedrock'))
    await collect(make(async (_u, init) => { headers = init.headers as Record<string, string>; return streamOf([event('messageStop', {})]) }, auth).stream([ChatMessage.user('x')], signal()))
    assert.match(headers.Authorization, /^AWS4-HMAC-SHA256 Credential=A\//)
    assert.ok(headers['x-amz-date'])
  })
  it('turns stream exceptions and HTTP errors into helpful messages without leaking the key', async () => {
    const throttled = make(async () => streamOf([frame({ ':message-type': 'exception', ':exception-type': 'throttlingException' }, { message: 'Too many requests' })]))
    await assert.rejects(collect(throttled.stream([ChatMessage.user('x')], signal())), /throttling/)
    const http = (status: number, body = '{}') => make(async () => new Response(body, { status }))
    await assert.rejects(collect(http(403).stream([ChatMessage.user('x')], signal())), (e: Error) => /credentials/.test(e.message) && !e.message.includes('secret'))
    await assert.rejects(collect(http(404).stream([ChatMessage.user('x')], signal())), /global\.amazon\.nova-2-lite-v1:0/)
    await assert.rejects(collect(http(400, '{"message":"bad input"}').stream([ChatMessage.user('x')], signal())), /bad input/)
    await assert.rejects(collect(make(async () => { throw new TypeError('x') }).stream([ChatMessage.user('x')], signal())), /Could not reach/)
  })
})

describe('provider registry and switching', () => {
  const env = (extra: Record<string, string> = {}) => AppConfig.fromEnv(extra)
  it('only configured providers are available, and the first available one starts', () => {
    const none = ProviderFactory.createRegistry(env())
    assert.equal(none.active.id, 'mock')
    assert.deepEqual(none.list().filter((e) => e.provider).map((e) => e.id), ['mock'])
    const all = ProviderFactory.createRegistry(env({ OLLAMA_API_KEY: 'o', AWS_BEARER_TOKEN_BEDROCK: 'b' }))
    assert.equal(all.active.id, 'ollama')
    assert.deepEqual(all.list().filter((e) => e.provider).map((e) => e.id), ['ollama', 'bedrock', 'mock'])
    assert.equal(ProviderFactory.createRegistry(env({ OLLAMA_API_KEY: 'o', AWS_BEARER_TOKEN_BEDROCK: 'b', LLM_PROVIDER: 'bedrock' })).active.id, 'bedrock')
    assert.equal(ProviderFactory.createRegistry(env({ LLM_PROVIDER: 'bedrock' })).active.id, 'mock') // preferred one is not set up
  })
  it('search starts on Brave when keyed, else on the backup; mock mode forces the backup', () => {
    assert.equal(SearchProviderFactory.createRegistry(env({ BRAVE_API_KEY: 'k' })).active.id, 'brave')
    assert.equal(SearchProviderFactory.createRegistry(env()).active.id, 'backup')
    assert.equal(SearchProviderFactory.createRegistry(env({ BRAVE_API_KEY: 'k', LLM_PROVIDER: 'mock' })).active.id, 'backup')
  })
  it('bedrockAuthFor prefers an API key, then access keys, else nothing', () => {
    assert.ok(bedrockAuthFor(env({ AWS_BEARER_TOKEN_BEDROCK: 'b', AWS_ACCESS_KEY_ID: 'a', AWS_SECRET_ACCESS_KEY: 's' })) instanceof BearerTokenAuth)
    assert.ok(bedrockAuthFor(env({ AWS_ACCESS_KEY_ID: 'a', AWS_SECRET_ACCESS_KEY: 's' })) instanceof SigV4Auth)
    assert.equal(bedrockAuthFor(env({ AWS_ACCESS_KEY_ID: 'a' })), undefined)
  })

  class Named implements LlmProvider {
    readonly model = 'm'
    readonly isLive = true
    readonly name: string
    constructor(name: string) { this.name = name }
    async *stream(): AsyncIterable<StreamEvent> { yield { type: 'token', text: this.name } }
  }
  it('switchable providers follow the active entry and refuse unavailable or unknown choices', async () => {
    const reg = new ProviderRegistry<LlmProvider>([
      { id: 'a', label: 'A', detail: '', provider: new Named('A') },
      { id: 'b', label: 'B', detail: '', provider: new Named('B') },
      { id: 'c', label: 'C', detail: '', provider: undefined },
    ])
    const proxy = new SwitchableLlmProvider(reg)
    const say = async () => { for await (const e of proxy.stream([], signal())) return e.type === 'token' ? e.text : '' }
    assert.equal(await say(), 'A')
    reg.select('b')
    assert.equal(proxy.name, 'B')
    assert.equal(await say(), 'B')
    assert.throws(() => reg.select('c'), /not set up/)
    assert.throws(() => reg.select('zzz'), ValidationError)
    assert.equal(reg.active.id, 'b')
  })

  it('SwitchableSearchProvider forwards to the active search service', async () => {
    const live: SearchProvider = { name: 'live', isLive: true, search: async () => [] }
    const reg = new ProviderRegistry<SearchProvider>([{ id: 'live', label: 'L', detail: '', provider: live }, { id: 'backup', label: 'B', detail: '', provider: new MockSearchProvider() }])
    const proxy = new SwitchableSearchProvider(reg)
    assert.equal(proxy.isLive, true)
    reg.select('backup')
    assert.equal(proxy.isLive, false)
    assert.ok((await proxy.search('easy dinner with eggs', signal())).length >= 3)
  })

  describe('HTTP routes', () => {
    let server: HttpServer
    let base = ''
    before(async () => {
      const llm = new ProviderRegistry<LlmProvider>([
        { id: 'ollama', label: 'Ollama Cloud', detail: 'm1', provider: new Named('o') },
        { id: 'bedrock', label: 'AWS Bedrock', detail: 'm2', provider: undefined },
        { id: 'mock', label: 'Offline', detail: '', provider: new MockProvider() },
      ])
      const search = new ProviderRegistry<SearchProvider>([
        { id: 'brave', label: 'Brave', detail: '', provider: { name: 'brave', isLive: true, search: async () => [] } },
        { id: 'backup', label: 'Backup', detail: '', provider: new MockSearchProvider() },
      ])
      const svc = new ProviderSwitchService(llm, search)
      server = new HttpServer('127.0.0.1', 0, [new ProvidersStateRoute(svc), new ProvidersSelectRoute(svc)], new SilentLogger())
      base = `http://127.0.0.1:${await server.start()}`
    })
    after(async () => { await server.stop() })
    const post = (body: unknown) => fetch(`${base}/api/providers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    type State = { llm: { active: string; options: { id: string; available: boolean }[] }; search: { active: string } }

    it('reports the active choices and which are available', async () => {
      const s = (await (await fetch(`${base}/api/providers`)).json()) as State
      assert.equal(s.llm.active, 'ollama')
      assert.deepEqual(s.llm.options.map((o) => [o.id, o.available]), [['ollama', true], ['bedrock', false], ['mock', true]])
      assert.equal(s.search.active, 'brave')
    })
    it('switches both at once, and refuses everything if one choice is bad', async () => {
      const ok = (await (await post({ llm: 'mock', search: 'backup' })).json()) as State
      assert.equal(ok.llm.active, 'mock')
      assert.equal(ok.search.active, 'backup')
      const bad = await post({ llm: 'ollama', search: 'nope' })
      assert.equal(bad.status, 400)
      const after = (await (await fetch(`${base}/api/providers`)).json()) as State
      assert.equal(after.llm.active, 'mock') // not switched to ollama: the whole change was refused
      assert.equal((await post({ llm: 'bedrock' })).status, 400)
      assert.equal((await post({ llm: 5 })).status, 400)
    })
  })
})
