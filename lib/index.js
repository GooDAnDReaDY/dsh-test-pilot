import Schema from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { randomUUID } from 'node:crypto';
import { formatRunReport, normalizeRunResult } from './result.js';
import { runTestCommand } from './runner.js';
import { createPilotState, eventKey } from './state.js';
import { sessionCwd, sessionId, workspaceHasChanges } from './workspace.js';

export const name = '@goodandready/dsh-test-pilot';
export const inject = ['tools', 'subprocess', 'settings'];
export const NS = name;

export const Config = Schema.object({
  enabled: Schema.boolean().default(true).description('Run tests automatically after a completed turn.'),
  runner: Schema.string().default('pytest').description('Runner adapter: pytest, jest, vitest, go, rust, tap or tsc.'),
  command: Schema.string().default('pytest -q').description('Executable and arguments; shell syntax is rejected.'),
  cwd: Schema.string().default('').description('Workspace directory; empty uses the session workspace.'),
  skipIfNoChanges: Schema.boolean().default(true).description('Skip a turn when git reports no workspace changes.'),
  timeoutMs: Schema.number().default(120000).description('Maximum test runtime in milliseconds.'),
  maxOutputBytes: Schema.number().default(200000).description('Per-stream in-memory output limit.'),
});

function liveConfig(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    enabled: input.enabled !== false,
    runner: String(input.runner || 'pytest').toLowerCase(),
    command: String(input.command || ''),
    cwd: String(input.cwd || ''),
    skipIfNoChanges: input.skipIfNoChanges !== false,
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

  const runNow = async (cwdOverride = '', event = null, session = null) => {
    const cfg = getConfig();
    const cwd = sessionCwd(session, event, cwdOverride || cfg.cwd);
    const id = randomUUID();
    state.start(id, {
      runner: cfg.runner, command: cfg.command, cwd, correlationId: id,
    });
    const result = await runTestCommand({
      subprocess: ctx.subprocess, cwd, runner: cfg.runner, command: cfg.command,
      timeoutMs: cfg.timeoutMs, maxOutputBytes: cfg.maxOutputBytes, correlationId: id,
    });
    return state.finish(id, normalizeRunResult(result));
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

  const emitReport = (session, event, result, key) => {
    const report = {
      source: name,
      sessionId: sessionId(session, event),
      correlationId: key,
      text: formatRunReport(result),
      result: normalizeRunResult(result),
    };
    try { ctx.emit?.('test-pilot/report', session, report); } catch {}
    try { ctx.emit?.('dsh-test-pilot/report', session, report); } catch {}
    appendChatReport(session, event, result);
  };

  const onTurnEnd = (session, event) => {
    if (event?.type !== 'turn/end') return;
    const cfg = getConfig();
    if (!cfg.enabled || !outcomeIsCompleted(event)) return;
    const key = eventKey(session, event);
    if (!state.claim(key)) return;
    const cwd = sessionCwd(session, event, cfg.cwd);
    const runId = randomUUID();
    state.queue(key, {
      runner: cfg.runner, command: cfg.command, cwd, runId, correlationId: key,
    });
    void enqueueWorkspaceRun(cwd, async () => {
      state.start(key, {
        runner: cfg.runner, command: cfg.command, cwd, runId, correlationId: key,
      });
      if (cfg.skipIfNoChanges) {
        const change = await workspaceHasChanges(ctx.subprocess, cwd);
        if (change.known && !change.changed) {
          const result = state.finish(key, {
            status: 'no-tests', runner: cfg.runner, command: cfg.command, cwd, runId,
            output: 'Skipped: workspace has no git changes.', correlationId: key,
          });
          emitReport(session, event, result, key);
          return;
        }
      }
      const result = await runTestCommand({
        subprocess: ctx.subprocess, cwd, runner: cfg.runner, command: cfg.command,
        timeoutMs: cfg.timeoutMs, maxOutputBytes: cfg.maxOutputBytes, correlationId: key,
      });
      const finished = state.finish(key, { ...result, runId });
      emitReport(session, event, finished, key);
    }).catch((error) => {
      const result = state.finish(key, {
        status: 'error', runner: cfg.runner, cwd: sessionCwd(session, event, cfg.cwd), runId,
        output: error?.message || String(error), correlationId: key,
      });
      emitReport(session, event, result, key);
    });
  };

  if (typeof ctx.effect === 'function' && typeof ctx.on === 'function') {
    ctx.effect(() => ctx.on('session/event', onTurnEnd), 'dsh-test-pilot: turn/end');
  } else if (typeof ctx.on === 'function') {
    ctx.on('session/event', onTurnEnd);
  }
  if (ctx.tools && typeof ctx.tools.register === 'function') {
    registerTools(ctx, state, (cwd) => runNow(cwd));
  } else if (typeof ctx.inject === 'function') {
    try { ctx.inject(['tools'], (tctx) => registerTools(tctx, state, (cwd) => runNow(cwd))); } catch {}
  }
  return { state, onTurnEnd };
}
