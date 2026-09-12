import { parseCommand, defaultCommand } from './command.js';
import { parseTestOutput } from './parser.js';

function appendBounded(parts, chunk, maxBytes) {
  parts.push(String(chunk));
  let value = parts.join('');
  while (Buffer.byteLength(value) > maxBytes && parts.length > 1) {
    parts.shift();
    value = parts.join('');
  }
  return Buffer.byteLength(value) > maxBytes ? value.slice(-maxBytes) : value;
}
function collectHandleOutput(handle, maxBytes) {
  const stdout = [];
  const stderr = [];
  if (handle?.collected?.stdout?.readFrom) {
    try { stdout.push(handle.collected.stdout.readFrom(0).text || ''); } catch {}
  }
  if (handle?.collected?.stderr?.readFrom) {
    try { stderr.push(handle.collected.stderr.readFrom(0).text || ''); } catch {}
  }
  if (typeof handle?.stdout === 'string') stdout.push(handle.stdout);
  if (typeof handle?.stderr === 'string') stderr.push(handle.stderr);
  return { stdout: appendBounded([], stdout.join(''), maxBytes), stderr: appendBounded([], stderr.join(''), maxBytes) };
}
export async function runTestCommand({
  subprocess, cwd, runner = 'pytest', command = '', timeoutMs = 120000,
  maxOutputBytes = 200000, signal, correlationId = '',
} = {}) {
  const selectedRunner = String(runner || 'pytest').toLowerCase();
  let argv;
  try { argv = parseCommand(command || defaultCommand(selectedRunner)); }
  catch (error) {
    return parseTestOutput({ runner: selectedRunner, command, cwd, exitCode: 1, output: error?.message || String(error), correlationId });
  }
  if (!subprocess || typeof subprocess.spawn !== 'function') {
    return parseTestOutput({ runner: selectedRunner, command: argv.join(' '), cwd, exitCode: 1, output: 'DSH subprocess service is unavailable', correlationId });
  }
  const controller = new AbortController();
  let timedOut = false;
  let timer = null;
  let timeoutResolve;
  const abort = () => { if (!controller.signal.aborted) controller.abort(new Error('test run cancelled')); };
  if (signal) {
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  }
  let handle;
  const started = Date.now();
  try {
    handle = subprocess.spawn({
      argv,
      cwd: String(cwd || process.cwd()),
      stdio: {
        stdin: 'ignore',
        stdout: { maxBytes: maxOutputBytes, spill: { maxBytes: maxOutputBytes * 4 } },
        stderr: { maxBytes: maxOutputBytes, spill: { maxBytes: maxOutputBytes * 4 } },
      },
      graceMs: 5000,
      signal: controller.signal,
    });
    const timeoutPromise = new Promise((resolve) => { timeoutResolve = resolve; });
    timer = setTimeout(() => {
      timedOut = true;
      abort();
      try { handle.terminate?.(); } catch {}
      timeoutResolve?.({ exitCode: null, signal: 'SIGTERM' });
    }, Math.max(1, Number(timeoutMs) || 120000));
    const outcome = await Promise.race([handle.done, timeoutPromise]);
    const streams = collectHandleOutput(handle, maxOutputBytes);
    let outputTruncated = false;
    try {
      outputTruncated = Boolean(handle?.collected?.stdout?.readFrom?.(0)?.lossy || handle?.collected?.stderr?.readFrom?.(0)?.lossy);
    } catch {}
    return parseTestOutput({
      runner: selectedRunner, command: argv.join(' '), cwd,
      exitCode: outcome?.exitCode == null ? 1 : outcome.exitCode, signal: outcome?.signal || null,
      timedOut, outputTruncated, output: [streams.stdout, streams.stderr].filter(Boolean).join('\n'),
      durationMs: Date.now() - started, correlationId,
    });
  } catch (error) {
    return parseTestOutput({
      runner: selectedRunner, command: argv.join(' '), cwd, exitCode: timedOut ? null : 1,
      timedOut, output: error?.message || String(error), durationMs: Date.now() - started, correlationId,
    });
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', abort);
  }
}