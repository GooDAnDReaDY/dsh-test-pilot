import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionCwd, workspaceHasChanges } from '../lib/workspace.js';
test('resolves workspace cwd from session and event contract', () => {
  assert.equal(sessionCwd({ workspace: { cwd: '/repo' } }, { data: {} }), '/repo');
  assert.equal(sessionCwd({}, { data: { cwd: '/event-repo' } }), '/event-repo');
});
test('detects a changed git workspace through bounded subprocess', async () => {
  const result = await workspaceHasChanges({
    spawn() {
      return {
        collected: { stdout: { readFrom: () => ({ text: ' M app.py\n' }) } },
        done: Promise.resolve({ exitCode: 0 }),
      };
    },
  }, '/repo');
  assert.deepEqual(result, { known: true, changed: true });
});
test('treats unavailable git status as unknown and fails open to a test run', async () => {
  assert.deepEqual(await workspaceHasChanges(null, '/repo'), { known: false, changed: true });
});
