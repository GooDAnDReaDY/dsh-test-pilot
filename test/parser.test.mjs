import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatRunReport } from '../lib/result.js';
import { parseTestOutput } from '../lib/parser.js';
test('parses a passing pytest run', () => {
  const result = parseTestOutput({
    runner: 'pytest',
    output: '============================= test session starts =============================\n============================== 42 passed in 1.23s ===============================',
    exitCode: 0,
  });
  assert.equal(result.status, 'passed');
  assert.equal(result.counts.passed, 42);
  assert.equal(result.durationMs, 1230);
});
test('parses pytest failures and locations', () => {
  const result = parseTestOutput({
    runner: 'pytest',
    output: 'FAILED tests/test_api.py::test_login - assert 401 == 200\n============================= 1 failed, 8 passed in 0.20s =============================',
    exitCode: 1,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.counts.failed, 1);
  assert.equal(result.counts.passed, 8);
  assert.equal(result.failures[0].file, 'tests/test_api.py');
  assert.equal(result.failures[0].testName, 'test_login');
});
test('parses collection errors and redacts secret-shaped output', () => {
  const result = parseTestOutput({
    runner: 'pytest',
    output: 'ERROR tests/test_config.py\npassword=super-secret\n============================= 1 error in 0.02s =============================',
    exitCode: 1,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.counts.errors, 1);
  assert.match(result.output, /password=\[REDACTED\]/);
  assert.doesNotMatch(result.output, /super-secret/);
});
test('parses a Jest-style summary', () => {
  const result = parseTestOutput({
    runner: 'jest',
    output: 'FAIL tests/api.test.js\nTests: 2 failed, 10 passed, 12 total',
    exitCode: 1,
  });
  assert.equal(result.status, 'failed');
  assert.equal(result.counts.failed, 2);
  assert.equal(result.counts.passed, 10);
  assert.equal(result.counts.total, 12);
});
test('classifies timeout, malformed output and empty output', () => {
  assert.equal(parseTestOutput({ runner: 'pytest', timedOut: true, exitCode: null }).status, 'timeout');
  assert.equal(parseTestOutput({ runner: 'pytest', output: 'garbage', exitCode: 0 }).status, 'error');
  assert.equal(parseTestOutput({ runner: 'pytest', output: '', exitCode: 0 }).status, 'no-tests');
});
test('report is concise and bounded to five failures', () => {
  const text = formatRunReport({
    status: 'failed', runner: 'pytest', exitCode: 1, counts: { failed: 6, passed: 2 },
    failures: Array.from({ length: 8 }, (_, index) => ({ file: 'x' + index + '.py', line: 1, message: 'boom' })),
  });
  assert.equal((text.match(/•/g) || []).length, 5);
  assert.ok(text.length < 1200);
});
test('parses Go, Rust, TAP and TypeScript compiler summaries', () => {
  const go = parseTestOutput({ runner: 'go', output: '--- PASS: TestHealth (0.01s)\nok example.test 0.01s', exitCode: 0 });
  assert.equal(go.status, 'passed');
  assert.equal(go.counts.passed, 1);

  const rust = parseTestOutput({ runner: 'rust', output: 'test result: ok. 3 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out', exitCode: 0 });
  assert.equal(rust.status, 'passed');
  assert.equal(rust.counts.total, 4);
  assert.equal(rust.counts.skipped, 1);

  const tap = parseTestOutput({ runner: 'tap', output: 'TAP version 13\n1..2\nok 1 - health\nok 2 - auth', exitCode: 0 });
  assert.equal(tap.status, 'passed');
  assert.equal(tap.counts.total, 2);

  const tsc = parseTestOutput({ runner: 'tsc', output: 'Found 0 errors.', exitCode: 0 });
  assert.equal(tsc.status, 'passed');
});
test('uses the exit status for an otherwise unrecognized npm test summary', () => {
  const result = parseTestOutput({ runner: 'npm', output: 'tests completed', exitCode: 0 });
  assert.equal(result.status, 'passed');
  assert.equal(result.counts.total, 0);
});
test('parses Deno summary counts', () => {
  const result = parseTestOutput({ runner: 'deno', output: 'ok | 2 passed | 0 failed (8ms)', exitCode: 0 });
  assert.equal(result.status, 'passed');
  assert.equal(result.counts.passed, 2);
});
test('parses the built-in Node.js test runner summary', () => {
  const output = [
    'ℹ tests 220',
    'ℹ pass 210',
    'ℹ fail 2',
    'ℹ cancelled 1',
    'ℹ skipped 3',
    'ℹ todo 4',
    'ℹ duration_ms 3091.77',
  ].join('\n');
  const result = parseTestOutput({ runner: 'npm', output, exitCode: 1 });
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.counts, {
    total: 220, passed: 210, failed: 2, skipped: 7, errors: 1, xfailed: 0, xpassed: 0,
  });
  assert.equal(result.durationMs, 3091.77);
});
test('Node.js summary failures remain red even when the process exit code is zero', () => {
  const result = parseTestOutput({ runner: 'npm', output: 'ℹ tests 2\nℹ pass 1\nℹ fail 1\nℹ duration_ms 4', exitCode: 0 });
  assert.equal(result.status, 'failed');
  assert.equal(result.counts.failed, 1);
});
