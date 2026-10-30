/**
 * A tiny arithmetic evaluator (numbers, + - * / % ^, brackets). Written by hand so a model can never run code:
 * anything that is not arithmetic is rejected.
 */
export class Calculator {
  static evaluate(expression: string): number {
    const parser = new Calculator(expression)
    const value = parser.expression()
    parser.skipSpace()
    if (parser.pos < parser.text.length) throw new Error(`Unexpected "${parser.text[parser.pos]}"`)
    if (!Number.isFinite(value)) throw new Error('The result is not a finite number')
    return value
  }

  /** Readable output: no floating-point dust (0.1 + 0.2 is 0.3). */
  static format(value: number): string {
    return String(Number(value.toPrecision(12)))
  }

  private readonly text: string
  private pos = 0

  private constructor(text: string) {
    this.text = text.replace(/[x×]/g, '*').replace(/÷/g, '/').replace(/,/g, '')
  }

  private skipSpace(): void {
    while (this.text[this.pos] === ' ') this.pos++
  }

  private take(char: string): boolean {
    this.skipSpace()
    if (this.text[this.pos] !== char) return false
    this.pos++
    return true
  }

  private expression(): number {
    let value = this.term()
    for (;;) {
      if (this.take('+')) value += this.term()
      else if (this.take('-')) value -= this.term()
      else return value
    }
  }

  private term(): number {
    let value = this.power()
    for (;;) {
      if (this.take('*')) value *= this.power()
      else if (this.take('/')) {
        const divisor = this.power()
        if (divisor === 0) throw new Error('Division by zero')
        value /= divisor
      } else if (this.take('%')) value %= this.power()
      else return value
    }
  }

  private power(): number {
    const base = this.unary()
    return this.take('^') ? Math.pow(base, this.power()) : base
  }

  private unary(): number {
    if (this.take('-')) return -this.unary()
    if (this.take('+')) return this.unary()
    return this.primary()
  }

  private primary(): number {
    if (this.take('(')) {
      const value = this.expression()
      if (!this.take(')')) throw new Error('Missing closing bracket')
      return value
    }
    this.skipSpace()
    const match = /^\d+(\.\d+)?|^\.\d+/.exec(this.text.slice(this.pos))
    if (!match) throw new Error(this.pos >= this.text.length ? 'The expression ends too soon' : `Unexpected "${this.text[this.pos]}"`)
    this.pos += match[0].length
    return Number(match[0])
  }
}
