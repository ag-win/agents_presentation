import { LlmStreamClient } from './LlmStreamClient'
import { PhoneDemoSession } from './PhoneDemoSession'
import { ScriptedConversation } from './ScriptedConversation'
import { systemPromptStore } from './systemPrompt/sharedStore'

/** The birthday-chat session for the system-prompt slide: same chat, but each call gets the editable system prompt. */
export const systemDemoSession = new PhoneDemoSession(new LlmStreamClient(), ScriptedConversation.birthdaySpeech(), systemPromptStore)
