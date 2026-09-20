import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionCwd } from '../lib/workspace.js';
test('resolves workspace cwd from session and event contract', () => {
  assert.equal(sessionCwd({ workspace: { cwd: '/repo' } }, { data: {} }), '/repo');
  assert.equal(sessionCwd({}, { data: { cwd: '/event-repo' } }), '/event-repo');
});
