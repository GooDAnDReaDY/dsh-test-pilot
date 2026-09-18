import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPilotState, eventKey } from '../lib/state.js';
test('idempotency accepts one event and rejects duplicates', () => {
  const state = createPilotState();
  assert.equal(state.claim('s:1'), true);
  assert.equal(state.claim('s:1'), false);
  state.finish('s:1', { status: 'passed', runner: 'pytest', counts: { passed: 1 } });
  assert.equal(state.latest().counts.passed, 1);
  assert.equal(state.activeCount(), 0);
});
test('event key is stable across equivalent turn/end shapes', () => {
  assert.equal(eventKey({ id: 's1' }, { data: { turnId: 7 } }), eventKey({ id: 's1' }, { turnId: 7 }));
});
test('seen-key retention is bounded', () => {
  const state = createPilotState(2);
  state.claim('a'); state.finish('a', { status: 'passed' });
  state.claim('b'); state.finish('b', { status: 'passed' });
  state.claim('c'); state.finish('c', { status: 'passed' });
  assert.equal(state.claim('a'), true);
});
test('tracks queued, running and terminal snapshots for a run id', () => {
  const state = createPilotState();
  state.claim('run-1');
  assert.equal(state.queue('run-1', { runner: 'pytest' }).status, 'queued');
  assert.equal(state.start('run-1', { runner: 'pytest' }).status, 'running');
  assert.equal(state.latest().runId, 'run-1');
  assert.equal(state.activeCount(), 1);
  const finished = state.finish('run-1', { status: 'passed', runner: 'pytest' });
  assert.equal(finished.status, 'passed');
});
test('restores persisted results into the bounded diagnostic history', () => {
  const state = createPilotState();
  state.restore([
    { status: 'passed', runner: 'pytest', finishedAt: 10, counts: { passed: 2 } },
    { status: 'failed', runner: 'pytest', finishedAt: 20, counts: { failed: 1 } },
  ]);
  assert.equal(state.latest().status, 'failed');
  assert.deepEqual(state.list(2).map((run) => run.status), ['failed', 'passed']);
  assert.equal(state.latest().output, '');
});
test('returns newest bounded history first', () => {
  const state = createPilotState();
  state.claim('a'); state.finish('a', { status: 'passed' });
  state.claim('b'); state.finish('b', { status: 'failed' });
  assert.deepEqual(state.list(2).map((run) => run.runId), ['b', 'a']);
  assert.equal(state.list(1)[0].status, 'failed');
});
test('preserves lifecycle timestamps across snapshots', () => {
  const state = createPilotState();
  state.claim('run-2');
  const queued = state.queue('run-2');
  const running = state.start('run-2');
  const finished = state.finish('run-2', { status: 'passed' });
  assert.equal(typeof queued.queuedAt, 'number');
  assert.equal(running.queuedAt, queued.queuedAt);
  assert.equal(typeof running.startedAt, 'number');
  assert.ok(finished.finishedAt >= running.startedAt);
});
