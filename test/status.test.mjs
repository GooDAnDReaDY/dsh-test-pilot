import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createSessionWorkspaceResolver,
  createStatusHandler,
  isValidSessionId,
  projectStatusSnapshot,
  SESSION_BINDING_TTL_MS,
  STALE_AFTER_MS,
} from '../lib/status.js';
import { workspaceStorageKey } from '../lib/persistence.js';

const NOW = 1_800_000_000_000;
const RUN_ID = '4a53c3f6-2cf7-4e5c-8b5a-9771f33ddf53';

test('session ids are bounded strings without control characters', () => {
  assert.equal(isValidSessionId('session-1'), true);
  assert.equal(isValidSessionId(''), false);
  assert.equal(isValidSessionId('x'.repeat(257)), false);
  assert.equal(isValidSessionId('session\nforged'), false);
});

test('status projection allowlists fields and collapses errors to failed', () => {
  const snapshot = projectStatusSnapshot({
    status: 'timeout',
    runId: RUN_ID,
    startedAt: NOW - 500,
    finishedAt: NOW,
    durationMs: 500,
    counts: { total: 2, failed: 1, errors: 1, xfailed: 0, xpassed: 0 },
    cwd: '/private/workspace',
    command: 'pytest --token=secret',
    output: 'PRIVATE_OUTPUT',
    failures: [{ file: '/private/test.py', testName: 'PRIVATE_TEST' }],
  }, { now: NOW });

  assert.equal(snapshot.status, 'failed');
  assert.equal(snapshot.lastStatus, 'timeout');
  assert.equal(snapshot.correlationId, RUN_ID);
  assert.deepEqual(snapshot.counts, {
    total: 2, passed: 0, failed: 1, skipped: 0, errors: 1, xfail: 0, xpass: 0,
  });
  assert.deepEqual(Object.keys(snapshot).sort(), [
    'correlationId', 'counts', 'durationMs', 'finishedAt', 'lastStatus', 'startedAt', 'status', 'updatedAt',
  ]);
  const serialized = JSON.stringify(snapshot);
  for (const secret of ['/private/workspace', 'pytest --token', 'PRIVATE_OUTPUT', 'PRIVATE_TEST']) {
    assert.equal(serialized.includes(secret), false);
  }
});

test('old terminal outcomes become stale without losing safe summary fields', () => {
  const snapshot = projectStatusSnapshot({
    status: 'passed', runId: RUN_ID, finishedAt: NOW - STALE_AFTER_MS - 1,
    durationMs: 120, counts: { passed: 4 },
  }, { now: NOW });

  assert.equal(snapshot.status, 'stale');
  assert.equal(snapshot.lastStatus, 'passed');
  assert.equal(snapshot.counts.passed, 4);
  assert.equal(snapshot.correlationId, RUN_ID);
});

test('disabled workspaces remain disabled while active runs stay visible', () => {
  const finished = projectStatusSnapshot({
    status: 'failed', runId: RUN_ID, finishedAt: NOW, counts: { failed: 1 },
  }, { now: NOW, enabled: false });
  assert.equal(finished.status, 'disabled');
  assert.equal(finished.lastStatus, 'failed');

  const active = projectStatusSnapshot({
    status: 'running', runId: RUN_ID, startedAt: NOW, counts: {},
  }, { now: NOW, enabled: false });
  assert.equal(active.status, 'running');
});

test('session binding matches only a Host-visible id and caches the positive cwd briefly', async () => {
  let clock = NOW;
  let calls = 0;
  const resolver = createSessionWorkspaceResolver({
    async list(request, signal) {
      calls += 1;
      assert.deepEqual(request, {});
      assert.ok(signal);
      return { items: [
        { sessionId: 'other-session', cwd: '/private/other' },
        { sessionId: 'visible-session', cwd: '/workspace/project' },
      ] };
    },
  }, { now: () => clock });
  const signal = new AbortController().signal;

  assert.equal(await resolver('visible-session', signal), '/workspace/project');
  assert.equal(await resolver('visible-session', signal), '/workspace/project');
  assert.equal(calls, 1);

  clock += SESSION_BINDING_TTL_MS;
  assert.equal(await resolver('visible-session', signal), '/workspace/project');
  assert.equal(calls, 2);
  assert.equal(await resolver('not-visible', signal), null);
});

test('status handler rejects caller-supplied workspace parameters before resolving a session', async () => {
  let resolveCalls = 0;
  const handler = createStatusHandler({
    resolveSessionWorkspace: async () => { resolveCalls += 1; return '/workspace'; },
    state: { ready: Promise.resolve(), listForWorkspace: () => [] },
    fs: {},
    getConfig: () => ({ enabled: false }),
  });
  const response = await handler(new Request(
    'http://example.invalid/api/dsh-test-pilot/status?sessionId=visible-session&cwd=%2Fetc%2Fpasswd',
  ));

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'invalid-request');
  assert.equal(resolveCalls, 0);
});

test('status response is workspace-bound, no-store, and excludes run internals', async () => {
  const expectedKey = workspaceStorageKey('/workspace/project');
  const state = {
    ready: Promise.resolve(),
    listForWorkspace(cwd, key, limit) {
      assert.equal(cwd, '/workspace/project');
      assert.equal(key, expectedKey);
      assert.equal(limit, 50);
      return [{
        status: 'passed',
        runId: RUN_ID,
        runner: 'pytest',
        startedAt: NOW - 500,
        finishedAt: NOW,
        durationMs: 500,
        counts: { total: 3, passed: 3 },
        cwd: '/workspace/project',
        command: 'pytest --token=secret',
        output: 'PRIVATE_OUTPUT',
        failures: [{ file: '/workspace/project/test_private.py', testName: 'PRIVATE_TEST' }],
      }];
    },
  };
  const handler = createStatusHandler({
    resolveSessionWorkspace: async (sessionId) => sessionId === 'visible-session' ? '/workspace/project' : null,
    state,
    fs: {},
    getConfig: () => ({ enabled: true, runner: 'pytest', command: 'pytest' }),
    now: () => NOW,
  });
  const response = await handler(new Request(
    'http://example.invalid/api/dsh-test-pilot/status?sessionId=visible-session',
  ));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(body.status, 'passed');
  assert.equal(body.correlationId, RUN_ID);
  assert.equal(body.counts.passed, 3);
  assert.equal(Object.hasOwn(body, 'cwd'), false);
  assert.equal(Object.hasOwn(body, 'output'), false);
  assert.equal(JSON.stringify(body).includes('PRIVATE_OUTPUT'), false);
  assert.equal(JSON.stringify(body).includes('PRIVATE_TEST'), false);
});
