import { workspaceStorageKey } from './persistence.js';
import { resolveWorkspaceTestConfig } from './workspace-config.js';

export const STATUS_ENDPOINT_PATH = '/api/dsh-test-pilot/status';
export const SESSION_BINDING_TTL_MS = 15_000;
export const SESSION_BINDING_MAX_ENTRIES = 128;
export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TERMINAL_STATUSES = new Set(['passed', 'failed', 'error', 'timeout']);
const MAX_COUNT = 1_000_000_000;
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: HEADERS });
}

export function isValidSessionId(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 256
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function safeTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const time = Number(value);
  return Number.isSafeInteger(time) && time >= 0 ? time : null;
}

function safeCount(value) {
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.min(MAX_COUNT, Math.floor(count)) : 0;
}

function safeCounts(value = {}) {
  return {
    total: safeCount(value.total),
    passed: safeCount(value.passed),
    failed: safeCount(value.failed),
    skipped: safeCount(value.skipped),
    errors: safeCount(value.errors),
    xfail: safeCount(value.xfailed ?? value.xfail),
    xpass: safeCount(value.xpassed ?? value.xpass),
  };
}

function safeCorrelationId(run) {
  const value = String(run?.runId || run?.correlationId || '');
  return UUID_PATTERN.test(value) ? value : null;
}

export function projectStatusSnapshot(run, options = {}) {
  const now = Number.isSafeInteger(options.now) ? options.now : Date.now();
  const enabled = options.enabled !== false;
  const status = String(run?.status || '');
  const active = status === 'queued' || status === 'running';
  const terminal = TERMINAL_STATUSES.has(status);
  let projectedStatus = 'unknown';

  if (active) projectedStatus = status;
  else if (!enabled) projectedStatus = 'disabled';
  else if (terminal && safeTime(run?.finishedAt) !== null) {
    projectedStatus = now - run.finishedAt > STALE_AFTER_MS
      ? 'stale'
      : status === 'passed' ? 'passed' : 'failed';
  }

  const startedAt = safeTime(run?.startedAt);
  const finishedAt = safeTime(run?.finishedAt);
  const updatedAt = active
    ? startedAt ?? safeTime(run?.queuedAt)
    : finishedAt;
  const durationMs = active && startedAt !== null
    ? Math.max(0, Math.min(STALE_AFTER_MS, now - startedAt))
    : Math.max(0, Math.min(STALE_AFTER_MS, Number(run?.durationMs) || 0));

  return {
    status: projectedStatus,
    lastStatus: active || terminal ? status : null,
    updatedAt,
    startedAt,
    finishedAt,
    durationMs,
    correlationId: safeCorrelationId(run),
    counts: safeCounts(run?.counts),
  };
}

export function createSessionWorkspaceResolver(sessionController, options = {}) {
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const cache = new Map();

  return async function resolveSessionWorkspace(sessionId, signal) {
    if (!isValidSessionId(sessionId) || typeof sessionController?.list !== 'function') return null;
    const currentTime = now();
    const cached = cache.get(sessionId);
    if (cached && cached.expiresAt > currentTime) {
      cache.delete(sessionId);
      cache.set(sessionId, cached);
      return cached.cwd;
    }
    if (cached) cache.delete(sessionId);

    const result = await sessionController.list({}, signal);
    const items = Array.isArray(result) ? result : result?.items;
    const row = Array.isArray(items)
      ? items.find((item) => item?.sessionId === sessionId)
      : null;
    const cwd = typeof row?.cwd === 'string'
      && row.cwd.length > 0
      && row.cwd.length <= 4096
      && !row.cwd.includes(String.fromCharCode(0))
      ? row.cwd
      : '';
    if (!cwd || signal?.aborted) return null;

    while (cache.size >= SESSION_BINDING_MAX_ENTRIES) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(sessionId, { cwd, expiresAt: currentTime + SESSION_BINDING_TTL_MS });
    return cwd;
  };
}

export function createStatusHandler(options) {
  const resolveSessionWorkspace = options.resolveSessionWorkspace;
  const getConfig = typeof options.getConfig === 'function' ? options.getConfig : () => ({});
  const now = typeof options.now === 'function' ? options.now : Date.now;

  return async function handleStatusRequest(request) {
    const url = new URL(request.url);
    const sessionIds = url.searchParams.getAll('sessionId');
    const sessionId = sessionIds[0];
    const hasUnexpectedParameter = Array.from(url.searchParams.keys()).some((key) => key !== 'sessionId');
    if (sessionIds.length !== 1 || hasUnexpectedParameter || !isValidSessionId(sessionId)) {
      return jsonResponse({ error: 'invalid-request' }, 400);
    }

    try {
      const sessionCwd = await resolveSessionWorkspace(sessionId, request.signal);
      if (!sessionCwd) return jsonResponse({ error: 'session-unavailable' }, 404);

      await options.state.ready;
      const config = getConfig() || {};
      const cwd = String(config.cwd || sessionCwd);
      const workspaceKey = workspaceStorageKey(cwd);
      const runs = options.state.listForWorkspace(cwd, workspaceKey, 50);
      const run = runs.find((entry) => entry.status === 'queued' || entry.status === 'running')
        || runs.find((entry) => TERMINAL_STATUSES.has(entry.status))
        || null;
      let enabled = config.enabled !== false;
      if (enabled) {
        const resolved = await resolveWorkspaceTestConfig(options.fs, cwd, config);
        if (resolved?.enabled === false) enabled = false;
      }

      return jsonResponse(projectStatusSnapshot(run, { enabled, now: now() }));
    } catch {
      return jsonResponse({ error: 'status-unavailable' }, 503);
    }
  };
}
