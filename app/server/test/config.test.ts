import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { AppConfig } from '../src/config/AppConfig.ts'
import { HttpServer } from '../src/http/HttpServer.ts'
import { ConfigRoute } from '../src/http/routes/ConfigRoute.ts'
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

describe('GET /api/config', () => {
  let server: HttpServer
  let base = ''
  before(async () => {
    server = new HttpServer('127.0.0.1', 0, [new ConfigRoute(AppConfig.fromEnv({ PRESENTER_NAME: 'Ada' }))], new SilentLogger())
    base = `http://127.0.0.1:${await server.start()}`
  })
  after(async () => { await server.stop() })
  it('returns the presenter name and nothing secret', async () => {
    const body = await (await fetch(`${base}/api/config`)).json()
    assert.deepEqual(body, { presenterName: 'Ada' })
  })
})
