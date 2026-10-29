import { useSyncExternalStore } from 'react'
import { systemPromptStore } from './sharedStore'
import type { SystemPromptState } from './SystemPromptStore'

export function useSystemPrompt(): SystemPromptState {
  return useSyncExternalStore(systemPromptStore.subscribe, systemPromptStore.getSnapshot)
}
