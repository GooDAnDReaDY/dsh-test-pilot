# Task Plan: dsh-test-pilot issues #8, #24–#32

## Goal
Complete the ten assigned open issues in one Gitea branch/worktree/PR, preserving the no-self-healing boundary. Gitea #24 confirms public 0.1.2 is already released; resolve the next valid version only after merge and release checks.

## Next Step
Run clean-install/preflight/package audit, then commit remaining slices, post issue evidence and open one PR. MiniPC acceptance follows merge.

## Current Phase
Phase 3 — implementation and verification

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

- [x] Confirm issue state and inspect the public mirror baseline; #24 allowlist/filter implementation remains.
- [x] Implement issue changes and focused regression tests in this worktree; #24 actual sanitized public-tree/tag update remains approval-gated.
- [ ] Run clean-install/full-suite/preflight/package audit and required isolated-server acceptance.
- [ ] Commit completed slices, push one branch, open one PR, report evidence on each issue.
- [ ] Await merge approval; proceed through release gates, select a valid unreleased version, and close issues only with evidence.

### Issue checklist
- [x] #8 — migrate to live ConfigForms settings policy and update contract tests; MiniPC verification pending.
- [ ] #24 — explicit sanitized GitHub source allowlist is documented; public tree must omit package-lock.json and internal files, verified at publication gate.
- [x] #25 — declare required startup peers and verify current clean install; MiniPC compatibility matrix still pending.
- [x] #26 — persistence tests use isolated temporary state-file paths; suite passes.
- [x] #27 — validate manual paths through DSH filesystem containment; npm defaults are offline with per-workspace explicit fetch opt-in; tests pass.
- [x] #28 — UTF-8-safe bounded output suffix; implementation committed as 0ad1144.
- [x] #29 — preserve locale identity and consult slot translator before built-in fallback; runtime verification pending.
- [x] #30 — use DSH DisclosureRow and elevation token; automated contract test passes. Light/dark visual acceptance pending.
- [x] #31 — extract cohesive host-event and agent-tool modules with focused behavior-contract tests; runtime acceptance pending.
- [x] #32 — explicitly declare requestBody:none and assert the route contract; installed-runtime acceptance pending.

**Status:** implementation underway; 97/97 tests pass. Clean npm ci and full tests passed; preflight FAIL=0/WARN=6 and package audit passed. MiniPC runtime/visual acceptance remains. The published 0.1.2 version must not be reused for a new public release.
