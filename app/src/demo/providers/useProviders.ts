import { useSyncExternalStore } from 'react'
import { providers } from './sharedProviders'
import type { ProviderState } from './ProviderStore'

export function useProviders(): ProviderState {
  return useSyncExternalStore(providers.subscribe, providers.getSnapshot)
}
