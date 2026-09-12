import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCommand } from '../lib/command.js';
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
