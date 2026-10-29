import { ChainService } from './application/ChainService.ts'
import { PromptComposer } from './application/PromptComposer.ts'
import { RoutingService } from './application/RoutingService.ts'
import { SingleCallService } from './application/SingleCallService.ts'
import { SupportChainFactory } from './chain/SupportChainFactory.ts'
import { AppConfig } from './config/AppConfig.ts'
import { HttpServer } from './http/HttpServer.ts'
import { ChainStreamRoute } from './http/routes/ChainStreamRoute.ts'
import { HealthRoute } from './http/routes/HealthRoute.ts'
import { RouteDefaultsRoute } from './http/routes/RouteDefaultsRoute.ts'
import { RouteStreamRoute } from './http/routes/RouteStreamRoute.ts'
import { StreamRoute } from './http/routes/StreamRoute.ts'
import { ProviderFactory } from './llm/ProviderFactory.ts'
import { RoutingPipeline } from './routing/RoutingPipeline.ts'
import { SpecialistCatalog } from './routing/SpecialistCatalog.ts'
import { SearchContextFormatter } from './search/SearchContextFormatter.ts'
import { SearchProviderFactory } from './search/SearchProviderFactory.ts'
import { ConsoleLogger } from './logging/Logger.ts'

/** Composition root: the only place where concrete classes are chosen and wired together. */
async function main(): Promise<void> {
  const config = AppConfig.fromEnv(process.env)
  const logger = new ConsoleLogger()

  const provider = ProviderFactory.create(config)
  const service = new SingleCallService(provider, new PromptComposer())
  const chainService = new ChainService(SupportChainFactory.create(provider), provider)
  const search = SearchProviderFactory.create(config)
  const catalog = SpecialistCatalog.standard()
  const routingService = new RoutingService(new RoutingPipeline(provider, search, catalog, new SearchContextFormatter()), provider, search, catalog)
  const server = new HttpServer(
    config.host,
    config.port,
    [
      new HealthRoute(service),
      new StreamRoute(service, config.maxPromptChars, logger),
      new ChainStreamRoute(chainService, { maxChars: config.maxPromptChars, maxTurns: config.maxHistoryTurns }, logger),
      new RouteDefaultsRoute(routingService),
      new RouteStreamRoute(routingService, { maxQuery: 300, maxSystem: 1500 }, logger),
    ],
    logger,
  )

  const port = await server.start()
  logger.info(`API listening on http://${config.host}:${port}`)
  logger.info(search.isLive ? 'Web search: Brave' : 'Web search: offline MOCK results. Set BRAVE_API_KEY in app/server/.env for real searches.')
  logger.info(
    provider.isLive
      ? `Model: ${provider.model} via ${provider.name}`
      : 'Using the offline MOCK model. Set OLLAMA_API_KEY in app/server/.env for real answers.',
  )

  const shutdown = () => void server.stop().then(() => process.exit(0))
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
