import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { NS as hostNS } from '../lib/index.js';

const clientSource = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');

test('Issue #57: client NS matches host NS and profile entry id dsh-test-pilot', () => {
  assert.equal(hostNS, 'dsh-test-pilot');
  assert.ok(clientSource.includes("const NS = 'dsh-test-pilot'"));
  assert.ok(clientSource.includes("const PKG = '@goodandready/dsh-test-pilot'"));
  assert.ok(clientSource.includes("const SETTINGS_ENTRY_ID = 'dsh-test-pilot'"));
});

test('Issue #57: plugins.item registers with entry id as both id and key', () => {
  assert.ok(clientSource.includes("{ name: 'plugins.item', id: SETTINGS_ENTRY_ID, key: SETTINGS_ENTRY_ID, order: 60 }"));
  assert.ok(clientSource.includes("const ROW_CONFIG_KEY = PKG + '#' + SETTINGS_ENTRY_ID"));
});

test('Issue #57: configForms is queried only with plugin entry id and never with package name', () => {
  assert.ok(clientSource.includes('ctx.configForms.get(SETTINGS_ENTRY_ID)'));
  assert.ok(clientSource.includes('forms.get(SETTINGS_ENTRY_ID)'));
  assert.equal(clientSource.includes('ctx.configForms.get(PKG)'), false);
  assert.equal(clientSource.includes("ctx.configForms.get('@goodandready/dsh-test-pilot')"), false);
  assert.equal(clientSource.includes("forms.get('@goodandready/dsh-test-pilot')"), false);
});

test('Issue #57: client.js contains zero Cyrillic characters', () => {
  assert.doesNotMatch(clientSource, /[\u0400-\u04ff]/);
});
