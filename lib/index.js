import Schema from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { randomUUID } from 'node:crypto';
import { formatRunReport, normalizeRunResult } from './result.js';
import { runTestCommand } from './runner.js';
import { resolveWorkspaceTestConfig } from './workspace-config.js';
import { createPilotState, eventKey } from './state.js';
import { planChangedTests } from './changed-tests.js';
import { createTurnChangeTracker } from './turn-changes.js';
import { sessionCwd, sessionId } from './workspace.js';

export const name = '@goodandready/dsh-test-pilot';
export const inject = ['tools', 'subprocess', 'settings', 'fs'];
export const NS = name;

export const Config = Schema.object({
  enabled: Schema.boolean().default(true).description('Run tests automatically after a completed turn.'),
  runner: Schema.string().default('auto').description('Runner adapter or auto-detect.'),
  command: Schema.string().default('').description('Optional executable and arguments; shell syntax is rejected.'),
  workspaceRules: Schema.array(Schema.object({
    path: Schema.string().default('').description('Absolute workspace path or parent path for this rule.'),
    enabled: Schema.boolean().default(true),
    runner: Schema.string().default('auto'),
    command: Schema.string().default(''),
  })).default([]),
  cwd: Schema.string().default('').description('Workspace directory; empty uses the session workspace.'),
  timeoutMs: Schema.number().default(120000).description('Maximum test runtime in milliseconds.'),
  maxOutputBytes: Schema.number().default(200000).description('Per-stream in-memory output limit.'),
});

function liveConfig(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    enabled: input.enabled !== false,
    runner: String(input.runner || 'auto').toLowerCase(),
    command: String(input.command || ''),
    workspaceRules: Array.isArray(input.workspaceRules) ? input.workspaceRules : [],
    cwd: String(input.cwd || ''),
    timeoutMs: Number(input.timeoutMs) > 0 ? Number(input.timeoutMs) : 120000,
    maxOutputBytes: Number(input.maxOutputBytes) > 0 ? Number(input.maxOutputBytes) : 200000,
  };
}

function outcomeIsCompleted(event) {
  const outcome = String(
    event?.outcome || event?.data?.outcome || event?.data?.reason?.kind
    || event?.result?.outcome || event?.result?.status || '',
  ).toLowerCase();
  return !outcome || ['success', 'ok', 'done', 'completed', 'complete'].includes(outcome);
}

function appendChatReport(session, event, result) {
  if (!session || typeof session.append !== 'function') return false;
  try {
    const turn = Number(event?.data?.turn ?? event?.turn ?? 0);
    const step = Number(event?.data?.step ?? event?.step ?? 0);
    session.append('assistant/message', {
      turn: Number.isFinite(turn) ? turn : 0,
      step: Number.isFinite(step) ? step : 0,
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: formatRunReport(result) }],
        source: { kind: 'model', provider: name, model: 'test-pilot' },
      },
    }, { surfaceOp: 'append' });
    return true;
  } catch {
    return false;
  }
}

function registerTools(ctx, state, runNow) {
  if (!ctx.tools || typeof ctx.tools.register !== 'function') return;
  const render = (_args, value) => [{ type: 'text', text: String(value || '') }];
  ctx.tools.register(defineTool({
    name: 'test_pilot_last_run',
    description: 'Show the latest bounded dsh-test-pilot result.',
    parameters: {},
    output: { schema: { type: 'string' }, render },
    async execute() {
      const result = state.latest();
      return result ? formatRunReport(result) + '\n\n' + JSON.stringify(result, null, 2) : 'No test-pilot run recorded yet.';
    },
  }));
  ctx.tools.register(defineTool({
    name: 'test_pilot_status',
    description: 'Show active test runs and the latest bounded result.',
    parameters: {},
    output: { schema: { type: 'string' }, render },
    async execute() {
      const result = state.latest();
      return JSON.stringify({ activeRuns: state.activeCount(), latest: result }, null, 2);
    },
  }));
  ctx.tools.register(defineTool({
    name: 'test_pilot_history',
    description: 'Show recent bounded test-pilot run summaries.',
    parameters: { limit: { type: 'number', description: 'Maximum number of runs, 1-20.' } },
    output: { schema: { type: 'string' }, render },
    async execute(args = {}) {
      const history = state.list(args.limit).map(({ output, ...summary }) => summary);
      return JSON.stringify(history, null, 2);
    },
  }));
  ctx.tools.register(defineTool({
    name: 'test_pilot_run',
    description: 'Run the configured bounded test command in the current workspace.',
    parameters: { cwd: { type: 'string', description: 'Workspace directory override.' } },
    output: { schema: { type: 'string' }, render },
    async execute(args = {}, execution = {}) {
      const result = await runNow(args.cwd || execution?.cwd || '');
      return formatRunReport(result) + '\n\n' + JSON.stringify(result, null, 2);
    },
  }));
}

export function apply(ctx, config = {}) {
  let getConfig = () => liveConfig(config);
  const state = createPilotState();
  const turnChanges = createTurnChangeTracker(ctx);
  const completedTurns = new Set();
  const workspaceChains = new Map();
  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['settings'], (sctx) => {
        const settings = sctx?.settings;
        if (settings?.register) {
          const scope = settings.register(NS, Config, { base: config });
          getConfig = () => liveConfig(scope?.get?.() || config);
        }
      });
    } catch {}
  }
  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['workspaceChanges'], (wctx) => turnChanges.setWorkspaceChanges(wctx?.workspaceChanges));
    } catch {}
  }

  const runNow = async (cwdOverride = '', event = null, session = null) => {
    const cfg = getConfig();
    const cwd = sessionCwd(session, event, cwdOverride || cfg.cwd);
    return enqueueWorkspaceRun(cwd, async () => {
      const testConfig = await resolveWorkspaceTestConfig(ctx.fs, cwd, cfg);
      if (!testConfig?.enabled || !testConfig.runner) {
        return normalizeRunResult({
          status: 'no-tests', runner: 'unknown', command: '', cwd,
          output: 'No supported test runner was detected for this workspace.',
          testScope: { kind: 'none', source: 'manual', changedFiles: [], paths: [], reason: 'No supported test runner was detected.' },
          correlationId: randomUUID(),
        });
      }
      const id = randomUUID();
      const testScope = {
        kind: 'full', source: 'manual', changedFiles: [], paths: [],
        reason: 'Manual runs always execute the full configured test command.',
      };
      state.start(id, {
        runner: testConfig.runner, command: testConfig.command, cwd, testScope, correlationId: id,
      });
      const result = await runTestCommand({
        subprocess: ctx.subprocess, cwd, runner: testConfig.runner, command: testConfig.command,
        timeoutMs: cfg.timeoutMs, maxOutputBytes: cfg.maxOutputBytes, correlationId: id,
      }).catch((error) => ({
        status: 'error', runner: testConfig.runner, command: testConfig.command, cwd,
        output: error?.message || String(error), correlationId: id,
      }));
      return state.finish(id, normalizeRunResult({ ...result, testScope }));
    });
  };
  const enqueueWorkspaceRun = (cwd, task) => {
    const workspaceKey = String(cwd || '');
    const previous = workspaceChains.get(workspaceKey) || Promise.resolve();
    const current = previous.then(task, task);
    workspaceChains.set(workspaceKey, current);
    const cleanup = () => {
      if (workspaceChains.get(workspaceKey) === current) workspaceChains.delete(workspaceKey);
    };
    current.then(cleanup, cleanup);
    return current;
  };

  const emitReport = (session, event, result, key, append = true) => {
    const report = {
      source: name,
      sessionId: sessionId(session, event),
      correlationId: key,
      text: formatRunReport(result),
      result: normalizeRunResult(result),
    };
    try { ctx.emit?.('test-pilot/report', session, report); } catch {}
    try { ctx.emit?.('dsh-test-pilot/report', session, report); } catch {}
    if (append) appendChatReport(session, event, result);
  };

  const onTurnEnd = async (session, event) => {
    if (event?.type !== 'turn/end' && event?.type !== 'workspace/changes') return;
    const key = eventKey(session, event);
    if (event.type === 'workspace/changes' && !completedTurns.has(key)) return;
    const cfg = getConfig();
    if (!cfg.enabled || (event.type === 'turn/end' && !outcomeIsCompleted(event))) return;
    if (event.type === 'turn/end' && turnChanges.hasWorkspaceChanges() && !turnChanges.hasSummary(session, event)) return;
    const changes = turnChanges.take(session, event);
    const cwd = sessionCwd(session, event, cfg.cwd);
    let testConfig;
    try { testConfig = await resolveWorkspaceTestConfig(ctx.fs, cwd, cfg); } catch { return; }
    if (!testConfig?.enabled || !testConfig.runner) return;
    if (!state.claim(key)) return;
    let selection;
    try {
      selection = await planChangedTests({
        summary: changes.summary, writePaths: changes.writePaths, overflow: changes.overflow,
        cwd, runner: testConfig.runner, command: testConfig.command, fs: ctx.fs,
      });
    } catch {
      selection = {
        kind: 'full', source: 'unknown', changedFiles: [], paths: [], args: [],
        reason: 'Related-test selection could not be completed.',
      };
    }
    if (selection.kind === 'none') {
      const skipped = state.finish(key, {
        status: 'no-tests', runner: testConfig.runner, command: '', cwd, runId: randomUUID(),
        testScope: selection, output: selection.reason, correlationId: key,
      });
      emitReport(session, event, skipped, key, false);
      return;
    }
    const runId = randomUUID();
    const command = selection.command || testConfig.command;
    const args = selection.kind === 'related' ? selection.args : [];
    const queued = state.queue(key, {
      runner: testConfig.runner, command, cwd, runId, correlationId: key, testScope: selection,
    });
    emitReport(session, event, queued, key, false);
    void enqueueWorkspaceRun(cwd, async () => {
      const running = state.start(key, {
        runner: testConfig.runner, command, cwd, runId, correlationId: key, testScope: selection,
      });
      emitReport(session, event, running, key, false);
      const result = await runTestCommand({
        subprocess: ctx.subprocess, cwd, runner: testConfig.runner, command, args,
        timeoutMs: cfg.timeoutMs, maxOutputBytes: cfg.maxOutputBytes, correlationId: key,
      });
      const finished = state.finish(key, { ...result, runId, testScope: selection });
      emitReport(session, event, finished, key);
    }).catch((error) => {
      const result = state.finish(key, {
        status: 'error', runner: testConfig.runner, command, cwd, runId, testScope: selection,
        output: error?.message || String(error), correlationId: key,
      });
      emitReport(session, event, result, key);
    });
  };

  const onSessionEvent = (session, event) => {
    turnChanges.observe(session, event);
    if (event?.type === 'turn/end' && outcomeIsCompleted(event)) {
      const key = eventKey(session, event);
      completedTurns.delete(key);
      completedTurns.add(key);
      while (completedTurns.size > 512) completedTurns.delete(completedTurns.values().next().value);
    }
    return onTurnEnd(session, event);
  };
  if (typeof ctx.effect === 'function' && typeof ctx.on === 'function') {
    ctx.effect(() => ctx.on('session/event', onSessionEvent), 'dsh-test-pilot: turn/end');
  } else if (typeof ctx.on === 'function') {
    ctx.on('session/event', onSessionEvent);
  }
  if (ctx.tools && typeof ctx.tools.register === 'function') {
    registerTools(ctx, state, (cwd) => runNow(cwd));
  } else if (typeof ctx.inject === 'function') {
    try { ctx.inject(['tools'], (tctx) => registerTools(tctx, state, (cwd) => runNow(cwd))); } catch {}
  }
  return { state, onTurnEnd, onSessionEvent };
}
