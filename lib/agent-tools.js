import { defineTool } from '@deepseek-ai/dsh-tools';
import { formatRunReport } from './result.js';
import { resolveManualWorkspace } from './workspace-boundary.js';

export function registerTools(ctx, state, runNow) {
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
    description: 'Run the configured full test command inside the current session workspace.',
    parameters: { cwd: { type: 'string', description: 'Optional path within the current session workspace; paths outside it are rejected.' } },
    output: { schema: { type: 'string' }, render },
    async execute(args = {}, execution = {}) {
      const session = execution?.agent?.session;
      const workspace = session?.workspace?.cwd || session?.meta?.cwd || session?.cwd || '';
      const cwd = await resolveManualWorkspace(ctx.fs, workspace, args.cwd || '');
      const result = await runNow(cwd, null, session);
      return formatRunReport(result) + '\n\n' + JSON.stringify(result, null, 2);
    },
  }));
}
