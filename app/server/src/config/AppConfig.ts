/** Which model to start with. 'auto' picks the first one that is configured (Ollama, then Bedrock, then the offline mock). */
export type LlmPreference = 'auto' | 'ollama' | 'bedrock' | 'mock'

/** All settings in one immutable object, read once from the environment at startup. */
const LLM_CHOICES: readonly string[] = ['ollama', 'bedrock', 'mock']

export class AppConfig {
  readonly host: string
  readonly port: number
  readonly llmPreference: LlmPreference
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
  readonly awsRegion: string
  /** A Bedrock API key (sent as a bearer token), or undefined. */
  readonly awsBearerToken: string | undefined
  readonly awsAccessKeyId: string | undefined
  readonly awsSecretAccessKey: string | undefined
  readonly awsSessionToken: string | undefined
  readonly bedrockModel: string

  private constructor(values: {
    host: string
    port: number
    llmPreference: LlmPreference
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
    awsRegion: string
    awsBearerToken: string | undefined
    awsAccessKeyId: string | undefined
    awsSecretAccessKey: string | undefined
    awsSessionToken: string | undefined
    bedrockModel: string
  }) {
    this.host = values.host
    this.port = values.port
    this.llmPreference = values.llmPreference
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
    this.awsRegion = values.awsRegion
    this.awsBearerToken = values.awsBearerToken
    this.awsAccessKeyId = values.awsAccessKeyId
    this.awsSecretAccessKey = values.awsSecretAccessKey
    this.awsSessionToken = values.awsSessionToken
    this.bedrockModel = values.bedrockModel
  }

  /** True when Bedrock credentials are present (an API key, or an access key pair). */
  get hasBedrockCredentials(): boolean {
    return Boolean(this.awsBearerToken || (this.awsAccessKeyId && this.awsSecretAccessKey))
  }

  static fromEnv(env: NodeJS.ProcessEnv): AppConfig {
    const key = env.OLLAMA_API_KEY?.trim()
    const braveKey = env.BRAVE_API_KEY?.trim()
    return new AppConfig({
      // Localhost only: the browser reaches us through the Vite proxy, so the API key never leaves this machine.
      host: env.HOST?.trim() || '127.0.0.1',
      port: Number(env.PORT) || 8787,
      llmPreference: LLM_CHOICES.includes(env.LLM_PROVIDER as LlmPreference) ? (env.LLM_PROVIDER as LlmPreference) : 'auto',
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
      awsRegion: env.AWS_REGION?.trim() || env.AWS_DEFAULT_REGION?.trim() || 'us-east-1',
      awsBearerToken: env.AWS_BEARER_TOKEN_BEDROCK?.trim() || undefined,
      awsAccessKeyId: env.AWS_ACCESS_KEY_ID?.trim() || undefined,
      awsSecretAccessKey: env.AWS_SECRET_ACCESS_KEY?.trim() || undefined,
      awsSessionToken: env.AWS_SESSION_TOKEN?.trim() || undefined,
      // Amazon's own model: no marketplace subscription needed. Claude Haiku 5.5 is "global.anthropic.claude-haiku-5-5".
      bedrockModel: env.BEDROCK_MODEL?.trim() || 'global.amazon.nova-2-lite-v1:0',
    })
  }
}
