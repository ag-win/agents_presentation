import type { LaneId, NodeId } from './types'

export interface Box {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface Lane {
  readonly id: LaneId
  /** SVG path in the pipeline's own coordinate space. Dots follow the same path. */
  readonly d: string
  readonly dashed: boolean
}

/** Fixed geometry of the pipeline panel (px). Boxes are absolutely placed so lanes and dots line up exactly. */
export class PipelineLayout {
  static readonly width = 820
  static readonly height = 908

  static readonly boxes: Readonly<Record<NodeId, Box>> = {
    input: { x: 110, y: 0, w: 600, h: 96 },
    extract: { x: 110, y: 136, w: 600, h: 120 },
    gate: { x: 110, y: 296, w: 600, h: 112 },
    draft: { x: 110, y: 448, w: 600, h: 120 },
    polish: { x: 110, y: 608, w: 600, h: 120 },
    output: { x: 110, y: 768, w: 600, h: 140 },
  }

  private static readonly cx = 410

  private static down(from: NodeId, to: NodeId): string {
    const a = PipelineLayout.boxes[from]
    const b = PipelineLayout.boxes[to]
    return `M ${PipelineLayout.cx} ${a.y + a.h} L ${PipelineLayout.cx} ${b.y}`
  }

  static readonly lanes: readonly Lane[] = (() => {
    const gate = PipelineLayout.boxes.gate
    const out = PipelineLayout.boxes.output
    const bypassX = 764
    return [
      { id: 'in-extract', d: PipelineLayout.down('input', 'extract'), dashed: false },
      { id: 'extract-gate', d: PipelineLayout.down('extract', 'gate'), dashed: false },
      { id: 'gate-draft', d: PipelineLayout.down('gate', 'draft'), dashed: false },
      { id: 'draft-polish', d: PipelineLayout.down('draft', 'polish'), dashed: false },
      { id: 'polish-output', d: PipelineLayout.down('polish', 'output'), dashed: false },
      {
        id: 'gate-output',
        d: `M ${gate.x + gate.w} ${gate.y + gate.h / 2} L ${bypassX} ${gate.y + gate.h / 2} L ${bypassX} ${out.y + out.h / 2} L ${out.x + out.w} ${out.y + out.h / 2}`,
        dashed: true,
      },
    ]
  })()

  static lane(id: LaneId): Lane {
    return PipelineLayout.lanes.find((l) => l.id === id) as Lane
  }
}
