export type NodeKind = 'io' | 'llm' | 'code' | 'tool' | 'human'

export interface NodeSpec {
  readonly id: string
  readonly label: string
  readonly kind: NodeKind
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** The branch this box belongs to (null = shared by every message). */
  readonly branch: string | null
  /** The system prompt this box uses (LLM boxes only). */
  readonly promptId?: string
  /** One plain sentence about what the box does, shown in the inspector. */
  readonly blurb: string
}

export interface CardSpec {
  readonly branch: string
  readonly title: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface EdgeSpec {
  readonly id: string
  readonly from: string
  readonly to: string
  /** SVG path in board coordinates; dots follow the same path. */
  readonly d: string
  /** False for return legs and bypass routes, which only carry dots. */
  readonly visible: boolean
}

const NODE_H = 44
const CARD_PAD = 14
const CARD_GAP = 18
const CARD_TOP = 112
const LEVEL = [146, 216, 286, 356]
const CHANNEL_Y = 446

interface Column {
  readonly branch: string
  readonly title: string
  readonly w: number
}

const COLUMNS: readonly Column[] = [
  { branch: 'complaint', title: 'Prompt chain', w: 232 },
  { branch: 'order', title: 'Tool call', w: 230 },
  { branch: 'product', title: 'Parallel', w: 262 },
  { branch: 'multi', title: 'Orchestrator-workers', w: 384 },
  { branch: 'feedback', title: 'Simple reply', w: 200 },
  { branch: 'escalate', title: 'Human in the loop', w: 212 },
  { branch: 'other', title: 'Simple reply', w: 170 },
]

/**
 * Geometry of the support-desk board, computed (never measured) so lines, dots and boxes always agree.
 * Flow: Message -> Guard -> Router across the top, seven branch cards in a row, then Quality check and the Reply.
 */
export class SupportLayout {
  static readonly width = 1808
  static readonly height = 612

  readonly nodes: readonly NodeSpec[]
  readonly cards: readonly CardSpec[]
  readonly edges: readonly EdgeSpec[]

  private readonly byNode: Readonly<Record<string, NodeSpec>>
  private readonly byEdge: Readonly<Record<string, EdgeSpec>>

  constructor() {
    const nodes: NodeSpec[] = []
    const cards: CardSpec[] = []
    const add = (n: NodeSpec) => { nodes.push(n) }

    // ---- shared top row, centred over the orchestrator card ----
    const xs: number[] = []
    let cursor = 5
    for (const c of COLUMNS) { xs.push(cursor); cursor += c.w + CARD_GAP }
    const mid = xs[3] + COLUMNS[3].w / 2
    add({ id: 'input', label: 'Message', kind: 'io', x: mid - 75 - 400, y: 30, w: 150, h: NODE_H, branch: null, blurb: "The customer's message arrives in the support inbox." })
    add({ id: 'guard', label: 'Guard', kind: 'llm', x: mid - 75 - 200, y: 30, w: 150, h: NODE_H, branch: null, promptId: 'guard', blurb: 'A small model screens the message. Normal messages pass; tricks and abuse are blocked before anything else runs.' })
    add({ id: 'router', label: 'Router', kind: 'llm', x: mid - 75, y: 30, w: 150, h: NODE_H, branch: null, promptId: 'router', blurb: 'Reads the message and picks exactly one path (or "multi" when there is more than one request).' })

    // ---- branch cards ----
    const llm = (id: string, label: string, branch: string | null, x: number, y: number, w: number, blurb: string, promptId = id): NodeSpec =>
      ({ id, label, kind: 'llm', x, y, w, h: NODE_H, branch, promptId, blurb })
    const code = (id: string, label: string, branch: string, x: number, y: number, w: number, blurb: string): NodeSpec =>
      ({ id, label, kind: 'code', x, y, w, h: NODE_H, branch, blurb })
    const card = (i: number, depth: number) => {
      const c = COLUMNS[i]
      cards.push({ branch: c.branch, title: c.title, x: xs[i], y: CARD_TOP, w: c.w, h: LEVEL[depth] + NODE_H + 18 - CARD_TOP })
    }

    // complaint: facts -> gate (code) -> draft -> polish
    let x = xs[0] + CARD_PAD, w = COLUMNS[0].w - 2 * CARD_PAD
    add(llm('facts', 'Extract facts', 'complaint', x, LEVEL[0], w, 'Pulls the order number, product and problem out of the message as JSON.'))
    add(code('gate', 'Gate (code)', 'complaint', x, LEVEL[1], w, 'Plain code, no model: is there an order number, and is it in the database? If not, a fixed message asks for it.'))
    add(llm('draft', 'Draft reply', 'complaint', x, LEVEL[2], w, 'Writes the reply from the facts and the order record, following the 14-day policy.'))
    add(llm('polish', 'Polish tone', 'complaint', x, LEVEL[3], w, 'Rewrites the draft to be warm and calm without changing any decision.'))
    card(0, 3)

    // order: LLM that may call the tool
    x = xs[1] + CARD_PAD; w = COLUMNS[1].w - 2 * CARD_PAD
    add(llm('order', 'Order status', 'order', x, LEVEL[0], w, 'Decides whether to call the order-status tool. If it does, it reads the result and explains it in plain words.'))
    add({ id: 'tool', label: 'Order tool', kind: 'tool', x, y: LEVEL[1], w: 140, h: NODE_H, branch: 'order', blurb: 'get_order_status: a function in our app. The model only asks for it; the harness runs it and hands the result back.' })
    card(1, 1)

    // product: lookup (code) -> specs || reviews -> compare
    x = xs[2] + CARD_PAD; w = COLUMNS[2].w - 2 * CARD_PAD
    const half = (w - 12) / 2
    add(code('lookup', 'Lookup (code)', 'product', x, LEVEL[0], w, 'Plain code: finds the product(s) the customer means in the catalogue.'))
    add(llm('specs', 'Specs', 'product', x, LEVEL[1], half, 'Summarises the product specifications for the customer\'s question.'))
    add(llm('reviews', 'Reviews', 'product', x + half + 12, LEVEL[1], half, 'Summarises customer reviews. Runs at the same time as Specs.'))
    add(llm('compare', 'Compare', 'product', x, LEVEL[2], w, 'Combines the two summaries into one honest answer.'))
    card(2, 2)

    // multi: planner -> three workers in parallel -> combine
    x = xs[3] + CARD_PAD; w = COLUMNS[3].w - 2 * CARD_PAD
    const third = (w - 24) / 3
    add(llm('planner', 'Planner', 'multi', x, LEVEL[0], w, 'The orchestrator: splits the message into separate tasks at run time (up to three).'))
    for (let i = 0; i < 3; i++) {
      add(llm(`worker${i + 1}`, `Worker ${i + 1}`, 'multi', x + i * (third + 12), LEVEL[1], third, 'Handles one task from the planner. It can call the order tool too. If the planner gave it no task it stays idle.', 'worker'))
    }
    add(llm('combine', 'Combine', 'multi', x, LEVEL[2], w, 'Merges the workers\' answers into one reply to the customer.'))
    card(3, 2)

    // feedback: thank-you -> log (code)
    x = xs[4] + CARD_PAD; w = COLUMNS[4].w - 2 * CARD_PAD
    add(llm('feedback', 'Thank you', 'feedback', x, LEVEL[0], w, 'Thanks the customer; for praise it invites a product review.'))
    add(code('log', 'File note (code)', 'feedback', x, LEVEL[1], w, 'Plain code: files the note on the product team\'s feedback board.'))
    card(4, 1)

    // escalate: notes + holding reply -> human approval
    x = xs[5] + CARD_PAD; w = COLUMNS[5].w - 2 * CARD_PAD
    add(llm('escalation', 'Escalation', 'escalate', x, LEVEL[0], w, 'Writes case notes for a person and a calm holding reply. It sends nothing itself.'))
    add({ id: 'human', label: 'Human approves', kind: 'human', x, y: LEVEL[1], w, h: NODE_H, branch: 'escalate', blurb: 'A person reads the notes and must press Approve before the reply is sent.' })
    card(5, 1)

    // other
    x = xs[6] + CARD_PAD; w = COLUMNS[6].w - 2 * CARD_PAD
    add(llm('other', 'General help', 'other', x, LEVEL[0], w, 'Answers general questions (hours, delivery) from the shop policy, and politely declines off-topic requests.'))
    card(6, 0)

    // ---- shared bottom: quality loop and the reply ----
    add(llm('quality', 'Quality check', null, 720, 480, 170, 'Evaluator: grades the reply against the facts and policy. A fail triggers one revision.'))
    add(llm('revise', 'Revise', null, 720, 556, 170, 'Optimizer: rewrites the reply using the checker\'s feedback.'))
    add({ id: 'output', label: 'Reply', kind: 'io', x: 1090, y: 440, w: 700, h: 124, branch: null, blurb: 'The reply that would be sent to the customer.' })

    this.nodes = nodes
    this.cards = cards
    this.byNode = Object.fromEntries(this.nodes.map((n) => [n.id, n]))

    const edges: EdgeSpec[] = []
    const link = (from: string, to: string, opts: { fa?: number; ta?: number; visible?: boolean; d?: string } = {}) => {
      const a = this.byNode[from], b = this.byNode[to]
      edges.push({ id: `${from}>${to}`, from, to, visible: opts.visible ?? true, d: opts.d ?? SupportLayout.path(a, b, opts.fa ?? 0.5, opts.ta ?? 0.5) })
    }
    link('input', 'guard'); link('guard', 'router')
    for (const first of ['facts', 'order', 'lookup', 'planner', 'feedback', 'escalation', 'other']) link('router', first)
    link('facts', 'gate'); link('gate', 'draft'); link('draft', 'polish'); link('polish', 'quality')
    link('order', 'tool', { fa: 0.35 }); link('tool', 'order', { ta: 0.35, visible: false }); link('order', 'quality', { fa: 0.88 })
    link('lookup', 'specs', { ta: 0.5 }); link('lookup', 'reviews'); link('specs', 'compare'); link('reviews', 'compare'); link('compare', 'quality')
    for (let i = 1; i <= 3; i++) { link('planner', `worker${i}`); link(`worker${i}`, 'combine') }
    link('combine', 'quality')
    link('feedback', 'log'); link('log', 'quality')
    link('escalation', 'human')
    link('other', 'quality')
    link('quality', 'revise'); link('quality', 'output'); link('revise', 'output', { d: SupportLayout.side(this.byNode.revise, this.byNode.output) })

    // Bypass routes (only dots travel on them): a fixed reply that skips the quality check goes straight to the Reply.
    const out = this.byNode.output
    const channel = (id: string) => {
      const n = this.byNode[id]
      return `M ${n.x + n.w / 2} ${n.y + n.h} V ${CHANNEL_Y} H ${out.x + out.w / 2} V ${out.y}`
    }
    for (const id of ['gate', 'lookup', 'human']) link(id, 'output', { visible: false, d: channel(id) })
    const g = this.byNode.guard
    link('guard', 'output', { visible: false, d: `M ${g.x + g.w / 2} ${g.y} V 8 H ${SupportLayout.width - 6} V ${out.y + out.h / 2} H ${out.x + out.w}` })

    this.edges = edges
    this.byEdge = Object.fromEntries(edges.map((e) => [e.id, e]))
  }

  node(id: string): NodeSpec {
    return this.byNode[id]
  }

  edge(id: string): EdgeSpec | undefined {
    return this.byEdge[id]
  }

  edgesInto(id: string): EdgeSpec[] {
    return this.edges.filter((e) => e.to === id)
  }

  /** The prompt a box edits, or null for boxes that have none. */
  promptOf(id: string): string | null {
    return this.byNode[id]?.promptId ?? null
  }

  private static path(a: NodeSpec, b: NodeSpec, fa: number, ta: number): string {
    const ay = a.y + a.h / 2, by = b.y + b.h / 2
    if (Math.abs(ay - by) < 2 && b.x > a.x + a.w) return `M ${a.x + a.w} ${ay} L ${b.x} ${by}`
    const x1 = a.x + a.w * fa, x2 = b.x + b.w * ta
    const y1 = b.y >= a.y ? a.y + a.h : a.y
    const y2 = b.y >= a.y ? b.y : b.y + b.h
    let dy = (y2 - y1) / 2
    if (Math.abs(dy) < 18) dy = dy < 0 ? -18 : 18
    return `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`
  }

  private static side(a: NodeSpec, b: NodeSpec): string {
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2
    const dx = (x2 - x1) / 2
    return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
  }
}
