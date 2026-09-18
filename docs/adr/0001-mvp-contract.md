# ADR-0001: MVP runtime contract

Status: accepted for MVP 0.1.0

## Decision

The first execution adapter is pytest, configured as the argv pytest -q.
The host listens to the native session/event bus. When the optional
ctx.workspaceChanges service is present, it reads the per-turn summary announced
by workspace/changes and starts only after that final event (which can follow
turn/end). On older DSH cores, it falls back to successful built-in write/edit
tool observations at turn/end and skips when no reliable paths were observed.
If a native change event is seen but its summary cannot be read or is incomplete,
the plugin runs the full configured suite instead of treating the turn as unchanged.

The process boundary is ctx.subprocess.spawn. The plugin supplies argv,
workspace cwd, ignored stdin, bounded stdout/stderr collection, a spill cap,
termination grace and an AbortSignal. No shell is invoked; shell operators in
the configured command are rejected.

The parser/result model repeats the useful parts of dsh-tool-tdd: normalized
runner output, counts, failure locations, timeout/cancellation facts, bounded
output and a concise report. Runner execution, parsing, idempotency and host
wiring are separate modules so the second runner can be added independently.

The parser also accepts Jest/Vitest-shaped summaries as a compatibility seam.
Jest execution is a follow-up adapter milestone, not the first MVP promise.

## Why

Pytest gives a deterministic, directly executable command without requiring a
package manager or shell. The current DSH subprocess service requires fully
specified argv and bounded collected streams, so this choice keeps execution
safe and portable.

The official DSH testing guidance requires real Loader/Cordis composition for
product-visible plugin acceptance. Pure tests cover domain contracts first;
the acceptance gate must boot the real entry path.

## Report boundary

Automatic runs emit the plugin-owned test-pilot/report event with bounded
result and formatted text.
Lifecycle events publish queued, running and terminal snapshots with runId and
timestamps; manual and automatic runs share the per-workspace queue. Only the
terminal snapshot is appended to chat.
When the native session exposes append, the plugin also appends one concise
assistant/message report with surfaceOp: append after the completed turn; this is a
session-log surface update, not a new agent turn, and the listener ignores
assistant-message events. If the session does not expose that API or rejects
the append, the bounded event and diagnostic test_pilot_last_run tool remain
available and the test run is not failed solely because chat rendering is unavailable.

## Rejected alternatives

- tree/settled: not confirmed in the current host API.
- shell command strings: rejected because they reintroduce injection.
- self-healing in 0.1.0: deferred until execution and policy are proven.
- commit blocking and automatic Git mutation: deferred and never implicit.
