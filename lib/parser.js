import { normalizeRunResult, redactText } from './result.js';

const ANSI_RE = /\u001b\[[0-?]*[ -/]*[@-~]/g;

function cleanOutput(output) {
  return String(output == null ? '' : output).replace(/\r\n?/g, '\n').replace(ANSI_RE, '');
}

function numberAfter(text, pattern) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : 0;
}

function countLines(text, pattern) {
  return text.split('\n').filter((line) => pattern.test(line)).length;
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
  return {
    counts,
    durationMs: summary?.[2] ? Number(summary[2]) * 1000 : 0,
    hasSummary: Boolean(summary) || Object.values(counts).some(Boolean),
  };
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

function parseGoSummary(text) {
  const passed = countLines(text, /^---\s+PASS:/);
  const failed = countLines(text, /^---\s+FAIL:/);
  const packagePassed = /^ok\s+\S+/m.test(text);
  const packageFailed = /^FAIL(?:\s|$)/m.test(text);
  const counts = {
    total: passed + failed || (packagePassed || packageFailed ? 1 : 0),
    passed: passed || (packagePassed && !packageFailed ? 1 : 0),
    failed: failed || (packageFailed ? 1 : 0),
    skipped: 0, errors: 0, xfailed: 0, xpassed: 0,
  };
  const duration = text.match(/^ok\s+.*?\s([\d.]+)s\s*$/m);
  return {
    counts,
    durationMs: duration ? Number(duration[1]) * 1000 : 0,
    hasSummary: packagePassed || packageFailed || passed > 0 || failed > 0,
  };
}

function parseRustSummary(text) {
  const match = text.match(/test result:\s+(ok|FAILED)\.\s+(\d+)\s+passed;\s+(\d+)\s+failed;\s+(\d+)\s+ignored;/i);
  if (!match) return { counts: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, xfailed: 0, xpassed: 0 }, durationMs: 0, hasSummary: false };
  const passed = Number(match[2]);
  const failed = Number(match[3]);
  const skipped = Number(match[4]);
  return {
    counts: { total: passed + failed + skipped, passed, failed, skipped, errors: 0, xfailed: 0, xpassed: 0 },
    durationMs: 0,
    hasSummary: true,
  };
}

function parseTapSummary(text) {
  const planned = numberAfter(text, /^1\.\.(\d+)\s*$/m);
  const passed = countLines(text, /^\s*ok\b/);
  const failed = countLines(text, /^\s*not ok\b/);
  return {
    counts: { total: planned || passed + failed, passed, failed, skipped: 0, errors: 0, xfailed: 0, xpassed: 0 },
    durationMs: 0,
    hasSummary: Boolean(planned || passed || failed),
  };
}

function parseGenericSummary(text) {
  return {
    counts: { total: 0, passed: 0, failed: 0, skipped: 0, errors: 0, xfailed: 0, xpassed: 0 },
    durationMs: 0,
    hasSummary: Boolean(text.trim()),
  };
}
function parseNodeSummary(text) {
  const count = (name) => numberAfter(text, new RegExp('^\\s*ℹ\\s+' + name + '\\s+(\\d+)\\s*$', 'm'));
  const total = count('tests');
  const passed = count('pass');
  const failed = count('fail');
  const cancelled = count('cancelled');
  const skipped = count('skipped');
  const todo = count('todo');
  const duration = numberAfter(text, /^ℹ\s+duration_ms\s+([\d.]+)\s*$/m);
  const hasSummary = /^ℹ\s+tests\s+\d+\s*$/m.test(text);
  return {
    counts: { total, passed, failed, skipped: skipped + todo, errors: cancelled, xfailed: 0, xpassed: 0 },
    durationMs: duration,
    hasSummary,
  };
}


function parseDenoSummary(text) {
  const match = text.match(/^(?:ok|FAILED)\s*\|\s*(\d+)\s+passed\s*\|\s*(\d+)\s+failed\b/im);
  if (!match) return parseGenericSummary(text);
  const passed = Number(match[1]);
  const failed = Number(match[2]);
  return {
    counts: { total: passed + failed, passed, failed, skipped: 0, errors: 0, xfailed: 0, xpassed: 0 },
    durationMs: 0,
    hasSummary: true,
  };
}

function parseTscSummary(text) {
  const match = text.match(/Found\s+(\d+)\s+errors?\.?/i);
  const errors = match ? Number(match[1]) : 0;
  return {
    counts: { total: 0, passed: 0, failed: 0, skipped: 0, errors, xfailed: 0, xpassed: 0 },
    durationMs: 0,
    hasSummary: Boolean(match),
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
  const tap = line.match(/^\s*not ok\s+\d+\s*-\s+(.+)$/i);
  if (tap) return { file: '', line: null, testName: tap[1], message: 'TAP reported a failure' };
  const rust = line.match(/^\s*test\s+(.+?)\s+\.\.\.\s+FAILED\s*$/i);
  if (rust) return { file: '', line: null, testName: rust[1], message: 'Rust test reported a failure' };
  const go = line.match(/^\s*---\s+FAIL:\s+(.+?)(?:\s+\((.+?)\))?$/i);
  if (go) return { file: '', line: null, testName: go[1], message: 'Go test reported a failure' };
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
  const parsed = selected === 'jest' || selected === 'vitest'
    ? parseJestSummary(text)
    : selected === 'go'
      ? parseGoSummary(text)
      : selected === 'rust' || selected === 'cargo'
        ? parseRustSummary(text)
        : selected === 'tap'
          ? parseTapSummary(text)
          : selected === 'tsc' || selected === 'typescript'
            ? parseTscSummary(text)
            : selected === 'deno'
              ? parseDenoSummary(text)
              : selected === 'npm'
                ? (() => {
                    const node = parseNodeSummary(text);
                    return node.hasSummary ? node : parseGenericSummary(text);
                  })()
                : parsePytestSummary(text);
  const failures = parseFailures(text, selected);
  let status = 'passed';
  if (timedOut) status = 'timeout';
  else if (exitCode !== 0 || signal || failures.length || parsed.counts.failed || parsed.counts.errors) status = 'failed';
  else if (!parsed.hasSummary && !text.trim()) status = 'no-tests';
  else if (!parsed.hasSummary) status = 'error';
  if (exitCode !== 0 && !failures.length && !parsed.counts.failed && !parsed.counts.errors) {
    failures.push({ file: '', line: null, testName: '', message: 'runner exited with code ' + exitCode });
  }
  return normalizeRunResult({
    status, runner: selected, command, cwd, exitCode, signal, timedOut,
    durationMs: durationMs || parsed.durationMs, counts: parsed.counts, failures,
    output: redactText(text, 12000), outputTruncated, correlationId,
  });
}
