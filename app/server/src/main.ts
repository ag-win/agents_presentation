import { AgentLoop } from './agent/AgentLoop.ts'
import { ApprovalBroker } from './agent/ApprovalBroker.ts'
import { AgentPromptCatalog } from './agent/AgentPrompts.ts'
import { AgentTaskCatalog } from './agent/AgentTaskCatalog.ts'
import { AgentToolbox } from './agent/AgentTool.ts'
import { FileSandbox } from './agent/FileSandbox.ts'
import { EscalateTool, FeedbackTool, OrderStatusAgentTool, ProductReviewsTool, ProductSpecsTool, ShopPolicyTool } from './agent/tools/ShopTools.ts'
import { AskModelTool, CalculatorTool, ReadFileTool, SpawnAgentTool, WebSearchTool, WriteFileTool } from './agent/tools/GeneralTools.ts'
import { AgentService } from './application/AgentService.ts'
import { AgentDecisionRoute, AgentDefaultsRoute, AgentStreamRoute, AgentWorkspaceClearRoute } from './http/routes/AgentRoutes.ts'
import { ChainService } from './application/ChainService.ts'
import { PromptComposer } from './application/PromptComposer.ts'
import { ProviderSwitchService } from './application/ProviderSwitchService.ts'
import { RoutingService } from './application/RoutingService.ts'
import { SingleCallService } from './application/SingleCallService.ts'
import { SupportService } from './application/SupportService.ts'
import { SupportChainFactory } from './chain/SupportChainFactory.ts'
import { AppConfig } from './config/AppConfig.ts'
import { HttpServer } from './http/HttpServer.ts'
import { ChainStreamRoute } from './http/routes/ChainStreamRoute.ts'
import { LogoFile } from './config/LogoFile.ts'
import { ConfigRoute, LogoRoute } from './http/routes/ConfigRoute.ts'
import { HealthRoute } from './http/routes/HealthRoute.ts'
import { ProvidersSelectRoute, ProvidersStateRoute } from './http/routes/ProvidersRoute.ts'
import { RouteDefaultsRoute } from './http/routes/RouteDefaultsRoute.ts'
import { RouteStreamRoute } from './http/routes/RouteStreamRoute.ts'
import { StreamRoute } from './http/routes/StreamRoute.ts'
import { SupportDefaultsRoute } from './http/routes/SupportDefaultsRoute.ts'
import { SupportStreamRoute } from './http/routes/SupportStreamRoute.ts'
import { ProviderFactory } from './llm/ProviderFactory.ts'
import { SwitchableLlmProvider } from './llm/SwitchableLlmProvider.ts'
import { RoutingPipeline } from './routing/RoutingPipeline.ts'
import { SpecialistCatalog } from './routing/SpecialistCatalog.ts'
import { SearchContextFormatter } from './search/SearchContextFormatter.ts'
import { OrderDatabase } from './shop/OrderDatabase.ts'
import { ProductCatalog } from './shop/ProductCatalog.ts'
import { ScenarioCatalog } from './support/ScenarioCatalog.ts'
import { SupportPipeline } from './support/SupportPipeline.ts'
import { SupportPromptCatalog } from './support/SupportPromptCatalog.ts'
import { OrderStatusTool } from './tools/OrderStatusTool.ts'
import { ToolLoop } from './tools/ToolLoop.ts'
import { ToolRegistry } from './tools/ToolRegistry.ts'
import { SwitchableSearchProvider } from './search/SwitchableSearchProvider.ts'
import { SearchProviderFactory } from './search/SearchProviderFactory.ts'
import { fileURLToPath } from 'node:url'
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
  const orders = new OrderDatabase()
  const tools = new ToolRegistry([new OrderStatusTool(orders)])
  const supportPrompts = SupportPromptCatalog.standard()
  const supportPipeline = new SupportPipeline({ provider, prompts: supportPrompts, orders, products: new ProductCatalog(), toolLoop: new ToolLoop(provider, tools) })
  const supportService = new SupportService(supportPipeline, provider, supportPrompts, new ScenarioCatalog(), tools, orders)
  const products = new ProductCatalog()
  const files = new FileSandbox(fileURLToPath(new URL('../workspace/', import.meta.url)))
  const agentToolbox = new AgentToolbox([
    new OrderStatusAgentTool(orders), new ProductSpecsTool(products), new ProductReviewsTool(products), new ShopPolicyTool(), new FeedbackTool(), new EscalateTool(),
    new WebSearchTool(search), new CalculatorTool(), new WriteFileTool(files), new ReadFileTool(files), new AskModelTool(), new SpawnAgentTool(),
  ])
  const agentPrompts = new AgentPromptCatalog()
  const agentService = new AgentService(new AgentLoop(provider, agentToolbox), provider, agentToolbox, agentPrompts, new AgentTaskCatalog(), new ScenarioCatalog(), files, new ApprovalBroker())
  const logoFile = new LogoFile(config.logoPath)
  const server = new HttpServer(
    config.host,
    config.port,
    [
      new HealthRoute(service),
      new ConfigRoute(config, logoFile),
      new LogoRoute(logoFile),
      new StreamRoute(service, config.maxPromptChars, logger),
      new ChainStreamRoute(chainService, { maxChars: config.maxPromptChars, maxTurns: config.maxHistoryTurns }, logger),
      new RouteDefaultsRoute(routingService),
      new ProvidersStateRoute(switcher),
      new ProvidersSelectRoute(switcher),
      new RouteStreamRoute(routingService, { maxQuery: 300, maxSystem: 1500 }, logger),
      new SupportDefaultsRoute(supportService),
      new AgentDefaultsRoute(agentService),
      new AgentStreamRoute(agentService, { maxTask: 600, maxSystem: 3000 }, logger),
      new AgentWorkspaceClearRoute(agentService),
      new AgentDecisionRoute(agentService),
      new SupportStreamRoute(supportService, { maxMessage: 600, maxSystem: 2500 }, logger),
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
