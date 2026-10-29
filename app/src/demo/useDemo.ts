import { useSyncExternalStore } from 'react'
import { demoSession } from './demoSession'
import type { PhoneDemoSession } from './PhoneDemoSession'
import type { DemoSnapshot } from './types'

/** Subscribe to a demo session's snapshot (the single-call demo's by default). */
export function useDemo(session: PhoneDemoSession = demoSession): DemoSnapshot {
  return useSyncExternalStore(session.subscribe, session.getSnapshot)
}
