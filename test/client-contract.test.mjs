import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'

const source = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

test('client bundle is declared and the settings card uses its exact namespace key', () => {
  assert.equal(pkg.exports['./client'], './lib/client.js')
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.ok(pkg.peerDependencies['@deepseek-ai/schemastery'])
  assert.ok(pkg.peerDependencies['@deepseek-ai/dsh-tools'])
  assert.equal(pkg.peerDependenciesMeta?.['@deepseek-ai/schemastery']?.optional, undefined)
  assert.equal(pkg.peerDependenciesMeta?.['@deepseek-ai/dsh-tools']?.optional, undefined)
  assert.ok(source.includes("id: '@goodandready/dsh-test-pilot'"))
  assert.ok(source.includes("name: 'settings.plugin.item', key: NS, locale: NS"))
  assert.ok(source.includes('ctx.configForms.get(SETTINGS_ENTRY_ID)'))
  assert.ok(source.includes("const SETTINGS_ENTRY_ID = 'dsh-test-pilot'"))
})

test('settings card reuses DSH disclosure UI and theme elevation tokens', () => {
  assert.ok(pkg.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-primitives'))
  assert.ok(source.includes('const { DisclosureRow } = require(\'@deepseek-ai/dsh-client-ui-primitives\')'))
  assert.ok(source.includes('h(DisclosureRow'))
  assert.doesNotMatch(source, /⌄/)
  assert.ok(source.includes('box-shadow:var(--dsw-elevation-panel)'))
  assert.doesNotMatch(source, /border(?:-top)?:1px solid var\(--dsw-alias-border-/)
  assert.ok(source.includes('corner-shape:round'))
  assert.doesNotMatch(source, /box-shadow:0 8px 28px rgba\(/)
})

test('client registers equivalent English and Chinese UI dictionaries only', () => {
  assert.ok(source.includes('en: {'))
  assert.ok(source.includes('zh: {'))
  assert.ok(source.includes('ctx.locale.register(NS, TEXT)'))
  assert.ok(source.includes("return String(current && (current.active || current.locale) || 'en')"))
  assert.ok(source.includes('textFor(props.t, language)'))
  assert.ok(source.includes("new Intl.DateTimeFormat(language"))
  assert.doesNotMatch(source, /startsWith\('zh'\)/)
  assert.doesNotMatch(source, /[\u0400-\u04ff]/)
  assert.ok(source.includes('data-dsh-plugin'))
})
