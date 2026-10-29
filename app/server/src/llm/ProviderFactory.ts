import type { AppConfig } from '../config/AppConfig.ts'
import type { LlmProvider } from './LlmProvider.ts'
import { MockProvider } from './MockProvider.ts'
import { OllamaCloudProvider } from './OllamaCloudProvider.ts'

/** Decides which provider the app runs with. The only place that knows about concrete provider classes. */
export class ProviderFactory {
  static create(config: AppConfig): LlmProvider {
    if (config.provider === 'mock' || !config.ollamaApiKey) return new MockProvider()
    return new OllamaCloudProvider({
      apiKey: config.ollamaApiKey,
      baseUrl: config.ollamaBaseUrl,
      model: config.ollamaModel,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    })
  }
}
