import { useSyncExternalStore } from 'react'
import type { AgentConfigState } from './AgentConfigStore'
import { agentConfig, agentSession } from './sharedSession'
import type { AgentSnapshot } from './types'

export function useAgent(): AgentSnapshot {
  return useSyncExternalStore(agentSession.subscribe, agentSession.getSnapshot)
}

export function useAgentConfig(): AgentConfigState {
  return useSyncExternalStore(agentConfig.subscribe, agentConfig.getSnapshot)
}
