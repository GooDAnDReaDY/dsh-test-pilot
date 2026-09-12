import { normalizeRunResult } from './result.js';
export function createPilotState(maxKeys = 256) {
  const seen = new Set();
  const active = new Set();
  let latest = null;
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
      active.delete(String(key));
      latest = normalizeRunResult(result);
      return latest;
    },
    latest() { return latest; },
    activeCount() { return active.size; },
  };
}
export function eventKey(session, event) {
  const sid = session?.id || event?.sessionId || event?.data?.sessionId || 'unknown';
  const turn = event?.turnId || event?.data?.turnId || event?.data?.turn || event?.seq || event?.time || 'unknown';
  return String(sid) + ':' + String(turn);
}
