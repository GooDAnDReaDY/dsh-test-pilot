import { formatRunReport } from './result.js'

export function outcomeIsCompleted(event) {
  const outcome = String(
    event?.outcome || event?.data?.outcome || event?.data?.reason?.kind
    || event?.result?.outcome || event?.result?.status || '',
  ).toLowerCase();
  return !outcome || ['success', 'ok', 'done', 'completed', 'complete'].includes(outcome);
}

export function mutationPathForExecution(exec) {
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

export function appendDecisionContext(decision, context) {
  return {
    ...decision,
    additionalContexts: [
      ...(Array.isArray(decision?.additionalContexts) ? decision.additionalContexts : []),
      context,
    ],
  };
}
export function appendChatReport(session, event, result, providerName) {
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
        source: { kind: 'model', provider: providerName, model: 'test-pilot' },
      },
    }, { surfaceOp: 'append' });
    return true;
  } catch {
    return false;
  }
}
