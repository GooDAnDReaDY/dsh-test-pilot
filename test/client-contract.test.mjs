import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'

const source = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

test('client bundle is declared and the settings card uses its exact namespace key', () => {
  assert.equal(pkg.exports['./client'], './lib/client.js')
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.ok(source.includes("id: '@goodandready/dsh-test-pilot'"))
  assert.ok(source.includes("name: 'settings.plugin.item', key: NS, locale: NS"))
  assert.ok(source.includes('ctx.configForms.get(NS)'))
})

test('client registers equivalent English and Chinese UI dictionaries only', () => {
  assert.ok(source.includes('en: {'))
  assert.ok(source.includes('zh: {'))
  assert.ok(source.includes('ctx.locale.register(NS, TEXT)'))
  assert.doesNotMatch(source, /[\u0400-\u04ff]/)
  assert.ok(source.includes('data-dsh-plugin'))
})
