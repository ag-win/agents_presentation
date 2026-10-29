import { ChatMessage } from '../domain/ChatMessage.ts'
import type { Prompt } from '../domain/Prompt.ts'

const SYSTEM_PROMPT = [
  'You are an AI assistant inside a group chat app.',
  'Answer the request directly and briefly, in plain text: no markdown, no lists, no emoji.',
  'You have no tools, no internet access and no memory of earlier messages.',
  'If a request needs live information or an action you cannot take, say so in one short sentence instead of guessing.',
].join(' ')

/** Builds the exact messages for one single, non-augmented LLM call: a fixed system prompt plus the user's text. */
export class PromptComposer {
  compose(prompt: Prompt): ChatMessage[] {
    return [ChatMessage.system(SYSTEM_PROMPT), ChatMessage.user(prompt.text)]
  }
}
