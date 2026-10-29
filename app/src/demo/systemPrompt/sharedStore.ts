import { SystemPromptStore } from './SystemPromptStore'

/** The one shared store for the system-prompt demo (module scope, so it outlives the overlay). */
export const systemPromptStore = new SystemPromptStore()
