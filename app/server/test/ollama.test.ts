import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ChatMessage } from '../src/domain/ChatMessage.ts'
import type { StreamEvent } from '../src/domain/StreamEvent.ts'
import { UpstreamError } from '../src/errors/AppError.ts'
import { OllamaCloudProvider, type FetchLike } from '../src/llm/OllamaCloudProvider.ts'

const enc = new TextEncoder()

function streamOf(parts: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const p of parts) controller.enqueue(enc.encode(p))
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } })
}

function provider(fetch: FetchLike) {
  return new OllamaCloudProvider({
    apiKey: 'secret-key', baseUrl: 'https://ollama.test', model: 'gemma4:31b', temperature: 0.5, maxTokens: 50, fetch,
  })
}

async function collect(it: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const out: StreamEvent[] = []
  for await (const e of it) out.push(e)
  return out
}

describe('OllamaCloudProvider', () => {
  it('posts the documented request and streams tokens, even when lines are split mid-chunk', async () => {
    let seen: { url: string; init: RequestInit } | undefined
    const p = provider(async (url, init) => {
      seen = { url, init }
      return streamOf([
        '{"message":{"content":"Hel"},"done":false}\n{"message":{"cont',
        'ent":"lo"},"done":false}\n',
        '{"message":{"content":""},"done":true,"done_reason":"stop","eval_count":2}',
      ])
    })
    const events = await collect(p.stream([ChatMessage.system('s'), ChatMessage.user('hi')], new AbortController().signal))

    assert.deepEqual(events, [
      { type: 'token', text: 'Hel' },
      { type: 'token', text: 'lo' },
      { type: 'done', stats: { tokens: 2, durationMs: undefined, finishReason: 'stop' } },
    ])
    assert.equal(seen?.url, 'https://ollama.test/api/chat')
    const headers = seen?.init.headers as Record<string, string>
    assert.equal(headers.Authorization, 'Bearer secret-key')
    const body = JSON.parse(String(seen?.init.body))
    assert.equal(body.model, 'gemma4:31b')
    assert.equal(body.stream, true)
    assert.equal(body.think, false)
    assert.deepEqual(body.messages, [{ role: 'system', content: 's' }, { role: 'user', content: 'hi' }])
    assert.deepEqual(body.options, { temperature: 0.5, num_predict: 50 })
  })

  it('explains a rejected key without leaking it', async () => {
    const p = provider(async () => new Response('unauthorized', { status: 401 }))
    await assert.rejects(collect(p.stream([ChatMessage.user('hi')], new AbortController().signal)), (e: Error) => {
      assert.ok(e instanceof UpstreamError)
      assert.match(e.message, /API key/)
      assert.ok(!e.message.includes('secret-key'))
      return true
    })
  })

  it('maps usage-limit and unknown-model responses to helpful messages', async () => {
    const limited = provider(async () => new Response('', { status: 429 }))
    await assert.rejects(collect(limited.stream([ChatMessage.user('x')], new AbortController().signal)), /usage limit/)
    const missing = provider(async () => new Response('', { status: 404 }))
    await assert.rejects(collect(missing.stream([ChatMessage.user('x')], new AbortController().signal)), /gemma4:31b/)
  })

  it('reports network failures as upstream errors', async () => {
    const p = provider(async () => {
      throw new TypeError('fetch failed')
    })
    await assert.rejects(collect(p.stream([ChatMessage.user('x')], new AbortController().signal)), /Could not reach/)
  })
})
