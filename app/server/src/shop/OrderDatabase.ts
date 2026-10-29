import { ShopClock } from './ShopClock.ts'

export type OrderStatus = 'processing' | 'in_transit' | 'delivered' | 'delayed'

export interface OrderRecord {
  readonly id: string
  readonly customer: string
  readonly product: string
  readonly price: number
  readonly status: OrderStatus
  readonly placed: string
  readonly shipped?: string
  readonly delivered?: string
  readonly expected?: string
  readonly carrier: string
  readonly lastScan: string
}

const ORDERS: readonly OrderRecord[] = [
  { id: '4821', customer: 'Amara', product: 'Tecno Spark 20 smartphone', price: 139, status: 'delivered', placed: '2026-10-21', shipped: '2026-10-22', delivered: '2026-10-25', carrier: 'SwiftShip', lastScan: 'Delivered to the front door' },
  { id: '4822', customer: 'Daniel', product: 'Sony WI-XB400 wireless earphones', price: 59, status: 'in_transit', placed: '2026-10-27', shipped: '2026-10-28', expected: '2026-11-02', carrier: 'SwiftShip', lastScan: 'Departed the regional hub' },
  { id: '4823', customer: 'Chioma', product: 'Lenovo IdeaPad laptop', price: 499, status: 'delivered', placed: '2026-10-23', shipped: '2026-10-24', delivered: '2026-10-27', carrier: 'SwiftShip', lastScan: 'Delivered, signed for' },
  { id: '4824', customer: 'Tunde', product: 'Avia running shoes', price: 45, status: 'delivered', placed: '2026-10-10', shipped: '2026-10-11', delivered: '2026-10-15', carrier: 'SwiftShip', lastScan: 'Delivered to the front door' },
  { id: '4825', customer: 'Grace', product: 'Casio G-Shock DW-5600E', price: 99, status: 'delayed', placed: '2026-10-20', shipped: '2026-10-21', expected: '2026-10-27', carrier: 'SwiftShip', lastScan: 'Held at customs' },
  { id: '4826', customer: 'Samuel', product: 'Casio F-91W classic watch', price: 19, status: 'processing', placed: '2026-10-29', carrier: 'SwiftShip', lastScan: 'Order received, being packed' },
]

/** The shop's orders. In a real system this would be a database; here it is a fixed list so demos are repeatable. */
export class OrderDatabase {
  private readonly orders: readonly OrderRecord[]

  constructor(orders: readonly OrderRecord[] = ORDERS) {
    this.orders = orders
  }

  all(): readonly OrderRecord[] {
    return this.orders
  }

  find(id: string): OrderRecord | undefined {
    return this.orders.find((o) => o.id === id.replace(/\D/g, ''))
  }

  /** The first order number mentioned in a piece of text that exists in the database. */
  findInText(text: string): OrderRecord | undefined {
    for (const m of text.matchAll(/\b(\d{4})\b/g)) {
      const order = this.find(m[1])
      if (order) return order
    }
    return undefined
  }

  /** The order as plain text for a model, including how long ago it was delivered and whether the 14-day window is open. */
  describe(order: OrderRecord): string {
    const lines = [`Order ${order.id} for ${order.customer}: ${order.product}, $${order.price}. Status: ${order.status.replace('_', ' ')}. Carrier ${order.carrier}, last scan: ${order.lastScan}.`]
    if (order.delivered) {
      const days = ShopClock.daysSince(order.delivered)
      lines.push(`Delivered ${order.delivered} (${days} days ago). ${days <= 14 ? 'Still inside' : 'Outside'} the 14-day refund and replacement window.`)
    }
    if (order.expected && !order.delivered) lines.push(`Expected delivery: ${order.expected}.`)
    return lines.join(' ')
  }
}
