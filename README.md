# @goodandready/dsh-test-pilot

Automatic, bounded test runs for DeepSeek Harness after a completed agent turn.

## MVP 0.1.0

The plugin listens to the native session/event bus and handles turn/end. It
checks whether git reports workspace changes, runs a configured executable
through ctx.subprocess.spawn without a shell, bounds stdout/stderr, supports
timeout and cancellation, redacts common secret-shaped values, normalizes a
pytest result, stores the latest result in memory, appends a concise assistant
report to the current session when the native session supports it, and emits
test-pilot/report.

The diagnostic tools test_pilot_last_run and test_pilot_run return a bounded
human-readable report and structured JSON in chat.

The MVP does not start repair agents, edit tests, commit, push, block
approvals or send network telemetry.

## Configuration

Default values:

    enabled: true
    runner: pytest
    command: pytest -q
    cwd: ''
    skipIfNoChanges: true
    timeoutMs: 120000
    maxOutputBytes: 200000

The command is tokenized into argv and rejects shell operators.

## Development

    npm test

Real-composition acceptance and isolated MiniPC installation are release
gates. GitHub/npm publication requires explicit owner approval.