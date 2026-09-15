export const RUN_STATUSES = Object.freeze([
  'queued', 'running', 'passed', 'failed', 'error', 'timeout', 'no-tests',
]);
export const EMPTY_COUNTS = Object.freeze({
  total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, xfailed: 0, xpassed: 0,
});
export function redactText(value, maxChars = 4000) {
  let text = String(value == null ? '' : value).replace(/\r\n?/g, '\n').replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '');
  text = text.replace(/((?:token|secret|password|passwd|api[_-]?key|authorization)\s*[:=]\s*)(["']?)[^\s"',;]+/gi, '$1$2[REDACTED]');
  text = text.replace(/\b(?:ghp|github_pat|sk|xoxb|xoxp)_[A-Za-z0-9_-]{12,}\b/g, '[REDACTED]');
  return text.length <= maxChars ? text : '[output truncated]\n' + text.slice(-maxChars);
}
export function normalizeCounts(counts = {}) {
  const out = {};
  for (const key of Object.keys(EMPTY_COUNTS)) {
    const value = Number(counts[key]);
    out[key] = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }
  if (out.total === 0) out.total = out.passed + out.failed + out.skipped + out.errors + out.xfailed + out.xpassed;
  return out;
}
export function normalizeRunResult(input = {}) {
  const status = RUN_STATUSES.includes(input.status) ? input.status : 'error';
  const failures = Array.isArray(input.failures) ? input.failures.slice(0, 20).map((failure) => ({
    file: redactText(failure?.file || '', 240),
    line: Number.isFinite(Number(failure?.line)) ? Number(failure.line) : null,
    testName: redactText(failure?.testName || '', 240),
    message: redactText(failure?.message || '', 600),
  })) : [];
  return {
    status, runner: redactText(input.runner || 'unknown', 80), command: redactText(input.command || '', 240),
    cwd: redactText(input.cwd || '', 240), exitCode: input.exitCode == null ? null : Number(input.exitCode),
    signal: input.signal ? redactText(input.signal, 40) : null, timedOut: Boolean(input.timedOut),
    durationMs: Math.max(0, Number(input.durationMs) || 0), counts: normalizeCounts(input.counts),
    failures, output: redactText(input.output || '', 12000), outputTruncated: Boolean(input.outputTruncated),
    runId: redactText(input.runId || input.correlationId || '', 100),
    correlationId: redactText(input.correlationId || '', 100),
  };
}
export function formatRunReport(result) {
  const value = normalizeRunResult(result);
  const icon = value.status === 'passed'
    ? '✅'
    : value.status === 'queued'
      ? '⏳'
      : value.status === 'running'
        ? '🔄'
        : value.status === 'timeout'
          ? '⏱️'
          : '❌';
  const c = value.counts;
  const countParts = [];
  if (c.passed) countParts.push(c.passed + ' passed');
  if (c.failed) countParts.push(c.failed + ' failed');
  if (c.errors) countParts.push(c.errors + ' errors');
  if (c.skipped) countParts.push(c.skipped + ' skipped');
  if (c.xfailed) countParts.push(c.xfailed + ' xfailed');
  if (c.xpassed) countParts.push(c.xpassed + ' xpassed');
  if (!countParts.length) {
    countParts.push(
      value.status === 'no-tests'
        ? 'no tests'
        : value.status === 'queued'
          ? 'queued'
          : value.status === 'running'
            ? 'running'
            : 'no test counts',
    );
  }
  const duration = value.durationMs ? ' in ' + (value.durationMs / 1000).toFixed(2) + 's' : '';
  const lines = [icon + ' test-pilot · ' + value.runner + ' · ' + countParts.join(', ') + duration, 'status=' + value.status + ' exit=' + (value.exitCode == null ? 'n/a' : value.exitCode)];
  for (const failure of value.failures.slice(0, 5)) {
    const location = failure.file ? failure.file + (failure.line ? ':' + failure.line : '') : '';
    const title = failure.testName ? ' ' + failure.testName : '';
    const message = failure.message ? ' — ' + failure.message.split('\n')[0] : '';
    lines.push('  • ' + (location || 'failure') + title + message);
  }
  return lines.join('\n');
}
