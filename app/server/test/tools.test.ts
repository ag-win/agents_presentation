import assert from 'node:assert/strict'
import { crc32 } from 'node:zlib'
import { describe, it } from 'node:test'
import { ChatMessage } from '../src/domain/ChatMessage.ts'
import type { StreamEvent } from '../src/domain/StreamEvent.ts'
import type { ToolCall, ToolDefinition } from '../src/domain/Tool.ts'
import { BearerTokenAuth } from '../src/llm/aws/BedrockAuth.ts'
import { BedrockProvider } from '../src/llm/BedrockProvider.ts'
import type { GenerationOptions, LlmProvider } from '../src/llm/LlmProvider.ts'
import { MockProvider } from '../src/llm/MockProvider.ts'
import { OllamaCloudProvider } from '../src/llm/OllamaCloudProvider.ts'
import { OrderDatabase } from '../src/shop/OrderDatabase.ts'
import { OrderStatusTool } from '../src/tools/OrderStatusTool.ts'
import { ToolLoop } from '../src/tools/ToolLoop.ts'
import { ToolRegistry } from '../src/tools/ToolRegistry.ts'

const signal = () => new AbortController().signal
const collect = async <T>(it: AsyncIterable<T>) => { const out: T[] = []; for await (const e of it) out.push(e); return out }

const WEATHER: ToolDefinition = { name: 'get_order_status', description: 'Look up an order.', parameters: { type: 'object', properties: { order_id: { type: 'string' } }, required: ['order_id'] } }
const CALL: ToolCall = { id: 'call_1', name: 'get_order_status', arguments: { order_id: '4821' } }

describe('ChatMessage tool messages', () => {
  it('builds assistant tool calls and tool results', () => {
    const calling = ChatMessage.assistantCalling([CALL])
    assert.equal(calling.role, 'assistant')
    assert.deepEqual(calling.toolCalls, [CALL])
    const result = ChatMessage.toolResult(CALL, '{"status":"delivered"}')
    assert.equal(result.role, 'tool')
    assert.equal(result.toolName, 'get_order_status')
    assert.equal(result.toolCallId, 'call_1')
  })
})

describe('OllamaCloudProvider tool calling', () => {
  const ndjson = (lines: unknown[]) => new Response(lines.map((l) => JSON.stringify(l)).join('\n') + '\n', { status: 200 })
  const make = (fetch: (url: string, init: RequestInit) => Promise<Response>) =>
    new OllamaCloudProvider({ apiKey: 'k', baseUrl: 'https://ollama.test', model: 'm', temperature: 0.5, maxTokens: 50, fetch })

  it('offers tools in the request and turns tool_calls into tool_call events', async () => {
    let body: Record<string, unknown> = {}
    const p = make(async (_u, init) => {
      body = JSON.parse(String(init.body))
      return ndjson([{ message: { content: '', tool_calls: [{ function: { name: 'get_order_status', arguments: { order_id: '4821' } } }] }, done: false }, { message: { content: '' }, done: true, done_reason: 'stop' }])
    })
    const events = await collect(p.stream([ChatMessage.user('where is 4821')], signal(), { tools: [WEATHER] }))
    assert.deepEqual(body.tools, [{ type: 'function', function: { name: 'get_order_status', description: 'Look up an order.', parameters: WEATHER.parameters } }])
    const call = events.find((e) => e.type === 'tool_call')
    assert.ok(call && call.type === 'tool_call')
    assert.equal(call.call.name, 'get_order_status')
    assert.deepEqual(call.call.arguments, { order_id: '4821' })
    assert.ok(call.call.id.length > 0)
  })

  it('sends the tool exchange back in the wire format Ollama expects', async () => {
    let body: { messages: Record<string, unknown>[] } = { messages: [] }
    const p = make(async (_u, init) => { body = JSON.parse(String(init.body)); return ndjson([{ message: { content: 'ok' }, done: true }]) })
    await collect(p.stream([ChatMessage.user('q'), ChatMessage.assistantCalling([CALL]), ChatMessage.toolResult(CALL, '{"s":1}')], signal()))
    assert.deepEqual(body.messages[1], { role: 'assistant', content: '', tool_calls: [{ function: { name: 'get_order_status', arguments: { order_id: '4821' } } }] })
    assert.deepEqual(body.messages[2], { role: 'tool', tool_name: 'get_order_status', content: '{"s":1}' })
  })

  it('leaves tools out of the request when none are offered', async () => {
    let body: Record<string, unknown> = {}
    const p = make(async (_u, init) => { body = JSON.parse(String(init.body)); return ndjson([{ message: { content: 'ok' }, done: true }]) })
    await collect(p.stream([ChatMessage.user('q')], signal()))
    assert.equal('tools' in body, false)
  })
})

describe('BedrockProvider tool calling', () => {
  const crcFrame = (type: string, payload: unknown): Uint8Array => {
    const enc = new TextEncoder()
    const hdr: number[] = []
    for (const [k, v] of Object.entries({ ':event-type': type, ':message-type': 'event', ':content-type': 'application/json' })) {
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
  const respond = (frames: Uint8Array[]) => new Response(new ReadableStream<Uint8Array>({ start(c) { frames.forEach((f) => c.enqueue(f)); c.close() } }), { status: 200 })
  const make = (fetch: (url: string, init: RequestInit) => Promise<Response>) =>
    new BedrockProvider({ region: 'us-east-1', model: 'm', auth: new BearerTokenAuth('secret'), temperature: 0.5, maxTokens: 100, fetch })

  it('declares tools as toolSpec and assembles a streamed toolUse block into one tool_call', async () => {
    let body: Record<string, unknown> = {}
    const p = make(async (_u, init) => {
      body = JSON.parse(String(init.body))
      return respond([
        crcFrame('contentBlockStart', { contentBlockIndex: 0, start: { toolUse: { toolUseId: 'tu_1', name: 'get_order_status' } } }),
        crcFrame('contentBlockDelta', { contentBlockIndex: 0, delta: { toolUse: { input: '{"order_' } } }),
        crcFrame('contentBlockDelta', { contentBlockIndex: 0, delta: { toolUse: { input: 'id":"4821"}' } } }),
        crcFrame('contentBlockStop', { contentBlockIndex: 0 }),
        crcFrame('messageStop', { stopReason: 'tool_use' }),
      ])
    })
    const events = await collect(p.stream([ChatMessage.user('where is 4821')], signal(), { tools: [WEATHER] }))
    assert.deepEqual(body.toolConfig, { tools: [{ toolSpec: { name: 'get_order_status', description: 'Look up an order.', inputSchema: { json: WEATHER.parameters } } }] })
    assert.deepEqual(events[0], { type: 'tool_call', call: { id: 'tu_1', name: 'get_order_status', arguments: { order_id: '4821' } } })
  })

  it('sends the assistant tool call and its result as toolUse / toolResult blocks', async () => {
    let body: { messages: { role: string; content: Record<string, unknown>[] }[] } = { messages: [] }
    const p = make(async (_u, init) => { body = JSON.parse(String(init.body)); return respond([crcFrame('messageStop', {})]) })
    await collect(p.stream([ChatMessage.user('q'), ChatMessage.assistantCalling([CALL]), ChatMessage.toolResult(CALL, '{"s":1}')], signal(), { tools: [WEATHER] }))
    assert.equal(body.messages[1].role, 'assistant')
    assert.deepEqual(body.messages[1].content[0], { toolUse: { toolUseId: 'call_1', name: 'get_order_status', input: { order_id: '4821' } } })
    assert.equal(body.messages[2].role, 'user')
    assert.deepEqual(body.messages[2].content[0], { toolResult: { toolUseId: 'call_1', content: [{ text: '{"s":1}' }] } })
  })
})

describe('MockProvider tool calling', () => {
  it('calls the tool with the order number it finds, then explains the result', async () => {
    const mock = new MockProvider(0)
    const first = await collect(mock.stream([ChatMessage.user('where is order 4821?')], signal(), { tools: [WEATHER] }))
    assert.deepEqual(first[0], { type: 'tool_call', call: { id: 'mock_call_1', name: 'get_order_status', arguments: { order_id: '4821' } } })
    const second = await collect(mock.stream([ChatMessage.user('where is order 4821?'), ChatMessage.assistantCalling([CALL]), ChatMessage.toolResult(CALL, '{"status":"delivered"}')], signal(), { tools: [WEATHER] }))
    assert.match(second.filter((e) => e.type === 'token').map((e) => (e as { text: string }).text).join(''), /delivered/)
  })
  it('answers in text when there is no order number', async () => {
    const events = await collect(new MockProvider(0).stream([ChatMessage.user('where is my parcel?')], signal(), { tools: [WEATHER] }))
    assert.ok(events.every((e) => e.type !== 'tool_call'))
  })
})

describe('OrderStatusTool and ToolRegistry', () => {
  const orders = new OrderDatabase()
  const registry = new ToolRegistry([new OrderStatusTool(orders)])

  it('describes itself with a name, description and JSON-schema parameters', () => {
    const [def] = registry.definitions()
    assert.equal(def.name, 'get_order_status')
    assert.deepEqual((def.parameters as { required: string[] }).required, ['order_id'])
  })
  it('looks up a known order, including how long ago it was delivered', async () => {
    const result = JSON.parse(await registry.execute({ id: 'x', name: 'get_order_status', arguments: { order_id: '4821' } }))
    assert.equal(result.status, 'delivered')
    assert.equal(result.delivered_days_ago, 5)
  })
  it('returns an error as text for unknown orders and unknown tools instead of throwing', async () => {
    assert.match(await registry.execute({ id: 'x', name: 'get_order_status', arguments: { order_id: '9999' } }), /No order found/)
    assert.match(await registry.execute({ id: 'x', name: 'delete_everything', arguments: {} }), /Unknown tool/)
  })
})

describe('ToolLoop', () => {
  /** Scripted model: each entry is the events for one call. Records the messages and tools it was given. */
  class Script implements LlmProvider {
    readonly name = 's'
    readonly model = 's'
    readonly isLive = true
    readonly seen: { messages: readonly ChatMessage[]; options?: GenerationOptions }[] = []
    private readonly rounds: StreamEvent[][]
    constructor(rounds: StreamEvent[][]) { this.rounds = [...rounds] }
    async *stream(messages: readonly ChatMessage[], _s: AbortSignal, options?: GenerationOptions): AsyncIterable<StreamEvent> {
      this.seen.push({ messages: [...messages], options })
      for (const e of this.rounds.shift() ?? [{ type: 'token', text: 'fallback' } as StreamEvent]) yield e
    }
  }
  const registry = new ToolRegistry([new OrderStatusTool(new OrderDatabase())])

  it('runs the tool the model asks for, returns the result to the model, and returns the final answer', async () => {
    const model = new Script([[{ type: 'tool_call', call: CALL }], [{ type: 'token', text: 'It was delivered.' }]])
    const loop = new ToolLoop(model, registry)
    const gen = loop.run('order', [ChatMessage.user('4821?')], signal())
    const events = []
    let step = await gen.next()
    while (!step.done) { events.push(step.value); step = await gen.next() }
    assert.equal(step.value, 'It was delivered.')
    assert.deepEqual(events.map((e) => e.type), ['stage_start', 'tool_call', 'tool_result', 'token', 'stage_end'])
    const second = model.seen[1].messages
    assert.equal(second[second.length - 1].role, 'tool')
    assert.match(second[second.length - 1].content, /delivered/)
  })

  it('answers without a tool when the model does not ask for one', async () => {
    const model = new Script([[{ type: 'token', text: 'What is your order number?' }]])
    const gen = new ToolLoop(model, registry).run('order', [ChatMessage.user('where is it')], signal())
    let step = await gen.next()
    while (!step.done) step = await gen.next()
    assert.equal(step.value, 'What is your order number?')
    assert.equal(model.seen.length, 1)
  })

  it('stops after the round limit and takes the last round without tools', async () => {
    const again: StreamEvent[] = [{ type: 'tool_call', call: CALL }]
    const model = new Script([again, again, [{ type: 'token', text: 'done anyway' }]])
    const gen = new ToolLoop(model, registry, 3).run('order', [ChatMessage.user('x')], signal())
    let step = await gen.next()
    while (!step.done) step = await gen.next()
    assert.equal(step.value, 'done anyway')
    assert.equal(model.seen.length, 3)
    assert.ok(model.seen[0].options?.tools?.length)
    assert.equal(model.seen[2].options?.tools, undefined)
  })
})
