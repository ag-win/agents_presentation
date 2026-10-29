import { createHash, createHmac } from 'node:crypto'

export interface AwsCredentials {
  readonly accessKeyId: string
  readonly secretAccessKey: string
  readonly sessionToken?: string
}

const sha256 = (data: string) => createHash('sha256').update(data).digest('hex')
const hmac = (key: string | Buffer, data: string) => createHmac('sha256', key).update(data).digest()

/** RFC 3986 percent-encoding, as SigV4 wants it (encodeURIComponent leaves !'()* alone). */
const encode = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

/**
 * AWS Signature Version 4 for one service and region. Signs `host` and `x-amz-date` (plus the session token
 * when there is one) and returns the headers to add to the request.
 */
export class SigV4Signer {
  private readonly credentials: AwsCredentials
  private readonly region: string
  private readonly service: string

  constructor(credentials: AwsCredentials, region: string, service: string) {
    this.credentials = credentials
    this.region = region
    this.service = service
  }

  sign(method: string, url: URL, body: string, now: Date = new Date()): Record<string, string> {
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '') // 20150830T123600Z
    const day = amzDate.slice(0, 8)
    const scope = `${day}/${this.region}/${this.service}/aws4_request`

    const headers: Record<string, string> = { host: url.host, 'x-amz-date': amzDate }
    if (this.credentials.sessionToken) headers['x-amz-security-token'] = this.credentials.sessionToken
    const names = Object.keys(headers).sort()
    const canonicalHeaders = names.map((n) => `${n}:${headers[n].trim()}\n`).join('')
    const signedHeaders = names.join(';')

    // Non-S3 services encode each path segment twice: once for the URL (already done in url.pathname), once here.
    const canonicalPath = url.pathname.split('/').map(encode).join('/') || '/'
    const canonicalQuery = [...url.searchParams.entries()]
      .map(([k, v]) => [encode(k), encode(v)] as const)
      .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => `${k}=${v}`)
      .join('&')

    const canonicalRequest = [method, canonicalPath, canonicalQuery, canonicalHeaders, signedHeaders, sha256(body)].join('\n')
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n')
    const key = hmac(hmac(hmac(hmac(`AWS4${this.credentials.secretAccessKey}`, day), this.region), this.service), 'aws4_request')
    const signature = createHmac('sha256', key).update(stringToSign).digest('hex')

    const out: Record<string, string> = {
      'x-amz-date': amzDate,
      Authorization: `AWS4-HMAC-SHA256 Credential=${this.credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    }
    if (this.credentials.sessionToken) out['x-amz-security-token'] = this.credentials.sessionToken
    return out
  }
}
