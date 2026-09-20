import { isAbsolute, relative, resolve, sep } from 'node:path';
import { defaultCommand } from './command.js';

const MAX_CONFIG_BYTES = 128 * 1024;
const RUNNERS = new Set(['pytest', 'jest', 'vitest', 'go', 'rust', 'tap', 'tsc', 'deno', 'npm']);

function normalizeRunner(value) {
  const runner = String(value || '').trim().toLowerCase();
  if (runner === 'cargo') return 'rust';
  if (runner === 'typescript') return 'tsc';
  return runner;
}

function containsPath(root, candidate) {
  const rel = relative(root, candidate);
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel));
}

function matchingRule(cwd, config) {
  const root = resolve(cwd || process.cwd());
  const rules = Array.isArray(config.workspaceRules) ? config.workspaceRules : [];
  const candidates = rules
    .filter((rule) => rule && typeof rule.path === 'string' && rule.path.trim())
    .map((rule, index) => ({ ...rule, index, path: resolve(root, rule.path) }))
    .filter((rule) => containsPath(rule.path, root));

  const legacyRunner = normalizeRunner(config.runner);
  const legacyCommand = String(config.command || '').trim();
  if ((legacyRunner && legacyRunner !== 'auto') || legacyCommand) {
    const legacyPath = resolve(config.cwd || root);
    if (containsPath(legacyPath, root)) {
      candidates.push({
        path: legacyPath,
        runner: legacyRunner,
        command: legacyCommand,
        enabled: true,
        index: rules.length,
      });
    }
  }
  candidates.sort((a, b) => b.path.length - a.path.length || a.index - b.index);
  return { root, rule: candidates[0] || null };
}

async function hasRegularFile(fs, file, cwd) {
  if (typeof fs?.lstat !== 'function') return false;
  try {
    return (await fs.lstat(file, { cwd }))?.type === 'file';
  } catch {
    return false;
  }
}

async function readSmallTextFile(fs, file, cwd) {
  if (
    typeof fs?.lstat !== 'function' || typeof fs.resolve !== 'function'
    || typeof fs.stat !== 'function' || typeof fs.readText !== 'function'
  ) return null;
  try {
    const entry = await fs.lstat(file, { cwd });
    if (entry?.type !== 'file' || typeof entry.size !== 'number' || entry.size > MAX_CONFIG_BYTES) return null;
    const target = await fs.resolve(file, { cwd });
    const info = await fs.stat(target);
    if (info?.type !== 'file' || typeof info.size !== 'number' || info.size > MAX_CONFIG_BYTES) return null;
    return await fs.readText(target);
  } catch {
    return null;
  }
}

async function detectRunner(fs, cwd) {
  if (await hasRegularFile(fs, 'pytest.ini', cwd)) {
    return { runner: 'pytest', command: 'pytest -q', source: 'pytest.ini' };
  }

  const pyproject = await readSmallTextFile(fs, 'pyproject.toml', cwd);
  if (pyproject && /^\s*\[tool\.pytest\.ini_options\]\s*$/m.test(pyproject)) {
    return { runner: 'pytest', command: 'pytest -q', source: 'pyproject.toml' };
  }

  const packageJson = await readSmallTextFile(fs, 'package.json', cwd);
  if (packageJson) {
    try {
      const script = String(JSON.parse(packageJson)?.scripts?.test || '').trim();
      if (script) {
        const runner = /\bvitest\b/i.test(script)
          ? 'vitest'
          : /\bjest\b/i.test(script) ? 'jest' : /\btap\b/i.test(script) ? 'tap' : 'npm';
        return { runner, command: 'npm test', source: 'package.json' };
      }
    } catch (error) { void error; }
  }

  if (await hasRegularFile(fs, 'go.mod', cwd)) {
    return { runner: 'go', command: 'go test ./...', source: 'go.mod' };
  }
  if (await hasRegularFile(fs, 'Cargo.toml', cwd)) {
    return { runner: 'rust', command: 'cargo test', source: 'Cargo.toml' };
  }
  if (await hasRegularFile(fs, 'deno.json', cwd) || await hasRegularFile(fs, 'deno.jsonc', cwd)) {
    return { runner: 'deno', command: 'deno test', source: 'deno.json' };
  }
  return null;
}

export async function resolveWorkspaceTestConfig(fs, cwd, config = {}) {
  const { root, rule } = matchingRule(cwd, config);
  if (rule?.enabled === false) return { enabled: false, cwd: root, source: 'workspace-rule' };

  const selectedRunner = normalizeRunner(rule?.runner);
  let detected = null;
  let runner = selectedRunner && selectedRunner !== 'auto' ? selectedRunner : '';
  if (!runner) {
    detected = await detectRunner(fs, root);
    runner = detected?.runner || '';
  }
  if (!runner || !RUNNERS.has(runner)) return null;

  const command = String(rule?.command || '').trim()
    || detected?.command
    || defaultCommand(runner);
  return {
    enabled: true,
    runner,
    command,
    cwd: root,
    source: detected?.source || (rule ? 'workspace-rule' : 'auto-detect'),
  };
}
