import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultCommand, parseCommand } from '../lib/command.js';
test('parses a safe executable command without invoking a shell', () => {
  assert.deepEqual(parseCommand('pytest -q "tests/unit tests"'), ['pytest', '-q', 'tests/unit tests']);
  assert.deepEqual(parseCommand(['node', '--test']), ['node', '--test']);
});
test('rejects shell composition', () => {
  assert.throws(() => parseCommand('pytest && curl bad.example'), /shell syntax/);
  assert.throws(() => parseCommand('pytest $(touch pwned)'), /shell syntax/);
});
test('rejects malformed command input', () => {
  assert.throws(() => parseCommand('pytest "unterminated'), /unterminated/);
  assert.throws(() => parseCommand(''), /empty/);
});
test('provides safe defaults for supported runners', () => {
  assert.equal(defaultCommand('pytest'), 'pytest -q');
  assert.equal(defaultCommand('jest'), 'npm exec --offline -- jest --runInBand');
  assert.equal(defaultCommand('jest', { allowNetworkFetch: true }), 'npm exec --yes --registry=https://registry.npmjs.org -- jest --runInBand');
  assert.equal(defaultCommand('vitest'), 'npm exec --offline -- vitest run');
  assert.equal(defaultCommand('go'), 'go test ./...');
  assert.equal(defaultCommand('npm'), 'npm test');
  assert.equal(defaultCommand('deno'), 'deno test');
  assert.equal(defaultCommand('rust'), 'cargo test');
  assert.equal(defaultCommand('tap'), 'npm test');
  assert.equal(defaultCommand('tsc'), 'npm exec --offline -- tsc --noEmit');
  assert.equal(defaultCommand('tsc', { allowNetworkFetch: true }), 'npm exec --yes --registry=https://registry.npmjs.org -- tsc --noEmit');
});
