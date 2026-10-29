import { PhoneDemoSession } from './PhoneDemoSession'

/** The one shared session. Module scope means it outlives the overlay and the slide component. */
export const demoSession = new PhoneDemoSession()
