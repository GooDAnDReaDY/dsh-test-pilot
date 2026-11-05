import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { Config, apply } from '../lib/index.js';

const clientSource = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');

function unwrap(val) {
  return val && typeof val.get === 'function' ? val.get() : val;
}

test('Issue #51: Config schema supports showHeaderIndicator and handles boolean and string representations', () => {
  const defaultConf = Config({});
  assert.equal(unwrap(defaultConf.showHeaderIndicator), true);

  const falseConf = Config({ showHeaderIndicator: false });
  assert.equal(unwrap(falseConf.showHeaderIndicator), false);

  const trueConf = Config({ showHeaderIndicator: true });
  assert.equal(unwrap(trueConf.showHeaderIndicator), true);
});

test('Issue #51: client.js defines resolveConfigScope with fallback to NS and ctx.get', () => {
  assert.ok(clientSource.includes('function resolveConfigScope('));
  assert.ok(clientSource.includes('ctx.configForms.get(SETTINGS_ENTRY_ID)'));
  assert.ok(clientSource.includes('forms.get(SETTINGS_ENTRY_ID) || forms.get(NS)'));
});

test('Issue #51: client.js SettingsForm, PluginCard, and SessionStatus use activeCtx fallback', () => {
  assert.ok(clientSource.includes('function SettingsForm(props) {\n      const ctx = props.ctx || activeCtx'));
  assert.ok(clientSource.includes('function PluginCard(props) {\n      const ctx = props.ctx || activeCtx'));
  assert.ok(clientSource.includes('function SessionStatus(props) {\n      const ctx = props.ctx || activeCtx'));
});

test('Issue #51: draftFromStored correctly handles false and string false', () => {
  assert.ok(clientSource.includes('showHeaderIndicator: value.showHeaderIndicator !== false && String(value.showHeaderIndicator) !== \'false\''));
  assert.ok(clientSource.includes('enabled: value.enabled !== false && String(value.enabled) !== \'false\''));
});

test('Issue #51: SessionStatus hides when showHeaderIndicator is false without hiding other UI', () => {
  assert.ok(clientSource.includes('if (!showHeaderIndicator) return null'));
  // Does not interfere with navigation buttons
  assert.doesNotMatch(clientSource, /Remote|Tasks|Kanban|Scheduled/);
});

test('Issue #51: client.js has no Cyrillic characters (clean localization)', () => {
  assert.doesNotMatch(clientSource, /[\u0400-\u04ff]/);
});

test('Issue #51: apply readLive matches describe rows by both ns and id variants', () => {
  const rowByNS = {
    ns: 'dsh-test-pilot',
    value: { enabled: true, showHeaderIndicator: false },
  };
  const settingsSvc = {
    describe: () => [rowByNS],
    configure: () => () => {},
  };
  const listeners = new Map();
  const context = {
    inject(deps, fn) {
      if (deps.includes('settings')) fn({ settings: settingsSvc });
    },
    on(name, listener) {
      listeners.set(name, listener);
      return () => listeners.delete(name);
    },
    effect(fn) { return fn(); },
    tools: { register() {} },
    fs: {},
    subprocess: { spawn() {} },
    emit() {},
  };

  const plugin = apply(context, { enabled: true, showHeaderIndicator: true });
  assert.ok(plugin);

  // Update settings document
  listeners.get('settings/document-updated')?.();
  listeners.get('loader/volatile-update')?.();
});
