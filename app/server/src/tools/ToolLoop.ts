import { ChatMessage } from '../domain/ChatMessage.ts'
import type { StageEndEvent, StageStartEvent, StageToolCallEvent, StageToolResultEvent, StageTokenEvent } from '../domain/SupportEvent.ts'
import type { ToolCall } from '../domain/Tool.ts'
import type { GenerationOptions, LlmProvider } from '../llm/LlmProvider.ts'
import type { ToolRegistry } from './ToolRegistry.ts'

type ToolLoopEvent = StageStartEvent | StageTokenEvent | StageEndEvent | StageToolCallEvent | StageToolResultEvent

/**
 * The agent harness in miniature: call the model with the tools on offer; if it asks for a tool, run it, hand the result
 * back and call the model again; stop when it answers in plain text. Capped so a confused model cannot loop forever.
 * The last round offers no tools, which forces an answer.
 */
export class ToolLoop {
  private readonly provider: LlmProvider
  private readonly registry: ToolRegistry
  private readonly maxRounds: number

  constructor(provider: LlmProvider, registry: ToolRegistry, maxRounds = 3) {
    this.provider = provider
    this.registry = registry
    this.maxRounds = maxRounds
  }

  async *run(stage: string, initial: readonly ChatMessage[], signal: AbortSignal, options: GenerationOptions = {}): AsyncGenerator<ToolLoopEvent, string> {
    const messages = [...initial]
    let answer = ''
    yield { type: 'stage_start', stage, kind: 'llm' }
    for (let round = 1; round <= this.maxRounds; round++) {
      const offerTools = round < this.maxRounds
      const calls: ToolCall[] = []
      let text = ''
      for await (const event of this.provider.stream(messages, signal, { ...options, tools: offerTools ? this.registry.definitions() : undefined })) {
        if (event.type === 'token') {
          text += event.text
          yield { type: 'token', stage, text: event.text }
        } else if (event.type === 'tool_call') {
          calls.push(event.call)
        }
      }
      answer = text
      if (calls.length === 0) break

      messages.push(ChatMessage.assistantCalling(calls, text))
      for (const call of calls) {
        yield { type: 'tool_call', stage, name: call.name, arguments: call.arguments }
        const result = await this.registry.execute(call)
        yield { type: 'tool_result', stage, name: call.name, result }
        messages.push(ChatMessage.toolResult(call, result))
      }
    }
    yield { type: 'stage_end', stage }
    return answer
  }
}
