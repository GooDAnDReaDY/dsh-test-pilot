import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runTestCommand } from '../lib/runner.js';
function fakeSubprocess({ output = '', exitCode = 0, delayMs = 0, reject = false } = {}) {
  return {
    spawn() {
      let timer;
      const handle = {
        collected: {
          stdout: { readFrom: () => ({ text: output, lossy: false }) },
          stderr: { readFrom: () => ({ text: '' }) },
        },
        terminate() { if (timer) clearTimeout(timer); },
      };
      handle.done = new Promise((resolve, rejectDone) => {
        timer = setTimeout(() => reject ? rejectDone(new Error('spawn failed')) : resolve({ exitCode, signal: null }), delayMs);
      });
      return handle;
    },
  };
}
test('runs through argv and returns structured result', async () => {
  const result = await runTestCommand({
    subprocess: fakeSubprocess({ output: '================ 3 passed in 0.01s ================' }),
    cwd: '/workspace', runner: 'pytest', command: 'pytest -q',
  });
  assert.equal(result.status, 'passed');
  assert.equal(result.counts.passed, 3);
});
test('appends selector arguments as argv elements without a shell', async () => {
  let argv;
  const subprocess = {
    spawn(options) {
      argv = options.argv;
      return {
        collected: {
          stdout: { readFrom: () => ({ text: 'Test Suites: 1 passed, 1 total' }) },
          stderr: { readFrom: () => ({ text: '' }) },
        },
        done: Promise.resolve({ exitCode: 0 }),
      };
    },
  };
  await runTestCommand({
    subprocess, cwd: '/workspace', runner: 'jest', command: 'npx jest',
    args: ['--runTestsByPath', 'test/a.test.js'],
  });
  assert.deepEqual(argv, ['npx', 'jest', '--runTestsByPath', 'test/a.test.js']);
});

test('rejects NUL bytes in selector arguments before spawning', async () => {
  let spawned = false;
  const result = await runTestCommand({
    subprocess: { spawn() { spawned = true; } },
    cwd: '/workspace', runner: 'pytest', command: 'pytest -q', args: ['bad' + String.fromCharCode(0) + 'path'],
  });
  assert.equal(spawned, false);
  assert.match(result.output, /without NUL/);
});

test('classifies a non-zero runner exit', async () => {
  const result = await runTestCommand({
    subprocess: fakeSubprocess({ output: 'boom', exitCode: 2 }),
    cwd: '/workspace', runner: 'pytest', command: 'pytest -q',
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.exitCode, 2);
});
test('classifies timeout and invokes termination', async () => {
  let terminated = false;
  const subprocess = {
    spawn() {
      return {
        collected: { stdout: { readFrom: () => ({ text: '' }) }, stderr: { readFrom: () => ({ text: '' }) } },
        terminate() { terminated = true; },
        done: new Promise(() => {}),
      };
    },
  };
  const result = await runTestCommand({ subprocess, cwd: '/workspace', runner: 'pytest', command: 'pytest -q', timeoutMs: 10 });
  assert.equal(result.status, 'timeout');
  assert.equal(result.timedOut, true);
  assert.equal(terminated, true);
});
test('returns a bounded error when subprocess service is unavailable', async () => {
  const result = await runTestCommand({ cwd: '/workspace', runner: 'pytest', command: 'pytest -q' });
  assert.equal(result.status, 'failed');
  assert.match(result.output, /subprocess service/);
});
