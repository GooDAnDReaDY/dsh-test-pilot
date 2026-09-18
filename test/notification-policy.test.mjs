import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldNotifyTransition } from '../lib/notification-policy.js';

const passed = { status: 'passed' };
const failed = (...testNames) => ({
  status: 'failed',
  failures: testNames.map((testName) => ({
    file: 'tests/test_app.py',
    line: 12,
    testName,
  })),
});

test('initial pass and repeated passes stay silent; initial red is reported', () => {
  assert.equal(shouldNotifyTransition(null, passed), false);
  for (let index = 0; index < 10; index += 1) {
    assert.equal(shouldNotifyTransition(passed, passed), false);
  }
  assert.equal(shouldNotifyTransition(null, failed('test_one')), true);
});

test('green to red and red to green are reported once', () => {
  assert.equal(shouldNotifyTransition(passed, failed('test_one')), true);
  assert.equal(shouldNotifyTransition(failed('test_one'), passed), true);
});

test('red with the same failed-test composition stays silent regardless of order', () => {
  assert.equal(shouldNotifyTransition(failed('test_one', 'test_two'), failed('test_two', 'test_one')), false);
});

test('red with a changed failed-test composition is reported', () => {
  assert.equal(shouldNotifyTransition(failed('test_one'), failed('test_two')), true);
});

test('absolute current paths match persisted workspace-relative identities', () => {
  const previous = failed('test_one');
  const current = {
    status: 'failed',
    failures: [{
      file: '/repo/tests/test_app.py',
      line: 12,
      testName: 'test_one',
    }],
  };
  assert.equal(shouldNotifyTransition(previous, current, '/repo'), false);
});

test('repeated runner errors and timeouts do not repeat the same red notification', () => {
  assert.equal(shouldNotifyTransition({ status: 'error' }, { status: 'error', failures: [{ testName: 'detail' }] }), false);
  assert.equal(shouldNotifyTransition({ status: 'timeout' }, { status: 'timeout' }), false);
});

test('non-terminal outcomes and no-tests never notify', () => {
  assert.equal(shouldNotifyTransition(failed('test_one'), { status: 'no-tests' }), false);
  assert.equal(shouldNotifyTransition(passed, { status: 'running' }), false);
});
