export type ProviderChoice = 'auto' | 'mock'

/** All settings in one immutable object, read once from the environment at startup. */
export class AppConfig {
  readonly host: string
  readonly port: number
  readonly provider: ProviderChoice
  readonly ollamaApiKey: string | undefined
  readonly ollamaBaseUrl: string
  readonly ollamaModel: string
  readonly temperature: number
  readonly maxTokens: number
  readonly maxPromptChars: number
  /** How many earlier chat turns the chain demo may send along with a new message. */
  readonly maxHistoryTurns: number
  readonly braveApiKey: string | undefined
  readonly braveBaseUrl: string
  readonly searchResultCount: number

  private constructor(values: {
    host: string
    port: number
    provider: ProviderChoice
    ollamaApiKey: string | undefined
    ollamaBaseUrl: string
    ollamaModel: string
    temperature: number
    maxTokens: number
    maxPromptChars: number
    maxHistoryTurns: number
    braveApiKey: string | undefined
    braveBaseUrl: string
    searchResultCount: number
  }) {
    this.host = values.host
    this.port = values.port
    this.provider = values.provider
    this.ollamaApiKey = values.ollamaApiKey
    this.ollamaBaseUrl = values.ollamaBaseUrl
    this.ollamaModel = values.ollamaModel
    this.temperature = values.temperature
    this.maxTokens = values.maxTokens
    this.maxPromptChars = values.maxPromptChars
    this.maxHistoryTurns = values.maxHistoryTurns
    this.braveApiKey = values.braveApiKey
    this.braveBaseUrl = values.braveBaseUrl
    this.searchResultCount = values.searchResultCount
  }

  static fromEnv(env: NodeJS.ProcessEnv): AppConfig {
    const key = env.OLLAMA_API_KEY?.trim()
    const braveKey = env.BRAVE_API_KEY?.trim()
    return new AppConfig({
      // Localhost only: the browser reaches us through the Vite proxy, so the API key never leaves this machine.
      host: env.HOST?.trim() || '127.0.0.1',
      port: Number(env.PORT) || 8787,
      provider: env.LLM_PROVIDER === 'mock' ? 'mock' : 'auto',
      ollamaApiKey: key ? key : undefined,
      ollamaBaseUrl: (env.OLLAMA_BASE_URL?.trim() || 'https://ollama.com').replace(/\/+$/, ''),
      ollamaModel: env.OLLAMA_MODEL?.trim() || 'gemma4:31b',
      temperature: 0.7,
      maxTokens: 300,
      maxPromptChars: 2000,
      maxHistoryTurns: 12,
      braveApiKey: braveKey ? braveKey : undefined,
      braveBaseUrl: (env.BRAVE_BASE_URL?.trim() || 'https://api.search.brave.com').replace(/\/+$/, ''),
      searchResultCount: 5,
    })
  }
}
