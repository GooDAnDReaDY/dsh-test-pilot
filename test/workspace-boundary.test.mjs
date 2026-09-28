import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
const pathResolve = path.resolve;
import { resolveManualWorkspace } from '../lib/workspace-boundary.js';

function filesystem(targets) {
  return {
    async resolve(path, options = {}) {
      const value = options.cwd && !path.startsWith('/')
        ? pathResolve(options.cwd, path)
        : path;
      const target = targets.get(value);
      if (!target) throw new Error('not found');
      return target;
    },
    contains(parent, child) {
      const base = parent.realPath.endsWith('/') ? parent.realPath.slice(0, -1) : parent.realPath;
      return child.realPath === parent.realPath || child.realPath.startsWith(base + '/');
    },
    async stat(target) { return { type: target.type }; },
    processPath(target) { return target.realPath; },
  };
}

test('manual runs resolve to the verified session workspace', async () => {
  const targets = new Map([
    ['/repo', { realPath: '/repo', type: 'directory' }],
    ['/repo/pkg', { realPath: '/repo/pkg', type: 'directory' }],
  ]);
  assert.equal(await resolveManualWorkspace(filesystem(targets), '/repo', 'pkg'), '/repo/pkg');
  assert.equal(await resolveManualWorkspace(filesystem(targets), '/repo'), '/repo');
});

test('manual runs reject traversal, outside absolute paths, missing workspace, and unresolved providers', async () => {
  const targets = new Map([
    ['/repo', { realPath: '/repo', type: 'directory' }],
    ['/outside', { realPath: '/outside', type: 'directory' }],
  ]);
  const fs = filesystem(targets);
  await assert.rejects(resolveManualWorkspace(fs, '/repo', '../../outside'), /restricted/);
  await assert.rejects(resolveManualWorkspace(fs, '/repo', '/outside'), /restricted/);
  await assert.rejects(resolveManualWorkspace(fs, '', ''), /verified session workspace/);
  await assert.rejects(resolveManualWorkspace({}, '/repo'), /cannot verify/);
});

test('manual runs reject a file as a workspace directory', async () => {
  const targets = new Map([
    ['/repo', { realPath: '/repo', type: 'directory' }],
    ['/repo/file.txt', { realPath: '/repo/file.txt', type: 'file' }],
  ]);
  await assert.rejects(resolveManualWorkspace(filesystem(targets), '/repo', 'file.txt'), /not a directory/);
});
