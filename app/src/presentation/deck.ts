import type { ComponentType } from 'react'
import { notes } from './notes'
import { addedNotes } from './notesAdded'
import type { SlideDef, SlideMeta } from './types'
import * as s01 from './slides/s01-title'
import * as s02 from './slides/s02-historically'
import * as s03 from './slides/s03-div-intro'
import * as s04 from './slides/s04-attention'
import * as s05 from './slides/s05-pretrain'
import * as s06 from './slides/s06-scaling'
import * as s07 from './slides/s07-instructgpt'
import * as s08 from './slides/s08-chatgpt'
import * as s09 from './slides/s09-backup-spine'
import * as s10 from './slides/s10-div-usecases'
import * as s11 from './slides/s11-adoption'
import * as s12 from './slides/s12-business'
import * as s13 from './slides/s13-agent-adoption'
import * as s14 from './slides/s14-backup-usecases'
import * as s15 from './slides/s15-div-agents'
import * as s15b from './slides/s15b-everyday-ai'
import * as s16 from './slides/s16-three-tiers'
import * as s17 from './slides/s17-augmented-llm'
import * as s18 from './slides/s18-div-design'
import * as s19 from './slides/s19-prompt-chaining'
import * as s19b from './slides/s19b-system-prompt'
import * as s20 from './slides/s20-routing'
import * as s21 from './slides/s21-parallelization'
import * as s22 from './slides/s22-orchestrator-workers'
import * as s23 from './slides/s23-evaluator-optimizer'
import * as s24 from './slides/s24-blend'
import * as s25 from './slides/s25-shopease-story'
import * as s26 from './slides/s26-shopease-architecture'
import * as s29 from './slides/s29-agent-loop'
import * as s30 from './slides/s30-demo-agent'
import * as s31 from './slides/s31-div-evidence'
import * as s32 from './slides/s32-swebench'
import * as s33 from './slides/s33-demo-claude-code'
import * as s34 from './slides/s34-computer-use'
import * as s35 from './slides/s35-div-when-not'
import * as s36 from './slides/s36-simplest'
import * as s37 from './slides/s37-div-mcp'
import * as s38 from './slides/s38-mcp'
import * as s39 from './slides/s39-div-qa'

function def(m: { meta: SlideMeta; default: ComponentType }): SlideDef {
  return { ...m.meta, Component: m.default, notes: [...(notes[m.meta.id] ?? []), ...(addedNotes[m.meta.id] ?? [])] }
}

/** The deck, in presentation order. Reorder, add or remove slides by editing this list. */
export const slides: SlideDef[] = [
  def(s01),
  def(s02),
  def(s03),
  def(s04),
  def(s05),
  def(s06),
  def(s07),
  def(s08),
  def(s09),
  def(s10),
  def(s11),
  def(s12),
  def(s13),
  def(s14),
  def(s15),
  def(s15b),
  def(s16),
  def(s17),
  def(s18),
  def(s19),
  def(s19b),
  def(s20),
  def(s21),
  def(s22),
  def(s23),
  def(s24),
  def(s25),
  def(s26),
  def(s29),
  def(s30),
  def(s31),
  def(s32),
  def(s33),
  def(s34),
  def(s35),
  def(s36),
  def(s37),
  def(s38),
  def(s39),
]
