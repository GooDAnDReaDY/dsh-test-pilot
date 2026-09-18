import { normalizeRunResult } from './result.js';
export function createPilotState(maxKeys = 256) {
  const seen = new Set();
  const active = new Set();
  const runs = new Map();
  let latest = null;
  const remember = (key, result) => {
    const value = normalizeRunResult({ ...result, correlationId: result?.correlationId || key });
    runs.set(String(key), value);
    while (runs.size > maxKeys) runs.delete(runs.keys().next().value);
    latest = value;
    return value;
  };
  return {
    claim(key) {
      const value = String(key);
      if (seen.has(value) || active.has(value)) return false;
      seen.add(value);
      active.add(value);
      while (seen.size > maxKeys) seen.delete(seen.values().next().value);
      return true;
    },
    finish(key, result) {
      const previous = runs.get(String(key)) || {};
      active.delete(String(key));
      return remember(key, { ...previous, ...result, finishedAt: Date.now() });
    },
    queue(key, result = {}) {
      return remember(key, { ...result, status: 'queued', queuedAt: Date.now() });
    },
    start(key, result = {}) {
      const previous = runs.get(String(key)) || {};
      active.add(String(key));
      return remember(key, {
        ...previous, ...result, status: 'running',
        queuedAt: result.queuedAt || previous.queuedAt || Date.now(),
        startedAt: Date.now(),
      });
    },
    restore(records = []) {
      const ordered = Array.isArray(records) ? [...records].sort((a, b) => a.finishedAt - b.finishedAt) : [];
      let index = 0;
      for (const record of ordered) {
        const key = 'persisted:' + String(index++).padStart(3, '0');
        remember(key, { ...record, runId: key, correlationId: key, cwd: '', command: '', output: '' });
      }
    },
    latest() { return latest; },
    get(key) { return runs.get(String(key)) || null; },
    list(limit = 10) {
      const count = Math.min(Math.max(Number(limit) || 10, 1), 20, maxKeys);
      return Array.from(runs.values()).slice(-count).reverse();
    },
    activeCount() { return active.size; },
  };
}
export function eventKey(session, event) {
  const sid = session?.id || event?.sessionId || event?.data?.sessionId || 'unknown';
  const turn = event?.turnId || event?.data?.turnId || event?.data?.turn || event?.seq || event?.time || 'unknown';
  return String(sid) + ':' + String(turn);
}
