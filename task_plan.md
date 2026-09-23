# Task Plan: dsh-test-pilot open issues / 0.1.2

## Goal
Complete all 12 open Gitea issues in one branch/PR, preserve the agreed no-self-healing scope, pass release gates, and publish 0.1.2.

## Next Step
Finish public-package review and release checks, then commit/push one PR. Do not claim
the session-header live E2E gate complete without a test-only API key.

## Current Phase
Phase 4 — final verification

## Phases
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
- [ ] Supply a test-only DSH API key or explicitly accept missing live-session/session-chip E2E evidence
- **Status:** blocked only on live session acceptance input; local/package checks complete

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

## Current status
Node.js parser (#13) and npm image inclusion (#20) are implemented; 84/84 unit tests pass. Exact candidate was installed on MiniPC, component load and auth guard checked, then candidate/package removed. Service remains active and original plugins unchanged. Live session/header-chip E2E is untested because no test API key exists; do not copy production credentials. Commit/PR, approval, publication, production verification, and issue closure remain.
