import type { ReactNode } from 'react'

/**
 * Tiny SVG kit for workflow diagrams. Every diagram is authored in its own viewBox using
 * *centre* coordinates for nodes, and scales to whatever space the slide gives it.
 * Colours live in theme/tokens.css (--dg-*), so one edit re-themes every diagram.
 */

export type NodeKind = 'io' | 'llm' | 'logic' | 'neutral' | 'hot'
export type EdgeStyle = 'solid' | 'dashed' | 'dotted'
export type Tone = 'ink' | 'soft' | 'accent'
export type GroupTone = 'purple' | 'teal' | 'orange'

const TONES: Tone[] = ['ink', 'soft', 'accent']

export function Diagram({ w, h, label, children }: { w: number; h: number; label: string; children: ReactNode }) {
  return (
    <svg className="dg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
      <defs>
        {TONES.map((t) => (
          <marker key={t} id={`dg-ah-${t}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="4.6" markerHeight="4.6" orient="auto-start-reverse">
            <path className={`dg-ah-${t}`} d="M0,0 L10,5 L0,10 L2.6,5 Z" />
          </marker>
        ))}
      </defs>
      {children}
    </svg>
  )
}

/** Multi-line text centred on (x, y). */
function Lines({ x, y, lines, size, className }: { x: number; y: number; lines: string | string[]; size: number; className?: string }) {
  const L = Array.isArray(lines) ? lines : [lines]
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={size} className={className}>
      {L.map((t, i) => (
        <tspan key={i} x={x} dy={i === 0 ? `${0.35 - (L.length - 1) * 0.6}em` : '1.2em'}>{t}</tspan>
      ))}
    </text>
  )
}

export function Node({ x, y, w, h, kind, lines, size = 24, strong }: {
  x: number; y: number; w: number; h: number; kind: NodeKind; lines: string | string[]; size?: number; strong?: boolean
}) {
  const rx = kind === 'io' ? h / 2.3 : 4
  return (
    <g className={`dg-node dg-node--${kind}${strong ? ' is-strong' : ''}`}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={rx} />
      <Lines x={x} y={y} lines={lines} size={size} />
    </g>
  )
}

export function Edge({ d, style = 'solid', tone, both }: { d: string; style?: EdgeStyle; tone?: Tone; both?: boolean }) {
  const t = tone ?? (style === 'dotted' ? 'soft' : 'ink')
  return (
    <path
      d={d}
      className={`dg-edge dg-edge--${t}${style !== 'solid' ? ` dg-edge--${style}` : ''}`}
      markerEnd={`url(#dg-ah-${t})`}
      markerStart={both ? `url(#dg-ah-${t})` : undefined}
    />
  )
}

/** Straight segment path. */
export const line = (x1: number, y1: number, x2: number, y2: number) => `M ${x1} ${y1} L ${x2} ${y2}`
/** S-curve with horizontal tangents at both ends (left-to-right flows). */
export const curve = (x1: number, y1: number, x2: number, y2: number) => {
  const m = (x1 + x2) / 2
  return `M ${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`
}
/** S-curve with vertical tangents (top-to-bottom flows). */
export const curveV = (x1: number, y1: number, x2: number, y2: number) => {
  const m = (y1 + y2) / 2
  return `M ${x1} ${y1} C ${x1} ${m}, ${x2} ${m}, ${x2} ${y2}`
}

export function Label({ x, y, lines, size = 18 }: { x: number; y: number; lines: string | string[]; size?: number }) {
  return <Lines x={x} y={y} lines={lines} size={size} className="dg-label" />
}

export function Group({ x, y, w, h, title, tone, titleY, titleSize = 26, solid }: {
  x: number; y: number; w: number; h: number; title: string; tone: GroupTone; titleY?: number; titleSize?: number; solid?: boolean
}) {
  return (
    <g className={`dg-group dg-group--${tone}${solid ? ' dg-group--solid' : ''}`}>
      <rect x={x} y={y} width={w} height={h} rx={28} />
      <text x={x + w / 2} y={titleY ?? y - 16} textAnchor="middle" fontSize={titleSize}>{title}</text>
    </g>
  )
}
