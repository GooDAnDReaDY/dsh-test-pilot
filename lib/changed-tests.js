import {
  basename, dirname, extname, isAbsolute, posix, relative, resolve, sep,
} from 'node:path';
import { defaultCommand, parseCommand } from './command.js';

const MAX_CHANGED_FILES = 256;
const MAX_TEST_TARGETS = 64;
const JS_EXTENSIONS = ['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts'];

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function relativeToWorkspace(cwd, value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096 || value.includes(String.fromCharCode(0))) return null;
  const root = resolve(cwd || process.cwd());
  const absolute = isAbsolute(value) ? resolve(value) : resolve(root, value);
  const path = relative(root, absolute);
  if (!path || path === '.') return null;
  if (path === '..' || path.startsWith('..' + sep) || isAbsolute(path)) return null;
  return path.split(sep).join('/');
}

function collectChangedFiles(summary, writePaths, overflow) {
  if (summary && typeof summary === 'object' && Array.isArray(summary.files)) {
    const files = summary.files.map((file) => file?.path);
    const total = summary.total;
    return {
      source: 'workspaceChanges',
      files,
      complete: summary.truncated !== true && typeof total === 'number'
        && Number.isSafeInteger(total) && total === files.length
        && files.every((path) => typeof path === 'string' && path.length > 0),
    };
  }
  return {
    source: 'write-tools',
    files: Array.isArray(writePaths) ? writePaths : [],
    complete: !overflow,
  };
}

function isJavaScriptTest(path, runner) {
  const name = basename(path);
  if (/\.(?:test|spec)\.[^.]+$/i.test(name)) return true;
  return runner === 'deno' && /_test\.[^.]+$/i.test(name);
}

function isPythonTest(path) {
  return /^(?:test_.+|.+_test)\.py$/i.test(basename(path));
}

function jsCandidates(path) {
  const dir = dirname(path);
  const stem = basename(path, extname(path));
  const relativeDir = dir === '.' ? '' : dir;
  const roots = unique([
    dir,
    posix.join(dir, '__tests__'),
    posix.join('test', relativeDir),
    posix.join('tests', relativeDir),
    posix.join('__tests__', relativeDir),
    'test',
    'tests',
    '__tests__',
  ]);
  return roots.flatMap((root) => JS_EXTENSIONS.flatMap((extension) => [
    posix.join(root, stem + '.test.' + extension),
    posix.join(root, stem + '.spec.' + extension),
  ]));
}

function pythonCandidates(path) {
  const dir = dirname(path);
  const stem = basename(path, '.py');
  const relativeDir = dir === '.' ? '' : dir;
  return unique([
    posix.join(dir, 'test_' + stem + '.py'),
    posix.join(dir, stem + '_test.py'),
    posix.join('test', relativeDir, 'test_' + stem + '.py'),
    posix.join('tests', relativeDir, 'test_' + stem + '.py'),
    posix.join('test', 'test_' + stem + '.py'),
    posix.join('tests', 'test_' + stem + '.py'),
  ]);
}

async function isRegularFile(fs, cwd, path) {
  if (typeof fs?.lstat !== 'function') return false;
  try {
    return (await fs.lstat(path, { cwd }))?.type === 'file';
  } catch {
    return false;
  }
}

async function firstExisting(fs, cwd, candidates) {
  for (const candidate of unique(candidates)) {
    if (await isRegularFile(fs, cwd, candidate)) return candidate;
  }
  return '';
}

async function relatedTarget(fs, cwd, runner, path) {
  if (runner === 'pytest') {
    if (isPythonTest(path) && await isRegularFile(fs, cwd, path)) {
      return { kind: 'file', path };
    }
    if (extname(path).toLowerCase() !== '.py') return null;
    const testPath = await firstExisting(fs, cwd, pythonCandidates(path));
    return testPath ? { kind: 'file', path: testPath } : null;
  }

  if (runner === 'jest' || runner === 'vitest' || runner === 'tap' || runner === 'deno') {
    if (isJavaScriptTest(path, runner) && await isRegularFile(fs, cwd, path)) {
      return { kind: 'file', path };
    }
    if (!JS_EXTENSIONS.includes(extname(path).slice(1).toLowerCase())) return null;
    const testPath = await firstExisting(fs, cwd, jsCandidates(path));
    return testPath ? { kind: 'file', path: testPath } : null;
  }

  if (runner === 'go') {
    if (!path.endsWith('.go')) return null;
    const directory = dirname(path);
    if (basename(path).endsWith('_test.go')) {
      return { kind: 'go-package', path: directory === '.' ? '.' : './' + directory };
    }
    const testPath = await firstExisting(fs, cwd, [
      posix.join(directory, basename(path, '.go') + '_test.go'),
    ]);
    return testPath ? { kind: 'go-package', path: directory === '.' ? '.' : './' + directory } : null;
  }

  if (runner === 'rust' || runner === 'cargo') {
    const parts = path.split('/');
    if (parts[0] === 'tests' && parts.length === 2 && path.endsWith('.rs')) {
      const target = basename(path, '.rs');
      return await isRegularFile(fs, cwd, path) ? { kind: 'cargo-test', path, target } : null;
    }
    if (!path.endsWith('.rs')) return null;
    const relativePath = path.startsWith('src/') ? path.slice(4) : basename(path);
    const targetPath = posix.join('tests', relativePath);
    if (!targetPath.endsWith('.rs')) return null;
    const target = basename(targetPath, '.rs');
    return await isRegularFile(fs, cwd, targetPath)
      ? { kind: 'cargo-test', path: targetPath, target }
      : null;
  }

  return null;
}

function scopedCommand(runner, command, targets) {
  let argv;
  try { argv = parseCommand(command || defaultCommand(runner)); } catch { return null; }
  if (argv.includes('--')) return null;
  const paths = targets.map((target) => target.path.startsWith('-') ? './' + target.path : target.path);
  const scriptRunner = ['npm', 'pnpm', 'yarn'].includes(argv[0]);

  if (runner === 'pytest' || runner === 'deno' || runner === 'vitest' || runner === 'tap') {
    return { args: scriptRunner ? ['--', ...paths] : paths };
  }
  if (runner === 'jest') {
    const selection = ['--runTestsByPath', ...paths];
    return { args: scriptRunner ? ['--', ...selection] : selection };
  }
  if (runner === 'go' && argv[0] === 'go' && argv[1] === 'test') {
    const packagePaths = unique(targets.map((target) => target.path));
    const existing = argv.slice(2).filter((arg) => arg !== './...');
    return { command: [...argv.slice(0, 2), ...existing, ...packagePaths], args: [] };
  }
  if ((runner === 'rust' || runner === 'cargo') && argv[0] === 'cargo' && argv[1] === 'test') {
    const names = unique(targets.map((target) => target.target));
    if (names.length !== 1) return null;
    return { args: ['--test', names[0]] };
  }
  return null;
}

function fullSuite(reason, source, changedFiles) {
  return { kind: 'full', source, changedFiles, paths: [], args: [], reason };
}

export async function planChangedTests({
  summary = null, writePaths = [], overflow = false, cwd = process.cwd(), runner = '', command = '', fs = null,
} = {}) {
  const collected = collectChangedFiles(summary, writePaths, overflow);
  if (!collected.complete) {
    return fullSuite('The per-turn change list is incomplete.', collected.source, []);
  }
  if (!collected.files.length) {
    return {
      kind: 'none', source: collected.source, changedFiles: [], paths: [], args: [],
      reason: 'No current-turn file changes were observed.',
    };
  }
  if (collected.files.length > MAX_CHANGED_FILES) {
    return fullSuite('The changed-file count exceeds the targeted-run limit.', collected.source, []);
  }

  const changedFiles = unique(collected.files.map((path) => relativeToWorkspace(cwd, path)));
  if (!changedFiles.length || changedFiles.length !== unique(collected.files).length) {
    return fullSuite('At least one changed path is outside the current workspace or invalid.', collected.source, changedFiles);
  }

  const targets = [];
  for (const path of changedFiles) {
    const target = await relatedTarget(fs, cwd, String(runner).toLowerCase(), path);
    if (!target) {
      return fullSuite('No supported related test was found for every changed file.', collected.source, changedFiles);
    }
    targets.push(target);
  }

  const paths = unique(targets.map((target) => target.path));
  if (paths.length > MAX_TEST_TARGETS) {
    return fullSuite('The related-test count exceeds the targeted-run limit.', collected.source, changedFiles);
  }

  const plan = scopedCommand(String(runner).toLowerCase(), command, targets);
  if (!plan) {
    return fullSuite('This runner or command cannot safely target a subset.', collected.source, changedFiles);
  }
  return { kind: 'related', source: collected.source, changedFiles, paths, ...plan };
}
