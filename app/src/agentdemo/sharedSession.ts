import { AgentConfigStore } from './AgentConfigStore'
import { AgentSession } from './AgentSession'

/** The shared config store and session. Module scope means they outlive the overlay and the slide component. */
export const agentConfig = new AgentConfigStore()
export const agentSession = new AgentSession(agentConfig)
