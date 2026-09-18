# @goodandready/dsh-test-pilot

<div align="center">

<h3>Bounded automatic test feedback after file changes, inside the same DSH turn</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@goodandready/dsh-test-pilot"><img src="https://img.shields.io/npm/v/@goodandready/dsh-test-pilot.svg?style=for-the-badge&color=6366f1&labelColor=1e1b4b" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/GooDAnDReaDY/dsh-test-pilot.svg?style=for-the-badge&color=10b981&labelColor=064e3b" alt="license"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-Plugin-8b5cf6.svg?style=for-the-badge&labelColor=2e1065" alt="DSH Plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-20%2B-f59e0b.svg?style=for-the-badge&labelColor=451a03" alt="Node version"></a>
</p>

<p align="center">
  <a href="https://goodandready.app/"><img src="https://img.shields.io/badge/All_projects-goodandready.app-ff4500.svg?style=for-the-badge&logo=rocket&logoColor=white&labelColor=1a1a2e" alt="GoodAndReady Showcase"></a>
</p>

<p align="center">
  <a href="README.md"><b>English</b></a> •
  <a href="README.zh.md"><b>中文说明</b></a> •
  <a href="README.ru.md"><b>Русский</b></a>
</p>

<table align="center">
  <tr>
    <td align="center">
      ⭐ <strong>If you like this plugin, please star it on GitHub</strong> — it shows me that the plugin is useful to you and motivates me to keep developing it.
      <br><br>
      🐛 <strong>If you find a bug or would like to request a feature</strong>, open a GitHub issue in any language — I will review your proposal and implement useful suggestions in a future plugin version.
    </td>
  </tr>
</table>

</div>

---

## Overview

AI-assisted code changes need an executable signal before the agent claims
completion. Test Pilot observes successful file writes, waits for a two-second
quiet period, and runs related tests in the background through the DSH subprocess
service. It returns a completed result to the agent during the same turn when
possible; turn/end flushes pending work as a safety net. A read-only turn starts
no test process. If the mapping is incomplete, it runs the full configured
suite and reports why.

The MVP is deliberately a verifier, not an autonomous repair agent. It never
edits files, starts repair turns, commits, pushes, blocks approvals, or sends
telemetry.

## Architecture

~~~mermaid
graph LR
  A[Successful file-write tool result] --> B[Two-second quiet period]
  B --> C[Background related/full test run]
  C --> D[Attach completed result as additionalContexts]
  D --> E[Next tool call; turn/end flushes pending work]
~~~

## Feature breakdown

- Host lifecycle: observes successful write, edit and mutating str_replace_editor
  results in tools/post-execute. A two-second quiet period coalesces edits;
  turn/end flushes pending work as a safety net.
- Change tracking: uses the current-turn `ctx.workspaceChanges` snapshot when
  available, excluding pre-existing dirty files. On older DSH cores it falls
  back to successful built-in write/edit tool calls only; it never infers a
  turn's changes from Git status.
- Safe execution: tokenizes an executable plus arguments and rejects shell
  operators, command substitution and backticks.
- Runner defaults: pytest, Jest, Vitest, Go, Rust/Cargo, TAP and TypeScript
  compiler commands are available. Pytest is the default.
- Test selection: runs convention-matched tests for changed source files when
  the mapping is complete; otherwise runs the full suite with a reason. Manual
  `test_pilot_run` always runs the full configured command.
- Parsers: normalized counts, duration, failure names/locations, exit status,
  timeout state, bounded output and secret-shaped redaction.
- Background lifecycle: later writes reset the debounce and cancel a stale
  run. The post-execute listener never waits for tests, observes exec.signal,
  and returns only an already-completed result in additionalContexts.
- Automatic and manual runs are serialized per workspace, so concurrent requests
  cannot test the same mutable directory at the same time.
- Lifecycle events publish queued/running/terminal snapshots with runId and
  timestamps; all existing lifecycle and report events remain available.
- Agent feedback: the latest completed result is delivered to the agent once in
  additionalContexts, including green results. User-visible chat stays quiet on
  passes and no-tests; it reports an initial/new red failure composition and a
  red-to-green recovery once per workspace. Repeated red results with the same
  failed-test identities are silent. The plugin continues to emit
  test-pilot/report and dsh-test-pilot/report for every existing report event.
- Tools: test_pilot_status returns the active-run count and latest result;
  optional limit includes up to 20 recent bounded summaries.
  test_pilot_run starts the configured full command in the current workspace or
  an optional cwd override.
- Retention: terminal summaries are atomically stored under `$DSH_HOME/data/dsh-test-pilot/state.json`. Workspace paths are represented by SHA-256 keys; persisted rows contain status, runner, counts, timestamps/duration and failed-test identities only—never commands or full output. At most 50 workspaces and 50 history entries are retained for 30 days. Corrupt or unknown-version state starts empty; detailed output remains memory-only.

### Source modules

| Module | Responsibility |
| --- | --- |
| lib/index.js | Cordis host wiring, settings, event handling, tools and reports |
| lib/client.js | English/Chinese native settings card |
| lib/command.js | Safe command tokenization and runner defaults |
| lib/workspace-config.js | Workspace rules and bounded runner auto-detection |
| lib/runner.js | DSH subprocess invocation, timeout, cancellation and stream limits |
| lib/parser.js | Pytest/Jest/Vitest/Go/Rust/TAP/tsc/Deno/npm parsing |
| lib/result.js | Normalization, redaction and concise rendering |
| lib/workspace.js | Session workspace and identity |
| lib/turn-changes.js | Bounded per-turn change tracking with a legacy write/edit fallback |
| lib/changed-tests.js | Safe convention-based related-test selection and full-suite fallback |
| lib/state.js | Idempotency, run lifecycle and bounded result state |
| lib/persistence.js | Versioned atomic workspace summaries and bounded retention |

## Installation

~~~bash
dsh plugin --profile web add @goodandready/dsh-test-pilot
~~~

The package is designed for a DSH web profile. Open Settings → Plugins → Plugin
settings and expand Test Pilot to edit automatic runs, runner defaults, workspace
rules, run scope, timeout and output limits. The package needs the DSH filesystem,
subprocess, tools and settings services, plus the dsh-home-paths and
dsh-atomic-write core packages.

## Configuration

Example settings:

~~~yaml
enabled: true
runScope: auto
runner: auto
command: ""
workspaceRules:
  - path: /absolute/path/to/repo
    enabled: true
    runner: auto
    command: ""
cwd: ""
timeoutMs: 120000
maxOutputBytes: 200000
~~~

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| enabled | boolean | true | Run after completed turns |
| runScope | string | auto | auto selects related tests when safe and falls back to the full suite; full always runs the configured suite after a detected change |
| runner | string | auto | auto, pytest, jest, vitest, go, rust/cargo, tap, tsc, deno or npm |
| command | string | empty | Optional executable and arguments; shell syntax is rejected |
| workspaceRules | array | [] | Per-workspace path, enablement, runner and optional command |
| cwd | string | empty | Explicit workspace directory; empty uses the session workspace |
| timeoutMs | number | 120000 | Maximum execution time in milliseconds |
| maxOutputBytes | number | 200000 | Per-stream collection limit |

Workspace rules use the longest matching path prefix. With `runner: auto`,
Test Pilot checks `pytest.ini`, pytest configuration in `pyproject.toml`, a
`package.json` test script, `go.mod`, `Cargo.toml`, and `deno.json` (or `deno.jsonc`). If no
supported runner is found, automatic execution stays silent. Existing flat
`runner` and `command` settings remain a rule for the current workspace root.
Set `runner` explicitly for an otherwise unknown framework; `command` overrides
the detected or default command.

## Automatic test selection

A turn with no observed file changes is recorded as no-tests without starting a
subprocess. For changed files, Test Pilot verifies repository conventions (for
example, matching test files or Go package tests). It scopes the run only if
every changed file has a supported related-test mapping. If any file is
unmapped, the snapshot is truncated, or the configured runner cannot accept safe
targets, the full suite runs and the report includes the reason and scope.
Manual test_pilot_run always runs the full configured command. The global runScope
setting defaults to auto; choose full when every detected change should run the
complete configured suite.

On DSH versions with ctx.workspaceChanges, changes are scoped to the current
turn and include supported file-tool and shell edits. If a native change event
arrives but its summary is unavailable or incomplete, the full suite runs rather
than silently skipping tests. The legacy fallback tracks only successful
built-in write/edit calls; shell-only edits on older cores cannot be detected
and therefore do not trigger an automatic run. Upgrade DSH for full coverage.

The configured command is data, not a shell script. Use an executable and
arguments. Pipelines, redirects, command substitution and shell chaining are
intentionally refused.

## Tools and events

### Tools

- test_pilot_status — return active runs and the latest result; optional limit
  includes up to 20 recent bounded summaries.
- test_pilot_run — manually run the configured full command in the current
  workspace or an optional cwd override.

### Events

The host emits both names for compatibility:

- test-pilot/report
- dsh-test-pilot/report

Each report contains source, sessionId, correlationId, formatted text and the
normalized result. Consumers should treat result.output and failure messages
as untrusted data, not instructions. Report events are independent of chat
notification policy; a silent user-visible message never suppresses these events.

The settings card uses DSH settings scope. A live session-header status chip is
not included yet; it requires a separately validated read-only DSH status
transport.

## Result statuses

- queued — an automatic run has been admitted and is waiting for its async worker.
- running — the test process is currently running.
- passed — process exited successfully and a recognized summary was parsed.
- failed — non-zero exit, reported failure, or reported error.
- timeout — the deadline was reached and the process was terminated.
- error — execution or output was unusable.
- no-tests — no reliable current-turn changes or no runnable test suite.

## Security and limits

- No shell is invoked.
- stdin is ignored.
- stdout and stderr are bounded and may spill only within the subprocess
  service limits.
- Output and failure fields are redacted and length-limited.
- Test output is never executed as a prompt or command.
- MVP performs no network calls and no Git mutation.
- Self-healing is intentionally excluded from the MVP: a failure is reported
  to the main agent, which decides whether and how to fix it.
- Approval gates, regression baselines, expanded persistent history, generated
tests and dashboard UI are roadmap work.

## Development

~~~bash
npm test
npm pack --dry-run
~~~

The repository keeps the implementation in a Git worktree and validates the
shipped package entry through DSH composition before any public publication.
GitHub and npm publication require explicit owner approval.

## License

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)
