import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Prompt } from '../src/domain/Prompt.ts'
import { ValidationError, UpstreamError } from '../src/errors/AppError.ts'
import { NdjsonLineSplitter } from '../src/llm/NdjsonLineSplitter.ts'
import { OllamaChunkMapper } from '../src/llm/OllamaChunkMapper.ts'

describe('Prompt', () => {
  it('trims and accepts normal text', () => {
    assert.equal(Prompt.parse('  hello  ', 100).text, 'hello')
  })
  it('rejects non-strings, empty and too-long input', () => {
    assert.throws(() => Prompt.parse(42, 100), ValidationError)
    assert.throws(() => Prompt.parse('   ', 100), ValidationError)
    assert.throws(() => Prompt.parse('x'.repeat(101), 100), ValidationError)
  })
})

describe('NdjsonLineSplitter', () => {
  it('reassembles lines split across chunks and skips blanks', () => {
    const s = new NdjsonLineSplitter()
    assert.deepEqual(s.push('{"a":1}\n{"b"'), ['{"a":1}'])
    assert.deepEqual(s.push(':2}\n\n'), ['{"b":2}'])
    assert.deepEqual(s.push('{"c":3}'), [])
    assert.deepEqual(s.flush(), ['{"c":3}'])
    assert.deepEqual(s.flush(), [])
  })
})

describe('OllamaChunkMapper', () => {
  const mapper = new OllamaChunkMapper()
  it('maps content to a token event', () => {
    assert.deepEqual(mapper.map('{"message":{"role":"assistant","content":"Hi"},"done":false}'), { type: 'token', text: 'Hi' })
  })
  it('drops empty content and reasoning text', () => {
    assert.equal(mapper.map('{"message":{"content":""},"done":false}'), null)
    assert.equal(mapper.map('{"message":{"thinking":"hmm"},"done":false}'), null)
  })
  it('maps the final chunk to stats', () => {
    assert.deepEqual(mapper.map('{"done":true,"done_reason":"stop","eval_count":18,"eval_duration":52479709}'), {
      type: 'done',
      stats: { tokens: 18, durationMs: 52, finishReason: 'stop' },
    })
  })
  it('throws on provider errors and on junk', () => {
    assert.throws(() => mapper.map('{"error":"model overloaded"}'), UpstreamError)
    assert.throws(() => mapper.map('not json'), UpstreamError)
  })
})
