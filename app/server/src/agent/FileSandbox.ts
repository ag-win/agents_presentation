import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,59}$/

/**
 * The only place the agent's file tools can touch: one flat folder, simple file names (no paths), small files,
 * and a cap on how many. Nothing outside the folder is reachable.
 */
export class FileSandbox {
  static readonly maxChars = 20_000
  static readonly maxFiles = 20

  private readonly dir: string

  constructor(dir: string) {
    this.dir = dir
  }

  private path(name: string): string {
    if (!NAME.test(name)) throw new Error('File names may only use letters, digits, dots, dashes and underscores (no folders), up to 60 characters')
    return join(this.dir, name)
  }

  async list(): Promise<string[]> {
    try {
      return (await readdir(this.dir)).filter((n) => NAME.test(n)).sort()
    } catch {
      return []
    }
  }

  async write(name: string, content: string): Promise<number> {
    const path = this.path(name)
    if (content.length > FileSandbox.maxChars) throw new Error(`Files are limited to ${FileSandbox.maxChars} characters`)
    const existing = await this.list()
    if (!existing.includes(name) && existing.length >= FileSandbox.maxFiles) throw new Error(`The workspace is full (${FileSandbox.maxFiles} files)`)
    await mkdir(this.dir, { recursive: true })
    await writeFile(path, content, 'utf8')
    return content.length
  }

  async read(name: string): Promise<string> {
    try {
      return await readFile(this.path(name), 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`There is no file called ${name}`)
      throw error
    }
  }

  async clear(): Promise<void> {
    for (const name of await this.list()) await rm(join(this.dir, name), { force: true })
  }
}
