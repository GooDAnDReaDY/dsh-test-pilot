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
