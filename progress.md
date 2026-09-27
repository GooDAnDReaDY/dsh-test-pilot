# Progress Log

- 2026-09-23 baseline: 77 passed, 1 failed solely from missing peer modules in the clean worktree; no assertion failed before module loading.
- 2026-09-23 tooling note: two git-apply attempts failed without changes; standard patch worked after setting the worktree cwd.

## Session: 2026-09-23

### Phase 1: Requirements and discovery
- Status: complete
- Read required Gitea, DSH, design, release and planning instructions.
- Audited open issues and existing worktree state.
- Owner approved local exclusion of .worktrees and release as 0.1.2.
- Fetched origin/main, fast-forwarded clean DEV-root, created one new worktree from fresh origin/main.
- Changed: root .git/info/exclude (local-only); planning files in this worktree.
- Confirmed product scope and existing Gitea acceptance evidence; remaining edits are limited to #13 and #20.

## Errors
| Date | Error | Attempt | Resolution |
|---|---|---:|---|
| 2026-09-23 | PowerShell quoting expanded remote jq locally | 1 | Corrected SSH quoting |
| 2026-09-23 | JS isolate has no btoa/TextEncoder | 2 | Use manual in-memory UTF-8 encoder |

## 2026-09-23 release-block update
- Branch/worktree: feat/complete-0.1.2-backlog; issue set #1, #4–#11, #13, #19, #20; one release as 0.1.2.
- Node parser and package image fixes are complete; npm test 84/84, preflight FAIL=0/WARN=7.
- Exact 0.1.2 candidate was installed and loaded on MiniPC, then the plugin and archive were removed; service is active and the three pre-existing plugins remain unchanged.
- Protected status route rejected requests without a session, including caller-provided workspace input.
- Earlier Gitea acceptance proves settings card in light/dark themes and host composition. Live model/session and header-chip E2E remain unverified because the isolated profile has no API key. Do not copy production credentials.

## 2026-09-23 — accepted live-E2E limitation
- Owner accepted release with the live model/session and session-header-chip E2E unverified because isolated MiniPC has no test API key.
- No production credential was copied or requested. The live E2E remains untested; this decision is not approval to merge or publish.
- PR #21 remains WIP and awaits a separate explicit owner merge decision.
- Remaining: final artifact/security review, commit/push, one PR, owner merge approval, publish 0.1.2, exact-registry production acceptance, public showcase update, then evidence-based closure of all 12 issues.

## Session: 2026-09-27 — issue block #8, #24–#32
- Scope: dsh-test-pilot only; one Gitea branch/worktree/PR; package version remains 0.1.2; no self-healing.
- Read project AGENTS.md, design contract, product spec, reuse notes, ADR and existing task/findings/progress records. Gitea main is clean at 7ae1d0f after fetch; no open PRs.
- Inspected existing project worktrees. Preserved them; five are clean and merged-PR #16 worktree has a package-lock version synchronization only. Owner chose investigation; evidence shows it is stale (0.1.1 branch versus current 0.1.2 main), so it is excluded and untouched.
- Created feat/issues-8-24-32-batch from fresh origin/main. No product source has been changed yet.
- Next: inspect the live public GitHub tree and verify source filtering with official Git documentation, then post the start comment and implement.

### Public mirror baseline
- Inspected the live public GitHub repository in the browser. It is a curated tree, not a full DEV/Gitea mirror; internal docs and OpenWiki are already absent, while package-lock.json remains.
- Latest visible source commit is 748f3b8 and links the sanitized fixture-host change to Gitea issue #24.

- Verified export-ignore semantics against the official Git archive documentation; it filters archives, not repository tree files.
- Gitea issue #24 identifies the precise source-tree defect: public main 748f3b8 and v0.1.2 tag tree 7a95888 both include package-lock.json. Existing public ancestry is intentionally retained; fix forward only.
- Issue #28 implementation: output truncation now keeps a contiguous UTF-8-safe suffix and never exceeds the configured byte budget, including Cyrillic/CJK/emoji characters. Focused runner tests pass 7/7.
- Next: fix the actual DSH ConfigForms lifecycle for #8, and the clean-install missing required schema peer for #25; no public GitHub writes until the publication gate.
