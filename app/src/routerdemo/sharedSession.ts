import { routerPrompts } from './promptStore'
import { RouterSession } from './RouterSession'

/** The one shared session. Module scope means it outlives the overlay and the slide component. */
export const routerSession = new RouterSession(routerPrompts)
