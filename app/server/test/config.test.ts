import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { AppConfig } from '../src/config/AppConfig.ts'
import { HttpServer } from '../src/http/HttpServer.ts'
import { LogoFile } from '../src/config/LogoFile.ts'
import { ConfigRoute, LogoRoute } from '../src/http/routes/ConfigRoute.ts'
import { SilentLogger } from '../src/logging/Logger.ts'

describe('presenter name and host settings', () => {
  it('reads PRESENTER_NAME, trims it and caps its length; empty when unset', () => {
    assert.equal(AppConfig.fromEnv({ PRESENTER_NAME: '  Ada Lovelace  ' }).presenterName, 'Ada Lovelace')
    assert.equal(AppConfig.fromEnv({ PRESENTER_NAME: 'x'.repeat(200) }).presenterName.length, 80)
    assert.equal(AppConfig.fromEnv({}).presenterName, '')
  })
  it('listens on localhost unless HOST says otherwise', () => {
    assert.equal(AppConfig.fromEnv({}).host, '127.0.0.1')
  })
})

describe('team settings', () => {
  it('splits TEAM_MEMBERS on commas, semicolons and new lines, trims, drops blanks and caps the count', () => {
    assert.deepEqual(AppConfig.fromEnv({ TEAM_MEMBERS: ' Ada ,Ben; Cleo\n, ,Dan' }).teamMembers, ['Ada', 'Ben', 'Cleo', 'Dan'])
    assert.equal(AppConfig.fromEnv({ TEAM_MEMBERS: Array.from({ length: 30 }, (_, i) => `P${i}`).join(',') }).teamMembers.length, AppConfig.maxTeamMembers)
    assert.deepEqual(AppConfig.fromEnv({}).teamMembers, [])
  })
  it('reads TEAM_NAME and LOGO_PATH', () => {
    const c = AppConfig.fromEnv({ TEAM_NAME: ' Team Rocket ', LOGO_PATH: ' /tmp/logo.png ' })
    assert.equal(c.teamName, 'Team Rocket')
    assert.equal(c.logoPath, '/tmp/logo.png')
    assert.equal(AppConfig.fromEnv({ LOGO_PATH: '   ' }).logoPath, undefined)
  })
})

describe('LogoFile', () => {
  let dir = ''
  before(async () => { dir = await mkdtemp(join(tmpdir(), 'logo-')) })
  after(async () => { await rm(dir, { recursive: true, force: true }) })

  it('accepts small image files and reports their type', async () => {
    await writeFile(join(dir, 'a.PNG'), Buffer.from([1, 2, 3]))
    await writeFile(join(dir, 'b.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    assert.equal(await new LogoFile(join(dir, 'a.PNG')).contentType(), 'image/png')
    assert.equal(await new LogoFile(join(dir, 'b.svg')).contentType(), 'image/svg+xml')
  })
  it('treats anything else as no logo: not set, missing, empty, a folder, not an image, too big', async () => {
    await writeFile(join(dir, 'empty.png'), '')
    await writeFile(join(dir, 'notes.txt'), 'hi')
    await writeFile(join(dir, 'big.png'), Buffer.alloc(LogoFile.maxBytes + 1))
    for (const path of [undefined, join(dir, 'missing.png'), join(dir, 'empty.png'), dir, join(dir, 'notes.txt'), join(dir, 'big.png')]) {
      assert.equal(await new LogoFile(path).contentType(), null, String(path))
    }
  })
})

describe('GET /api/config and /api/logo', () => {
  let server: HttpServer
  let bare: HttpServer
  let base = ''
  let bareBase = ''
  let dir = ''
  before(async () => { dir = await mkdtemp(join(tmpdir(), 'logo-route-')) })
  before(async () => {
    await writeFile(join(dir, 'logo.png'), Buffer.from([137, 80, 78, 71]))
    const config = AppConfig.fromEnv({ PRESENTER_NAME: 'Ada', TEAM_NAME: 'Team X', TEAM_MEMBERS: 'Ada, Ben' })
    const logo = new LogoFile(join(dir, 'logo.png'))
    const none = new LogoFile(undefined)
    server = new HttpServer('127.0.0.1', 0, [new ConfigRoute(config, logo), new LogoRoute(logo)], new SilentLogger())
    base = `http://127.0.0.1:${await server.start()}`
    bare = new HttpServer('127.0.0.1', 0, [new ConfigRoute(AppConfig.fromEnv({}), none), new LogoRoute(none)], new SilentLogger())
    bareBase = `http://127.0.0.1:${await bare.start()}`
  })
  after(async () => { await server.stop(); await bare.stop(); await rm(dir, { recursive: true, force: true }) })
  it('returns the names and the logo address, and nothing secret', async () => {
    assert.deepEqual(await (await fetch(`${base}/api/config`)).json(), { presenterName: 'Ada', teamName: 'Team X', teamMembers: ['Ada', 'Ben'], logoUrl: '/api/logo' })
  })
  it('has no logo address when none is set, and /api/logo is then a 404', async () => {
    assert.deepEqual(await (await fetch(`${bareBase}/api/config`)).json(), { presenterName: '', teamName: '', teamMembers: [], logoUrl: null })
    assert.equal((await fetch(`${bareBase}/api/logo`)).status, 404)
  })
  it('serves the logo bytes with its type and defensive headers', async () => {
    const res = await fetch(`${base}/api/logo`)
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'image/png')
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.match(res.headers.get('content-security-policy') ?? '', /sandbox/)
    assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], [137, 80, 78, 71])
  })
})
