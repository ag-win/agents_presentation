import { useSyncExternalStore } from 'react'
import { routerPrompts } from './promptStore'
import type { RouterPromptState } from './RouterPromptStore'

export function usePrompts(): RouterPromptState {
  return useSyncExternalStore(routerPrompts.subscribe, routerPrompts.getSnapshot)
}
