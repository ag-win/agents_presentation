import type { AppConfig } from '../../config/AppConfig.ts'
import { SigV4Signer } from './SigV4Signer.ts'

/** How a Bedrock request proves who is calling. Strategy: the provider only asks for the headers. */
export interface BedrockAuth {
  headers(url: URL, body: string): Record<string, string>
}

/** A Bedrock API key (AWS_BEARER_TOKEN_BEDROCK) sent as a bearer token. */
export class BearerTokenAuth implements BedrockAuth {
  private readonly token: string

  constructor(token: string) {
    this.token = token
  }

  headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.token}` }
  }
}

/** Regular AWS access keys, signed with Signature Version 4. */
export class SigV4Auth implements BedrockAuth {
  private readonly signer: SigV4Signer

  constructor(signer: SigV4Signer) {
    this.signer = signer
  }

  headers(url: URL, body: string): Record<string, string> {
    return this.signer.sign('POST', url, body)
  }
}

/** Picks the auth from what is configured: an API key wins, otherwise access keys. Undefined when neither is set. */
export function bedrockAuthFor(config: AppConfig): BedrockAuth | undefined {
  if (config.awsBearerToken) return new BearerTokenAuth(config.awsBearerToken)
  if (config.awsAccessKeyId && config.awsSecretAccessKey) {
    const credentials = { accessKeyId: config.awsAccessKeyId, secretAccessKey: config.awsSecretAccessKey, sessionToken: config.awsSessionToken }
    return new SigV4Auth(new SigV4Signer(credentials, config.awsRegion, 'bedrock'))
  }
  return undefined
}
