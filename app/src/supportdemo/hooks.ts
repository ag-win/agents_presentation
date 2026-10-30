import { useSyncExternalStore } from 'react'
import type { BenchSnapshot } from './SupportBench'
import type { SupportPromptState } from './SupportPromptStore'
import { supportBench, supportPrompts, supportSession } from './sharedSession'
import type { SupportSnapshot } from './types'

export function useSupport(): SupportSnapshot {
  return useSyncExternalStore(supportSession.subscribe, supportSession.getSnapshot)
}

export function useSupportPrompts(): SupportPromptState {
  return useSyncExternalStore(supportPrompts.subscribe, supportPrompts.getSnapshot)
}

export function useSupportBench(): BenchSnapshot {
  return useSyncExternalStore(supportBench.subscribe, supportBench.getSnapshot)
}
