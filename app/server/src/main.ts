import { ChainService } from './application/ChainService.ts'
import { PromptComposer } from './application/PromptComposer.ts'
import { ProviderSwitchService } from './application/ProviderSwitchService.ts'
import { RoutingService } from './application/RoutingService.ts'
import { SingleCallService } from './application/SingleCallService.ts'
import { SupportChainFactory } from './chain/SupportChainFactory.ts'
import { AppConfig } from './config/AppConfig.ts'
import { HttpServer } from './http/HttpServer.ts'
import { ChainStreamRoute } from './http/routes/ChainStreamRoute.ts'
import { HealthRoute } from './http/routes/HealthRoute.ts'
import { ProvidersSelectRoute, ProvidersStateRoute } from './http/routes/ProvidersRoute.ts'
import { RouteDefaultsRoute } from './http/routes/RouteDefaultsRoute.ts'
import { RouteStreamRoute } from './http/routes/RouteStreamRoute.ts'
import { StreamRoute } from './http/routes/StreamRoute.ts'
import { ProviderFactory } from './llm/ProviderFactory.ts'
import { SwitchableLlmProvider } from './llm/SwitchableLlmProvider.ts'
import { RoutingPipeline } from './routing/RoutingPipeline.ts'
import { SpecialistCatalog } from './routing/SpecialistCatalog.ts'
import { SearchContextFormatter } from './search/SearchContextFormatter.ts'
import { SwitchableSearchProvider } from './search/SwitchableSearchProvider.ts'
import { SearchProviderFactory } from './search/SearchProviderFactory.ts'
import { ConsoleLogger } from './logging/Logger.ts'

/** Composition root: the only place where concrete classes are chosen and wired together. */
async function main(): Promise<void> {
  const config = AppConfig.fromEnv(process.env)
  const logger = new ConsoleLogger()

  // Registries hold every configured model/search service; the proxies follow whichever one is active, so the
  // presenter can switch to a backup (Backup button in the demos) without restarting anything.
  const llmRegistry = ProviderFactory.createRegistry(config)
  const searchRegistry = SearchProviderFactory.createRegistry(config)
  const provider = new SwitchableLlmProvider(llmRegistry)
  const search = new SwitchableSearchProvider(searchRegistry)
  const service = new SingleCallService(provider, new PromptComposer())
  const chainService = new ChainService(SupportChainFactory.create(provider), provider)
  const catalog = SpecialistCatalog.standard()
  const switcher = new ProviderSwitchService(llmRegistry, searchRegistry)
  const routingService = new RoutingService(new RoutingPipeline(provider, search, catalog, new SearchContextFormatter()), provider, search, catalog)
  const server = new HttpServer(
    config.host,
    config.port,
    [
      new HealthRoute(service),
      new StreamRoute(service, config.maxPromptChars, logger),
      new ChainStreamRoute(chainService, { maxChars: config.maxPromptChars, maxTurns: config.maxHistoryTurns }, logger),
      new RouteDefaultsRoute(routingService),
      new ProvidersStateRoute(switcher),
      new ProvidersSelectRoute(switcher),
      new RouteStreamRoute(routingService, { maxQuery: 300, maxSystem: 1500 }, logger),
    ],
    logger,
  )

  const port = await server.start()
  logger.info(`API listening on http://${config.host}:${port}`)
  const ids = (r: { list(): readonly { id: string; provider: unknown }[] }) => r.list().filter((e) => e.provider).map((e) => e.id).join(', ')
  logger.info(`Model: ${provider.model} via ${provider.name} (available: ${ids(llmRegistry)})`)
  logger.info(`Web search: ${searchRegistry.active.label} (available: ${ids(searchRegistry)})`)
  if (!provider.isLive) logger.warn('Using the offline MOCK model. Set OLLAMA_API_KEY (or AWS Bedrock credentials) in app/server/.env for real answers.')
  if (!search.isLive) logger.warn('Using BACKUP search results. Set BRAVE_API_KEY in app/server/.env for real searches.')

  const shutdown = () => void server.stop().then(() => process.exit(0))
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
