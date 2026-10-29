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
  static readonly width = 960
  static readonly height = 938

  static readonly boxes: Readonly<Record<NodeId, Box>> = {
    input: { x: 100, y: 0, w: 760, h: 112 },
    extract: { x: 100, y: 142, w: 760, h: 132 },
    gate: { x: 100, y: 304, w: 760, h: 124 },
    draft: { x: 100, y: 458, w: 760, h: 132 },
    polish: { x: 100, y: 620, w: 760, h: 132 },
    output: { x: 100, y: 782, w: 760, h: 156 },
  }

  private static readonly cx = 480

  private static down(from: NodeId, to: NodeId): string {
    const a = PipelineLayout.boxes[from]
    const b = PipelineLayout.boxes[to]
    return `M ${PipelineLayout.cx} ${a.y + a.h} L ${PipelineLayout.cx} ${b.y}`
  }

  static readonly lanes: readonly Lane[] = (() => {
    const gate = PipelineLayout.boxes.gate
    const out = PipelineLayout.boxes.output
    const bypassX = 884
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
