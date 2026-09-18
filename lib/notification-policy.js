import { resolve } from 'node:path';

const RED_STATUSES = new Set(['failed', 'error', 'timeout']);

function failureComposition(result, cwd) {
  if (result?.status !== 'failed') return String(result?.status || 'red');
  const workspace = resolve(String(cwd || process.cwd())).replace(/\\/g, '/').replace(/\/$/, '');
  const identities = new Set();
  for (const failure of Array.isArray(result?.failures) ? result.failures : []) {
    let file = String(failure?.file || '').replace(/\\/g, '/').replace(/^(?:\.\/)+/, '');
    if (workspace && file.startsWith(workspace + '/')) file = file.slice(workspace.length + 1);
    else if (file.startsWith('/') || /^[a-z]:\//i.test(file)) file = file.split('/').pop();
    const line = Number(failure?.line);
    identities.add(JSON.stringify([
      file,
      Number.isSafeInteger(line) && line > 0 ? line : null,
      String(failure?.testName || ''),
    ]));
  }
  return [...identities].sort().join('\n');
}

export function shouldNotifyTransition(previous, current, cwd = '') {
  if (current?.status === 'passed') return RED_STATUSES.has(previous?.status);
  if (!RED_STATUSES.has(current?.status)) return false;
  if (previous?.status === 'passed') return true;
  if (!RED_STATUSES.has(previous?.status)) return true;
  return failureComposition(previous, cwd) !== failureComposition(current, cwd);
}
