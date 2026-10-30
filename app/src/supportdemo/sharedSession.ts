import { SupportPromptStore } from './SupportPromptStore'
import { SupportSession } from './SupportSession'
import { SupportBench } from './SupportBench'

/** The shared prompt store, session and test bench. Module scope means they outlive the overlay and the slide component. */
export const supportPrompts = new SupportPromptStore()
export const supportSession = new SupportSession(supportPrompts)
export const supportBench = new SupportBench(supportPrompts)
