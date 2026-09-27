# Findings — dsh-test-pilot 0.1.2

## Baseline and reuse findings
- Baseline npm test: 77 passed, 1 failed because this new worktree has no node_modules and the entry import cannot resolve the already-declared peer @deepseek-ai/schemastery. No product assertion failed before module loading. Existing production dependencies contain schemastery but not dsh-tools; do not borrow from another plugin worktree. Install declared peers locally without saving manifest/lockfile changes, then rerun.
- dsh-tool-tdd public source confirms subprocess-backed test execution, separate parsing, structured failures/counts, and runner adapters. Test Pilot reuses those concepts but automates the run trigger instead of copying its interactive TDD tool UX.

## Requirements
- Complete open issues #1, #4–#11, #13, #19, #20 as one release block.
- Preserve no-self-healing boundary.
- Keep version 0.1.2; publish only after all test-server, production, package, security, documentation and site gates pass.
- Do not change unrelated plugins or existing worktrees.
- Public GitHub/npm route was previously approved; merge still requires a separate approval.

## Initial repository state
- Gitea main: 754eb4bd2d5bd68fc526adcaa47d2725f57d8e35.
- Root checkout was one commit behind; owner approved adding /.worktrees/ to local .git/info/exclude. Root fast-forwarded cleanly.
- One new worktree created from fresh origin/main.
- Existing worktrees preserved: chore/public-release (clean, behind 6); fix/dsh-test-pilot-config-forms (dirty package-lock version change 0.1.0→0.1.1); issue-17-format-v4 (clean, behind 1; production references its candidate tarball).
- 12 open issues.

## Issue set
#1 umbrella/dsh-tool-tdd parity; #4 post-execute in-turn feedback; #5 transition-only notices; #6 changed-file selection; #7 per-workspace config/autodetection; #8 settings card/session chip/en+zh; #9 persisted bounded state; #10 two tools; #11 authenticated read-only status endpoint; #13 Node built-in parser; #19 registry migration; #20 npm screenshot asset.

## Research constraints
- Reuse dsh-tool-tdd patterns and verified DSH APIs.
- #11 is security-sensitive: a browser-provided cwd/workspace key is not authorization. Stop if DSH lacks a supported authenticated session binding.
- Production profile changes only in the agreed release sequence.
- UI release requires real Dark/Light evidence and public artifact scans.

## 2026-09-23 candidate
- Node.js built-in test parsing added test-first; npm pack now includes the linked visual verification PNG. The English/Chinese/Russian README parser descriptions were updated.
- Full unit suite: 84/84; preflight: FAIL=0, WARN=7. The actual 0.1.2 tarball has 22 intended files.
- MiniPC reports Test Pilot v0.1.2 Running. No test model/API key is configured, so live-session chip E2E remains unverified; production credentials must not be copied.

## 2026-09-27 — assigned issue block preflight
- Owner clarified the only project in scope is dsh-test-pilot; assigned issue set is #8, #24, #25, #26, #27, #28, #29, #30, #31 and #32, handled as one branch/worktree/PR.
- Gitea origin/main is clean and current at 7ae1d0ff7b6898325c20a615bb64b0d1d16942b9; there are no open PRs. New worktree: feat/issues-8-24-32-batch, based on that commit.
- Existing worktree fix/dsh-test-pilot-config-forms has one uncommitted package-lock-only diff, version 0.1.0 to 0.1.1. Its package.json is 0.1.1, it is based on merged PR #16, and current origin/main package.json is 0.1.2 while current lockfile remains 0.1.0. Decision after owner-selected investigation: stale branch-local version synchronization; do not include or alter it. Preserve the worktree.
- Reuse-first references: dsh-tool-tdd for subprocess-backed test execution/result patterns; dsh-github-ops for sanitized mirror publication; dsh-image-gen is reported to use export-ignore, to be checked against official Git behavior and actual GitHub tree semantics before adoption.
- Baseline main has package version 0.1.2 and lockfile version 0.1.0. Track this mismatch under #24/#25; do not copy the stale 0.1.1 edit forward.
- Current issue test obligations: ConfigForms/Connection route contracts, clean npm install, persistence isolation, workspace traversal/no implicit network, UTF-8 byte limit, locale fallback and light/dark visual verification.

## Public GitHub tree inspected
- The public GitHub main tree is already a curated source tree, not a full Gitea mirror: it contains lib/, media/, test/, .gitignore, CHANGELOG.md, LICENSE, README.md, README.ru.md, README.zh.md, cordis.patch.yml, package.json and package-lock.json. Internal docs, AGENTS.md, plans/research and openwiki are absent.
- The current visible main head is commit 748f3b8 (2026-09-23); its message records sanitizing two test-only internal-host fixtures and references Gitea issue #24. The source list still includes package-lock.json, matching issue #24's title.
- GitHub API returned HTTP 403 from MiniAI; the public GitHub browser page provided the read-only tree evidence instead.
- Reuse candidate: dsh-image-gen is indexed with an export-ignore pattern for release archives. Verify official Git semantics before adopting; archive filtering alone must not be confused with removing paths from the GitHub repository tree.

- Official Git archive docs state export-ignore files are omitted from archive files only. This cannot remove package-lock.json from the live GitHub repository tree.
- Keep the source-tree change as a normal forward commit; do not rewrite public history. Archive/package filtering may supplement, but not replace, public tree sanitization.
- Live Gitea issue #24 reproduction: public GitHub main `748f3b8a448084fd2e96edda2dffe9e77a5ab59a` and public v0.1.2 tag tree `7a95888d5b2f6804761f4b486de0888e21e74b83` both include `package-lock.json`.
- The owner already accepted the existing public ancestry unchanged. Do not rewrite it, force-push, or broaden this into a full mirror redesign. The requested outcome is to remove the lockfile from public main and the next public tag with an ordinary forward change. `export-ignore` cannot satisfy that because it only filters archives.
