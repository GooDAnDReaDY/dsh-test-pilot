# Progress: dsh-test-pilot

## Completed

- User selected dsh-test-pilot as the first implementation target.
- Confirmed Gitea issue #1, WIP PR #3, origin/main and the execution worktree.
- Resolved the root checkout anomaly through the allowed fast-forward from
  origin/main; no force or copy operation was used.
- Contract spike chose pytest as the first execution adapter and confirmed the
  native DSH session/event plus turn/end and ctx.subprocess contracts.
- Implemented package skeleton, Cordis patch, result model, safe argv parser,
  bounded subprocess runner, pytest/Jest-compatible parser, redaction,
  workspace change detector, idempotency state and diagnostic tools.
- The original baseline had 21 passing unit/contract tests before this feature
  block; that result is historical, not validation of the current changes.
- Implemented #7: workspace rules, safe runner detection and silent automatic
  no-run for unknown projects; updated the English, Chinese and Russian guides.
- Added runner-detection and npm/Deno parser tests. Tests remain deliberately
  unrun; the earlier static checks predate #6 and do not validate this change.
- Verified native Session.append report bridge in a real Cordis Context: automatic
  runs append one concise assistant/message after turn/end when supported, while
  plugin-owned report events and diagnostic tools remain fallbacks.
- Implemented #6 using the current DSH workspace/changes event and
  ctx.workspaceChanges.summary(sessionId, seq); missing or incomplete summaries
  force the full suite. Older-core fallback is limited to successful built-in
  write/edit calls.
- Authored #6 tests for event summaries, fallback, mapping, report scope and argv
  safety; test execution remains deferred by owner request.

## Current work

- #4 is implemented in the worktree: tools/post-execute observes successful
  write/edit/str_replace_editor mutations, coalesces for two seconds, cancels
  stale runs via exec.signal, returns a completed undelivered result through
  additionalContexts, and flushes pending work at turn/end. The completion
  nudge and EN/RU/ZH documentation are updated. Integration tests are authored,
  not run.

## Next

- Review/static-check #4, update its Gitea issue and PR #3, commit and record
  Memory Brain; then continue #9, #5, #8 and #10. Tests, profile changes,
  merge, deploy and publication remain deferred.

## Current blocker

The private Gitea archive URL redirects unauthenticated MiniPC requests to
/user/login. No token was copied, no source was transferred manually, and the
MiniPC profile was not changed. An approved Git/Gitea artifact route or owner
permission for a read-only credential on the test server is required before
installation.

## Evidence

No profile, OPT, production, database, credentials or external publication
has been changed in this implementation step.

## Workflow note

- The first baseline push had no upstream. A normal explicit origin/branch
  push completed successfully; no force operation was used.
- 2026-09-15: Added explicit queued/running lifecycle snapshots and run IDs for
  background automatic runs; self-healing remains out of scope.

- 2026-09-18: Owner approved #4-#10 in PR #3 and confirmed the expected DEV-root
  .worktrees entry may be ignored without touching root. Tests remain deferred.
