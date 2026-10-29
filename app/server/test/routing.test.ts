import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { RoutingService } from '../src/application/RoutingService.ts'
import type { ChatMessage } from '../src/domain/ChatMessage.ts'
import type { RouteEvent } from '../src/domain/RouteEvent.ts'
import type { SearchResult } from '../src/domain/Search.ts'
import type { StreamEvent } from '../src/domain/StreamEvent.ts'
import { UpstreamError, ValidationError } from '../src/errors/AppError.ts'
import { HttpServer } from '../src/http/HttpServer.ts'
import { RouteDefaultsRoute } from '../src/http/routes/RouteDefaultsRoute.ts'
import { RouteStreamRoute } from '../src/http/routes/RouteStreamRoute.ts'
import type { GenerationOptions, LlmProvider } from '../src/llm/LlmProvider.ts'
import { MockProvider } from '../src/llm/MockProvider.ts'
import { SilentLogger } from '../src/logging/Logger.ts'
import { RouteLabelParser } from '../src/routing/RouteLabelParser.ts'
import { RouteRequest } from '../src/routing/RouteRequest.ts'
import { RoutingPipeline } from '../src/routing/RoutingPipeline.ts'
import { SpecialistCatalog } from '../src/routing/SpecialistCatalog.ts'
import { BraveSearchProvider } from '../src/search/BraveSearchProvider.ts'
import { htmlToText } from '../src/search/htmlText.ts'
import { MockSearchProvider } from '../src/search/MockSearchProvider.ts'
import { SearchContextFormatter } from '../src/search/SearchContextFormatter.ts'
import type { SearchProvider } from '../src/search/SearchProvider.ts'

const LIMITS = { maxQuery: 100, maxSystem: 200 }
const catalog = SpecialistCatalog.standard()
const formatter = new SearchContextFormatter()

const RESULT: SearchResult = { title: 'Egg curry', url: 'https://food.example.com/egg-curry', host: 'food.example.com', description: 'A simple egg curry.', snippets: ['Use ripe tomatoes.'] }

class FakeSearch implements SearchProvider {
  readonly name = 'fake'
  readonly isLive = true
  readonly queries: string[] = []
  private readonly outcome: readonly SearchResult[] | Error
  constructor(outcome: readonly SearchResult[] | Error = [RESULT]) { this.outcome = outcome }
  async search(query: string): Promise<readonly SearchResult[]> {
    this.queries.push(query)
    if (this.outcome instanceof Error) throw this.outcome
    return this.outcome
  }
}

/** Answers each call with the next scripted reply (as two tokens) and records the messages it was given. */
class ScriptedProvider implements LlmProvider {
  readonly name = 'scripted'
  readonly model = 'x'
  readonly isLive = true
  readonly calls: { messages: readonly ChatMessage[]; options?: GenerationOptions }[] = []
  private readonly replies: string[]
  constructor(replies: string[]) { this.replies = [...replies] }
  async *stream(messages: readonly ChatMessage[], _s: AbortSignal, options?: GenerationOptions): AsyncIterable<StreamEvent> {
    this.calls.push({ messages, options })
    const reply = this.replies.shift() ?? ''
    const half = Math.ceil(reply.length / 2)
    yield { type: 'token', text: reply.slice(0, half) }
    yield { type: 'token', text: reply.slice(half) }
    yield { type: 'done', stats: {} }
  }
}

async function collect(events: AsyncIterable<RouteEvent>): Promise<RouteEvent[]> {
  const out: RouteEvent[] = []
  for await (const e of events) out.push(e)
  return out
}
const signal = () => new AbortController().signal
const req = (query: string, systems?: Record<string, string>) => RouteRequest.parse({ query, systems }, ['router', ...catalog.ids], LIMITS)
const pipeline = (provider: LlmProvider, search: SearchProvider) => new RoutingPipeline(provider, search, catalog, formatter)

describe('search helpers', () => {
  it('htmlToText strips markup and decodes entities', () => {
    assert.equal(htmlToText('<b>Tom</b> &amp; Jerry&#39;s &nbsp;show'), "Tom & Jerry's show")
  })
  it('formats results into a block starting with an instruction, and is empty with no results', () => {
    assert.equal(formatter.format('q', []), '')
    const text = formatter.format('egg curry', [RESULT])
    assert.match(text, /^Web search results for "egg curry"/)
    assert.match(text, /\[1\] Egg curry \(food\.example\.com\)\nA simple egg curry\.\n- Use ripe tomatoes\./)
  })
})

describe('BraveSearchProvider', () => {
  const ok = { web: { results: [{ title: '<b>Rice</b> &amp; stew', url: 'https://www.cooking.example/rice', description: 'Best <strong>rice</strong>', extra_snippets: ['one', '<i>two</i>'] }, { url: 'https://x.example' }] } }
  it('sends the documented request and maps results', async () => {
    let seen: { url: string; init: RequestInit } | undefined
    const brave = new BraveSearchProvider({ apiKey: 'secret', baseUrl: 'https://brave.test', count: 5, fetch: async (url, init) => { seen = { url, init }; return Response.json(ok) } })
    const results = await brave.search('rice and stew', signal())
    const u = new URL(seen?.url ?? '')
    assert.equal(u.origin + u.pathname, 'https://brave.test/res/v1/web/search')
    assert.equal(u.searchParams.get('q'), 'rice and stew')
    assert.equal(u.searchParams.get('count'), '5')
    assert.equal(u.searchParams.get('extra_snippets'), 'true')
    assert.equal((seen?.init.headers as Record<string, string>)['X-Subscription-Token'], 'secret')
    assert.deepEqual(results, [{ title: 'Rice & stew', url: 'https://www.cooking.example/rice', host: 'cooking.example', description: 'Best rice', snippets: ['one', 'two'] }])
  })
  it('explains failures without leaking the key', async () => {
    const mk = (status: number) => new BraveSearchProvider({ apiKey: 'secret', baseUrl: 'https://b', count: 3, fetch: async () => new Response('', { status }) })
    await assert.rejects(mk(401).search('q', signal()), (e: Error) => e instanceof UpstreamError && /API key/.test(e.message) && !e.message.includes('secret'))
    await assert.rejects(mk(429).search('q', signal()), /rate limit/)
    await assert.rejects(new BraveSearchProvider({ apiKey: 'k', baseUrl: 'https://b', count: 3, fetch: async () => { throw new TypeError('x') } }).search('q', signal()), /Could not reach/)
  })
})

describe('routing helpers', () => {
  it('RouteLabelParser finds a known label anywhere and otherwise falls back', () => {
    const p = new RouteLabelParser(catalog.ids, 'general')
    assert.equal(p.parse('Food'), 'food')
    assert.equal(p.parse('I think this is travel.'), 'travel')
    assert.equal(p.parse('no idea what this is'), 'general')
    assert.equal(p.parse(''), 'general')
  })
  it('the router prompt is built from the catalog', () => {
    const prompt = catalog.routerPrompt()
    for (const id of catalog.ids) assert.match(prompt, new RegExp(id))
    assert.match(prompt, /exactly one word/)
  })
  it('RouteRequest validates the query and the system prompt keys', () => {
    assert.throws(() => req(''), ValidationError)
    assert.throws(() => req('x'.repeat(101)), ValidationError)
    assert.throws(() => RouteRequest.parse({ query: 'q', systems: { nope: 'x' } }, ['router'], LIMITS), ValidationError)
    assert.throws(() => RouteRequest.parse({ query: 'q', systems: { router: 5 } }, ['router'], LIMITS), ValidationError)
    assert.throws(() => RouteRequest.parse({ query: 'q', systems: { router: 'x'.repeat(201) } }, ['router'], LIMITS), ValidationError)
    assert.deepEqual(req(' hi ', { router: ' be brief ' }).systems, { router: 'be brief' })
  })
})

describe('RoutingPipeline', () => {
  it('searches, routes, and appends the results to the chosen specialist\'s own system prompt', async () => {
    const provider = new ScriptedProvider(['food', 'Try egg curry.'])
    const search = new FakeSearch()
    const events = await collect(pipeline(provider, search).run(req('easy dinner with eggs'), signal()))

    assert.deepEqual(search.queries, ['easy dinner with eggs'])
    assert.deepEqual(events.map((e) => e.type === 'step_start' ? `start:${e.step}` : e.type).filter((t, i, a) => a.indexOf(t) === i),
      ['search', 'start:router', 'token', 'step_end', 'route', 'start:food', 'done'])
    const route = events.find((e) => e.type === 'route')
    assert.ok(route && route.type === 'route' && route.label === 'food')
    const searchEvent = events[0]
    assert.ok(searchEvent.type === 'search' && searchEvent.results.length === 1 && searchEvent.error === null && searchEvent.context.startsWith('Web search results'))

    // router: its default prompt, label-only options
    assert.deepEqual(provider.calls[0].messages.map((m) => m.role), ['system', 'user'])
    assert.match(provider.calls[0].messages[0].content, /route search queries/)
    assert.equal(provider.calls[0].options?.purpose, 'classify')
    // specialist: own prompt + appended results (one system message), then the query
    const system = provider.calls[1].messages[0].content
    assert.ok(system.startsWith(catalog.byId('food').systemPrompt))
    assert.match(system, /\n\nWeb search results for "easy dinner with eggs"[\s\S]*\[1\] Egg curry \(food\.example\.com\)/)
    assert.equal(provider.calls[1].messages[1].content, 'easy dinner with eggs')
    const answer = events.filter((e) => e.type === 'token' && e.step === 'food').map((e) => (e as { text: string }).text).join('')
    assert.equal(answer, 'Try egg curry.')
  })

  it('uses edited system prompts, and sends none when one is blank', async () => {
    const provider = new ScriptedProvider(['travel', 'Fly in March.'])
    await collect(pipeline(provider, new FakeSearch()).run(req('cheap flights', { router: '', travel: 'Be a pirate.' }), signal()))
    assert.deepEqual(provider.calls[0].messages.map((m) => m.role), ['user'])   // blank router prompt: no system message
    assert.match(provider.calls[1].messages[0].content, /^Be a pirate\.\n\nWeb search results/)
  })

  it('falls back to the general specialist when the router answers with something unknown', async () => {
    const provider = new ScriptedProvider(['hmm, not sure', 'ok'])
    const events = await collect(pipeline(provider, new FakeSearch()).run(req('what is a rainbow'), signal()))
    assert.equal((events.find((e) => e.type === 'route') as { label: string }).label, 'general')
  })

  it('carries on without context when the search fails, and reports the error', async () => {
    const provider = new ScriptedProvider(['health', 'Rest.'])
    const events = await collect(pipeline(provider, new FakeSearch(new UpstreamError('Brave Search rate limit reached.'))).run(req('headache'), signal()))
    const s = events[0]
    assert.ok(s.type === 'search' && s.results.length === 0 && s.context === '' && /rate limit/.test(s.error ?? ''))
    assert.equal(provider.calls[1].messages[0].content, catalog.byId('health').systemPrompt)   // no results appended
    assert.equal(events.at(-1)?.type, 'done')
  })
})

describe('HTTP routes with the offline mocks', () => {
  let server: HttpServer
  let base = ''
  before(async () => {
    const provider = new MockProvider(0)
    const search = new MockSearchProvider()
    const service = new RoutingService(pipeline(provider, search), provider, search, catalog)
    server = new HttpServer('127.0.0.1', 0, [new RouteDefaultsRoute(service), new RouteStreamRoute(service, LIMITS, new SilentLogger())], new SilentLogger())
    base = `http://127.0.0.1:${await server.start()}`
  })
  after(async () => { await server.stop() })

  it('GET /api/route/defaults lists the router and specialists with their prompts', async () => {
    const d = await (await fetch(`${base}/api/route/defaults`)).json() as { search: { provider: string }; router: { systemPrompt: string }; specialists: { id: string }[] }
    assert.equal(d.search.provider, 'backup')
    assert.match(d.router.systemPrompt, /exactly one word/)
    assert.deepEqual(d.specialists.map((s) => s.id), ['food', 'travel', 'health', 'general'])
  })
  it('POST /api/route/stream streams search, router, route, specialist and done', async () => {
    const res = await fetch(`${base}/api/route/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'easy dinner with eggs and tomatoes' }) })
    const events = (await res.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l) as { type: string; step?: string; label?: string })
    assert.deepEqual([...new Set(events.map((e) => e.type === 'step_start' ? `start:${e.step}` : e.type))], ['start', 'search', 'start:router', 'token', 'step_end', 'route', 'start:food', 'done'].filter((x) => x !== 'token' || true))
    assert.equal(events.find((e) => e.type === 'route')?.label, 'food')
  })
  it('rejects bad input with 400', async () => {
    const post = (body: unknown) => fetch(`${base}/api/route/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    assert.equal((await post({ query: '' })).status, 400)
    assert.equal((await post({ query: 'hi', systems: { bogus: 'x' } })).status, 400)
  })
})
