import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { AgentLoop, AgentBudget, type AgentLimits, DEFAULT_LIMITS } from '../src/agent/AgentLoop.ts'
import { ApprovalBroker } from '../src/agent/ApprovalBroker.ts'
import { AgentPromptCatalog } from '../src/agent/AgentPrompts.ts'
import { AgentRequest } from '../src/agent/AgentRequest.ts'
import { AgentTaskCatalog } from '../src/agent/AgentTaskCatalog.ts'
import { AgentToolbox } from '../src/agent/AgentTool.ts'
import { Calculator } from '../src/agent/Calculator.ts'
import { FileSandbox } from '../src/agent/FileSandbox.ts'
import { AskModelTool, CalculatorTool, ReadFileTool, SpawnAgentTool, WebSearchTool, WriteFileTool } from '../src/agent/tools/GeneralTools.ts'
import { EscalateTool, FeedbackTool, OrderStatusAgentTool, ProductReviewsTool, ProductSpecsTool, ShopPolicyTool } from '../src/agent/tools/ShopTools.ts'
import { AgentService } from '../src/application/AgentService.ts'
import type { ChatMessage } from '../src/domain/ChatMessage.ts'
import type { AgentEvent } from '../src/domain/AgentEvent.ts'
import type { StreamEvent } from '../src/domain/StreamEvent.ts'
import { ValidationError } from '../src/errors/AppError.ts'
import { HttpServer } from '../src/http/HttpServer.ts'
import { AgentDecisionRoute, AgentDefaultsRoute, AgentStreamRoute, AgentWorkspaceClearRoute } from '../src/http/routes/AgentRoutes.ts'
import type { GenerationOptions, LlmProvider } from '../src/llm/LlmProvider.ts'
import { MockProvider } from '../src/llm/MockProvider.ts'
import { SilentLogger } from '../src/logging/Logger.ts'
import { MockSearchProvider } from '../src/search/MockSearchProvider.ts'
import { OrderDatabase } from '../src/shop/OrderDatabase.ts'
import { ProductCatalog } from '../src/shop/ProductCatalog.ts'
import { ScenarioCatalog } from '../src/support/ScenarioCatalog.ts'

type Turn = { text?: string; calls?: { name: string; args: Record<string, unknown> }[] }
interface Seen { messages: readonly ChatMessage[]; options?: GenerationOptions }

/** A model that decides what to do by looking at the conversation. Records every call it was given. */
class Brain implements LlmProvider {
  readonly name = 'brain'
  readonly model = 'brain'
  readonly isLive = true
  readonly seen: Seen[] = []
  private readonly decide: (messages: readonly ChatMessage[], options: GenerationOptions) => Turn
  constructor(decide: (messages: readonly ChatMessage[], options: GenerationOptions) => Turn) { this.decide = decide }
  async *stream(messages: readonly ChatMessage[], _s: AbortSignal, options: GenerationOptions = {}): AsyncIterable<StreamEvent> {
    this.seen.push({ messages: [...messages], options })
    const turn = this.decide(messages, options)
    await new Promise((r) => setTimeout(r, 2))
    if (turn.text) yield { type: 'token', text: turn.text }
    for (const [i, c] of (turn.calls ?? []).entries()) yield { type: 'tool_call', call: { id: `t${this.seen.length}_${i}`, name: c.name, arguments: c.args } }
    yield { type: 'done', stats: {} }
  }
}

const orders = new OrderDatabase()
const products = new ProductCatalog()
let dir = ''
let files: FileSandbox
let toolbox: AgentToolbox
const allNames = () => toolbox.names
const systems = { agent: 'AGENT SYSTEM', subagent: 'SUB SYSTEM' }

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agent-test-'))
  files = new FileSandbox(dir)
  toolbox = new AgentToolbox([
    new OrderStatusAgentTool(orders), new ProductSpecsTool(products), new ProductReviewsTool(products), new ShopPolicyTool(), new FeedbackTool(), new EscalateTool(),
    new WebSearchTool(new MockSearchProvider()), new CalculatorTool(), new WriteFileTool(files), new ReadFileTool(files), new AskModelTool(), new SpawnAgentTool(),
  ])
})
after(async () => { await rm(dir, { recursive: true, force: true }) })

/** `human` answers a paused tool: it is called when an approval_request arrives and returns approve (true) or decline (false). */
async function run(brain: LlmProvider, task: string, opts: { enabled?: string[]; limits?: AgentLimits; human?: (e: Extract<AgentEvent, { type: 'approval_request' }>) => boolean } = {}) {
  const loop = new AgentLoop(brain, toolbox, opts.limits ?? DEFAULT_LIMITS)
  const budget = new AgentBudget()
  const approvals = new ApprovalBroker(2000)
  const events: AgentEvent[] = []
  const gen = loop.run({ runId: 'r1', approvals, signal: new AbortController().signal, budget, systems, enabled: opts.enabled ?? allNames() }, 'a0', null, task, 0)
  let step = await gen.next()
  while (!step.done) {
    events.push(step.value)
    if (step.value.type === 'approval_request') {
      const answer = (opts.human ?? (() => true))(step.value)
      // the person answers a moment later, from another request
      setTimeout(() => approvals.decide('r1', (step.value as { id: string }).id, answer), 5)
    }
    step = await gen.next()
  }
  return { events, answer: step.value, budget }
}
const types = (events: AgentEvent[]) => events.map((e) => e.type)
const lastTool = (m: readonly ChatMessage[]) => m.filter((x) => x.role === 'tool').map((x) => x.content)

describe('Calculator', () => {
  it('does arithmetic with precedence, brackets, powers and no floating-point dust', () => {
    assert.equal(Calculator.evaluate('2 + 3 * 4'), 14)
    assert.equal(Calculator.format(Calculator.evaluate('(3 * 499 + 5 * 99) * 0.85')), '1693.2')
    assert.equal(Calculator.evaluate('2 ^ 3 ^ 2'), 512)
    assert.equal(Calculator.evaluate('-(2 + 1) * 2'), -6)
    assert.equal(Calculator.format(Calculator.evaluate('0.1 + 0.2')), '0.3')
    assert.equal(Calculator.evaluate('1,000 x 2'), 2000)
  })
  it('rejects anything that is not arithmetic, so a model can never run code', () => {
    for (const bad of ['process.exit()', '2 +', '(1 + 2', '1 / 0', 'abc', '1 2']) assert.throws(() => Calculator.evaluate(bad), Error, bad)
  })
})

describe('FileSandbox', () => {
  it('writes, reads, lists and clears simple files', async () => {
    const box = new FileSandbox(await mkdtemp(join(tmpdir(), 'box-')))
    await box.write('a.txt', 'hello')
    assert.equal(await box.read('a.txt'), 'hello')
    assert.deepEqual(await box.list(), ['a.txt'])
    await box.clear()
    assert.deepEqual(await box.list(), [])
  })
  it('refuses paths, odd names, huge files, too many files and missing files', async () => {
    const box = new FileSandbox(await mkdtemp(join(tmpdir(), 'box-')))
    for (const bad of ['../x.txt', 'a/b.txt', '.hidden', '', 'x'.repeat(61), '/etc/passwd']) await assert.rejects(box.write(bad, 'x'), /File names may only/, bad)
    await assert.rejects(box.write('big.txt', 'x'.repeat(FileSandbox.maxChars + 1)), /limited/)
    await assert.rejects(box.read('nope.txt'), /no file called/)
    for (let i = 0; i < FileSandbox.maxFiles; i++) await box.write(`f${i}.txt`, 'x')
    await assert.rejects(box.write('one-more.txt', 'x'), /full/)
    await box.write('f0.txt', 'overwrite is fine')
  })
})

describe('AgentRequest', () => {
  const prompts = new AgentPromptCatalog()
  const limits = { maxTask: 50, maxSystem: 100 }
  it('accepts a task, defaults to every tool, and keeps only supplied prompts (blank allowed)', () => {
    const r = AgentRequest.parse({ task: ' hi ', systems: { agent: '' } }, allNames(), prompts.ids, limits)
    assert.equal(r.task, 'hi')
    assert.deepEqual(r.tools, allNames())
    assert.deepEqual(r.systems, { agent: '' })
  })
  it('rejects empty tasks, unknown tools and prompts, and oversize text', () => {
    assert.throws(() => AgentRequest.parse({ task: '' }, allNames(), prompts.ids, limits), ValidationError)
    assert.throws(() => AgentRequest.parse({ task: 'x', tools: ['rm_rf'] }, allNames(), prompts.ids, limits), /unknown tool/)
    assert.throws(() => AgentRequest.parse({ task: 'x', tools: 'web_search' }, allNames(), prompts.ids, limits), ValidationError)
    assert.throws(() => AgentRequest.parse({ task: 'x', systems: { nope: 'a' } }, allNames(), prompts.ids, limits), /unknown system prompt/)
    assert.throws(() => AgentRequest.parse({ task: 'x'.repeat(51) }, allNames(), prompts.ids, limits), /at most 50/)
    assert.deepEqual(AgentRequest.parse({ task: 'x', tools: [] }, allNames(), prompts.ids, limits).tools, [])
  })
})

describe('AgentLoop', () => {
  it('answers straight away when the model uses no tools (one LLM call)', async () => {
    const { events, answer, budget } = await run(new Brain(() => ({ text: 'Nairobi.' })), 'Capital of Kenya?')
    assert.equal(answer, 'Nairobi.')
    assert.deepEqual(types(events), ['agent_start', 'llm_start', 'token', 'llm_end', 'agent_end'])
    assert.deepEqual(events.find((e) => e.type === 'llm_end'), { type: 'llm_end', id: 'a0.s1', calls: 0 })
    assert.equal(budget.llmCalls, 1)
  })

  it('offers the enabled tools plus the system prompt and task, and nothing else', async () => {
    const brain = new Brain(() => ({ text: 'ok' }))
    await run(brain, 'task', { enabled: ['calculator', 'get_policy'] })
    assert.deepEqual(brain.seen[0].options?.tools?.map((t) => t.name).sort(), ['calculator', 'get_policy'])
    assert.deepEqual(brain.seen[0].messages.map((m) => [m.role, m.content]), [['system', 'AGENT SYSTEM'], ['user', 'task']])
  })

  it('sends no tools at all when none are switched on', async () => {
    const brain = new Brain(() => ({ text: 'ok' }))
    await run(brain, 'task', { enabled: [] })
    assert.equal(brain.seen[0].options?.tools, undefined)
  })

  it('runs a tool, hands the result back, and the next call sees the whole history (each step grows the context)', async () => {
    const brain = new Brain((m) => (lastTool(m).length ? { text: 'Delivered 5 days ago.' } : { calls: [{ name: 'get_order_status', args: { order_id: '4821' } }] }))
    const { events, answer } = await run(brain, 'Where is 4821?')
    assert.equal(answer, 'Delivered 5 days ago.')
    assert.deepEqual(types(events), ['agent_start', 'llm_start', 'llm_end', 'tool_call', 'tool_result', 'llm_start', 'token', 'llm_end', 'agent_end'])
    const starts = events.filter((e) => e.type === 'llm_start') as Extract<AgentEvent, { type: 'llm_start' }>[]
    assert.deepEqual(starts.map((s) => s.context), [2, 4])
    assert.match((events.find((e) => e.type === 'tool_result') as { result: string }).result, /"status":"delivered"/)
    assert.deepEqual(events.find((e) => e.type === 'llm_end'), { type: 'llm_end', id: 'a0.s1', calls: 1 })
  })

  it('announces every parallel tool call first and runs them at the same time', async () => {
    const brain = new Brain((m) => (lastTool(m).length ? { text: 'done' } : { calls: [{ name: 'find_product', args: { query: 'Tecno Spark 20' } }, { name: 'find_product', args: { query: 'Sony WI-XB400' } }, { name: 'calculator', args: { expression: '2+2' } }] }))
    const { events } = await run(brain, 'compare')
    const order = types(events)
    const firstResult = order.indexOf('tool_result')
    assert.equal(order.slice(0, firstResult).filter((t) => t === 'tool_call').length, 3)
    assert.deepEqual(events.filter((e) => e.type === 'tool_call').map((e) => (e as { id: string }).id), ['a0.s1.c1', 'a0.s1.c2', 'a0.s1.c3'])
    // the model got the three results back in the same order it asked
    const results = lastTool(brain.seen[1].messages)
    assert.match(results[0], /Tecno Spark 20/); assert.match(results[1], /Sony WI-XB400/); assert.equal(results[2], '4')
  })

  it('refuses a tool that is switched off, an unknown tool, and calls beyond the parallel limit, and tells the model', async () => {
    const calls = ['calculator', 'get_policy', 'get_policy'].map((name) => ({ name, args: { expression: '1+1' } }))
    const brain = new Brain((m) => (lastTool(m).length ? { text: 'ok' } : { calls: [...calls, { name: 'rm_rf', args: {} }] }))
    const { events } = await run(brain, 'x', { enabled: ['get_policy'], limits: { ...DEFAULT_LIMITS, maxParallel: 3 } })
    const results = events.filter((e) => e.type === 'tool_result') as Extract<AgentEvent, { type: 'tool_result' }>[]
    assert.match(results[0].result, /not available/); assert.equal(results[0].error, true)
    assert.match(results[1].result, /ShopEase policy/); assert.equal(results[1].error, false)
    assert.match(results[3].result, /Too many tool calls/)
    assert.equal(results.length, 4)
  })

  it('turns a tool failure into a result the model can read instead of crashing the run', async () => {
    const brain = new Brain((m) => (lastTool(m).length ? { text: 'sorry' } : { calls: [{ name: 'read_file', args: { filename: 'missing.txt' } }] }))
    const { events, answer } = await run(brain, 'x')
    assert.equal(answer, 'sorry')
    assert.equal((events.find((e) => e.type === 'tool_result') as { error: boolean }).error, true)
  })

  it('takes away the tools on the last allowed step to force an answer, even if the model keeps asking', async () => {
    const brain = new Brain((_m, o) => (o.tools ? { calls: [{ name: 'get_policy', args: {} }] } : { text: 'Final answer.' }))
    const { events, answer, budget } = await run(brain, 'x', { limits: { ...DEFAULT_LIMITS, maxSteps: 3 } })
    assert.equal(answer, 'Final answer.')
    assert.equal(budget.llmCalls, 3)
    assert.equal(brain.seen[2].options?.tools, undefined)
    assert.equal(events.filter((e) => e.type === 'tool_call').length, 2)
  })

  it('falls back to a message when the forced last step says nothing', async () => {
    const brain = new Brain((_m, o) => (o.tools ? { calls: [{ name: 'get_policy', args: {} }] } : {}))
    const { answer } = await run(brain, 'x', { limits: { ...DEFAULT_LIMITS, maxSteps: 2 } })
    assert.match(answer, /could not finish/)
  })

  it('writes and reads a file in the sandbox across two steps', async () => {
    let n = 0
    const brain = new Brain(() => {
      n++
      if (n === 1) return { calls: [{ name: 'write_file', args: { filename: 'hello.txt', content: 'Hello' } }] }
      if (n === 2) return { calls: [{ name: 'read_file', args: { filename: 'hello.txt' } }] }
      return { text: 'Saved and checked.' }
    })
    const { events } = await run(brain, 'x')
    assert.equal(await files.read('hello.txt'), 'Hello')
    assert.equal((events.filter((e) => e.type === 'tool_result')[1] as { result: string }).result, 'Hello')
  })

  it('ask_model makes a separate plain call (no tools, no history) and counts it', async () => {
    const brain = new Brain((m, o) => {
      if (!o.tools) return { text: 'SHORT' }
      return lastTool(m).length ? { text: 'used it' } : { calls: [{ name: 'ask_model', args: { prompt: 'shorten this' } }] }
    })
    const { budget, events } = await run(brain, 'x')
    assert.equal(budget.llmCalls, 3)
    assert.equal((events.find((e) => e.type === 'tool_result') as { result: string }).result, 'SHORT')
  })
})

describe('ApprovalBroker', () => {
  const signal = () => new AbortController().signal
  it('resolves a waiting request with the person\'s answer, once', async () => {
    const broker = new ApprovalBroker(1000)
    const waiting = broker.wait('r', 'c1', signal())
    assert.equal(broker.waiting, 1)
    assert.equal(broker.decide('r', 'c1', true), true)
    assert.equal(await waiting, true)
    assert.equal(broker.decide('r', 'c1', false), false)
    assert.equal(broker.waiting, 0)
  })
  it('treats no answer, a stopped run and an already-aborted run as a decline, and never leaks a timer', async () => {
    const broker = new ApprovalBroker(20)
    assert.equal(await broker.wait('r', 'slow', signal()), false)
    const stop = new AbortController()
    const stopped = new ApprovalBroker(5000).wait('r', 'c', stop.signal)
    stop.abort()
    assert.equal(await stopped, false)
    stop.abort()
    assert.equal(await new ApprovalBroker(5000).wait('r', 'c', stop.signal), false)
    assert.equal(broker.decide('r', 'nothing', true), false)
  })
})

describe('human in the loop (escalate_to_human)', () => {
  const escalating = () => new Brain((m) => (lastTool(m).length ? { text: `Result seen: ${lastTool(m)[0].slice(0, 40)}` } : { calls: [{ name: 'escalate_to_human', args: { summary: 'Angry customer, order 4825' } }] }))

  it('pauses the run until a person approves, then hands the model the approval', async () => {
    const { events, answer } = await run(escalating(), 'I am furious', { human: () => true })
    const order = types(events)
    assert.ok(order.indexOf('approval_request') < order.indexOf('tool_result'), 'the request must come before the result')
    assert.deepEqual(events.find((e) => e.type === 'approval_request'), { type: 'approval_request', id: 'a0.s1.c1', summary: 'Angry customer, order 4825' })
    assert.match((events.find((e) => e.type === 'tool_result') as { result: string }).result, /human approved the escalation. Case ESC-/)
    assert.match(answer, /approved/)
  })

  it('tells the model when the person declines, so it does not promise a callback', async () => {
    const { events, answer } = await run(escalating(), 'I am furious', { human: () => false })
    const result = (events.find((e) => e.type === 'tool_result') as { result: string; error: boolean })
    assert.match(result.result, /declined/)
    assert.match(result.result, /Do not promise a callback/)
    assert.equal(result.error, false)
    assert.match(answer, /declined/)
  })

  it('does not run the rest of the agent while waiting', async () => {
    const brain = escalating()
    const loop = new AgentLoop(brain, toolbox)
    const approvals = new ApprovalBroker(5000)
    const gen = loop.run({ runId: 'r2', approvals, signal: new AbortController().signal, budget: new AgentBudget(), systems, enabled: allNames() }, 'a0', null, 'x', 0)
    const seen: string[] = []
    let waited = false
    const consume = (async () => { for await (const e of { [Symbol.asyncIterator]: () => gen }) seen.push(e.type) })()
    for (let i = 0; i < 200 && approvals.waiting === 0; i++) await new Promise((r) => setTimeout(r, 5))
    assert.equal(approvals.waiting, 1)
    await new Promise((r) => setTimeout(r, 60))
    waited = !seen.includes('tool_result') && brain.seen.length === 1
    assert.equal(waited, true, 'no result and no second LLM call while a person has not answered')
    approvals.decide('r2', 'a0.s1.c1', true)
    await consume
    assert.ok(seen.includes('tool_result') && brain.seen.length === 2)
  })
})

describe('sub-agents', () => {
  const brain = () => new Brain((m, o) => {
    const system = m.find((x) => x.role === 'system')?.content
    if (system === 'SUB SYSTEM') {
      assert.ok(!o.tools?.some((t) => t.name === 'spawn_agent'), 'a sub-agent must not be offered spawn_agent')
      return lastTool(m).length ? { text: `brief about ${m[1].content}` } : { calls: [{ name: 'find_product', args: { query: m[1].content } }] }
    }
    if (lastTool(m).length) return { text: 'Both briefs combined.' }
    return { calls: [{ name: 'spawn_agent', args: { task: 'Sony WI-XB400' } }, { name: 'spawn_agent', args: { task: 'Tecno Spark 20' } }] }
  })

  it('runs one sub-agent per spawn call at the same time, each with its own lane of events, and returns their answers', async () => {
    const { events, answer, budget } = await run(brain(), 'compare two products')
    assert.equal(answer, 'Both briefs combined.')
    const starts = events.filter((e) => e.type === 'agent_start') as Extract<AgentEvent, { type: 'agent_start' }>[]
    assert.deepEqual(starts.map((s) => [s.agent, s.parent]), [['a0', null], ['a1', 'a0.s1.c1'], ['a2', 'a0.s1.c2']])
    assert.ok(events.some((e) => e.type === 'tool_call' && e.id === 'a1.s1.c1' && e.name === 'find_product'))
    assert.ok(events.some((e) => e.type === 'llm_start' && e.id === 'a2.s2'))
    const spawned = events.filter((e) => e.type === 'tool_result' && e.id.startsWith('a0.')) as { id: string; result: string }[]
    assert.match(spawned[0].result + spawned[1].result, /brief about Sony WI-XB400/)
    assert.match(spawned[0].result + spawned[1].result, /brief about Tecno Spark 20/)
    assert.equal(budget.subAgents, 2)
    assert.equal(budget.llmCalls, 1 + 2 + 2 + 1)
  })

  it('limits how many sub-agents one run may start', async () => {
    const eager = new Brain((m) => {
      const system = m.find((x) => x.role === 'system')?.content
      if (system === 'SUB SYSTEM') return { text: 'done' }
      return lastTool(m).length ? { text: 'ok' } : { calls: [1, 2, 3, 4].map(() => ({ name: 'spawn_agent', args: { task: 't' } })) }
    })
    const { events } = await run(eager, 'x', { limits: { ...DEFAULT_LIMITS, maxParallel: 4, maxSubAgents: 2 } })
    assert.equal(events.filter((e) => e.type === 'agent_start').length, 3)
    assert.ok(events.some((e) => e.type === 'tool_result' && /Only 2 sub-agents/.test(e.result)))
  })

  it('caps the whole run at maxLlmCalls by forcing answers once the budget is used', async () => {
    const endless = new Brain((_m, o) => (o.tools ? { calls: [{ name: 'get_policy', args: {} }] } : { text: 'stopped' }))
    const { budget, answer } = await run(endless, 'x', { limits: { ...DEFAULT_LIMITS, maxSteps: 50, maxLlmCalls: 4 } })
    assert.equal(answer, 'stopped')
    assert.equal(budget.llmCalls, 5)
  })
})

describe('agent HTTP routes (offline mock model)', () => {
  let server: HttpServer
  let base = ''
  before(async () => {
    const provider = new MockProvider(0)
    const prompts = new AgentPromptCatalog()
    const service = new AgentService(new AgentLoop(provider, toolbox), provider, toolbox, prompts, new AgentTaskCatalog(), new ScenarioCatalog(), files, new ApprovalBroker(2000))
    server = new HttpServer('127.0.0.1', 0, [new AgentDefaultsRoute(service), new AgentStreamRoute(service, { maxTask: 600, maxSystem: 3000 }, new SilentLogger()), new AgentWorkspaceClearRoute(service), new AgentDecisionRoute(service)], new SilentLogger())
    base = `http://127.0.0.1:${await server.start()}`
  })
  after(async () => { await server.stop() })

  it('GET /api/agent/defaults lists the toolbox with categories, prompts, starter messages and files', async () => {
    const d = await (await fetch(`${base}/api/agent/defaults`)).json() as { tools: { name: string; label: string; category: string }[]; prompts: { id: string }[]; shopMessages: unknown[]; tasks: unknown[]; files: string[] }
    assert.equal(d.tools.length, 12)
    assert.equal(d.tools[0].name, 'get_order_status')
    assert.deepEqual([...new Set(d.tools.map((t) => t.category))].sort(), ['agents', 'files', 'shop', 'web'])
    assert.deepEqual(d.prompts.map((p) => p.id), ['agent', 'subagent'])
    assert.equal(d.shopMessages.length, 20)
    assert.ok(d.tasks.length >= 5)
  })
  it('POST /api/agent/stream streams boxes as they appear, then final and done; bad input is a 400', async () => {
    const res = await fetch(`${base}/api/agent/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'Where is order 4822?' }) })
    const lines = (await res.text()).trim().split('\n').map((l) => JSON.parse(l) as { type: string })
    assert.equal(lines[0].type, 'start')
    assert.ok(lines.some((l) => l.type === 'tool_call') && lines.some((l) => l.type === 'tool_result') && lines.some((l) => l.type === 'final'))
    assert.deepEqual(lines[lines.length - 1], { type: 'done', llmCalls: 2, toolCalls: 1 })
    const bad = await fetch(`${base}/api/agent/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'x', tools: ['nope'] }) })
    assert.equal(bad.status, 400)
  })
  it('starts every stream with the run id, and POST /api/agent/decision validates and answers', async () => {
    const res = await fetch(`${base}/api/agent/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'Capital of Kenya?' }) })
    const lines = (await res.text()).trim().split('\n').map((l) => JSON.parse(l) as { type: string; runId?: string })
    assert.equal(lines[1].type, 'run')
    assert.match(lines[1].runId ?? '', /^[0-9a-f-]{36}$/)
    const post = (body: unknown) => fetch(`${base}/api/agent/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    assert.equal((await post({ run: 'x', call: 'y', approved: 'yes' })).status, 400)
    assert.deepEqual(await (await post({ run: 'x', call: 'y', approved: true })).json(), { ok: false })
  })
  it('POST /api/agent/workspace/clear empties the workspace', async () => {
    await files.write('tmp.txt', 'x')
    assert.equal((await fetch(`${base}/api/agent/workspace/clear`, { method: 'POST' })).status, 200)
    assert.deepEqual(await files.list(), [])
  })
})
