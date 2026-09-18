import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTurnChangeTracker } from '../lib/turn-changes.js';

const session = { id: 'session-1' };

function toolEvent(type, turn, callId, extra = {}) {
  return { type, data: { turn, callId, ...extra } };
}

test('uses the core per-turn summary keyed by the workspace changes event sequence', () => {
  const calls = [];
  const tracker = createTurnChangeTracker({
    workspaceChanges: {
      summary(sessionId, sequence) {
        calls.push([sessionId, sequence]);
        return { total: 1, files: [{ path: 'src/app.ts' }] };
      },
    },
  });
  tracker.observe(session, {
    type: 'workspace/changes', seq: 42, data: { turn: 3 },
  });
  assert.deepEqual(calls, [['session-1', 42]]);
  assert.deepEqual(tracker.take(session, { type: 'turn/end', data: { turn: 3 } }), {
    summary: { total: 1, files: [{ path: 'src/app.ts' }] },
    summarySeen: true,
    writePaths: [],
    overflow: false,
  });
});

test('fallback tracks successful write/edit tool calls but ignores reads', () => {
  const tracker = createTurnChangeTracker();
  tracker.observe(session, toolEvent('tool/call', 1, 'read-1', {
    name: 'read', arguments: JSON.stringify({ file_path: 'src/read.ts' }),
  }));
  tracker.observe(session, toolEvent('tool/call', 1, 'write-1', {
    name: 'write', arguments: JSON.stringify({ file_path: 'src/app.ts', content: 'x' }),
  }));
  tracker.observe(session, toolEvent('tool/result', 1, 'write-1', {
    message: { content: [{ type: 'text', text: 'Updated file' }] },
  }));
  assert.deepEqual(tracker.take(session, { type: 'turn/end', data: { turn: 1 } }), {
    summary: null,
    summarySeen: false,
    writePaths: ['src/app.ts'],
    overflow: false,
  });
});

test('forces a full-suite fallback when a successful write has no reliable path', () => {
  const tracker = createTurnChangeTracker();
  tracker.observe(session, toolEvent('tool/call', 5, 'write-unknown', {
    name: 'write', arguments: JSON.stringify({ content: 'x' }),
  }));
  tracker.observe(session, toolEvent('tool/result', 5, 'write-unknown'));
  assert.deepEqual(tracker.take(session, { type: 'turn/end', data: { turn: 5 } }), {
    summary: null,
    summarySeen: false,
    writePaths: [],
    overflow: true,
  });
});

test('does not count a failed file mutation as a workspace change', () => {
  const tracker = createTurnChangeTracker();
  tracker.observe(session, toolEvent('tool/call', 2, 'edit-1', {
    name: 'edit', arguments: JSON.stringify({ file_path: 'src/app.ts' }),
  }));
  tracker.observe(session, toolEvent('tool/result', 2, 'edit-1', {
    message: { content: [{ type: 'tool-result', isError: true, text: 'stale write' }] },
  }));
  assert.deepEqual(tracker.take(session, { type: 'turn/end', data: { turn: 2 } }), {
    summary: null,
    summarySeen: false,
    writePaths: [],
    overflow: false,
  });
});

test('an unavailable native summary marks observed write paths incomplete', () => {
  const tracker = createTurnChangeTracker({});
  tracker.observe(session, {
    type: 'workspace/changes', seq: 99, data: { turn: 4 },
  });
  tracker.observe(session, toolEvent('tool/call', 4, 'write-2', {
    name: 'write', arguments: JSON.stringify({ file_path: 'src/fallback.ts' }),
  }));
  tracker.observe(session, toolEvent('tool/result', 4, 'write-2'));
  assert.deepEqual(tracker.take(session, { type: 'turn/end', data: { turn: 4 } }), {
    summary: null,
    summarySeen: true,
    writePaths: ['src/fallback.ts'],
    overflow: true,
  });
});

test('marks a native change with unavailable summary as incomplete', () => {
  const tracker = createTurnChangeTracker({});
  tracker.observe(session, {
    type: 'workspace/changes', seq: 100, data: { turn: 5 },
  });
  assert.deepEqual(tracker.take(session, { type: 'turn/end', data: { turn: 5 } }), {
    summary: null,
    summarySeen: true,
    writePaths: [],
    overflow: true,
  });
});
