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
import { createRunPersistence, workspaceStorageKey } from './persistence.js';
import { shouldNotifyTransition } from './notification-policy.js';
import { STATUS_ENDPOINT_PATH, createSessionWorkspaceResolver, createStatusHandler } from './status.js';

export const name = '@goodandready/dsh-test-pilot';
export const inject = ['tools', 'subprocess', 'settings', 'fs', 'connection', 'sessionController', 'workspaceChanges'];
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
  runScope: Schema.string().default('auto').description('Use related tests when safe, or run the full suite after changes.'),
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
    runScope: input.runScope === 'full' ? 'full' : 'auto',
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

function mutationPathForExecution(exec) {
  const name = String(exec?.name || '').toLowerCase();
  const args = exec?.arguments;
  if (!args || typeof args !== 'object') return null;
  if (name === 'write' || name === 'edit') {
    return { path: args.file_path ?? args.filePath ?? args.path };
  }
  if (name === 'str_replace_editor' && ['create', 'str_replace', 'insert'].includes(args.command)) {
    return { path: args.path };
  }
  return null;
}

function appendDecisionContext(decision, context) {
  return {
    ...decision,
    additionalContexts: [
      ...(Array.isArray(decision?.additionalContexts) ? decision.additionalContexts : []),
      context,
    ],
  };
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
    name: 'test_pilot_status',
    description: 'Show active runs and the latest result; optionally include recent summaries.',
    parameters: { limit: { type: 'number', description: 'Optional recent summaries to include, 1-20.' } },
    output: { schema: { type: 'string' }, render },
    async execute(args = {}) {
      await state.ready;
      const latest = state.latest();
      const result = { activeRuns: state.activeCount(), latest };
      const limit = Number(args.limit);
      if (Number.isSafeInteger(limit) && limit > 0) {
        result.history = state.list(Math.min(limit, 20)).map(({ output, ...summary }) => summary);
      }
      const summary = latest ? formatRunReport(latest) + '\n\n' : '';
      return summary + JSON.stringify(result, null, 2);
    },
  }));
  ctx.tools.register(defineTool({
    name: 'test_pilot_run',
    description: 'Run the configured full test command in the current or specified workspace.',
    parameters: { cwd: { type: 'string', description: 'Optional workspace directory; defaults to the current session.' } },
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
  const persistence = createRunPersistence({
    onError: (error) => {
      try { ctx.logger?.warn?.('dsh-test-pilot: persistent state is unavailable', error); } catch (logError) { void logError; }
    },
  });
  const workspaceOutcomes = new Map();
  state.ready = persistence.ready.then((records) => {
    state.restore(records);
    for (const record of records) {
      if (record.workspaceKey) workspaceOutcomes.set(record.workspaceKey, record);
    }
  });
  const turnChanges = createTurnChangeTracker(ctx);
  const currentTurnKeys = new Map();
  const turnRecords = new Map();
  const workspaceChains = new Map();
  let implicitTurnCounter = 0;
  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['settings'], (sctx) => {
        const settings = sctx?.settings;
        if (settings?.register) {
          const scope = settings.register(NS, Config, { base: config });
          getConfig = () => liveConfig(scope?.get?.() || config);
        }
      });
    } catch (error) { void error; }
  }
  if (ctx.connection?.fetch?.register && ctx.sessionController?.list) {
    const resolveSessionWorkspace = createSessionWorkspaceResolver(ctx.sessionController);
    const statusHandler = createStatusHandler({
      resolveSessionWorkspace,
      state,
      fs: ctx.fs,
      getConfig: () => getConfig(),
    });
    const registerStatusRoute = () => ctx.connection.fetch.register({
      path: STATUS_ENDPOINT_PATH,
      methods: ['GET'],
      fetch: statusHandler,
    });
    try {
      if (typeof ctx.effect === 'function') ctx.effect(registerStatusRoute, 'dsh-test-pilot: session status endpoint');
      else registerStatusRoute();
    } catch {
      try { ctx.logger?.warn?.('dsh-test-pilot: session status endpoint is unavailable'); } catch (logError) { void logError; }
    }
  }
  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['systemPrompt'], (pctx) => {
        const prompt = pctx?.systemPrompt;
        if (typeof prompt?.section !== 'function' || typeof prompt.getSectionOrder !== 'function') return;
        prompt.section({
          name: 'test-pilot:completion-check',
          order: prompt.getSectionOrder('TOOL_EDIT') + 10,
          text: 'After changing files, do not claim completion until Test Pilot reports a run that covers the latest changes. If no fresh result is available, call test_pilot_run and inspect its report. 修改文件后，只有 Test Pilot 报告覆盖最新修改时才能宣告完成。如果没有最新结果，请调用 test_pilot_run 并检查报告。',
        });
      });
    } catch (error) { void error; }
  }
  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['workspaceChanges'], (wctx) => turnChanges.setWorkspaceChanges(wctx?.workspaceChanges));
    } catch (error) { void error; }
  }

  const finishRun = async (cwd, key, result) => {
    const finished = state.finish(key, result);
    const workspaceKey = workspaceStorageKey(cwd);
    let previous = workspaceOutcomes.get(workspaceKey) || null;
    if (finished.status !== 'no-tests') {
      try {
        const outcome = await persistence.recordResultAndGetPrevious(cwd, finished);
        if (outcome.available) previous = outcome.previous;
      } catch (error) {
        try { ctx.logger?.warn?.('dsh-test-pilot: could not save completed run state', error); } catch (logError) { void logError; }
      }
      workspaceOutcomes.set(workspaceKey, finished);
    }
    return {
      finished,
      shouldNotifyChat: finished.status !== 'no-tests' && shouldNotifyTransition(previous, finished, cwd),
    };
  };

  const runNow = async (cwdOverride = '', event = null, session = null) => {
    await state.ready;
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
      return (await finishRun(cwd, id, normalizeRunResult({ ...result, testScope }))).finished;
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
    try { ctx.emit?.('test-pilot/report', session, report); } catch (emitError) { void emitError; }
    try { ctx.emit?.('dsh-test-pilot/report', session, report); } catch (emitError) { void emitError; }
    if (append) appendChatReport(session, event, result);
  };

  function clearRecordSignal(record) {
    if (record.signal && record.signalAbort) {
      try { record.signal.removeEventListener('abort', record.signalAbort); } catch (removeError) { void removeError; }
    }
    record.signal = null;
    record.signalAbort = null;
  }

  function cancelRecord(record, cancelled = true) {
    if (!record) return;
    if (record.timer) clearTimeout(record.timer);
    record.timer = null;
    if (record.controller) {
      try { record.controller.abort(); } catch (abortError) { void abortError; }
      record.controller = null;
    }
    clearRecordSignal(record);
    if (cancelled) record.cancelled = true;
  }

  function createTurnRecord(session, event, key) {
    const cfg = getConfig();
    const record = {
      key,
      sessionId: sessionId(session, event),
      session,
      event,
      cwd: sessionCwd(session, event, cfg.cwd),
      paths: new Set(),
      summary: null,
      overflow: false,
      generation: 0,
      launchedGeneration: 0,
      completedGeneration: 0,
      reportedGeneration: 0,
      timer: null,
      controller: null,
      signal: null,
      signalAbort: null,
      latestResult: null,
      shouldNotifyChat: false,
      contextDeliveredGeneration: 0,
      ended: false,
      cancelled: false,
    };
    turnRecords.set(key, record);
    while (turnRecords.size > 512) {
      const oldestKey = turnRecords.keys().next().value;
      const oldest = turnRecords.get(oldestKey);
      cancelRecord(oldest);
      turnRecords.delete(oldestKey);
      if (oldest && currentTurnKeys.get(oldest.sessionId) === oldestKey) currentTurnKeys.delete(oldest.sessionId);
    }
    return record;
  }

  function beginTurn(session, event) {
    const sid = sessionId(session, event);
    const key = eventKey(session, event);
    const previousKey = currentTurnKeys.get(sid);
    if (previousKey && previousKey !== key) {
      cancelRecord(turnRecords.get(previousKey));
      turnRecords.delete(previousKey);
    }
    const record = turnRecords.get(key) || createTurnRecord(session, event, key);
    record.session = session;
    record.event = event;
    record.ended = false;
    record.cancelled = false;
    currentTurnKeys.set(sid, key);
    return record;
  }

  function getTurnRecord(session, event = null) {
    const sid = sessionId(session, event);
    let key = currentTurnKeys.get(sid);
    if (!key) {
      key = event ? eventKey(session, event) : sid + ':implicit:' + (++implicitTurnCounter);
      currentTurnKeys.set(sid, key);
    }
    let record = turnRecords.get(key);
    if (!record) record = createTurnRecord(session, event, key);
    if (session) record.session = session;
    if (event) record.event = event;
    return record;
  }

  function addSnapshotPath(record, path) {
    if (typeof path !== 'string' || !path.trim() || path.length > 4096 || path.includes(String.fromCharCode(0))) {
      if (!record.overflow) record.generation += 1;
      record.overflow = true;
      return;
    }
    if (!record.paths.has(path)) {
      record.paths.add(path);
      record.generation += 1;
    }
  }

  function mergeTurnChanges(record, changes) {
    if (changes?.summary && Array.isArray(changes.summary.files)) {
      const previousSummary = record.summary;
      record.summary = changes.summary;
      for (const file of changes.summary.files) addSnapshotPath(record, file?.path);
      const total = changes.summary.total;
      const complete = changes.summary.truncated !== true
        && typeof total === 'number' && Number.isSafeInteger(total)
        && total === changes.summary.files.length
        && changes.summary.files.every((file) => typeof file?.path === 'string' && file.path.length > 0);
      if (!complete && record.launchedGeneration >= record.generation) record.generation += 1;
      if (previousSummary && previousSummary !== changes.summary && !complete
        && record.launchedGeneration >= record.generation) record.generation += 1;
    } else {
      for (const path of changes?.writePaths || []) addSnapshotPath(record, path);
    }
    if (changes?.overflow && !record.overflow) {
      record.overflow = true;
      record.generation += 1;
    }
  }

  function bindRecordSignal(record, signal) {
    clearRecordSignal(record);
    if (!signal || typeof signal.addEventListener !== 'function') return;
    record.signal = signal;
    record.signalAbort = () => {
      record.cancelled = true;
      if (record.timer) clearTimeout(record.timer);
      record.timer = null;
      if (record.controller) {
        try { record.controller.abort(signal.reason); } catch (abortError) { void abortError; }
        record.controller = null;
      }
    };
    if (signal.aborted) record.signalAbort();
    else signal.addEventListener('abort', record.signalAbort, { once: true });
  }

  function scheduleAutomaticRun(record, delayMs = 2000) {
    if (record.cancelled || !record.generation) return;
    if (record.timer) clearTimeout(record.timer);
    record.timer = setTimeout(() => {
      record.timer = null;
      void startAutomaticRun(record);
    }, delayMs);
  }

  async function startAutomaticRun(record) {
    const generation = record.generation;
    if (!generation || generation <= record.launchedGeneration || record.cancelled) return;
    await state.ready;
    if (generation !== record.generation || record.cancelled) return;
    const cfg = getConfig();
    if (!cfg.enabled) return;
    record.launchedGeneration = generation;
    const runId = randomUUID();
    const controller = new AbortController();
    record.controller = controller;
    const linkedSignal = record.signal;
    const cwd = record.cwd;
    const info = {
      runner: 'unknown', command: '', cwd, runId, correlationId: record.key,
    };
    const superseded = () => controller.signal.aborted || record.generation !== generation;

    const finish = async (result, testScope, publish = true) => {
      if (superseded()) {
        state.finish(runId, {
          ...info, status: 'no-tests', runId,
          output: 'Superseded by newer file changes or turn cancellation.',
          testScope: { kind: 'none', source: 'automatic', changedFiles: [], paths: [], reason: 'The run was superseded.' },
        });
        if (record.controller === controller) {
          record.controller = null;
          if (record.signal === linkedSignal) clearRecordSignal(record);
        }
        return;
      }
      const completion = await finishRun(cwd, runId, {
        ...info, ...result, runId, testScope, correlationId: record.key,
      });
      const finished = completion.finished;
      if (superseded()) return;
      record.completedGeneration = generation;
      if (record.controller === controller) {
        record.controller = null;
        if (record.signal === linkedSignal) clearRecordSignal(record);
      }
      if (!publish || finished.status === 'no-tests') return;
      record.latestResult = finished;
      record.shouldNotifyChat = completion.shouldNotifyChat;
      emitReport(record.session, record.event, finished, runId, false);
      if (record.ended && record.shouldNotifyChat && record.reportedGeneration < generation) {
        appendChatReport(record.session, record.event, finished);
        record.reportedGeneration = generation;
      }
    };

    try {
      const testConfig = await resolveWorkspaceTestConfig(ctx.fs, cwd, cfg);
      if (superseded()) { await finish({}, null, false); return; }
      if (!testConfig?.enabled || !testConfig.runner) {
        await finish({
          status: 'no-tests', runner: 'unknown', command: '',
          output: 'No supported test runner is configured for this workspace.',
        }, { kind: 'none', source: 'automatic', changedFiles: [], paths: [], reason: 'No supported test runner was configured.' }, false);
        return;
      }
      info.runner = testConfig.runner;
      info.command = testConfig.command;
      const selection = cfg.runScope === 'full'
        ? {
          kind: 'full', source: 'automatic', changedFiles: [], paths: [],
          reason: 'Full-suite scope was selected in settings.',
        }
        : await planChangedTests({
          summary: record.summary,
          writePaths: [...record.paths],
          overflow: record.overflow,
          cwd,
          runner: testConfig.runner,
          command: testConfig.command,
          fs: ctx.fs,
        });
      if (superseded()) return finish({}, selection, false);
      if (selection.kind === 'none') {
        await finish({ status: 'no-tests', output: selection.reason }, selection, false);
        return;
      }
      const command = selection.command || testConfig.command;
      const args = selection.kind === 'related' ? selection.args : [];
      const runInfo = {
        runner: testConfig.runner, command, cwd, runId,
        correlationId: record.key, testScope: selection,
      };
      state.queue(runId, runInfo);
      emitReport(record.session, record.event, state.get(runId), runId, false);
      const result = await enqueueWorkspaceRun(cwd, async () => {
        if (superseded()) return null;
        emitReport(record.session, record.event, state.start(runId, runInfo), runId, false);
        return runTestCommand({
          subprocess: ctx.subprocess, cwd, runner: testConfig.runner, command, args,
          timeoutMs: cfg.timeoutMs, maxOutputBytes: cfg.maxOutputBytes,
          signal: controller.signal, correlationId: record.key,
        });
      });
      if (!result) return finish({}, selection, false);
      info.runner = testConfig.runner;
      info.command = command;
      await finish(result, selection);
    } catch (error) {
      await finish({
        status: 'error', runner: info.runner, command: info.command, cwd,
        output: error?.message || String(error), correlationId: record.key,
      }, null);
    }
  }

  const onTurnEnd = async (session, event) => {
    if (event?.type !== 'turn/end') return;
    const sid = sessionId(session, event);
    const key = currentTurnKeys.get(sid) || eventKey(session, event);
    const record = turnRecords.get(key) || getTurnRecord(session, event);
    record.session = session;
    record.event = event;
    if (!outcomeIsCompleted(event)) {
      cancelRecord(record);
      currentTurnKeys.delete(sid);
      return;
    }

    record.ended = true;
    const changes = turnChanges.take(session, event);
    mergeTurnChanges(record, changes);
    if (record.generation > record.launchedGeneration && turnChanges.hasWorkspaceChanges() && !changes.summarySeen && !record.overflow) {
      record.overflow = true;
      record.generation += 1;
    }
    if (record.generation > record.launchedGeneration) {
      if (record.timer) clearTimeout(record.timer);
      record.timer = null;
      void startAutomaticRun(record);
    } else if (
      record.latestResult && record.completedGeneration === record.generation
      && record.shouldNotifyChat
      && record.reportedGeneration < record.completedGeneration
    ) {
      appendChatReport(session, event, record.latestResult);
      record.reportedGeneration = record.completedGeneration;
    }
    clearRecordSignal(record);
    currentTurnKeys.delete(sid);
  };

  const onSessionEvent = (session, event) => {
    turnChanges.observe(session, event);
    const sid = sessionId(session, event);
    if (event?.type === 'turn/start') {
      beginTurn(session, event);
      return;
    }
    if (event?.type === 'tool/call') {
      const observed = eventKey(session, event);
      const current = currentTurnKeys.get(sid);
      const hasExplicitTurn = event?.turnId != null || event?.data?.turnId != null || event?.data?.turn != null;
      if (!current || (hasExplicitTurn && current !== observed)) beginTurn(session, event);
      const record = turnRecords.get(currentTurnKeys.get(sid));
      if (record) {
        record.session = session;
        record.event = event;
      }
      return;
    }
    if (event?.type === 'turn/end') return onTurnEnd(session, event);
    if (event?.type === 'workspace/changes') {
      const record = turnRecords.get(eventKey(session, event));
      if (record?.ended) {
        const changes = turnChanges.take(session, event);
        const previousGeneration = record.generation;
        mergeTurnChanges(record, changes);
        if (record.generation > previousGeneration && record.generation > record.launchedGeneration) {
          if (record.timer) clearTimeout(record.timer);
          record.timer = null;
          void startAutomaticRun(record);
        }
      }
    }
  };

  if (typeof ctx.effect === 'function' && typeof ctx.on === 'function') {
    ctx.effect(() => ctx.on('session/event', onSessionEvent), 'dsh-test-pilot: session events');
    ctx.effect(() => () => {
      for (const record of turnRecords.values()) cancelRecord(record);
      turnRecords.clear();
      currentTurnKeys.clear();
    }, 'dsh-test-pilot: cancel automatic test runs');
  } else if (typeof ctx.on === 'function') {
    ctx.on('session/event', onSessionEvent);
  }

  if (typeof ctx.on === 'function') {
    ctx.on('tools/post-execute', async (exec, result, next) => {
      const session = exec?.agent?.session;
      const mutation = mutationPathForExecution(exec);
      if (!exec?.signal?.aborted && mutation && result?.isError !== true && getConfig().enabled) {
        const record = getTurnRecord(session);
        record.cwd = sessionCwd(session, null, getConfig().cwd);
        record.session = session;
        record.cancelled = false;
        record.shouldNotifyChat = false;
        record.generation += 1;
        record.latestResult = null;
        if (record.controller) {
          try { record.controller.abort(); } catch (abortError) { void abortError; }
          record.controller = null;
        }
        const path = mutation.path;
        if (typeof path === 'string' && path.trim() && path.length <= 4096 && !path.includes(String.fromCharCode(0))) {
          record.paths.add(path);
        } else {
          record.overflow = true;
        }
        bindRecordSignal(record, exec.signal);
        scheduleAutomaticRun(record);
      }

      const decision = await next();
      if (exec?.signal?.aborted) return decision;
      const record = session ? turnRecords.get(currentTurnKeys.get(sessionId(session))) : null;
      if (
        record?.latestResult
        && record.completedGeneration === record.generation
        && record.contextDeliveredGeneration < record.completedGeneration
        && record.latestResult.status !== 'no-tests'
      ) {
        const context = {
          id: randomUUID(),
          role: 'user',
          content: [{ type: 'text', text: formatRunReport(record.latestResult) }],
          source: { kind: 'plugin', plugin: name, form: 'notice', summary: 'test-pilot result' },
        };
        record.contextDeliveredGeneration = record.completedGeneration;
        return appendDecisionContext(decision, context);
      }
      return decision;
    });
  }

  if (ctx.tools && typeof ctx.tools.register === 'function') {
    registerTools(ctx, state, (cwd) => runNow(cwd));
  } else if (typeof ctx.inject === 'function') {
    try { ctx.inject(['tools'], (tctx) => registerTools(tctx, state, (cwd) => runNow(cwd))); } catch (error) { void error; }
  }
  return { state, onTurnEnd, onSessionEvent };
}
