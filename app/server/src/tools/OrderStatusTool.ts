import type { ToolDefinition } from '../domain/Tool.ts'
import type { OrderDatabase } from '../shop/OrderDatabase.ts'
import { ShopClock } from '../shop/ShopClock.ts'
import type { Tool } from './Tool.ts'

/** get_order_status(order_id): looks an order up in the shop's database and returns its status as JSON. */
export class OrderStatusTool implements Tool {
  readonly definition: ToolDefinition = {
    name: 'get_order_status',
    description: 'Look up the current status of a ShopEase order: status, carrier, last scan and expected or actual delivery date.',
    parameters: {
      type: 'object',
      properties: { order_id: { type: 'string', description: 'The order number, digits only, for example "4821".' } },
      required: ['order_id'],
    },
  }

  private readonly orders: OrderDatabase

  constructor(orders: OrderDatabase) {
    this.orders = orders
  }

  async execute(args: Readonly<Record<string, unknown>>): Promise<string> {
    const id = String(args.order_id ?? '')
    const order = this.orders.find(id)
    if (!order) return JSON.stringify({ error: `No order found with number ${id}` })
    return JSON.stringify({ order_id: order.id, product: order.product, status: order.status, carrier: order.carrier, last_scan: order.lastScan, shipped: order.shipped ?? null, expected_delivery: order.expected ?? null, delivered: order.delivered ?? null, delivered_days_ago: order.delivered ? ShopClock.daysSince(order.delivered) : null })
  }
}
