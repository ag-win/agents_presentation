import { ProviderStore } from './ProviderStore'

/** The one shared store, so every demo's Backup button shows and changes the same selection. */
export const providers = new ProviderStore()
