import { useSyncExternalStore } from 'react'
import { shopSession } from './shopSession'
import type { ShopSnapshot } from './types'

export function useShopDemo(): ShopSnapshot {
  return useSyncExternalStore(shopSession.subscribe, shopSession.getSnapshot)
}
