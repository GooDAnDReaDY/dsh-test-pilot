import { normalizeRunResult, redactText } from './result.js';

const ANSI_RE = /\u001b\[[0-?]*[ -/]*[@-~]/g;
function cleanOutput(output) {
  return String(output == null ? '' : output).replace(/\r\n?/g, '\n').replace(ANSI_RE, '');
}
function numberAfter(text, pattern) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : 0;
}
function parsePytestSummary(text) {
  const tail = text.split('\n').slice(-8).join(' ');
  const summary = text.match(/(\d+)\s+(?:passed|failed|skipped|xfailed|xpassed|error|errors)\b.*?(?:in\s+([\d.]+)s)?\s*=*\s*$/im);
  const counts = {
    total: 0,
    passed: numberAfter(tail, /(\d+)\s+passed\b/i),
    failed: numberAfter(tail, /(\d+)\s+failed\b/i),
    skipped: numberAfter(tail, /(\d+)\s+skipped\b/i),
    errors: numberAfter(tail, /(\d+)\s+errors?\b/i),
    xfailed: numberAfter(tail, /(\d+)\s+xfailed\b/i),
    xpassed: numberAfter(tail, /(\d+)\s+xpassed\b/i),
  };
  return { counts, durationMs: summary?.[2] ? Number(summary[2]) * 1000 : 0, hasSummary: Boolean(summary) || Object.values(counts).some(Boolean) };
}
function parseJestSummary(text) {
  const line = text.split('\n').reverse().find((item) => /^\s*Tests?:/i.test(item)) || '';
  return {
    counts: {
      total: numberAfter(line, /(\d+)\s+total\b/i),
      passed: numberAfter(line, /(\d+)\s+passed\b/i),
      failed: numberAfter(line, /(\d+)\s+failed\b/i),
      skipped: numberAfter(line, /(\d+)\s+skipped\b/i),
      errors: 0, xfailed: 0, xpassed: 0,
    },
    durationMs: 0,
    hasSummary: Boolean(line),
  };
}
function failureFromLine(line, runner) {
  const pytest = line.match(/^\s*(?:FAILED|ERROR)\s+(.+?)(?:::(.+?))?(?:\s+-\s+(.*))?$/i);
  if (pytest) {
    const location = pytest[1].match(/^(.*?)(?::(\d+))?$/);
    return {
      file: location?.[1] || pytest[1],
      line: location?.[2] ? Number(location[2]) : null,
      testName: pytest[2] || '',
      message: pytest[3] || (runner === 'pytest' ? 'pytest reported a failure' : ''),
    };
  }
  const jest = line.match(/^\s*[✕×x]\s+(.+?)(?:\s+\((.+?):(\d+):\d+\))?$/i);
  if (jest) return { file: jest[2] || '', line: jest[3] ? Number(jest[3]) : null, testName: jest[1], message: 'test reported a failure' };
  return null;
}
function parseFailures(text, runner) {
  const failures = [];
  for (const line of text.split('\n')) {
    const failure = failureFromLine(line, runner);
    if (failure && failures.length < 20) failures.push(failure);
  }
  return failures;
}
export function parseTestOutput({
  runner = 'pytest', output = '', exitCode = 0, signal = null, timedOut = false,
  outputTruncated = false, command = '', cwd = '', durationMs = 0, correlationId = '',
} = {}) {
  const text = cleanOutput(output);
  const selected = String(runner).toLowerCase();
  const parsed = selected === 'jest' || selected === 'vitest' ? parseJestSummary(text) : parsePytestSummary(text);
  const failures = parseFailures(text, selected);
  let status = 'passed';
  if (timedOut) status = 'timeout';
  else if (exitCode !== 0 || signal || failures.length || parsed.counts.failed || parsed.counts.errors) status = 'failed';
  else if (!parsed.hasSummary && !text.trim()) status = 'no-tests';
  else if (!parsed.hasSummary) status = exitCode === 0 ? 'passed' : 'error';
  if (exitCode !== 0 && !failures.length && !parsed.counts.failed && !parsed.counts.errors) {
    failures.push({ file: '', line: null, testName: '', message: 'runner exited with code ' + exitCode });
  }
  return normalizeRunResult({
    status, runner: selected, command, cwd, exitCode, signal, timedOut,
    durationMs: durationMs || parsed.durationMs, counts: parsed.counts, failures,
    output: redactText(text, 12000), outputTruncated, correlationId,
  });
}
