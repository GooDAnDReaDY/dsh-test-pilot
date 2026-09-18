import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
const source = fs.readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8');
test('host uses the confirmed native event and bounded subprocess service', () => {
  assert.match(source, /ctx\.on\('session\/event'/);
  assert.ok(source.includes('tools/post-execute'));
  assert.match(source, /additionalContexts/);
  assert.ok(source.includes('exec?.signal?.aborted'));
  assert.match(source, /workspace\/changes/);
  assert.match(source, /ctx\.inject\(\['workspaceChanges'\]/);
  assert.match(source, /event\?\.type !== 'turn\/end'/);
  assert.match(source, /ctx\.subprocess/);
  assert.match(source, /planChangedTests/);
  assert.ok(source.includes("'workspace/changes'"));
  assert.match(source, /testScope/);
  assert.doesNotMatch(source, /workspaceHasChanges|git status/);
  assert.match(source, /return enqueueWorkspaceRun\(cwd/);
  assert.match(source, /workspaceChains/);
  assert.match(source, /test_pilot_history/);
  assert.match(source, /test-pilot\/report/);
  assert.match(source, /test_pilot_status/);
  assert.match(source, /session\.append\('assistant\/message'/);
});
test('MVP does not contain self-healing or automatic git mutation', () => {
  assert.doesNotMatch(source, /agents\.create|git\s+(commit|push)|repair turn/i);
});
