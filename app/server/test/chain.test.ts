import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { ChainService } from '../src/application/ChainService.ts'
import { PromptComposer } from '../src/application/PromptComposer.ts'
import { SingleCallService } from '../src/application/SingleCallService.ts'
import { SupportChainFactory } from '../src/chain/SupportChainFactory.ts'
import type { ChainEvent } from '../src/domain/ChainEvent.ts'
import type { ChatMessage } from '../src/domain/ChatMessage.ts'
import { Conversation } from '../src/domain/Conversation.ts'
import { FactsParser } from '../src/domain/Facts.ts'
import type { StreamEvent } from '../src/domain/StreamEvent.ts'
import { ValidationError } from '../src/errors/AppError.ts'
import { HttpServer } from '../src/http/HttpServer.ts'
import { ChainStreamRoute } from '../src/http/routes/ChainStreamRoute.ts'
import { HealthRoute } from '../src/http/routes/HealthRoute.ts'
import type { GenerationOptions, LlmProvider } from '../src/llm/LlmProvider.ts'
import { MockProvider } from '../src/llm/MockProvider.ts'
import { SilentLogger } from '../src/logging/Logger.ts'

const LIMITS = { maxChars: 500, maxTurns: 4 }

/** Answers each call with the next scripted reply (split into 3 tokens) and records what it was asked. */
class ScriptedProvider implements LlmProvider {
  readonly name = 'scripted'
  readonly model = 'x'
  readonly isLive = true
  readonly calls: { messages: readonly ChatMessage[]; options?: GenerationOptions }[] = []
  private readonly replies: string[]

  constructor(replies: string[]) {
    this.replies = [...replies]
  }

  async *stream(messages: readonly ChatMessage[], _signal: AbortSignal, options?: GenerationOptions): AsyncIterable<StreamEvent> {
    this.calls.push({ messages, options })
    const reply = this.replies.shift() ?? ''
    const third = Math.ceil(reply.length / 3)
    for (let i = 0; i < reply.length; i += third) yield { type: 'token', text: reply.slice(i, i + third) }
    yield { type: 'done', stats: {} }
  }
}

async function collect(events: AsyncIterable<ChainEvent>): Promise<ChainEvent[]> {
  const out: ChainEvent[] = []
  for await (const e of events) out.push(e)
  return out
}

const signal = () => new AbortController().signal
const FACTS_OK = '{"orderNumber":"4821","product":"phone","issue":"cracked screen","request":"refund"}'

describe('FactsParser', () => {
  it('reads plain, fenced and chatty JSON and turns "null"-like values into null', () => {
    assert.deepEqual(FactsParser.parse(FACTS_OK)?.toJSON(), { orderNumber: '4821', product: 'phone', issue: 'cracked screen', request: 'refund' })
    assert.equal(FactsParser.parse('```json\n{"orderNumber": 4821, "issue": "unknown"}\n```')?.orderNumber, '4821')
    assert.equal(FactsParser.parse('Sure! {"orderNumber":"none","issue":"late"} hope that helps')?.issue, 'late')
    assert.equal(FactsParser.parse('{"orderNumber":"none"}')?.orderNumber, null)
  })
  it('returns null when there is no JSON object', () => {
    assert.equal(FactsParser.parse('no json here'), null)
    assert.equal(FactsParser.parse('{broken'), null)
  })
})

describe('Conversation', () => {
  it('keeps only the last turns and builds a transcript ending with the new message', () => {
    const history = Array.from({ length: 6 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` }))
    const c = Conversation.parse({ message: ' new one ', history }, LIMITS)
    assert.equal(c.history.length, 4)
    assert.equal(c.transcript(), 'Customer: m2\nAssistant: m3\nCustomer: m4\nAssistant: m5\nCustomer: new one')
  })
  it('rejects bad input', () => {
    assert.throws(() => Conversation.parse({ message: '' }, LIMITS), ValidationError)
    assert.throws(() => Conversation.parse({ message: 'x'.repeat(501) }, LIMITS), ValidationError)
    assert.throws(() => Conversation.parse({ message: 'hi', history: 'nope' }, LIMITS), ValidationError)
    assert.throws(() => Conversation.parse({ message: 'hi', history: [{ role: 'system', content: 'x' }] }, LIMITS), ValidationError)
  })
})

describe('support chain', () => {
  it('runs extract -> gate -> draft -> polish when the facts are complete, passing history to the first call', async () => {
    const provider = new ScriptedProvider([FACTS_OK, 'Draft text here.', 'Polished text here.'])
    const chain = SupportChainFactory.create(provider)
    const conversation = Conversation.parse(
      { message: 'its 4821, screen is cracked', history: [{ role: 'user', content: 'my phone came broken' }, { role: 'assistant', content: 'Please send your order number.' }] },
      LIMITS,
    )
    const events = await collect(chain.run(conversation, signal()))

    const starts = events.filter((e) => e.type === 'step_start').map((e) => (e as { step: string }).step)
    assert.deepEqual(starts, ['extract', 'gate', 'draft', 'polish'])
    const gate = events.find((e) => e.type === 'gate')
    assert.ok(gate && gate.type === 'gate' && gate.passed && gate.reply === null)
    assert.equal(events.at(-1)?.type, 'done')
    const polished = events.filter((e) => e.type === 'token' && e.step === 'polish').map((e) => (e as { text: string }).text).join('')
    assert.equal(polished, 'Polished text here.')

    // History reached the model, and only the extraction call asked for JSON.
    assert.match(provider.calls[0].messages.at(-1)?.content ?? '', /Customer: my phone came broken\nAssistant: Please send your order number\.\nCustomer: its 4821/)
    assert.equal(provider.calls[0].options?.jsonMode, true)
    assert.equal(provider.calls[1].options?.jsonMode, undefined)
    assert.match(provider.calls[1].messages.at(-1)?.content ?? '', /"orderNumber":"4821"/)
    assert.match(provider.calls[2].messages.at(-1)?.content ?? '', /^DRAFT:\nDraft text here\./)
  })

  it('stops at the gate and asks for the missing order number, without calling the later steps', async () => {
    const provider = new ScriptedProvider(['{"orderNumber":null,"product":"phone","issue":"broken","request":"refund"}'])
    const events = await collect(SupportChainFactory.create(provider).run(Conversation.parse({ message: 'my phone came broken!!!' }, LIMITS), signal()))

    const gate = events.find((e) => e.type === 'gate')
    assert.ok(gate && gate.type === 'gate' && !gate.passed)
    assert.match(gate.reply ?? '', /order number/i)
    assert.deepEqual(gate.checks.map((c) => [c.label, c.ok]), [['Order number', false], ['Problem described', true]])
    assert.deepEqual(events.filter((e) => e.type === 'step_start').map((e) => (e as { step: string }).step), ['extract', 'gate'])
    assert.equal(provider.calls.length, 1)
    assert.equal(events.at(-1)?.type, 'done')
  })

  it('treats unreadable model output as "nothing known" and asks for details', async () => {
    const provider = new ScriptedProvider(['I could not do that'])
    const events = await collect(SupportChainFactory.create(provider).run(Conversation.parse({ message: 'hello' }, LIMITS), signal()))
    const gate = events.find((e) => e.type === 'gate')
    assert.ok(gate && gate.type === 'gate' && !gate.passed)
    assert.match(gate.reply ?? '', /order number and tell me what went wrong/)
  })
})

describe('POST /api/chain/stream (offline mock)', () => {
  let server: HttpServer
  let base = ''
  before(async () => {
    const provider = new MockProvider(0)
    const route = new ChainStreamRoute(new ChainService(SupportChainFactory.create(provider), provider), LIMITS, new SilentLogger())
    server = new HttpServer('127.0.0.1', 0, [new HealthRoute(new SingleCallService(provider, new PromptComposer())), route], new SilentLogger())
    base = `http://127.0.0.1:${await server.start()}`
  })
  after(async () => { await server.stop() })

  const post = (body: unknown) => fetch(`${base}/api/chain/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const lines = async (res: Response) => (await res.text()).split('\n').filter(Boolean).map((l) => JSON.parse(l) as { type: string; step?: string; passed?: boolean; reply?: string })

  it('fails the gate on the first message and passes on the follow-up that carries the history', async () => {
    const first = await lines(await post({ message: 'my phone came broken!!!' }))
    assert.deepEqual(first.map((e) => e.type).filter((t, i, a) => a.indexOf(t) === i), ['start', 'step_start', 'token', 'step_end', 'gate', 'done'])
    assert.equal(first.find((e) => e.type === 'gate')?.passed, false)

    const second = await lines(await post({
      message: 'its 4821, the screen is cracked',
      history: [{ role: 'user', content: 'my phone came broken!!!' }, { role: 'assistant', content: first.find((e) => e.type === 'gate')?.reply }],
    }))
    assert.equal(second.find((e) => e.type === 'gate')?.passed, true)
    assert.deepEqual([...new Set(second.filter((e) => e.type === 'step_start').map((e) => e.step))], ['extract', 'gate', 'draft', 'polish'])
    assert.equal(second.at(-1)?.type, 'done')
  })

  it('answers 400 for invalid input before streaming', async () => {
    assert.equal((await post({ message: '' })).status, 400)
    assert.equal((await post({ message: 'hi', history: [{ role: 'bot', content: 'x' }] })).status, 400)
  })
})
