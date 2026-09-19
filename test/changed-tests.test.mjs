import assert from 'node:assert/strict';
import { test } from 'node:test';
import { planChangedTests } from '../lib/changed-tests.js';

function makeFs(files) {
  return {
    async lstat(path) {
      return files.includes(path) ? { type: 'file' } : undefined;
    },
  };
}

test('selects a paired JavaScript test and appends safe runner arguments', async () => {
  const result = await planChangedTests({
    cwd: '/repo',
    runner: 'vitest',
    command: 'npm test',
    fs: makeFs(['test/parser.test.mjs']),
    writePaths: ['/repo/lib/parser.js'],
  });
  assert.deepEqual({ kind: result.kind, paths: result.paths, args: result.args }, {
    kind: 'related', paths: ['test/parser.test.mjs'], args: ['--', 'test/parser.test.mjs'],
  });
});

test('runs the full suite when any changed file has no paired test', async () => {
  const result = await planChangedTests({
    cwd: '/repo',
    runner: 'pytest',
    command: 'pytest -q',
    fs: makeFs(['tests/test_model.py']),
    writePaths: ['app/model.py', 'README.md'],
  });
  assert.equal(result.kind, 'full');
  assert.match(result.reason, /No supported related test/);
});

test('selects only a paired pytest test', async () => {
  const result = await planChangedTests({
    cwd: '/repo',
    runner: 'pytest',
    command: 'pytest -q',
    fs: makeFs(['tests/test_model.py']),
    writePaths: ['/repo/app/model.py'],
  });
  assert.deepEqual({ kind: result.kind, paths: result.paths, args: result.args }, {
    kind: 'related', paths: ['tests/test_model.py'], args: ['tests/test_model.py'],
  });
});

test('narrows Go execution to the changed package', async () => {
  const result = await planChangedTests({
    cwd: '/repo',
    runner: 'go',
    command: 'go test ./...',
    fs: makeFs(['pkg/api/api_test.go']),
    writePaths: ['pkg/api/api.go'],
  });
  assert.deepEqual({ kind: result.kind, command: result.command }, {
    kind: 'related', command: ['go', 'test', './pkg/api'],
  });
});

test('uses the per-turn core summary and falls back when it is truncated', async () => {
  const targeted = await planChangedTests({
    cwd: '/repo',
    runner: 'pytest',
    fs: makeFs(['test/test_model.py']),
    summary: { total: 1, files: [{ path: 'app/model.py' }] },
  });
  assert.equal(targeted.kind, 'related');

  const fallback = await planChangedTests({
    cwd: '/repo',
    runner: 'pytest',
    fs: makeFs(['test/test_model.py']),
    summary: { total: 2, files: [{ path: 'app/model.py' }] },
  });
  assert.equal(fallback.kind, 'full');
  assert.match(fallback.reason, /incomplete/);
});

test('treats inconsistent native summary counts as incomplete', async () => {
  const result = await planChangedTests({
    cwd: '/repo', runner: 'pytest',
    summary: { total: 0, files: [{ path: 'app.py' }] },
  });
  assert.equal(result.kind, 'full');
  assert.match(result.reason, /incomplete/);
});

test('runs the full suite for invalid or oversized changed paths', async () => {
  for (const path of ['../outside.py', 'bad' + String.fromCharCode(0) + 'path', 'x'.repeat(4097)]) {
    const result = await planChangedTests({ cwd: '/repo', runner: 'pytest', writePaths: [path] });
    assert.equal(result.kind, 'full');
  }
});

test('does not start for a turn with no observable file changes', async () => {
  const result = await planChangedTests({ cwd: '/repo', runner: 'pytest' });
  assert.equal(result.kind, 'none');
});

test('runs the full suite when a summary is incomplete even if its file list is empty', async () => {
  const result = await planChangedTests({
    cwd: '/repo', runner: 'pytest',
    summary: { total: 4, files: [] },
  });
  assert.equal(result.kind, 'full');
  assert.match(result.reason, /incomplete/);
});

test('runs the full suite when legacy write tracking overflowed', async () => {
  const result = await planChangedTests({
    cwd: '/repo', runner: 'pytest', writePaths: ['app.py'], overflow: true,
  });
  assert.equal(result.kind, 'full');
  assert.match(result.reason, /incomplete/);
});

test('keeps manual execution out of the selector and refuses unknown npm targeting', async () => {
  const result = await planChangedTests({
    cwd: '/repo',
    runner: 'npm',
    command: 'npm test',
    writePaths: ['src/index.js'],
    fs: makeFs(['test/index.test.js']),
  });
  assert.equal(result.kind, 'full');
  assert.match(result.reason, /supported related test/);
});
