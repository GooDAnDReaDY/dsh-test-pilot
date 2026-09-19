import { createHash } from 'node:crypto';
import { mkdir as makeDirectory, readFile as readText } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { normalizeCounts, redactText } from './result.js';

export const PERSISTED_STATE_VERSION = 1;
export const MAX_PERSISTED_HISTORY = 50;
export const MAX_PERSISTED_WORKSPACES = 50;
export const MAX_PERSISTED_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const PERSISTABLE_STATUSES = new Set(['passed', 'failed', 'error', 'timeout']);
const MAX_COUNT = 1_000_000_000;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function emptyState() {
  return { schemaVersion: PERSISTED_STATE_VERSION, history: [], workspaces: {} };
}

function safeText(value, limit) {
  return redactText(value || '', limit).slice(0, limit);
}

export function workspaceStorageKey(cwd) {
  let path = resolve(String(cwd || process.cwd()));
  if (process.platform === 'win32') path = path.toLowerCase();
  return createHash('sha256').update(path).digest('hex');
}

function safeTestFile(value, cwd) {
  let file = String(value || '').trim().replace(/\\/g, '/');
  if (!file) return '';
  let workspace = '';
  try { workspace = resolve(String(cwd || process.cwd())).replace(/\\/g, '/').replace(/\/$/, ''); } catch (error) { void error; }
  if (workspace && file.startsWith(workspace + '/')) {
    file = file.slice(workspace.length + 1);
  } else if (file.startsWith('/') || /^[a-z]:\//i.test(file)) {
    file = basename(file);
  }
  file = file.replace(/^(?:\.\/)+/, '');
  if (file.split('/').includes('..')) file = basename(file);
  return safeText(file, 180);
}

function normalizeRecord(input, workspaceKey, now) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || !HASH_PATTERN.test(workspaceKey || '')) return null;
  if (!PERSISTABLE_STATUSES.has(input.status)) return null;
  const finishedAt = Number(input.finishedAt);
  if (!Number.isSafeInteger(finishedAt) || finishedAt < now - MAX_PERSISTED_AGE_MS || finishedAt > now + 60_000) return null;
  const counts = normalizeCounts(input.counts);
  for (const key of Object.keys(counts)) counts[key] = Math.min(MAX_COUNT, counts[key]);
  const failures = input.status === 'failed' && Array.isArray(input.failures)
    ? input.failures.slice(0, 20).map((failure) => ({
      file: safeText(failure?.file, 180),
      line: Number.isSafeInteger(Number(failure?.line)) && Number(failure.line) > 0 ? Number(failure.line) : null,
      testName: safeText(failure?.testName, 180),
    }))
    : [];
  return {
    workspaceKey,
    status: input.status,
    runner: safeText(input.runner || 'unknown', 80),
    finishedAt,
    durationMs: Math.max(0, Math.min(MAX_PERSISTED_AGE_MS, Number(input.durationMs) || 0)),
    counts,
    failures,
    correlationId: UUID_PATTERN.test(String(input.runId || input.correlationId || ''))
      ? String(input.runId || input.correlationId)
      : null,
  };
}

function withoutWorkspaceKey(record) {
  const { workspaceKey: _workspaceKey, ...value } = record;
  return value;
}

export function parsePersistedState(text, now = Date.now()) {
  let raw;
  try { raw = JSON.parse(String(text)); } catch { return emptyState(); }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schemaVersion !== PERSISTED_STATE_VERSION) {
    return emptyState();
  }
  const currentTime = Number.isSafeInteger(Number(now)) ? Number(now) : Date.now();
  const history = Array.isArray(raw.history)
    ? raw.history.map((entry) => normalizeRecord(entry, entry?.workspaceKey, currentTime)).filter(Boolean)
      .sort((left, right) => left.finishedAt - right.finishedAt).slice(-MAX_PERSISTED_HISTORY)
    : [];
  const workspaceEntries = raw.workspaces && typeof raw.workspaces === 'object' && !Array.isArray(raw.workspaces)
    ? Object.entries(raw.workspaces)
      .filter(([key]) => HASH_PATTERN.test(key))
      .map(([key, entry]) => normalizeRecord(entry, key, currentTime))
      .filter(Boolean)
      .sort((left, right) => right.finishedAt - left.finishedAt)
      .slice(0, MAX_PERSISTED_WORKSPACES)
    : [];
  const workspaces = Object.fromEntries(workspaceEntries.map((entry) => [entry.workspaceKey, entry]));
  return { schemaVersion: PERSISTED_STATE_VERSION, history, workspaces };
}

function recordsForRestore(state) {
  const records = new Map();
  for (const entry of [...state.history, ...Object.values(state.workspaces)]) {
    records.set(entry.workspaceKey + ':' + entry.finishedAt + ':' + entry.status, entry);
  }
  return [...records.values()].sort((left, right) => left.finishedAt - right.finishedAt);
}

function addRecord(state, record, now) {
  const history = [...state.history, record]
    .filter((entry) => entry.finishedAt >= now - MAX_PERSISTED_AGE_MS)
    .slice(-MAX_PERSISTED_HISTORY);
  const workspaces = { ...state.workspaces, [record.workspaceKey]: record };
  const retainedWorkspaces = Object.fromEntries(
    Object.entries(workspaces)
      .sort((left, right) => right[1].finishedAt - left[1].finishedAt)
      .slice(0, MAX_PERSISTED_WORKSPACES),
  );
  return { schemaVersion: PERSISTED_STATE_VERSION, history, workspaces: retainedWorkspaces };
}

function serializeState(state) {
  return JSON.stringify({
    schemaVersion: PERSISTED_STATE_VERSION,
    history: state.history,
    workspaces: Object.fromEntries(
      Object.entries(state.workspaces).map(([key, record]) => [key, withoutWorkspaceKey(record)]),
    ),
  }) + '\n';
}

function compactResult(cwd, result, now) {
  const status = result?.status;
  if (!PERSISTABLE_STATUSES.has(status)) return null;
  const workspaceKey = workspaceStorageKey(cwd);
  return normalizeRecord({
    status,
    runId: result.runId,
    runner: result.runner,
    finishedAt: result.finishedAt || now,
    durationMs: result.durationMs,
    counts: result.counts,
    failures: status === 'failed' && Array.isArray(result.failures)
      ? result.failures.slice(0, 20).map((failure) => ({
        file: safeTestFile(failure?.file, cwd),
        line: failure?.line,
        testName: failure?.testName,
      }))
      : [],
  }, workspaceKey, now);
}

export function createRunPersistence(options = {}) {
  let filePath = options.filePath || '';
  let writeFileAtomic = options.writeFileAtomic;
  let withFileLock = options.withFileLock;
  const readFile = options.readFile || readText;
  const makeDir = options.mkdir || makeDirectory;
  const now = options.now || Date.now;
  const onError = typeof options.onError === 'function' ? options.onError : () => {};
  let enabled = false;
  let state = emptyState();
  let operations = Promise.resolve();

  async function readState() {
    try {
      return parsePersistedState(await readFile(filePath, 'utf8'), now());
    } catch (error) {
      if (error?.code === 'ENOENT') return emptyState();
      throw error;
    }
  }

  const ready = (async () => {
    try {
      if (!filePath) {
        const { dshHomePath } = await import('@deepseek-ai/dsh-home-paths');
        filePath = dshHomePath('data', 'dsh-test-pilot', 'state.json');
      }
      if (typeof writeFileAtomic !== 'function' || typeof withFileLock !== 'function') {
        const atomicWrite = await import('@deepseek-ai/dsh-atomic-write');
        writeFileAtomic ||= atomicWrite.writeFileAtomic;
        withFileLock ||= atomicWrite.withFileLock;
      }
      state = await readState();
      enabled = true;
      return recordsForRestore(state);
    } catch (error) {
      try { onError(error); } catch (callbackError) { void callbackError; }
      enabled = false;
      return [];
    }
  })();

  function recordResultAndGetPrevious(cwd, result) {
    const task = operations.then(async () => {
      await ready;
      const entry = compactResult(cwd, result, now());
      const key = workspaceStorageKey(cwd);
      if (!enabled || !entry) return { available: false, previous: state.workspaces[key] || null };
      await makeDir(dirname(filePath), { recursive: true, mode: 0o700 });
      let previous = null;
      await withFileLock(filePath, async () => {
        const current = await readState();
        previous = current.workspaces[entry.workspaceKey] || null;
        const next = addRecord(current, entry, now());
        await writeFileAtomic(filePath, serializeState(next), { mode: 0o600, dirMode: 0o700 });
        state = next;
      });
      return { available: true, previous };
    });
    operations = task.then(() => undefined, () => undefined);
    return task;
  }

  function recordResult(cwd, result) {
    return recordResultAndGetPrevious(cwd, result).then((outcome) => outcome.available);
  }

  async function latestForWorkspace(cwd) {
    await ready;
    if (!enabled) return null;
    return state.workspaces[workspaceStorageKey(cwd)] || null;
  }

  return {
    ready,
    recordResult,
    recordResultAndGetPrevious,
    latestForWorkspace,
  };
}
