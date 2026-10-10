# Task Plan: dsh-test-pilot issues #36, #37, #38, #39, #40, #41, #42

## Goal
Resolve all 7 open issues (#36, #37, #38, #39, #40, #41, #42) in Gitea repository `goodandready/dsh-test-pilot`, verify with full automated test suite (103/103 tests pass) and preflight check, create PR for review and prepare release.

## Next Step
Commit changes, push branch, open PR, and report status to user.

## Current Phase
Phase 3 — Review, PR and release preparation

### Phase 1: Requirements and Discovery
- [x] Read AGENTS.md, DESIGN.md, index.md, package.json
- [x] Analyze all 7 open issues: #36 (DSH 0.2 seats), #37 (reactive settings), #38 (allowNetworkFetch / npmExec), #39 (duplicate report event shim), #40 (record.paths count cap), #41 (missing devDependencies in clean checkout), #42 (auto-run safety for auto-detected commands)
- [x] Update Gitea issue labels, titles, and post start progress comments
- **Status:** complete

### Phase 2: Implementation and Local Verification
- [x] #36: Register `plugins.item` and `plugins.row.config` in `lib/client.js`, remove deprecated `settings.plugin.item`
- [x] #37: Subscribe to `loader/volatile-update` and `settings/document-updated` in `lib/index.js` to update `getConfig` reactively without restart
- [x] #38: Verify `defaultCommand` runner allowlist (`jest`, `vitest`, `tsc`) and document `allowNetworkFetch` opt-in boundary
- [x] #39: Document backward-compatibility shim for `test-pilot/report` and `dsh-test-pilot/report` events in `lib/index.js`
- [x] #40: Add `MAX_RECORD_PATHS = 1000` count cap to `addSnapshotPath` in `lib/index.js` to prevent unbounded Set growth
- [x] #41: Add devDependencies to `package.json`, document `npm ci && npm test` workflow
- [x] #42: Guard automatic background runs against auto-detected repository commands without a workspace rule; track `commandSource`
- [x] Add comprehensive test suite in `test/issues-36-42.test.mjs`
- [x] Verify `npm test` passes completely: 103/103 pass, 0 fail
- [x] Verify `preflight.sh` passes: FAIL=0, exit code 0
- [x] Verify `npm pack --dry-run`: package under limits, clean composition
- **Status:** complete

### Phase 3: PR, Release and Prod Acceptance
- [ ] Commit changes via `git-antigravity`
- [ ] Push branch `fix/resolve-open-issues-36-42` to Gitea origin
- [ ] Create Gitea PR linking issues #36, #37, #38, #39, #40, #41, #42
- [ ] Present PR to user for merge approval
- [ ] Prepare release v0.1.5 after merge
