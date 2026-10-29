import { useSyncExternalStore } from 'react'
import { routerSession } from './sharedSession'
import type { RouterSnapshot } from './types'

export function useRouter(): RouterSnapshot {
  return useSyncExternalStore(routerSession.subscribe, routerSession.getSnapshot)
}
