import { useSyncExternalStore } from 'react'
import { demoSession } from './demoSession'
import type { DemoSnapshot } from './types'

export function useDemo(): DemoSnapshot {
  return useSyncExternalStore(demoSession.subscribe, demoSession.getSnapshot)
}
