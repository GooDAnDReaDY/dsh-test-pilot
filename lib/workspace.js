export function sessionCwd(session, event, configuredCwd = '') {
  if (configuredCwd) return String(configuredCwd);
  return String(event?.cwd || event?.data?.cwd || session?.workspace?.cwd || session?.meta?.cwd || session?.cwd || process.cwd());
}
export function sessionId(session, event) {
  return String(session?.id || event?.sessionId || event?.data?.sessionId || 'unknown');
}
