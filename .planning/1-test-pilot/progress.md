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
- Added 21 unit/contract tests. Current result: 21 passed, 0 failed,
  0 cancelled; git diff --check is clean.
- Verified native Session.append report bridge in a real Cordis Context: automatic
  runs append one concise assistant/message after turn/end when supported, while
  plugin-owned report events and diagnostic tools remain fallbacks.

## Next

- Run the exact package artifact through the isolated MiniPC DSH profile.
- Verify settings-card behavior in the shipped profile and record smoke evidence.
- Remove the temporary test installation and close the acceptance gate.

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
