const FORBIDDEN_SHELL = /[;&|<>$()]/;
export function defaultCommand(runner) {
  const selected = String(runner).toLowerCase();
  if (selected === 'jest') return 'npx jest --runInBand';
  if (selected === 'vitest') return 'npx vitest run';
  if (selected === 'go') return 'go test ./...';
  if (selected === 'rust' || selected === 'cargo') return 'cargo test';
  if (selected === 'tap') return 'npm test';
  if (selected === 'tsc' || selected === 'typescript') return 'npx tsc --noEmit';
  return 'pytest -q';
}
export function parseCommand(command) {
  if (Array.isArray(command)) {
    if (!command.length || command.some((part) => typeof part !== 'string' || !part)) throw new Error('command array must contain non-empty strings');
    return command.slice();
  }
  const input = String(command || '').trim();
  if (!input) throw new Error('test command is empty');
  if (FORBIDDEN_SHELL.test(input) || input.includes(String.fromCharCode(96))) throw new Error('test command contains shell syntax; use an executable and arguments only');
  const argv = [];
  let token = '';
  let quote = '';
  let escaped = false;
  for (const char of input) {
    if (escaped) { token += char; escaped = false; }
    else if (char === '\\') escaped = true;
    else if (quote) { if (char === quote) quote = ''; else token += char; }
    else if (char === '"' || char === "'") quote = char;
    else if (/\s/.test(char)) { if (token) { argv.push(token); token = ''; } }
    else token += char;
  }
  if (escaped) token += '\\';
  if (quote) throw new Error('test command has an unterminated quote');
  if (token) argv.push(token);
  if (!argv.length) throw new Error('test command is empty');
  return argv;
}
