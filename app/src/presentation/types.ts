import type { ComponentType } from 'react'

/** Exported as `meta` from every slide file. */
export interface SlideMeta {
  /** Stable id, also the key into notes.ts. Keep it when reordering. */
  id: string
  /** Short name for the jump menu. */
  title: string
  /** Part of the 15-min condensed path; hidden by default (toggle with B). */
  backup?: boolean
  /** Safe to cut first when running long. */
  optional?: boolean
}

export interface SlideDef extends SlideMeta {
  Component: ComponentType
  notes: string[]
}
