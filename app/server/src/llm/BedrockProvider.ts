import type { ChatMessage } from '../domain/ChatMessage.ts'
import type { StreamEvent } from '../domain/StreamEvent.ts'
import { UpstreamError } from '../errors/AppError.ts'
import type { FetchLike } from '../net/FetchLike.ts'
import type { BedrockAuth } from './aws/BedrockAuth.ts'
import { EventStreamDecoder } from './aws/EventStreamDecoder.ts'
import type { GenerationOptions, LlmProvider } from './LlmProvider.ts'

export interface BedrockOptions {
  readonly region: string
  /** A model id or an inference profile id, e.g. "global.amazon.nova-2-lite-v1:0". */
  readonly model: string
  readonly auth: BedrockAuth
  readonly temperature: number
  readonly maxTokens: number
  readonly fetch?: FetchLike
}

const JSON_ONLY = 'Respond with a single JSON object and nothing else.'

/**
 * Amazon Bedrock through the Converse streaming API (POST /model/{id}/converse-stream). Works with any model
 * that supports Converse. Reasoning/thinking output is ignored: this demo shows plain answers.
 */
export class BedrockProvider implements LlmProvider {
  readonly name = 'aws-bedrock'
  readonly isLive = true
  readonly model: string

  private readonly options: BedrockOptions
  private readonly fetchFn: FetchLike

  constructor(options: BedrockOptions) {
    this.options = options
    this.model = options.model
    this.fetchFn = options.fetch ?? ((url, init) => fetch(url, init))
  }

  async *stream(messages: readonly ChatMessage[], signal: AbortSignal, options: GenerationOptions = {}): AsyncIterable<StreamEvent> {
    const response = await this.send(messages, signal, options)
    if (!response.ok) throw await this.describeFailure(response)
    if (!response.body) throw new UpstreamError('AWS Bedrock returned an empty response body')

    const decoder = new EventStreamDecoder()
    const decode = new TextDecoder()
    let stopReason: string | undefined
    let tokens: number | undefined
    let latencyMs: number | undefined

    for await (const bytes of response.body) {
      for (const message of decoder.push(bytes)) {
        const kind = message.headers[':message-type']
        const data = JSON.parse(decode.decode(message.payload) || '{}') as {
          message?: string
          delta?: { text?: string }
          stopReason?: string
          usage?: { outputTokens?: number }
          metrics?: { latencyMs?: number }
        }
        if (kind === 'exception') throw this.describeException(message.headers[':exception-type'] ?? 'error', data.message)
        switch (message.headers[':event-type']) {
          case 'contentBlockDelta':
            if (data.delta?.text) yield { type: 'token', text: data.delta.text } // reasoning deltas carry no text field
            break
          case 'messageStop':
            stopReason = data.stopReason
            break
          case 'metadata':
            tokens = data.usage?.outputTokens
            latencyMs = data.metrics?.latencyMs
            break
        }
      }
    }
    yield { type: 'done', stats: { tokens, durationMs: latencyMs, finishReason: stopReason } }
  }

  private async send(messages: readonly ChatMessage[], signal: AbortSignal, options: GenerationOptions): Promise<Response> {
    const system = messages.filter((m) => m.role === 'system').map((m) => m.content)
    if (options.jsonMode) system.push(JSON_ONLY)
    const body = JSON.stringify({
      messages: messages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: [{ text: m.content }] })),
      ...(system.length ? { system: [{ text: system.join('\n\n') }] } : {}),
      inferenceConfig: { maxTokens: options.maxTokens ?? this.options.maxTokens, temperature: options.temperature ?? this.options.temperature },
    })
    const url = new URL(`https://bedrock-runtime.${this.options.region}.amazonaws.com/model/${encodeURIComponent(this.model)}/converse-stream`)
    try {
      return await this.fetchFn(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/vnd.amazon.eventstream', ...this.options.auth.headers(url, body) },
        body,
        signal,
      })
    } catch (cause) {
      if (signal.aborted) throw cause
      throw new UpstreamError('Could not reach AWS Bedrock (network problem?)', { cause })
    }
  }

  private async describeFailure(response: Response): Promise<UpstreamError> {
    const text = await response.text().catch(() => '')
    let detail = text.slice(0, 200)
    try {
      detail = (JSON.parse(text) as { message?: string }).message ?? detail
    } catch {
      /* not JSON: keep the raw text */
    }
    switch (response.status) {
      case 401:
      case 403:
        return new UpstreamError('AWS Bedrock rejected the credentials or the model is not enabled for them. Check the AWS settings in app/server/.env.')
      case 404:
        return new UpstreamError(`AWS Bedrock does not know the model "${this.model}" in ${this.options.region}. Check BEDROCK_MODEL and AWS_REGION.`)
      case 429:
        return new UpstreamError('AWS Bedrock is throttling requests. Wait a moment and try again.')
      default:
        return new UpstreamError(`AWS Bedrock returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`)
    }
  }

  private describeException(type: string, message: string | undefined): UpstreamError {
    if (/throttling/i.test(type)) return new UpstreamError('AWS Bedrock is throttling requests. Wait a moment and try again.')
    return new UpstreamError(`AWS Bedrock error (${type})${message ? `: ${message}` : ''}`)
  }
}
