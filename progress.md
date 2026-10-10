# Progress: dsh-test-pilot issues #36-#42

## 2026-10-10: Batch Resolution
1. Created worktree `.worktrees/fix-all-open-issues` on branch `fix/resolve-open-issues-36-42` from `origin/main`.
2. Updated Gitea issues #36, #37, #38, #39, #40, #41, #42 with canonical labels, titles, and progress comments.
3. Installed dependencies via `npm ci` in worktree.
4. Updated `package.json` with `devDependencies`.
5. Updated `lib/client.js` with `plugins.item` and `plugins.row.config` registrations; removed deprecated `settings.plugin.item`.
6. Updated `lib/index.js` with reactive settings update listeners (`loader/volatile-update`, `settings/document-updated`).
7. Added `MAX_RECORD_PATHS = 1000` count cap to `lib/index.js`.
8. Added backward-compatibility documentation comment to `test-pilot/report` and `dsh-test-pilot/report` in `lib/index.js`.
9. Added auto-run protection for auto-detected commands in `lib/workspace-config.js` and `lib/index.js`.
10. Added `commandSource` tracking in `lib/result.js`.
11. Created `test/issues-36-42.test.mjs` with tests for all 7 issues.
12. Verified `npm test`: 103 passed, 0 failed.
13. Verified `preflight.sh`: FAIL=0, WARN=5 (all acceptable).
14. Verified `npm pack --dry-run`: 25 files, 152 KB archive size, all files under limits.
