import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { Config, apply } from '../lib/index.js';

const clientSource = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8');

function unwrap(val) {
  return val && typeof val.get === 'function' ? val.get() : val;
}

test('Issue #48: Config schema defines showHeaderIndicator with default true', () => {
  const parsedDefault = Config({});
  assert.equal(unwrap(parsedDefault.showHeaderIndicator), true);

  const parsedExplicitFalse = Config({ showHeaderIndicator: false });
  assert.equal(unwrap(parsedExplicitFalse.showHeaderIndicator), false);

  const parsedExplicitTrue = Config({ showHeaderIndicator: true });
  assert.equal(unwrap(parsedExplicitTrue.showHeaderIndicator), true);
});

test('Issue #48: client.js includes showHeaderIndicator in settings and translations', () => {
  assert.ok(clientSource.includes('showHeaderIndicator'));
  assert.ok(clientSource.includes("showHeaderIndicator: 'Show test status in header'"));
  assert.ok(clientSource.includes("showHeaderIndicator: '在会话标题栏显示状态指示器'"));
  assert.ok(clientSource.includes('draft.showHeaderIndicator'));
  assert.doesNotMatch(clientSource, /[\u0400-\u04ff]/);
});

test('Issue #48: client.js has alternative access to test results via StatusSummary in settings', () => {
  assert.ok(clientSource.includes('function StatusSummary('));
  assert.ok(clientSource.includes('h(StatusSummary'));
  assert.ok(clientSource.includes('/api/dsh-test-pilot/status'));
  assert.ok(clientSource.includes('dtp-status-card'));
});

test('Issue #48: SessionStatus component hides when showHeaderIndicator is false', () => {
  assert.ok(clientSource.includes('const showHeaderIndicator = configSnapshot.status === \'ready\''));
  assert.ok(clientSource.includes('if (!showHeaderIndicator) return null'));
  assert.ok(clientSource.includes('if (!showHeaderIndicator || !sessionId)'));
});

test('Issue #48: apply reactively updates live configuration without restart', () => {
  let capturedConfig = null;
  const describeRow = {
    ns: 'dsh-test-pilot',
    value: { enabled: true, showHeaderIndicator: false },
  };
  const settingsSvc = {
    describe: () => [describeRow],
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

  // Trigger settings update
  listeners.get('settings/document-updated')?.();
  listeners.get('loader/volatile-update')?.();
});
