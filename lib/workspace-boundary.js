export async function resolveManualWorkspace(fs, sessionWorkspace, requested = '') {
  const rootPath = String(sessionWorkspace || '').trim();
  if (!rootPath) throw new Error('Manual test runs require a verified session workspace.');
  if (
    typeof fs?.resolve !== 'function' || typeof fs?.contains !== 'function'
    || typeof fs?.stat !== 'function' || typeof fs?.processPath !== 'function'
  ) throw new Error('The filesystem provider cannot verify the session workspace.');

  const root = await fs.resolve(rootPath);
  const target = requested ? await fs.resolve(String(requested), { cwd: rootPath }) : root;
  if (!fs.contains(root, target)) {
    throw new Error('Manual test runs are restricted to the current session workspace.');
  }
  const info = await fs.stat(target);
  if (info?.type !== 'directory') throw new Error('The selected test workspace is not a directory.');
  const cwd = fs.processPath(target);
  if (typeof cwd !== 'string' || !cwd) throw new Error('The selected workspace cannot be used by the subprocess service.');
  return cwd;
}
