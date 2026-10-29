/**
 * Where a run gets its system prompt from. The run asks for it only when the prompt reaches the LLM, so
 * anything typed while the prompt is still on its way counts. `lock` freezes editing while the model answers.
 */
export interface SystemPromptSource {
  /** The text to send now. Empty means "send no system prompt". */
  current(): string
  lock(): void
  unlock(): void
}
