import type { AppConfig } from '../../config/AppConfig.ts'
import type { LogoFile } from '../../config/LogoFile.ts'
import { NotFoundError } from '../../errors/AppError.ts'
import type { RequestContext } from '../RequestContext.ts'
import type { Route } from '../Route.ts'

/** GET /api/config: what the first and last slides show (names and whether there is a logo). Never anything secret. */
export class ConfigRoute implements Route {
  readonly method = 'GET'
  readonly path = '/api/config'

  private readonly config: AppConfig
  private readonly logo: LogoFile

  constructor(config: AppConfig, logo: LogoFile) {
    this.config = config
    this.logo = logo
  }

  async handle(ctx: RequestContext): Promise<void> {
    ctx.json(200, {
      presenterName: this.config.presenterName,
      teamName: this.config.teamName,
      teamMembers: this.config.teamMembers,
      logoUrl: (await this.logo.contentType()) ? '/api/logo' : null,
    })
  }
}

/** GET /api/logo: the image at LOGO_PATH. */
export class LogoRoute implements Route {
  readonly method = 'GET'
  readonly path = '/api/logo'

  private readonly logo: LogoFile

  constructor(logo: LogoFile) {
    this.logo = logo
  }

  async handle(ctx: RequestContext): Promise<void> {
    const type = await this.logo.contentType()
    if (!type) throw new NotFoundError('No logo is set up. Put its path in LOGO_PATH in app/server/.env.')
    // The headers stop a hostile SVG from running anything if the URL is ever opened directly.
    ctx.bytes(200, type, await this.logo.read(), {
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    })
  }
}
