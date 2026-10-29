import { ShopDemoSession } from './ShopDemoSession'

/** The one shared session. Module scope means it outlives the overlay and the slide component. */
export const shopSession = new ShopDemoSession()
