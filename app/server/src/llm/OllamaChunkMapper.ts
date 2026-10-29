import type { StreamEvent } from '../domain/StreamEvent.ts'
import { UpstreamError } from '../errors/AppError.ts'

interface OllamaChunk {
  error?: string
  done?: boolean
  done_reason?: string
  eval_count?: number
  eval_duration?: number
  message?: { content?: string; thinking?: string }
}

/**
 * Translates one NDJSON line of Ollama's /api/chat stream into our own event type.
 * Reasoning text (`message.thinking`) is deliberately dropped: this demo is a plain single call.
 */
export class OllamaChunkMapper {
  map(line: string): StreamEvent | null {
    let chunk: OllamaChunk
    try {
      chunk = JSON.parse(line) as OllamaChunk
    } catch (cause) {
      throw new UpstreamError('Ollama sent a line that is not valid JSON', { cause })
    }
    if (chunk.error) throw new UpstreamError(chunk.error)
    if (chunk.done) {
      return {
        type: 'done',
        stats: {
          tokens: chunk.eval_count,
          durationMs: chunk.eval_duration === undefined ? undefined : Math.round(chunk.eval_duration / 1e6),
          finishReason: chunk.done_reason,
        },
      }
    }
    const text = chunk.message?.content
    return text ? { type: 'token', text } : null
  }
}
