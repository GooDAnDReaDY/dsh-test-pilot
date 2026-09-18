# ADR-0001: MVP runtime contract

Status: accepted for MVP 0.1.0

## Decision

The first execution adapter is pytest, configured as the argv pytest -q.
The host observes successful file mutations in the tools/post-execute
waterfall and coalesces them behind a two-second quiet period. It never waits for
the test process in that critical path. New writes cancel stale work; the
listener observes exec.signal, and turn/end flushes pending changes as a
safety net. When available, ctx.workspaceChanges.summary(sessionId, seq)
provides the authoritative per-turn file list; absent, incomplete, or unsafe
change data falls back to the full configured suite. Older cores use successful
built-in write/edit observations.

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
The latest completed result is attached once to a later tool outcome through
additionalContexts, so the agent can inspect it in the same turn. The
post-execute listener never waits for a pending test run. If a run finishes only
after turn end, the plugin appends one concise assistant/message with
surfaceOp: append when supported. This is a session-log update, not a new
agent turn. If chat append is unavailable, the bounded report event and
test_pilot_last_run remain available.

## Persistent state boundary

Completed outcomes are stored in the DSH data tree at `dshHomePath('data', 'dsh-test-pilot', 'state.json')`. The JSON document is schema-versioned and replaced with `writeFileAtomic` under `withFileLock`; the file and directory use owner-only modes. Workspace identity is a SHA-256 key, not an absolute path. Only status, runner, counts, completion time/duration and bounded failed-test identities are persisted—never command text, workspace path, messages or full output. The store keeps at most 50 workspaces and 50 history rows for 30 days. Corrupt or unsupported-version data loads as empty; detailed output remains process-memory-only.

## Rejected alternatives

- tree/settled: not confirmed in the current host API.
- shell command strings: rejected because they reintroduce injection.
- self-healing in 0.1.0: deferred until execution and policy are proven.
- commit blocking and automatic Git mutation: deferred and never implicit.
