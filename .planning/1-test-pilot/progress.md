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
  unrun; static syntax checks and git diff --check pass.
- Verified native Session.append report bridge in a real Cordis Context: automatic
  runs append one concise assistant/message after turn/end when supported, while
  plugin-owned report events and diagnostic tools remain fallbacks.

## Next

- Implement #6 next, then #4, #9, #5, #8 and #10; update docs/issues/Memory Brain and perform non-test static checks only. Keep testing, profile changes, merge, deploy and publication deferred.

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
