function readCollected(handle) {
  try {
    if (handle?.collected?.stdout?.readFrom) return handle.collected.stdout.readFrom(0).text || '';
    if (typeof handle?.stdout === 'string') return handle.stdout;
  } catch {}
  return '';
}
export async function workspaceHasChanges(subprocess, cwd) {
  if (!subprocess || typeof subprocess.spawn !== 'function') return { known: false, changed: true };
  try {
    const handle = subprocess.spawn({
      argv: ['git', 'status', '--porcelain', '--untracked-files=normal'],
      cwd: String(cwd || process.cwd()),
      stdio: { stdin: 'ignore', stdout: { maxBytes: 32000 }, stderr: { maxBytes: 8000 } },
      graceMs: 2000,
    });
    const outcome = await handle.done;
    if (outcome?.exitCode !== 0) return { known: false, changed: true };
    return { known: true, changed: Boolean(readCollected(handle).trim()) };
  } catch {
    return { known: false, changed: true };
  }
}
export function sessionCwd(session, event, configuredCwd = '') {
  if (configuredCwd) return String(configuredCwd);
  return String(event?.cwd || event?.data?.cwd || session?.workspace?.cwd || session?.meta?.cwd || session?.cwd || process.cwd());
}
export function sessionId(session, event) {
  return String(session?.id || event?.sessionId || event?.data?.sessionId || 'unknown');
}
