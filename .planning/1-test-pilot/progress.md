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

- #4 implementation is in commit 0dc2ad1 on PR #3. The post-execute hook,
  debounce, cancellation, in-turn report, turn/end failsafe and completion
  nudge are documented in issue #4 and PR #3. Syntax and whitespace checks
  passed; integration tests remain authored but unrun.
- #9 implementation is in commit 9f52868 on PR #3. Versioned atomic state
  preserves compact per-workspace summaries; no commands, absolute workspace
  paths or full output are stored. Persistence tests are authored but unrun.

## Next

- Issue #5 notification transitions are implemented and documented; unit and
  integration coverage is authored but remains unrun by owner request. Continue
  with #8 and #10. Test suites, profile changes, merge, deploy and publication
  remain deferred.

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

## 2026-09-18 follow-on: issue #11

- Owner explicitly authorized implementation of the remaining #8 session chip
  through the read-only API tracked in issue #11.
- Work remains in branch docs/issue-1-baseline-dsh-test-pilot and PR #3; the
  branch/worktree preflight showed only this feature worktree plus DEV main.
- Current phase: verify official/target DSH route, auth/origin and session
  binding contracts before any endpoint code.
- No profile changes, package installs, restarts, tests, merge, deploy, or
  publication are authorized by this step; tests remain deferred.
## 2026-09-18 issue #11 implementation update

- Research completed against pinned DSH core commit
  f02c691a2120b8c53e1fcedeac1b4d59d91067fa. Authenticated Connection Fetch
  registration, Host/Origin checks, Session Controller list semantics and
  native session-header slot are verified. No DSH core issue is needed.
- Implemented `lib/status.js`: GET-only read projection, strict single sessionId
  validation, exact match against Host-visible Session summaries, 15-second /
  128-entry positive binding cache, workspace-key lookup, stale/disabled states,
  allowlisted response fields, no-store headers and generic errors.
- Extended state/persistence with workspace-scoped in-memory lookup and an
  additive UUID-only run correlation value; schema version 1 remains compatible.
- Implemented the native header chip in `lib/client.js`: en/zh labels, 10-second
  polling while visible, hidden-tab pause, abort on hide/unmount/session switch,
  compact accessible result, Escape/outside-pointer dismissal.
- Added ADR 0002 and updated product/design/index/README documentation.
- No test suites, DSH profile, install/restart, deploy, merge or publication
  have been run or performed. Test and visual acceptance remain deferred.

### Next

Static syntax, JSON and staged diff checks passed; no test command was run.
Next: commit/push and update issue #11. Do not run the DSH preflight because it
invokes the deferred test suite.

- Added focused status/state/persistence test source; test suites remain unrun.

## 2026-09-19: owner-requested verification cycle

- Installed peer dependencies only in the active DEV worktree; no DSH profile
  or production state was changed.
- Initial full run found 3 failures: two brittle assertions and one missing
  peer environment. The assertions were corrected without changing runtime
  behavior; `npm install` supplied the declared DSH peers.
- Full `npm test` now passes: 82/82 tests, 0 failures.
- Next is the mandatory preflight, exact package candidate, isolated MiniPC
  install/smoke/UI acceptance, cleanup, and Gitea evidence. Merge, deploy and
  publication remain unauthorized.

## 2026-09-19: isolated MiniPC smoke finding

- Exact `0.1.0` was installed through the test harness, but the WebUI service
  failed to load the plugin because `workspaceChanges` was not in the exported
  Cordis injection list.
- This was a defect in `dsh-test-pilot`, not in `dsh-lanmode` or the DSH test
  profile. No foreign plugin or profile configuration was edited.
- Added the missing injection declaration and a contract test; replacement
  candidate verification is pending.

## 2026-09-19: verification completed

- Re-ran the full suite: 82/82 passed; preflight: `FAIL=0`, 7 non-blocking
  warnings.
- Exact replacement candidate SHA-256:
  `d5dc852eb1ab8de07ee6cdcf84d4824ba40eb4e4eaf1069932400147efa65ff7`.
- MiniPC service loaded the plugin and returned `DSH_TEST_OK`; UI card and
  running component were visually checked in light and dark themes.
- Cleanup removed the temporary plugin and artifact; the permanent test

## 2026-09-20: private package release preparation

- Owner selected the private route: private GitHub repository + GitHub Packages; npmjs is explicitly excluded.
- Changed package publication metadata to https://npm.pkg.github.com with restricted access and added the release changelog to the package allowlist.
- Updated English, Chinese and Russian README installation instructions and removed the npmjs version badge.
- Updated docs/design/DESIGN.md to record the selected private route and the accepted live-chip limitation.
- Re-ran the full suite: 82/82 passed; preflight: FAIL=0, 7 non-blocking warnings.
- Exact candidate goodandready-dsh-test-pilot-0.1.0.tgz SHA-256: f76b61d6034d9b5e564854254cfe68ab67d32513dcdbfee49b9faef00a942dfd. Package contains 21 allowlisted files and no internal planning/agent files.
- Installed that exact candidate on the isolated MiniPC; service returned DSH_TEST_OK, plugin card showed v0.1.0 and component Running in light and dark themes. Cleanup removed the plugin and artifact; the permanent lanmode plugin was untouched.
- GitHub CLI is not authenticated on MiniAI, so private GitHub repository creation/package publication is pending credentials. PR #3 remains draft/open and production has not been changed.
- Live session-header chip remains intentionally unverified end-to-end because the test profile has no API key/live agent session; owner accepted this limitation.

- npm publish --dry-run against https://npm.pkg.github.com completed with restricted access and no auto-correction warning after npm pkg fix.
- The exact candidate hash changed only because npm pkg fix normalized package.json formatting and repository metadata; the final exact candidate still requires one last MiniPC install/cleanup before publication.
