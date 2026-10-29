/** What the first LLM call pulled out of the conversation. Anything not clearly stated is null. */
export class Facts {
  readonly orderNumber: string | null
  readonly product: string | null
  readonly issue: string | null
  readonly request: string | null

  constructor(values: { orderNumber: string | null; product: string | null; issue: string | null; request: string | null }) {
    this.orderNumber = values.orderNumber
    this.product = values.product
    this.issue = values.issue
    this.request = values.request
  }

  static empty(): Facts {
    return new Facts({ orderNumber: null, product: null, issue: null, request: null })
  }

  toJSON(): Record<string, string | null> {
    return { orderNumber: this.orderNumber, product: this.product, issue: this.issue, request: this.request }
  }
}

const NOTHING = new Set(['', 'null', 'none', 'unknown', 'n/a', 'na', 'not provided', 'not stated'])

function clean(value: unknown): string | null {
  if (typeof value === 'number') return String(value)
  if (typeof value !== 'string') return null
  const text = value.trim()
  return NOTHING.has(text.toLowerCase()) ? null : text
}

/** Reads the model's JSON answer, tolerating code fences and chatter around the object. */
export class FactsParser {
  /** Returns null when no JSON object can be read at all. */
  static parse(text: string): Facts | null {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start < 0 || end <= start) return null
    try {
      const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
      return new Facts({
        orderNumber: clean(raw.orderNumber),
        product: clean(raw.product),
        issue: clean(raw.issue),
        request: clean(raw.request),
      })
    } catch {
      return null
    }
  }
}
