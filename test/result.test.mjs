import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatRunReport, normalizeRunResult } from '../lib/result.js';

test('formats argv commands consistently in queued state', () => {
  const result = normalizeRunResult({
    status: 'queued',
    command: ['go', 'test', './pkg/api'],
  });
  assert.equal(result.command, 'go test ./pkg/api');
});

test('keeps bounded test scope in structured history and the report', () => {
  const result = normalizeRunResult({
    status: 'passed',
    runner: 'vitest',
    testScope: {
      kind: 'related',
      source: 'workspaceChanges',
      changedFiles: ['src/parser.ts'],
      paths: ['test/parser.test.ts'],
    },
  });
  assert.equal(result.testScope.kind, 'related');
  assert.match(formatRunReport(result), /scope=related/);
  assert.match(formatRunReport(result), /test\/parser\.test\.ts/);
});

test('bounds paths and scope reason before persisting a result', () => {
  const result = normalizeRunResult({
    status: 'failed',
    testScope: {
      kind: 'full',
      paths: Array.from({ length: 40 }, (_, index) => 'tests/' + index + '.test.js'),
      reason: 'The mapping was incomplete.',
    },
  });
  assert.equal(result.testScope.paths.length, 32);
  assert.match(formatRunReport(result), /scope=full/);
  assert.match(formatRunReport(result), /mapping was incomplete/);
});
