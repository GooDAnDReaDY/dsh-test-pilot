import { eventKey } from './state.js';
import { sessionId } from './workspace.js';

const WRITE_TOOLS = new Set(['write', 'edit', 'str_replace_editor']);
const MAX_PENDING_CALLS = 512;
const MAX_FILES_PER_TURN = 256;
const MAX_TRACKED_TURNS = 512;
const MAX_ARGUMENT_CHARS = 16384;

function dataOf(event) {
  return event?.data && typeof event.data === 'object' ? event.data : {};
}

function fileMutationForCall(event) {
  const data = dataOf(event);
  if (!WRITE_TOOLS.has(String(data.name || '').toLowerCase())) return null;
  let args = data.arguments;
  if (typeof args === 'string') {
    if (args.length > MAX_ARGUMENT_CHARS) return { paths: [], incomplete: true };
    try { args = JSON.parse(args); } catch { return { paths: [], incomplete: true }; }
  }
  if (!args || typeof args !== 'object') return { paths: [], incomplete: true };
  const path = args.file_path ?? args.filePath ?? args.path;
  if (typeof path !== 'string' || !path.trim() || path.length > 4096 || path.includes(String.fromCharCode(0))) {
    return { paths: [], incomplete: true };
  }
  return { paths: [path], incomplete: false };
}

function resultFailed(event) {
  const data = dataOf(event);
  if (data.error || event?.error) return true;
  const blocks = data.message?.content;
  return Array.isArray(blocks) && blocks.some((block) => (
    block?.isError === true
    || (typeof block?.text === 'string' && /^\s*Error(?:\s|:)/i.test(block.text))
  ));
}

function markTurnIncomplete(map, key) {
  const entry = map.get(key) || { paths: [], overflow: false };
  entry.overflow = true;
  map.delete(key);
  map.set(key, entry);
  while (map.size > MAX_TRACKED_TURNS) map.delete(map.keys().next().value);
}

function appendPaths(map, key, paths) {
  const entry = map.get(key) || { paths: [], overflow: false };
  const values = new Set(entry.paths);
  for (const path of paths) {
    if (values.has(path)) continue;
    if (values.size >= MAX_FILES_PER_TURN) {
      entry.overflow = true;
      break;
    }
    values.add(path);
  }
  entry.paths = [...values];
  map.delete(key);
  map.set(key, entry);
  while (map.size > MAX_TRACKED_TURNS) map.delete(map.keys().next().value);
}

export function createTurnChangeTracker(ctx = {}) {
  let workspaceChanges = ctx.workspaceChanges;
  const summaries = new Map();
  const writeCalls = new Map();
  const writesByTurn = new Map();

  function observe(session, event) {
    const sid = sessionId(session, event);
    const key = eventKey(session, event);
    const data = dataOf(event);

    if (event?.type === 'workspace/changes') {
      const sequence = event.seq ?? data.seq;
      let summary = null;
      try {
        if (sequence != null && typeof workspaceChanges?.summary === 'function') {
          summary = workspaceChanges.summary(sid, sequence);
        }
      } catch {}
      summaries.delete(key);
      summaries.set(key, {
        available: Boolean(summary && Array.isArray(summary.files)),
        summary: summary && Array.isArray(summary.files) ? summary : null,
      });
      while (summaries.size > MAX_TRACKED_TURNS) summaries.delete(summaries.keys().next().value);
      return;
    }

    if (event?.type === 'tool/call') {
      const callId = data.callId;
      const mutation = fileMutationForCall(event);
      if (callId == null || !mutation) return;
      const callKey = sid + ':' + String(callId);
      writeCalls.delete(callKey);
      writeCalls.set(callKey, { key, ...mutation });
      while (writeCalls.size > MAX_PENDING_CALLS) {
        const oldest = writeCalls.keys().next().value;
        const dropped = writeCalls.get(oldest);
        if (dropped) markTurnIncomplete(writesByTurn, dropped.key);
        writeCalls.delete(oldest);
      }
      return;
    }

    if (event?.type !== 'tool/result') return;
    const callId = data.callId;
    if (callId == null) return;
    const callKey = sid + ':' + String(callId);
    const call = writeCalls.get(callKey);
    writeCalls.delete(callKey);
    if (!call || resultFailed(event)) return;
    if (call.incomplete) markTurnIncomplete(writesByTurn, call.key);
    appendPaths(writesByTurn, call.key, call.paths);
  }

  function take(session, event) {
    const key = eventKey(session, event);
    const summaryRecord = summaries.get(key);
    const tracked = {
      summary: summaryRecord?.summary || null,
      summarySeen: Boolean(summaryRecord),
      writePaths: writesByTurn.get(key)?.paths || [],
      overflow: Boolean(writesByTurn.get(key)?.overflow || (summaryRecord && !summaryRecord.available)),
    };
    summaries.delete(key);
    writesByTurn.delete(key);
    for (const [callKey, call] of writeCalls) {
      if (call.key === key) writeCalls.delete(callKey);
    }
    return tracked;
  }

  return {
    observe,
    take,
    hasWorkspaceChanges() { return typeof workspaceChanges?.summary === 'function'; },
    hasSummary(session, event) { return summaries.has(eventKey(session, event)); },
    setWorkspaceChanges(service) { workspaceChanges = service; },
  };
}
