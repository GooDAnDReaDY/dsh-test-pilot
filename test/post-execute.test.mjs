import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apply } from '../lib/index.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createHost(exitCode = 0) {
  const listeners = new Map();
  const spawnCalls = [];
  const cleanups = [];
  const context = {
    inject() {},
    on(name, listener) {
      listeners.set(name, listener);
      return () => listeners.delete(name);
    },
    effect(effect) {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
      return cleanup;
    },
    tools: { register() {} },
    fs: {
      async lstat(path) {
        return path === 'tests/test_app.py' ? { type: 'file' } : undefined;
      },
    },
    subprocess: {
      spawn(options) {
        spawnCalls.push(options);
        return {
          collected: {
            stdout: { readFrom: () => ({ text: '1 passed' }) },
            stderr: { readFrom: () => ({ text: '' }) },
          },
          done: Promise.resolve({ exitCode }),
        };
      },
    },
    emit() {},
  };
  const session = {
    id: 'session-1',
    workspace: { cwd: '/repo' },
    appended: [],
    append(type, data) { this.appended.push({ type, data }); },
  };
  const plugin = apply(context, { runner: 'pytest', command: 'pytest -q' });
  return { context, listeners, spawnCalls, session, cleanups, plugin };
}

function startTurn(listeners, session, turn = 1) {
  listeners.get('session/event')(session, { type: 'turn/start', data: { turn } });
}

function writeExecution(session, signal, callId = 'write-1') {
  return {
    name: 'write',
    callId,
    arguments: { file_path: '/repo/src/app.py', content: 'updated' },
    signal,
    agent: { session },
  };
}

function successfulSubprocessResult() {
  return { isError: false, value: { path: '/repo/src/app.py' }, content: [] };
}

test('debounces writes and returns a fresh completed result in additionalContexts', async () => {
  const host = createHost();
  const { listeners, session } = host;
  const signal = new AbortController().signal;
  startTurn(listeners, session);
  const postExecute = listeners.get('tools/post-execute');

  await postExecute(writeExecution(session, signal), successfulSubprocessResult(), async () => ({ kind: 'accept' }));
  await sleep(1250);
  assert.equal(host.spawnCalls.length, 0);

  await postExecute(writeExecution(session, signal, 'write-2'), successfulSubprocessResult(), async () => ({ kind: 'accept' }));
  await sleep(1000);
  assert.equal(host.spawnCalls.length, 0);
  await sleep(1200);
  assert.equal(host.spawnCalls.length, 1);
  assert.deepEqual(host.spawnCalls[0].argv, ['pytest', '-q', 'tests/test_app.py']);

  for (let i = 0; i < 100 && host.plugin.state.latest()?.finishedAt == null; i += 1) await sleep(10);
  assert.ok(host.plugin.state.latest()?.finishedAt);
  const next = await postExecute({
    name: 'read',
    arguments: { file_path: '/repo/src/app.py' },
    signal,
    agent: { session },
  }, { isError: false, value: {}, content: [] }, async () => ({ kind: 'accept' }));
  assert.equal(next.additionalContexts?.length, 1);
  assert.match(next.additionalContexts[0].id, /^[0-9a-f-]{36}$/i);
  assert.equal(next.additionalContexts[0].role, 'user');
  assert.match(next.additionalContexts[0].content[0].text, /test-pilot/);
  await listeners.get('session/event')(session, { type: 'turn/end', data: { turn: 1, outcome: 'success' } });
  assert.equal(session.appended.length, 0, 'a green result is delivered to the agent but never appended to chat');
});

test('the first red result appends one user-visible transition report', async () => {
  const host = createHost(1);
  const { listeners, session, plugin } = host;
  session.workspace.cwd = '/repo-red-transition-' + Date.now() + '-' + Math.random();
  startTurn(listeners, session);
  const signal = new AbortController().signal;
  await listeners.get('tools/post-execute')(
    writeExecution(session, signal),
    successfulSubprocessResult(),
    async () => ({ kind: 'accept' }),
  );
  await listeners.get('session/event')(session, { type: 'turn/end', data: { turn: 1, outcome: 'success' } });
  for (let i = 0; i < 100 && session.appended.length === 0; i += 1) await sleep(10);
  assert.equal(plugin.state.latest()?.status, 'failed');
  assert.equal(session.appended.length, 1);
  assert.match(session.appended[0].data.message.content[0].text, /status=failed/);
});

test('aborting exec.signal cancels a pending debounce before subprocess spawn', async () => {
  const host = createHost();
  const { listeners, session } = host;
  const controller = new AbortController();
  startTurn(listeners, session);
  await listeners.get('tools/post-execute')(
    writeExecution(session, controller.signal),
    successfulSubprocessResult(),
    async () => ({ kind: 'accept' }),
  );
  controller.abort();
  await sleep(2100);
  assert.equal(host.spawnCalls.length, 0);
});

test('turn/end flushes a pending run immediately as a safety net', async () => {
  const host = createHost();
  const { listeners, session } = host;
  const signal = new AbortController().signal;
  startTurn(listeners, session, 7);
  await listeners.get('tools/post-execute')(
    writeExecution(session, signal),
    successfulSubprocessResult(),
    async () => ({ kind: 'accept' }),
  );
  await listeners.get('session/event')(session, { type: 'turn/end', data: { turn: 7 } });
  for (let i = 0; i < 50 && host.spawnCalls.length === 0; i += 1) await sleep(10);
  assert.equal(host.spawnCalls.length, 1);
});
