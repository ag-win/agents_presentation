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
  /** How long a gate glows while it "thinks" (it is plain code, so this is only for show). */
  readonly gateDwellMs: number
  /** The long way round: a gate sending its reply straight to the output. */
  readonly bypassTravelMs: number

  constructor(factor: number) {
    const f = Math.max(1, factor)
    this.inputGlowMs = 300 * f
    this.promptTravelMs = 450 * f
    this.tokenTravelMs = 320 * f
    this.emitGapMs = 28 * f
    this.gateDwellMs = 700 * f
    this.bypassTravelMs = 1000 * f
  }
}
