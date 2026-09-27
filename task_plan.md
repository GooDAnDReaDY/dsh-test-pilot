# Task Plan: dsh-test-pilot issues #8, #24–#32

## Goal
Complete the ten assigned open issues in one Gitea branch/worktree/PR, preserve the no-self-healing boundary, and prepare the already selected 0.1.2 release only after all gates and approvals.

## Next Step
Review the exact public GitHub tree and verify source-sanitization options against Git documentation; finalize issue mapping before code changes.

## Current Phase
Phase 1 — preflight and research

## Previous block phases (#1, #4–#11, #13, #19, #20)
### Phase 1: Requirements and discovery
- [x] Confirm open issue set and owner scope
- [x] Clean/sync root and create a worktree from fresh origin/main
- [x] Read project requirements, design contract, and current implementation
- **Status:** complete

### Phase 2: Plan
- [x] Map all 12 open issues to implementation and evidence
- [x] Record detailed versioned plan in docs/plans
- [x] Keep self-healing excluded
- **Status:** complete

### Phase 3: Implementation
- [x] Existing implementation covers #4–#11; prior composition and MiniPC evidence recorded in Gitea
- [x] Fix #13 Node.js built-in test summary parsing
- [x] Fix #20 package allowlist/image
- [ ] Resolve #19 through the 0.1.2 publish/deploy path
- [x] Resolve #1 according to agreed MVP boundary; later roadmap remains deferred

### Phase 4: Verification
- [x] Unit suite, existing composition/API/UI tests, and MiniPC package install/load check
- [x] README trio synchronized; versioned release plan recorded
- [x] npm test 84/84; preflight FAIL=0/WARN=7; package contents reviewed
- [x] Exact candidate installed then removed from isolated MiniPC; service active and pre-existing plugins preserved
- [x] Owner accepted missing live-session/session-chip E2E evidence as a release limitation (2026-09-23); no test key supplied and no production credentials copied
- **Status:** limitation accepted; live E2E remains unverified; local/package checks complete

### Phase 5: PR and release
- [ ] One PR, request explicit merge approval
- [ ] Merge after approval; test exact main candidate on MiniPC and production
- [ ] Publish public 0.1.2, install exact registry version, verify production
- [ ] Update goodandready.app through its Gitea workflow
- [ ] Close issues only with evidence; cleanup own branch/worktree
- **Status:** pending

## Decisions
| Decision | Rationale |
|---|---|
| One branch/worktree/PR/release | Owner requested all current Gitea issues together |
| Keep package version 0.1.2 | Owner explicitly chose the release version |
| No self-healing | Existing owner agreement and project AGENTS.md |
| Preserve unrelated worktrees and dirty lockfile | No authorization to modify or discard them |

## Errors
| Error | Attempt | Resolution |
|---|---:|---|
| Root initially showed untracked .worktrees | 1 | Owner approved local exclude; contents preserved |
| PowerShell expansion/quoting issues in earlier commands | 1 | Corrected invocation; no repository data changed |
| JS isolate lacked btoa/TextEncoder | 2 | Use manual in-memory UTF-8 encoder |

## Previous block status
Previous 0.1.2 backlog implementation and MiniPC candidate acceptance were recorded in the prior plan. PR #21 and visual-evidence PR #23 are merged into the current main baseline. The current assignment is a new ten-issue block; its tests, public mirror update, production acceptance and release are not yet complete.

## Active block: issues #8, #24–#32

- [ ] Confirm exact issue state and public mirror tree; finalize public-source allowlist.
- [ ] Implement all ten issues in this worktree; add focused regression tests.
- [ ] Run clean-install/full-suite/preflight/package audit and required isolated-server acceptance.
- [ ] Commit completed slices, push one branch, open one PR, report evidence on each issue.
- [ ] Await merge approval; proceed through release gates and close issues only with evidence.

### Issue checklist
- [ ] #8 — current ConfigForms settings registration and contract tests.
- [ ] #24 — reproducible sanitized public tree; preserve internal Gitea docs and OpenWiki.
- [ ] #25 — clean install succeeds with startup-import dependencies declared correctly.
- [ ] #26 — persistence tests use injected temporary state and never touch default DSH home.
- [ ] #27 — runner paths are workspace-bounded and network fetch is not implicit.
- [ ] #28 — output is truncated at valid UTF-8 byte boundaries.
- [ ] #29 — locale identity/fallback preserves externally provided locales.
- [ ] #30 — theme-token/shared UI styling and light/dark visual verification.
- [ ] #31 — cohesive host-module extraction with behavior preserved.
- [ ] #32 — ConnectionFetchRoute registration matches the installed type contract.

**Status:** preflight underway; no product changes yet.
