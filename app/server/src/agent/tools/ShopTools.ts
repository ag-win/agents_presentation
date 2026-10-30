import type { ToolDefinition } from '../../domain/Tool.ts'
import type { OrderDatabase } from '../../shop/OrderDatabase.ts'
import { ShopClock } from '../../shop/ShopClock.ts'
import type { ProductCatalog } from '../../shop/ProductCatalog.ts'
import { SHOP_POLICY } from '../../support/ShopPolicy.ts'
import type { AgentEvent } from '../../domain/AgentEvent.ts'
import { SimpleTool, type AgentTool, type ToolCategory, type ToolRunContext } from '../AgentTool.ts'

const str = (value: unknown): string => (typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value))
const object = (properties: Record<string, unknown>, required: string[]) => ({ type: 'object', properties, required })

export class OrderStatusAgentTool extends SimpleTool {
  readonly category: ToolCategory = 'shop'
  readonly label = 'Order status'
  readonly definition: ToolDefinition = {
    name: 'get_order_status',
    description: 'Look up a ShopEase order: status, carrier, last scan, and expected or actual delivery date (with how many days ago it was delivered).',
    parameters: object({ order_id: { type: 'string', description: 'The order number, digits only, for example "4821".' } }, ['order_id']),
  }
  private readonly orders: OrderDatabase

  constructor(orders: OrderDatabase) {
    super()
    this.orders = orders
  }

  protected async execute(args: Readonly<Record<string, unknown>>): Promise<string> {
    const id = str(args.order_id)
    const order = this.orders.find(id)
    if (!order) return JSON.stringify({ error: `No order found with number ${id}` })
    return JSON.stringify({ order_id: order.id, product: order.product, price: order.price, status: order.status, carrier: order.carrier, last_scan: order.lastScan, shipped: order.shipped ?? null, expected_delivery: order.expected ?? null, delivered: order.delivered ?? null, delivered_days_ago: order.delivered ? ShopClock.daysSince(order.delivered) : null })
  }
}

export class ProductSpecsTool extends SimpleTool {
  readonly category: ToolCategory = 'shop'
  readonly label = 'Product specs'
  readonly definition: ToolDefinition = {
    name: 'find_product',
    description: 'Look up a ShopEase product by name and return its price and specifications. Call it once per product.',
    parameters: object({ query: { type: 'string', description: 'The product name, for example "Tecno Spark 20".' } }, ['query']),
  }
  private readonly products: ProductCatalog

  constructor(products: ProductCatalog) {
    super()
    this.products = products
  }

  protected async execute(args: Readonly<Record<string, unknown>>): Promise<string> {
    const found = this.products.search(str(args.query))[0]
    return found ? this.products.describe(found) : JSON.stringify({ error: `No product matched "${str(args.query)}"` })
  }
}

export class ProductReviewsTool extends SimpleTool {
  readonly category: ToolCategory = 'shop'
  readonly label = 'Reviews'
  readonly definition: ToolDefinition = {
    name: 'get_reviews',
    description: 'Get the customer reviews (score out of 5 and text) for a ShopEase product. Call it once per product.',
    parameters: object({ query: { type: 'string', description: 'The product name, for example "Sony WI-XB400".' } }, ['query']),
  }
  private readonly products: ProductCatalog

  constructor(products: ProductCatalog) {
    super()
    this.products = products
  }

  protected async execute(args: Readonly<Record<string, unknown>>): Promise<string> {
    const found = this.products.search(str(args.query))[0]
    return found ? `${found.name} reviews:\n${this.products.reviewsOf(found)}` : JSON.stringify({ error: `No product matched "${str(args.query)}"` })
  }
}

export class ShopPolicyTool extends SimpleTool {
  readonly category: ToolCategory = 'shop'
  readonly label = 'Shop policy'
  readonly definition: ToolDefinition = {
    name: 'get_policy',
    description: 'Get ShopEase\'s policy on refunds, replacements, delivery times and support hours. Check it before promising anything.',
    parameters: object({}, []),
  }

  protected async execute(): Promise<string> {
    return SHOP_POLICY
  }
}

export class FeedbackTool extends SimpleTool {
  readonly category: ToolCategory = 'shop'
  readonly label = 'File feedback'
  readonly definition: ToolDefinition = {
    name: 'file_feedback',
    description: 'File a customer\'s praise, review or suggestion on the product team\'s feedback board.',
    parameters: object({ note: { type: 'string', description: 'The feedback, in one or two sentences.' } }, ['note']),
  }

  protected async execute(args: Readonly<Record<string, unknown>>): Promise<string> {
    return `Saved to the product team's feedback board: "${str(args.note).slice(0, 200)}"`
  }
}

/**
 * Human in the loop: the model asks to hand the case to a person, and the run PAUSES until a human approves or declines
 * on screen. Only then does the tool return, so the model's next step depends on what the person decided.
 */
export class EscalateTool implements AgentTool {
  readonly category: ToolCategory = 'shop'
  readonly label = 'Escalate'
  readonly definition: ToolDefinition = {
    name: 'escalate_to_human',
    description: 'Hand the case to a human support agent, who must approve it first (this call waits for them). Use it for very angry customers, legal threats, payment or fraud problems, or when asked for a person. It sends nothing to the customer.',
    parameters: object({ summary: { type: 'string', description: 'Two short sentences for the human agent: what happened and how upset the customer is.' } }, ['summary']),
  }
  private cases = 1041

  async *run(args: Readonly<Record<string, unknown>>, ctx: ToolRunContext): AsyncGenerator<AgentEvent, string> {
    yield { type: 'approval_request', id: ctx.callId, summary: str(args.summary).slice(0, 400) }
    const approved = await ctx.waitForHuman()
    return approved
      ? `A human approved the escalation. Case ESC-${++this.cases} was created. Tell the customer a colleague will contact them personally. Promise nothing else.`
      : 'A human declined to take this case (or did not answer in time). Do not promise a callback. Apologise briefly, tell the customer you could not arrange it, and ask for any extra detail.'
  }
}
