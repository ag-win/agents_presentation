import { readFile, stat } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const TYPES: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

/**
 * The logo image named by LOGO_PATH. The browser cannot read files on this machine, so the backend serves this one
 * file (and only this one: the path comes from the settings, never from a request). Anything that is not a small
 * image file is treated as "no logo".
 */
export class LogoFile {
  static readonly maxBytes = 5 * 1024 * 1024

  private readonly path: string | undefined

  constructor(path: string | undefined) {
    this.path = path ? resolve(path) : undefined
  }

  /** The image's content type, or null if there is no usable logo right now (checked on each call, so a file added later works). */
  async contentType(): Promise<string | null> {
    if (!this.path) return null
    const type = TYPES[extname(this.path).toLowerCase()]
    if (!type) return null
    try {
      const info = await stat(this.path)
      return info.isFile() && info.size > 0 && info.size <= LogoFile.maxBytes ? type : null
    } catch {
      return null
    }
  }

  async read(): Promise<Buffer> {
    if (!this.path) throw new Error('No logo is set')
    return readFile(this.path)
  }
}
