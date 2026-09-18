import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveWorkspaceTestConfig } from '../lib/workspace-config.js';

function makeFs(files) {
  const entries = new Map(Object.entries(files).map(([path, value]) => [
    path,
    typeof value === 'string' ? value : value.content,
  ]));
  const sizeOf = (path) => Buffer.byteLength(entries.get(path) || '');
  return {
    async lstat(path) {
      return entries.has(path) ? { type: 'file', size: sizeOf(path) } : undefined;
    },
    async resolve(path) {
      return { path };
    },
    async stat(target) {
      return entries.has(target.path) ? { type: 'file', size: sizeOf(target.path) } : undefined;
    },
    async readText(target) {
      return entries.get(target.path);
    },
  };
}

test('auto-detects pytest from pytest.ini and pyproject pytest configuration', async () => {
  assert.equal((await resolveWorkspaceTestConfig(makeFs({ 'pytest.ini': '' }), '/repo', {})).runner, 'pytest');
  const pyproject = await resolveWorkspaceTestConfig(
    makeFs({ 'pyproject.toml': '[tool.pytest.ini_options]\naddopts = "-q"\n' }),
    '/repo',
    {},
  );
  assert.equal(pyproject.command, 'pytest -q');
});

test('uses a package test script and selects its known output parser', async () => {
  const result = await resolveWorkspaceTestConfig(
    makeFs({ 'package.json': JSON.stringify({ scripts: { test: 'vitest run' } }) }),
    '/repo',
    {},
  );
  assert.deepEqual({ runner: result.runner, command: result.command }, { runner: 'vitest', command: 'npm test' });
});

test('auto-detects Go, Cargo and Deno markers', async () => {
  assert.equal((await resolveWorkspaceTestConfig(makeFs({ 'go.mod': 'module example' }), '/repo', {})).runner, 'go');
  assert.equal((await resolveWorkspaceTestConfig(makeFs({ 'Cargo.toml': '[package]' }), '/repo', {})).runner, 'rust');
  assert.equal((await resolveWorkspaceTestConfig(makeFs({ 'deno.json': '{}' }), '/repo', {})).runner, 'deno');
});

test('chooses the longest matching workspace path rule', async () => {
  const result = await resolveWorkspaceTestConfig(null, '/work/app/packages/api', {
    workspaceRules: [
      { path: '/work/app', runner: 'jest', command: 'npm test' },
      { path: '/work/app/packages/api', runner: 'go', command: 'go test ./...' },
    ],
  });
  assert.equal(result.runner, 'go');
});

test('keeps the legacy runner as a rule at the current workspace root', async () => {
  const result = await resolveWorkspaceTestConfig(null, '/repo', { runner: 'pytest', command: 'pytest -q' });
  assert.deepEqual({ runner: result.runner, command: result.command }, { runner: 'pytest', command: 'pytest -q' });
});

test('returns no runner for unknown workspaces and oversized config files', async () => {
  assert.equal(await resolveWorkspaceTestConfig(makeFs({}), '/repo', {}), null);
  const large = 'x'.repeat(128 * 1024 + 1);
  assert.equal(await resolveWorkspaceTestConfig(makeFs({ 'package.json': large }), '/repo', {}), null);
});
test('uses the generic npm adapter for an unrecognized package test script', async () => {
  const result = await resolveWorkspaceTestConfig(
    makeFs({ 'package.json': JSON.stringify({ scripts: { test: 'mocha' } }) }), '/repo', {},
  );
  assert.deepEqual({ runner: result.runner, command: result.command }, { runner: 'npm', command: 'npm test' });
});
