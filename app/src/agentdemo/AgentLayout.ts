import type { AgentInfo, GraphNode, ToolCategory, ToolInfo } from './types'

export interface Rect {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

export interface PaletteBox extends Rect {
  readonly name: string
  readonly label: string
  readonly category: ToolCategory
}

export interface PaletteGroup extends Rect {
  readonly category: ToolCategory
  readonly title: string
}

export interface AgentEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly d: string
  readonly visible: boolean
}

export interface SubAgentCard extends Rect {
  readonly agent: string
  readonly title: string
}

export interface Laid {
  readonly palette: readonly PaletteBox[]
  readonly groups: readonly PaletteGroup[]
  readonly rects: Readonly<Record<string, Rect>>
  readonly edges: readonly AgentEdge[]
  readonly cards: readonly SubAgentCard[]
  /** Where the tool signatures join the prompt on its way into the first LLM call. */
  readonly merge: { readonly x: number; readonly y: number }
  /** True until the first LLM call exists: the board shows faint placeholders. */
  readonly ghost: boolean
  readonly width: number
  readonly height: number
}

const ROOT_Y = 230
const INPUT: Rect = { x: 290, y: ROOT_Y - 28, w: 130, h: 56 }
const MERGE = { x: 480, y: ROOT_Y }
const LLM1_X = 540
const LLM_W = 170
const LLM_H = 56
const GAP = 70
const CALL_W = 210
const TOOL_H = 56
const TOOL_PITCH = 66
const OUT: { w: number; h: number } = { w: 380, h: 120 }
const PAL = { x: 0, w: 200, boxX: 10, boxW: 180, boxH: 36, pitch: 40, top: 22, bottom: 10, gap: 14, busX: 214, trunkY: ROOT_Y + 90 }

const CATEGORIES: readonly { category: ToolCategory; title: string }[] = [
  { category: 'shop', title: 'ShopEase' },
  { category: 'web', title: 'Web & data' },
  { category: 'files', title: 'Files' },
  { category: 'agents', title: 'Agents' },
]

const halfStack = (calls: number): number => Math.max(TOOL_H / 2, (calls * TOOL_PITCH - (TOOL_PITCH - TOOL_H)) / 2)

/** A smooth left-to-right line between two boxes. */
function link(a: Rect, b: Rect): string {
  const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + b.h / 2
  const dx = Math.max(30, (x2 - x1) / 2)
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}

/**
 * Where every box goes. Pure: it takes the boxes the model has created so far and works out positions, so the board can
 * grow as the run goes on. Time runs left to right: an LLM call, then the tool calls it asked for stacked in the next
 * column, then the next LLM call. A sub-agent gets its own lane below, and the parent's next call waits to its right.
 */
export class AgentLayout {
  static compute(tools: readonly ToolInfo[], nodes: readonly GraphNode[], agents: readonly AgentInfo[], enabled: ReadonlySet<string>): Laid {
    // ---- the toolbox on the left ----
    const palette: PaletteBox[] = []
    const groups: PaletteGroup[] = []
    const rects: Record<string, Rect> = {}
    let y = 10
    for (const { category, title } of CATEGORIES) {
      const inGroup = tools.filter((t) => t.category === category)
      if (inGroup.length === 0) continue
      const h = PAL.top + inGroup.length * PAL.pitch - (PAL.pitch - PAL.boxH) + PAL.bottom
      groups.push({ category, title, x: PAL.x, y, w: PAL.w, h })
      inGroup.forEach((t, i) => {
        const box: PaletteBox = { name: t.name, label: t.label, category, x: PAL.boxX, y: y + PAL.top + i * PAL.pitch, w: PAL.boxW, h: PAL.boxH }
        palette.push(box)
        rects[`pal:${t.name}`] = box
      })
      y += h + PAL.gap
    }
    const paletteBottom = y - PAL.gap

    // ---- the boxes the model has created ----
    const llmsOf = (agent: string) => nodes.filter((n): n is Extract<GraphNode, { kind: 'llm' }> => n.kind === 'llm' && n.agent === agent).sort((a, b) => a.step - b.step)
    const toolsOf = (llm: string) => nodes.filter((n): n is Extract<GraphNode, { kind: 'tool' }> => n.kind === 'tool' && n.llm === llm).sort((a, b) => a.index - b.index)
    const childOf = (call: string) => agents.find((a) => a.parent === call)
    const callsOf = (l: Extract<GraphNode, { kind: 'llm' }>) => Math.max(l.calls ?? 0, toolsOf(l.id).length)
    const half = (agent: string) => llmsOf(agent).reduce((m, l) => Math.max(m, halfStack(callsOf(l))), halfStack(1))

    const root = agents.find((a) => a.parent === null)
    const rootId = root?.id ?? 'a0'
    let laneTop = ROOT_Y + half(rootId) + 56
    const agentRects: Record<string, string[]> = {}

    /** Lay out one agent's lane; returns the right-most x it uses. */
    const layoutAgent = (agent: string, x0: number, cy: number): number => {
      let x = x0
      let right = x0
      const ids: string[] = (agentRects[agent] = [])
      for (const llm of llmsOf(agent)) {
        rects[llm.id] = { x, y: cy - LLM_H / 2, w: LLM_W, h: LLM_H }
        ids.push(llm.id)
        const calls = toolsOf(llm.id)
        const n = callsOf(llm)
        const callsX = x + LLM_W + GAP
        calls.forEach((t) => {
          rects[t.id] = { x: callsX, y: cy + (t.index - 1 - (n - 1) / 2) * TOOL_PITCH - TOOL_H / 2, w: CALL_W, h: TOOL_H }
          ids.push(t.id)
        })
        right = Math.max(right, calls.length ? callsX + CALL_W : x + LLM_W)
        let next = callsX + CALL_W + GAP
        for (const t of calls) {
          const child = childOf(t.id)
          if (!child) continue
          const h = half(child.id)
          const lane = laneTop + h + 24
          laneTop += 2 * h + 24 * 2 + 12
          const extent = layoutAgent(child.id, next, lane)
          next = Math.max(next, extent + GAP)
          right = Math.max(right, extent)
        }
        x = next
      }
      return right
    }
    layoutAgent(rootId, LLM1_X, ROOT_Y)

    const ghost = llmsOf(rootId).length === 0
    const rootLlms = llmsOf(rootId)
    const finalLlm = rootLlms.find((l) => l.calls === 0)
    const hasOutput = nodes.some((n) => n.kind === 'output')
    if (ghost) {
      rects[`${rootId}.s1`] = { x: LLM1_X, y: ROOT_Y - LLM_H / 2, w: LLM_W, h: LLM_H }
      rects.output = { x: LLM1_X + LLM_W + GAP, y: ROOT_Y - OUT.h / 2, w: OUT.w, h: OUT.h }
    } else if (hasOutput && finalLlm) {
      const r = rects[finalLlm.id]
      rects.output = { x: r.x + LLM_W + GAP, y: ROOT_Y - OUT.h / 2, w: OUT.w, h: OUT.h }
    }
    rects.input = INPUT

    // ---- lines ----
    const edges: AgentEdge[] = []
    const add = (id: string, from: string, to: string, d: string, visible = true) => edges.push({ id, from, to, d, visible })
    const firstId = `${rootId}.s1`
    add(`input>${firstId}`, 'input', firstId, link(INPUT, rects[firstId]))
    for (const t of tools) {
      if (!enabled.has(t.name)) continue
      const b = rects[`pal:${t.name}`]
      const cy = b.y + b.h / 2
      add(`pal:${t.name}`, `pal:${t.name}`, 'merge', `M ${b.x + b.w} ${cy} L ${PAL.busX} ${cy} L ${PAL.busX} ${PAL.trunkY} L ${MERGE.x} ${PAL.trunkY} L ${MERGE.x} ${MERGE.y}`)
    }
    const lastOf = (agent: string) => llmsOf(agent).find((l) => l.calls === 0)
    for (const llm of nodes.filter((n): n is Extract<GraphNode, { kind: 'llm' }> => n.kind === 'llm')) {
      for (const t of toolsOf(llm.id)) {
        add(`${llm.id}>${t.id}`, llm.id, t.id, link(rects[llm.id], rects[t.id]))
        const child = childOf(t.id)
        const childFirst = child ? llmsOf(child.id)[0] : undefined
        if (child && childFirst) add(`${t.id}>${childFirst.id}`, t.id, childFirst.id, link(rects[t.id], rects[childFirst.id]))
      }
      const next = llmsOf(llm.agent).find((l) => l.step === llm.step + 1)
      if (next) {
        for (const t of toolsOf(llm.id)) {
          const child = childOf(t.id)
          const back = child ? lastOf(child.id) : undefined
          const source = back ?? t
          add(`${source.id}>${next.id}`, source.id, next.id, link(rects[source.id], rects[next.id]))
        }
      }
    }
    if (hasOutput && finalLlm) add(`${finalLlm.id}>output`, finalLlm.id, 'output', link(rects[finalLlm.id], rects.output))

    // ---- a dashed card around each sub-agent ----
    const cards: SubAgentCard[] = []
    for (const a of agents.filter((x) => x.parent !== null)) {
      const own = (agentRects[a.id] ?? []).map((id) => rects[id]).filter(Boolean)
      if (own.length === 0) continue
      const x = Math.min(...own.map((r) => r.x)) - 18, right = Math.max(...own.map((r) => r.x + r.w)) + 18
      const top = Math.min(...own.map((r) => r.y)) - 34, bottom = Math.max(...own.map((r) => r.y + r.h)) + 18
      cards.push({ agent: a.id, title: `Sub-agent ${a.order}`, x, y: top, w: right - x, h: bottom - top })
    }

    const all = [...Object.values(rects), ...cards, ...groups]
    const width = Math.max(1180, ...all.map((r) => r.x + r.w)) + 30
    const height = Math.max(paletteBottom + 30, ...all.map((r) => r.y + r.h)) + 30
    return { palette, groups, rects, edges, cards, merge: MERGE, ghost, width, height }
  }
}
