import type { ChatMessage } from '../domain/ChatMessage.ts'
import type { StreamEvent } from '../domain/StreamEvent.ts'
import { UpstreamError } from '../errors/AppError.ts'
import type { FetchLike } from '../net/FetchLike.ts'
import type { GenerationOptions, LlmProvider } from './LlmProvider.ts'
import { NdjsonLineSplitter } from './NdjsonLineSplitter.ts'
import { OllamaChunkMapper } from './OllamaChunkMapper.ts'

export type { FetchLike }

export interface OllamaCloudOptions {
  readonly apiKey: string
  readonly baseUrl: string
  readonly model: string
  readonly temperature: number
  readonly maxTokens: number
  /** Injected so tests can run without a network. Defaults to the global fetch. */
  readonly fetch?: FetchLike
}

/**
 * Talks to Ollama Cloud directly (https://ollama.com/api/chat with a bearer key), which is
 * different from the local Ollama app. Streams NDJSON and yields one TokenEvent per chunk.
 */
export class OllamaCloudProvider implements LlmProvider {
  readonly name = 'ollama-cloud'
  readonly isLive = true
  readonly model: string

  private readonly options: OllamaCloudOptions
  private readonly fetchFn: FetchLike
  private readonly mapper = new OllamaChunkMapper()

  constructor(options: OllamaCloudOptions) {
    this.options = options
    this.model = options.model
    this.fetchFn = options.fetch ?? ((url, init) => fetch(url, init))
  }

  async *stream(messages: readonly ChatMessage[], signal: AbortSignal, options: GenerationOptions = {}): AsyncIterable<StreamEvent> {
    const response = await this.send(messages, signal, options)
    if (!response.ok) throw await this.describeFailure(response)
    if (!response.body) throw new UpstreamError('Ollama returned an empty response body')

    const decoder = new TextDecoder()
    const splitter = new NdjsonLineSplitter()
    for await (const bytes of response.body) {
      for (const line of splitter.push(decoder.decode(bytes, { stream: true }))) {
        yield* this.mapper.mapAll(line)
      }
    }
    for (const line of splitter.flush()) yield* this.mapper.mapAll(line)
  }

  /** Our message -> Ollama's: tool requests and tool results have their own shapes. */
  private static toWire(m: ChatMessage): Record<string, unknown> {
    if (m.role === 'tool') return { role: 'tool', tool_name: m.toolName, content: m.content }
    if (m.toolCalls.length) return { role: 'assistant', content: m.content, tool_calls: m.toolCalls.map((c) => ({ function: { name: c.name, arguments: c.arguments } })) }
    return { role: m.role, content: m.content }
  }

  private async send(messages: readonly ChatMessage[], signal: AbortSignal, options: GenerationOptions): Promise<Response> {
    const body = {
      model: this.options.model,
      stream: true,
      think: false, // a plain answer, no reasoning phase
      messages: messages.map(OllamaCloudProvider.toWire),
      ...(options.tools?.length ? { tools: options.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })) } : {}),
      options: { temperature: options.temperature ?? this.options.temperature, num_predict: options.maxTokens ?? this.options.maxTokens },
      ...(options.jsonMode ? { format: 'json' } : {}),
    }
    try {
      return await this.fetchFn(`${this.options.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.options.apiKey}` },
        body: JSON.stringify(body),
        signal,
      })
    } catch (cause) {
      if (signal.aborted) throw cause
      throw new UpstreamError('Could not reach Ollama Cloud (network problem?)', { cause })
    }
  }

  private async describeFailure(response: Response): Promise<UpstreamError> {
    const detail = (await response.text().catch(() => '')).slice(0, 200)
    switch (response.status) {
      case 401:
      case 403:
        return new UpstreamError('Ollama Cloud rejected the API key. Check OLLAMA_API_KEY in app/server/.env.')
      case 404:
        return new UpstreamError(`Ollama Cloud does not know the model "${this.model}". Check OLLAMA_MODEL.`)
      case 402:
        return new UpstreamError(`Ollama Cloud says "${this.model}" is not included in your plan. Add usage credits or choose another OLLAMA_MODEL.`)
      case 429:
        return new UpstreamError('Ollama Cloud usage limit reached. Add credits or upgrade at ollama.com/settings, or wait for the limit to reset.')
      default:
        return new UpstreamError(`Ollama Cloud returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
    }
  }
}
