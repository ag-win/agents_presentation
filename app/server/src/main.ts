import { PromptComposer } from './application/PromptComposer.ts'
import { SingleCallService } from './application/SingleCallService.ts'
import { AppConfig } from './config/AppConfig.ts'
import { HttpServer } from './http/HttpServer.ts'
import { HealthRoute } from './http/routes/HealthRoute.ts'
import { StreamRoute } from './http/routes/StreamRoute.ts'
import { ProviderFactory } from './llm/ProviderFactory.ts'
import { ConsoleLogger } from './logging/Logger.ts'

/** Composition root: the only place where concrete classes are chosen and wired together. */
async function main(): Promise<void> {
  const config = AppConfig.fromEnv(process.env)
  const logger = new ConsoleLogger()

  const provider = ProviderFactory.create(config)
  const service = new SingleCallService(provider, new PromptComposer())
  const server = new HttpServer(
    config.host,
    config.port,
    [new HealthRoute(service), new StreamRoute(service, config.maxPromptChars, logger)],
    logger,
  )

  const port = await server.start()
  logger.info(`API listening on http://${config.host}:${port}`)
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
