import type { SupportEvent } from '../../domain/SupportEvent.ts'
import type { Branch, BranchOutcome } from '../Branch.ts'
import { firstJsonObject } from '../JsonText.ts'
import { runParallel } from '../runParallel.ts'
import { withSystem, type SupportContext } from '../SupportContext.ts'
import { tap } from '../tap.ts'

interface Task {
  readonly stage: string
  readonly label: string
  readonly request: string
}

const LABELS = ['order', 'complaint', 'product', 'feedback', 'other']
const MAX_TASKS = 3

/** Orchestrator-workers: a planner splits the message at run time, one worker per task runs in parallel, a final call merges the answers. */
export class MultiIssueBranch implements Branch {
  readonly id = 'multi'

  async *run(ctx: SupportContext): AsyncGenerator<SupportEvent, BranchOutcome> {
    const planText = yield* ctx.llm('planner', 'planner', ctx.message, { jsonMode: true, purpose: 'plan', temperature: 0, maxTokens: 300 })
    const tasks = MultiIssueBranch.parsePlan(planText, ctx.message)
    yield { type: 'plan', tasks }

    const evidence: string[] = []
    const answers = yield* runParallel(tasks.map((task) => this.worker(ctx, task, evidence)))

    const numbered = tasks.map((task, i) => `${i + 1}. (${task.label}) ${answers[i].trim()}`).join('\n')
    const reply = yield* ctx.llm('combine', 'combine', `CUSTOMER MESSAGE: ${ctx.message}\n\nSPECIALIST ANSWERS:\n${numbered}`, { temperature: 0.3, maxTokens: 400 })
    return { reply: reply.trim(), evidence: evidence.join('\n') }
  }

  static parsePlan(text: string, message: string): Task[] {
    const raw = firstJsonObject(text)?.tasks
    const tasks: Task[] = []
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const label = String((item as { label?: unknown })?.label ?? '').toLowerCase()
        const request = String((item as { request?: unknown })?.request ?? '').trim()
        if (LABELS.includes(label) && request && tasks.length < MAX_TASKS) tasks.push({ stage: `worker${tasks.length + 1}`, label, request })
      }
    }
    // A planner that returns nothing usable still gets the customer an answer: one worker takes the whole message.
    return tasks.length ? tasks : [{ stage: 'worker1', label: 'other', request: message }]
  }

  private async *worker(ctx: SupportContext, task: Task, evidence: string[]): AsyncGenerator<SupportEvent, string> {
    const context = this.contextFor(ctx, task)
    if (context) evidence.push(`${task.label}: ${context}`)
    const user = `SUB-REQUEST: ${task.request}\n\nCONTEXT FROM OUR SYSTEMS:\n${context || 'none'}`
    const options = { temperature: 0.3, maxTokens: 200 }
    if (task.label !== 'order') return yield* ctx.llm(task.stage, 'worker', user, options)
    // Order tasks may need the tool, so they run in the tool loop.
    const loop = ctx.services.toolLoop.run(task.stage, withSystem(ctx.prompt('worker'), user), ctx.signal, options)
    return yield* tap(loop, (event) => {
      if (event.type === 'tool_result') evidence.push(`order tool: ${event.result}`)
    })
  }

  /** Plain-code lookups that give a worker the facts it needs, so workers stay small and cheap. */
  private contextFor(ctx: SupportContext, task: Task): string {
    const { orders, products } = ctx.services
    if (task.label === 'complaint') {
      const order = orders.findInText(task.request) ?? orders.findInText(ctx.message)
      return order ? orders.describe(order) : 'No matching order was found in our system.'
    }
    if (task.label === 'product') {
      const found = products.search(task.request)
      return found.map((p) => `${products.describe(p)}\nReviews:\n${products.reviewsOf(p)}`).join('\n\n')
    }
    return ''
  }
}
