import { RouterPromptStore } from './RouterPromptStore'

/** The one shared store for the routing demo (module scope, so it outlives the overlay). */
export const routerPrompts = new RouterPromptStore()
