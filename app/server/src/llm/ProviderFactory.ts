import type { AppConfig } from '../config/AppConfig.ts'
import { bedrockAuthFor } from './aws/BedrockAuth.ts'
import { BedrockProvider } from './BedrockProvider.ts'
import type { LlmProvider } from './LlmProvider.ts'
import { MockProvider } from './MockProvider.ts'
import { OllamaCloudProvider } from './OllamaCloudProvider.ts'
import { ProviderRegistry } from './ProviderRegistry.ts'

/** Builds the set of language models the app can use. The only place that knows about the concrete classes. */
export class ProviderFactory {
  static createRegistry(config: AppConfig): ProviderRegistry<LlmProvider> {
    const ollama = config.ollamaApiKey
      ? new OllamaCloudProvider({ apiKey: config.ollamaApiKey, baseUrl: config.ollamaBaseUrl, model: config.ollamaModel, temperature: config.temperature, maxTokens: config.maxTokens })
      : undefined
    const auth = bedrockAuthFor(config)
    const bedrock = auth
      ? new BedrockProvider({ region: config.awsRegion, model: config.bedrockModel, auth, temperature: config.temperature, maxTokens: config.maxTokens })
      : undefined
    return new ProviderRegistry<LlmProvider>(
      [
        { id: 'ollama', label: 'Ollama Cloud', detail: config.ollamaModel, provider: ollama },
        { id: 'bedrock', label: 'AWS Bedrock', detail: `${config.bedrockModel} · ${config.awsRegion}`, provider: bedrock },
        { id: 'mock', label: 'Offline (canned)', detail: 'no network needed', provider: new MockProvider() },
      ],
      config.llmPreference === 'auto' ? undefined : config.llmPreference,
    )
  }
}
