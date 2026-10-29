import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { PromptComposer } from '../src/application/PromptComposer.ts'
import { SingleCallService } from '../src/application/SingleCallService.ts'
import type { ChatMessage } from '../src/domain/ChatMessage.ts'
import { Prompt } from '../src/domain/Prompt.ts'
import type { StreamEvent } from '../src/domain/StreamEvent.ts'
import { SystemPrompt } from '../src/domain/SystemPrompt.ts'
import { ValidationError } from '../src/errors/AppError.ts'
import { HttpServer } from '../src/http/HttpServer.ts'
import { StreamRoute } from '../src/http/routes/StreamRoute.ts'
import type { LlmProvider } from '../src/llm/LlmProvider.ts'
import { SilentLogger } from '../src/logging/Logger.ts'

/** Records the messages it is given and answers with one token. */
class RecordingProvider implements LlmProvider {
  readonly name = 'rec'
  readonly model = 'x'
  readonly isLive = true
  last: readonly ChatMessage[] = []
  async *stream(messages: readonly ChatMessage[]): AsyncIterable<StreamEvent> {
    this.last = messages
    yield { type: 'token', text: 'ok' }
    yield { type: 'done', stats: {} }
  }
}

describe('SystemPrompt', () => {
  it('is undefined when absent, trims text, and allows empty (meaning none)', () => {
    assert.equal(SystemPrompt.parse(undefined, 50), undefined)
    assert.equal(SystemPrompt.parse(null, 50), undefined)
    assert.equal(SystemPrompt.parse('  be brief ', 50)?.text, 'be brief')
    assert.equal(SystemPrompt.parse('   ', 50)?.isEmpty, true)
  })
  it('rejects non-strings and over-long text', () => {
    assert.throws(() => SystemPrompt.parse(5, 50), ValidationError)
    assert.throws(() => SystemPrompt.parse('x'.repeat(51), 50), ValidationError)
  })
})

describe('PromptComposer with a custom system prompt', () => {
  const composer = new PromptComposer()
  const prompt = Prompt.parse('hello', 100)
  it('uses the built-in system prompt by default', () => {
    const m = composer.compose(prompt)
    assert.deepEqual(m.map((x) => x.role), ['system', 'user'])
    assert.match(m[0].content, /group chat app/)
  })
  it('replaces it when one is supplied, and sends none when it is empty', () => {
    assert.equal(composer.compose(prompt, SystemPrompt.parse('You are a pirate.', 50))[0].content, 'You are a pirate.')
    assert.deepEqual(composer.compose(prompt, SystemPrompt.parse('', 50)).map((x) => x.role), ['user'])
  })
})

describe('POST /api/llm/stream with "system"', () => {
  const provider = new RecordingProvider()
  let server: HttpServer
  let base = ''
  before(async () => {
    const service = new SingleCallService(provider, new PromptComposer())
    server = new HttpServer('127.0.0.1', 0, [new StreamRoute(service, 100, new SilentLogger(), 40)], new SilentLogger())
    base = `http://127.0.0.1:${await server.start()}`
  })
  after(async () => { await server.stop() })
  const post = (body: unknown) => fetch(`${base}/api/llm/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  it('passes the system prompt through to the model', async () => {
    await (await post({ prompt: 'hi', system: 'Talk like a pirate.' })).text()
    assert.deepEqual(provider.last.map((m) => [m.role, m.content]), [['system', 'Talk like a pirate.'], ['user', 'hi']])
  })
  it('keeps the built-in prompt when "system" is omitted', async () => {
    await (await post({ prompt: 'hi' })).text()
    assert.match(provider.last[0].content, /group chat app/)
  })
  it('rejects a system prompt that is too long or not a string', async () => {
    assert.equal((await post({ prompt: 'hi', system: 'x'.repeat(41) })).status, 400)
    assert.equal((await post({ prompt: 'hi', system: 7 })).status, 400)
  })
})
