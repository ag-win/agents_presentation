export interface Box {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface Lane {
  readonly id: string
  /** SVG path in the pipeline's own coordinates; dots follow the same path. */
  readonly d: string
  readonly length: number
}

/**
 * Geometry of the routing pipeline, computed (not measured) from how many specialists there are.
 * The system-prompt dropdown has its own fixed area below the Output box, so opening it never moves a lane.
 */
export class RouterLayout {
  static readonly width = 788
  static readonly panelHeight = 282
  /** How far left of the pipeline the search-results box's right edge sits. */
  static readonly asideGap = 40

  readonly boxes: Readonly<Record<string, Box>>
  /** Where the system-prompt dropdown opens. */
  readonly panel: Box
  readonly lanes: readonly Lane[]
  readonly height: number
  /** Thin structure lines (always drawn), as SVG path strings. */
  readonly structure: readonly string[]
  /** y of the point where the search-results line meets a specialist's lane. */
  readonly attachY: number

  private readonly cx = RouterLayout.width / 2
  private readonly routerBottom: number
  private readonly busY: number
  private readonly branchX: Readonly<Record<string, number>>

  constructor(specialistIds: readonly string[]) {
    const W = RouterLayout.width
    const cx = this.cx
    const PH = RouterLayout.panelHeight
    const n = specialistIds.length

    const input: Box = { x: 94, y: 0, w: 600, h: 88 }
    const router: Box = { x: 94, y: 132, w: 600, h: 128 }
    const routerBottom = router.y + router.h
    const busY = routerBottom + 38
    const specTop = routerBottom + 76
    const specH = 112
    const specBottom = specTop + specH

    const boxW = (W - (n - 1) * 14) / n
    const boxes: Record<string, Box> = { input, router }
    const branchX: Record<string, number> = {}
    specialistIds.forEach((id, i) => {
      boxes[id] = { x: i * (boxW + 14), y: specTop, w: boxW, h: specH }
      branchX[id] = i * (boxW + 14) + boxW / 2
    })

    const outBusY = specBottom + 38
    const outTop = specBottom + 76
    boxes.output = { x: 94, y: outTop, w: 600, h: 140 }

    this.boxes = boxes
    this.routerBottom = routerBottom
    this.busY = busY
    this.branchX = branchX
    this.attachY = busY + (specTop - busY) / 2
    this.panel = { x: 0, y: outTop + 140 + 14, w: W, h: PH }
    this.height = this.panel.y + PH

    const xs = specialistIds.map((id) => branchX[id])
    const first = Math.min(...xs)
    const last = Math.max(...xs)
    const lanes: Lane[] = [
      RouterLayout.lane('in-router', [[cx, input.y + input.h], [cx, router.y]]),
      RouterLayout.lane('router-bus', [[cx, routerBottom], [cx, busY]]),
    ]
    const structure = [
      `M ${cx} ${input.y + input.h} L ${cx} ${router.y}`,
      `M ${cx} ${routerBottom} L ${cx} ${busY}`,
      `M ${first} ${busY} L ${last} ${busY}`,
      `M ${first} ${outBusY} L ${last} ${outBusY}`,
      `M ${cx} ${outBusY} L ${cx} ${outTop}`,
    ]
    for (const id of specialistIds) {
      const bx = branchX[id]
      lanes.push(RouterLayout.lane(`route-${id}`, [[cx, routerBottom], [cx, busY], [bx, busY], [bx, specTop]]))
      lanes.push(RouterLayout.lane(`out-${id}`, [[bx, specBottom], [bx, outBusY], [cx, outBusY], [cx, outTop]]))
      lanes.push(RouterLayout.lane(`ctx-${id}`, [[-RouterLayout.asideGap, this.attachY], [bx, this.attachY]]))
      structure.push(`M ${bx} ${busY} L ${bx} ${specTop}`, `M ${bx} ${specBottom} L ${bx} ${outBusY}`)
    }
    this.lanes = lanes
    this.structure = structure
  }

  private static lane(id: string, points: readonly (readonly [number, number])[]): Lane {
    let length = 0
    for (let i = 1; i < points.length; i++) length += Math.abs(points[i][0] - points[i - 1][0]) + Math.abs(points[i][1] - points[i - 1][1])
    return { id, d: points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' '), length }
  }

  lane(id: string): Lane {
    const found = this.lanes.find((l) => l.id === id)
    if (!found) throw new Error(`no lane "${id}"`)
    return found
  }

  /** How far along the router's path to a specialist the search-results line joins it (0 to 1). */
  attachFraction(specialistId: string): number {
    const total = this.lane(`route-${specialistId}`).length
    const toAttach = this.busY - this.routerBottom + Math.abs(this.branchX[specialistId] - this.cx) + (this.attachY - this.busY)
    return toAttach / total
  }
}
