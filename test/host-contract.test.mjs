import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
const source = fs.readFileSync(new URL('../lib/index.js', import.meta.url), 'utf8');
const hostEvents = fs.readFileSync(new URL('../lib/host-events.js', import.meta.url), 'utf8');
const toolsSource = fs.readFileSync(new URL('../lib/agent-tools.js', import.meta.url), 'utf8');
test('host uses the confirmed native event and bounded subprocess service', () => {
  assert.match(source, /ctx\.on\('session\/event'/);
  assert.ok(source.includes('tools/post-execute'));
  assert.match(hostEvents, /additionalContexts/);
  assert.ok(source.includes('exec?.signal?.aborted'));
  assert.match(source, /workspace\/changes/);
  assert.match(source, /export const inject = .*workspaceChanges/);
  assert.match(source, /ctx\.inject\(\['workspaceChanges'\]/);
  assert.match(source, /event\?\.type !== 'turn\/end'/);
  assert.match(source, /ctx\.subprocess/);
  assert.match(source, /planChangedTests/);
  assert.ok(source.includes("'workspace/changes'"));
  assert.match(source, /testScope/);
  assert.ok(source.includes("runScope: currentValue(input.runScope) === 'full' ? 'full' : 'auto'"));
  assert.match(source, /cfg.runScope === 'full'/);
  assert.doesNotMatch(source, /workspaceHasChanges|git status/);
  assert.match(source, /return enqueueWorkspaceRun\(cwd/);
  assert.match(source, /workspaceChains/);
  assert.equal((toolsSource.match(/name: 'test_pilot_/g) || []).length, 2);
  assert.match(toolsSource, /name: 'test_pilot_status'/);
  assert.match(toolsSource, /name: 'test_pilot_run'/);
  assert.match(toolsSource, /resolveManualWorkspace\(ctx\.fs, workspace, args\.cwd \|\| ''\)/);
  assert.match(toolsSource, /execution\?\.agent\?\.session/);
  assert.match(toolsSource, /parameters: \{ limit: \{ type: 'number'/);
  assert.doesNotMatch(toolsSource, /test_pilot_(last_run|history)/);
  assert.match(source, /test-pilot\/report/);
  assert.match(source, /methods: \['GET'\],\s*requestBody: \x27none\x27/);
  assert.match(hostEvents, /session\.append\('assistant\/message'/);
});
test('MVP does not contain self-healing or automatic git mutation', () => {
  assert.doesNotMatch(source, /agents\.create|git\s+(commit|push)|repair turn/i);
});

test('host config exposes live fields to native settings and uses the current settings policy API', () => {
  assert.equal((source.match(/\.volatile\(\)/g) || []).length, 8);
  assert.match(source, /settings\?\.configure/);
  assert.match(source, /settings\.configure\(\{ auto: false \}, ctx\.fiber\)/);
  assert.doesNotMatch(source, /settings\.register\(/);
  assert.match(source, /currentValue\(input\.enabled\)/);
});
