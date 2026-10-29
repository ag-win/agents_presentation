/**
 * How long each visual step takes. The base values are "real time" (fast, like the real thing);
 * a slow-mo factor stretches all of them equally.
 */
export class Timings {
  readonly inputGlowMs: number
  readonly promptTravelMs: number
  readonly tokenTravelMs: number
  /** Minimum gap between two tokens leaving the LLM box. */
  readonly emitGapMs: number

  constructor(factor: number) {
    const f = Math.max(1, factor)
    this.inputGlowMs = 300 * f
    this.promptTravelMs = 450 * f
    this.tokenTravelMs = 320 * f
    this.emitGapMs = 28 * f
  }
}
