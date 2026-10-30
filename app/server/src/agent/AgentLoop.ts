import { ChatMessage } from '../domain/ChatMessage.ts'
import type { AgentEvent } from '../domain/AgentEvent.ts'
import type { ToolCall } from '../domain/Tool.ts'
import type { LlmProvider } from '../llm/LlmProvider.ts'
import { runParallel } from '../support/runParallel.ts'
import type { ApprovalBroker } from './ApprovalBroker.ts'
import { AgentToolbox } from './AgentTool.ts'

export interface AgentLimits {
  /** Most LLM calls one agent may make. The last one is made without tools, which forces an answer. */
  readonly maxSteps: number
  readonly maxSubSteps: number
  /** Most LLM calls in the whole run, sub-agents included. */
  readonly maxLlmCalls: number
  /** Most tool calls run at once in one step (the rest are refused). */
  readonly maxParallel: number
  readonly maxSubAgents: number
}

export const DEFAULT_LIMITS: AgentLimits = { maxSteps: 7, maxSubSteps: 4, maxLlmCalls: 18, maxParallel: 4, maxSubAgents: 3 }

/** Counters shared by the main agent and its sub-agents, so the limits apply to the whole run. */
export class AgentBudget {
  llmCalls = 0
  toolCalls = 0
  subAgents = 0
}

export interface AgentRun {
  readonly runId: string
  /** Where tools that need a person's approval wait for it. */
  readonly approvals: ApprovalBroker
  readonly signal: AbortSignal
  readonly budget: AgentBudget
  readonly systems: { readonly agent: string; readonly subagent: string }
  /** Names of the tools switched on for this run. */
  readonly enabled: readonly string[]
}

const RESULT_TO_MODEL = 6000
const RESULT_TO_UI = 3000

/**
 * The agent loop: call the model with the tools on offer; run every tool it asks for (at the same time when it asks for
 * several, and a tool may start a sub-agent that runs this same loop); give the results back; repeat until the model
 * answers in plain text. Capped so a confused model cannot loop forever. Every step is reported as an event, because
 * the shape of the run is decided by the model, not by us.
 */
export class AgentLoop {
  private readonly provider: LlmProvider
  private readonly toolbox: AgentToolbox
  private readonly limits: AgentLimits

  constructor(provider: LlmProvider, toolbox: AgentToolbox, limits: AgentLimits = DEFAULT_LIMITS) {
    this.provider = provider
    this.toolbox = toolbox
    this.limits = limits
  }

  async *run(run: AgentRun, agentId: string, parent: string | null, task: string, depth: number): AsyncGenerator<AgentEvent, string> {
    const sub = depth > 0
    const maxSteps = sub ? this.limits.maxSubSteps : this.limits.maxSteps
    // A sub-agent gets the same tools except spawning, so agents cannot nest without end.
    const enabled = run.enabled.filter((name) => !(sub && name === 'spawn_agent'))
    const definitions = this.toolbox.definitions(enabled)
    const system = sub ? run.systems.subagent : run.systems.agent
    const messages: ChatMessage[] = system.trim() ? [ChatMessage.system(system), ChatMessage.user(task)] : [ChatMessage.user(task)]

    yield { type: 'agent_start', agent: agentId, parent, task }
    let answer = ''
    for (let step = 1; step <= maxSteps; step++) {
      const lastChance = step === maxSteps || run.budget.llmCalls >= this.limits.maxLlmCalls
      run.budget.llmCalls++
      const id = `${agentId}.s${step}`
      yield { type: 'llm_start', agent: agentId, id, step, context: messages.length }

      let text = ''
      const calls: ToolCall[] = []
      const tools = lastChance || definitions.length === 0 ? undefined : definitions
      for await (const event of this.provider.stream(messages, run.signal, { tools, temperature: 0.3, maxTokens: 700 })) {
        if (event.type === 'token') {
          text += event.text
          yield { type: 'token', id, text: event.text }
        } else if (event.type === 'tool_call' && tools) {
          calls.push(event.call)
        }
      }

      yield { type: 'llm_end', id, calls: calls.length }
      if (calls.length === 0) {
        answer = text.trim() || 'I could not finish within my step limit.'
        break
      }

      const ids = calls.map((_, i) => `${id}.c${i + 1}`)
      for (let i = 0; i < calls.length; i++) yield { type: 'tool_call', id: ids[i], llm: id, name: calls[i].name, arguments: calls[i].arguments }
      const results = yield* runParallel(calls.map((call, i) => this.execute(run, call, ids[i], i >= this.limits.maxParallel, enabled, depth)))

      messages.push(ChatMessage.assistantCalling(calls, text))
      calls.forEach((call, i) => messages.push(ChatMessage.toolResult(call, results[i])))
    }
    yield { type: 'agent_end', agent: agentId, answer }
    return answer
  }

  private async *execute(run: AgentRun, call: ToolCall, callId: string, refused: boolean, enabled: readonly string[], depth: number): AsyncGenerator<AgentEvent, string> {
    const tool = this.toolbox.get(call.name)
    let result: string
    let error = false
    if (refused) {
      result = JSON.stringify({ error: `Too many tool calls at once (the limit is ${this.limits.maxParallel}). Ask again for fewer.` })
      error = true
    } else if (!tool || !enabled.includes(call.name)) {
      result = JSON.stringify({ error: `The tool "${call.name}" is not available.` })
      error = true
    } else {
      try {
        result = yield* tool.run(call.arguments, {
          signal: run.signal,
          callId,
          spawn: (task) => this.spawn(run, callId, task, depth),
          ask: (prompt) => this.ask(run, prompt),
          waitForHuman: () => run.approvals.wait(run.runId, callId, run.signal),
        })
      } catch (cause) {
        if (run.signal.aborted) throw cause
        result = JSON.stringify({ error: cause instanceof Error ? cause.message : 'The tool failed' })
        error = true
      }
    }
    run.budget.toolCalls++
    yield { type: 'tool_result', id: callId, result: result.slice(0, RESULT_TO_UI), error: error || /^\{"error":/.test(result) }
    return result.slice(0, RESULT_TO_MODEL)
  }

  private async *spawn(run: AgentRun, callId: string, task: string, depth: number): AsyncGenerator<AgentEvent, string> {
    if (depth >= 1) return JSON.stringify({ error: 'Sub-agents cannot start more sub-agents.' })
    if (run.budget.subAgents >= this.limits.maxSubAgents) return JSON.stringify({ error: `Only ${this.limits.maxSubAgents} sub-agents may be started in one run.` })
    const agentId = `a${++run.budget.subAgents}`
    return yield* this.run(run, agentId, callId, task, depth + 1)
  }

  private async ask(run: AgentRun, prompt: string): Promise<string> {
    run.budget.llmCalls++
    let text = ''
    for await (const event of this.provider.stream([ChatMessage.user(prompt)], run.signal, { temperature: 0.3, maxTokens: 400 })) {
      if (event.type === 'token') text += event.text
    }
    return text
  }
}
