import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createRunPersistence,
  MAX_PERSISTED_AGE_MS,
  MAX_PERSISTED_HISTORY,
  MAX_PERSISTED_WORKSPACES,
  parsePersistedState,
  workspaceStorageKey,
} from '../lib/persistence.js';

const NOW = 1_800_000_000_000;

test('corrupt and unknown-version state files load as empty', () => {
  assert.deepEqual(parsePersistedState('{broken', NOW), {
    schemaVersion: 1, history: [], workspaces: {},
  });
  assert.deepEqual(parsePersistedState(JSON.stringify({ schemaVersion: 99, history: [] }), NOW), {
    schemaVersion: 1, history: [], workspaces: {},
  });
});

test('history and workspace snapshots are age and count bounded', () => {
  const history = Array.from({ length: MAX_PERSISTED_HISTORY + 5 }, (_, index) => ({
    workspaceKey: (index + 1).toString(16).padStart(64, '0'),
    status: 'passed',
    finishedAt: NOW - index * 1000,
    counts: { passed: 1 },
  }));
  history.push({
    workspaceKey: 'f'.repeat(64),
    status: 'failed',
    finishedAt: NOW - MAX_PERSISTED_AGE_MS - 1,
    counts: { failed: 1 },
  });
  const workspaces = Object.fromEntries(history.map((entry) => [
    entry.workspaceKey,
    { ...entry, workspaceKey: undefined },
  ]));
  const loaded = parsePersistedState(JSON.stringify({ schemaVersion: 1, history, workspaces }), NOW);
  assert.equal(loaded.history.length, MAX_PERSISTED_HISTORY);
  assert.ok(loaded.history.every((entry) => entry.finishedAt >= NOW - MAX_PERSISTED_AGE_MS));
  assert.ok(Object.keys(loaded.workspaces).length <= MAX_PERSISTED_WORKSPACES);
});

test('atomic persistence restores compact per-workspace outcomes without output or absolute paths', async () => {
  let disk = '';
  let options;
  const io = {
    filePath: '/virtual/dsh/data/dsh-test-pilot/state.json',
    now: () => NOW,
    async readFile() {
      if (!disk) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return disk;
    },
    async mkdir() {},
    async writeFileAtomic(_path, content, callOptions) {
      disk = content;
      options = callOptions;
    },
    async withFileLock(_path, operation) { return operation(); },
  };
  const first = createRunPersistence(io);
  await first.ready;
  const cwd = '/work/private-project';
  const firstWrite = await first.recordResultAndGetPrevious(cwd, {
    status: 'failed',
    runner: 'pytest',
    finishedAt: NOW,
    durationMs: 850,
    counts: { total: 2, passed: 1, failed: 1 },
    failures: [{
      file: cwd + '/tests/test_secret.py',
      line: 9,
      testName: 'test_redacts',
      message: 'output=DO_NOT_STORE',
    }],
    command: 'pytest --secret-token',
    cwd,
    output: 'DO_NOT_STORE',
  });
  assert.equal(firstWrite.available, true);
  assert.equal(firstWrite.previous, null);

  assert.equal(options.mode, 0o600);
  assert.equal(options.dirMode, 0o700);
  assert.equal(disk.includes('DO_NOT_STORE'), false);
  assert.equal(disk.includes(cwd), false);
  assert.equal(disk.includes('command'), false);

  const restarted = createRunPersistence(io);
  const records = await restarted.ready;
  assert.equal(records.length, 1);
  assert.equal(records[0].failures[0].file, 'tests/test_secret.py');
  assert.equal(records[0].failures[0].message, undefined);
  assert.equal((await restarted.latestForWorkspace(cwd)).status, 'failed');
  assert.equal((await restarted.recordResultAndGetPrevious(cwd, { status: 'passed', finishedAt: NOW + 1000 })).previous.status, 'failed');
  assert.equal(records[0].workspaceKey, workspaceStorageKey(cwd));
});
