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
