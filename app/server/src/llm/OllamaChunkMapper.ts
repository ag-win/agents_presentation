import type { StreamEvent } from '../domain/StreamEvent.ts'
import { UpstreamError } from '../errors/AppError.ts'

interface OllamaChunk {
  error?: string
  done?: boolean
  done_reason?: string
  eval_count?: number
  eval_duration?: number
  message?: { content?: string; thinking?: string; tool_calls?: { function?: { name?: string; arguments?: Record<string, unknown> } }[] }
}

/**
 * Translates one NDJSON line of Ollama's /api/chat stream into our own event type.
 * Reasoning text (`message.thinking`) is deliberately dropped: this demo is a plain single call.
 */
export class OllamaChunkMapper {
  private calls = 0

  /** First event of a line, or null. Kept for callers that expect one event per line. */
  map(line: string): StreamEvent | null {
    return this.mapAll(line)[0] ?? null
  }

  /** All events in one line: a chunk can carry text and tool calls, and the final chunk carries the stats. */
  mapAll(line: string): StreamEvent[] {
    let chunk: OllamaChunk
    try {
      chunk = JSON.parse(line) as OllamaChunk
    } catch (cause) {
      throw new UpstreamError('Ollama sent a line that is not valid JSON', { cause })
    }
    if (chunk.error) throw new UpstreamError(chunk.error)
    const events: StreamEvent[] = []
    const text = chunk.message?.content
    if (text) events.push({ type: 'token', text })
    for (const call of chunk.message?.tool_calls ?? []) {
      if (call.function?.name) events.push({ type: 'tool_call', call: { id: `call_${++this.calls}`, name: call.function.name, arguments: call.function.arguments ?? {} } })
    }
    if (chunk.done) {
      events.push({
        type: 'done',
        stats: {
          tokens: chunk.eval_count,
          durationMs: chunk.eval_duration === undefined ? undefined : Math.round(chunk.eval_duration / 1e6),
          finishReason: chunk.done_reason,
        },
      })
    }
    return events
  }
}
