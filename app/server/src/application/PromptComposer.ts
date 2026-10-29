import { ChatMessage } from '../domain/ChatMessage.ts'
import type { Prompt } from '../domain/Prompt.ts'
import type { SystemPrompt } from '../domain/SystemPrompt.ts'

const SYSTEM_PROMPT = [
  'You are an AI assistant inside a group chat app.',
  'Answer the request directly and briefly, in plain text: no markdown, no lists, no emoji.',
  'You have no tools, no internet access and no memory of earlier messages.',
  'If a request needs live information or an action you cannot take, say so in one short sentence instead of guessing.',
].join(' ')

/**
 * Builds the exact messages for one single, non-augmented LLM call: a system prompt plus the user's text.
 * The system prompt is the built-in one unless the caller supplies its own (an empty one means none at all).
 */
export class PromptComposer {
  compose(prompt: Prompt, system?: SystemPrompt): ChatMessage[] {
    const user = ChatMessage.user(prompt.text)
    if (!system) return [ChatMessage.system(SYSTEM_PROMPT), user]
    return system.isEmpty ? [user] : [ChatMessage.system(system.text), user]
  }
}
