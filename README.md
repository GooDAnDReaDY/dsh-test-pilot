# @goodandready/dsh-test-pilot

<div align="center">

<h3>Bounded automatic test feedback after every completed DSH turn</h3>

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

AI-assisted code changes need an executable signal after the turn ends. Without
one, a plausible response can hide a broken test suite until much later.
Test Pilot listens to the native DSH session/event bus, detects a changed Git
workspace, runs a configured test command through the DSH subprocess service,
and posts a bounded result back to the session.

The MVP is deliberately a verifier, not an autonomous repair agent. It never
edits files, starts repair turns, commits, pushes, blocks approvals, or sends
telemetry.

## Architecture

~~~mermaid
graph LR
  A[Completed DSH turn] --> B[session/event turn/end]
  B --> C{Workspace changed?}
  C -- no --> D[no-tests report]
  C -- yes --> E[Safe argv parser]
  E --> F[ctx.subprocess.spawn]
  F --> G[Bounded stdout/stderr]
  G --> H[Runner parser]
  H --> I[Normalized redacted result]
  I --> J[Session assistant report]
  I --> K[test-pilot/report event]
  I --> L[Last-run diagnostic tool]
~~~

## Feature breakdown

- Host lifecycle: subscribes to session/event and handles completed turn/end
  events through the Cordis lifecycle.
- Workspace policy: uses Git porcelain status and the session workspace
  contract. A missing Git/subprocess service fails open to a test attempt.
- Safe execution: tokenizes an executable plus arguments and rejects shell
  operators, command substitution and backticks.
- Runner defaults: pytest, Jest, Vitest, Go, Rust/Cargo, TAP and TypeScript
  compiler commands are available. Pytest is the default.
- Parsers: normalized counts, duration, failure names/locations, exit status,
  timeout state, bounded output and secret-shaped redaction.
- Background lifecycle: automatic runs are admitted once per session/turn key,
  move through queued/running/finished states, and do not block the turn event
  handler.
- Automatic runs are serialized per workspace, so concurrent turn events
  cannot test the same mutable directory at the same time.
- Chat surface: one concise assistant/message is appended when the native
  session exposes append. The plugin also emits test-pilot/report and
  dsh-test-pilot/report for consumers that render their own surface.
- Diagnostics: test_pilot_last_run returns the latest queued, running or
  finished result; test_pilot_run starts a bounded manual run for the current
  workspace.
- Retention: only bounded run records and event keys are retained in memory.

### Source modules

| Module | Responsibility |
| --- | --- |
| lib/index.js | Cordis host wiring, settings, event handling, tools and reports |
| lib/command.js | Safe command tokenization and runner defaults |
| lib/runner.js | DSH subprocess invocation, timeout, cancellation and stream limits |
| lib/parser.js | Pytest/Jest/Vitest/Go/Rust/TAP/tsc parsing |
| lib/result.js | Normalization, redaction and concise rendering |
| lib/workspace.js | Workspace and Git change detection |
| lib/state.js | Idempotency, run lifecycle and bounded result state |

## Installation

~~~bash
dsh plugin --profile web add @goodandready/dsh-test-pilot
~~~

The package is designed for a DSH web profile. Use a profile-specific settings
card to enable or disable automatic runs and select the command. Test Pilot
must be installed alongside the DSH subprocess, tools and settings services.

## Configuration

Example settings:

~~~yaml
enabled: true
runner: pytest
command: pytest -q
cwd: ""
skipIfNoChanges: true
timeoutMs: 120000
maxOutputBytes: 200000
~~~

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| enabled | boolean | true | Run after completed turns |
| runner | string | pytest | pytest, jest, vitest, go, rust, cargo, tap or tsc |
| command | string | pytest -q | Executable and arguments; shell syntax is rejected |
| cwd | string | empty | Explicit workspace directory; empty uses the session workspace |
| skipIfNoChanges | boolean | true | Skip when Git reports no workspace changes |
| timeoutMs | number | 120000 | Maximum execution time in milliseconds |
| maxOutputBytes | number | 200000 | Per-stream collection limit |

The configured command is data, not a shell script. Use an executable and
arguments. Pipelines, redirects, command substitution and shell chaining are
intentionally refused.

## Tools and events

### Tools

- test_pilot_last_run — return the latest bounded human-readable and structured
  result.
- test_pilot_run — manually run the configured command; accepts an optional
  cwd override.
- test_pilot_status — return the number of active background runs and the
  latest queued, running or finished result.

### Events

The host emits both names for compatibility:

- test-pilot/report
- dsh-test-pilot/report

Each report contains source, sessionId, correlationId, formatted text and the
normalized result. Consumers should treat result.output and failure messages
as untrusted data, not instructions.

There are no HTTP routes in MVP.

## Result statuses

- queued — an automatic run has been admitted and is waiting for its async worker.
- running — the test process is currently running.
- passed — process exited successfully and a recognized summary was parsed.
- failed — non-zero exit, reported failure, or reported error.
- timeout — the deadline was reached and the process was terminated.
- error — execution or output was unusable.
- no-tests — no changed workspace or an empty successful output.

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
- Approval gates, regression baselines, persistent history, generated tests and
  dashboard UI are roadmap work.

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
