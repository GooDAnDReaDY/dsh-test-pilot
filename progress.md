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


## 2026-09-27 continuation — implementation checkpoint
- Scope reaffirmed: only dsh-test-pilot, in feat/issues-8-24-32-batch worktree.
- #8: ConfigForms uses profile entry id dsh-test-pilot; volatile schema values and settings.configure({auto:false}) replace removed registration API. Automated contract tests pass; verify on MiniPC.
- #25/#26/#27/#29/#32 implemented with focused test coverage: required peers declared; persistence test paths are isolated; manual workspace paths are canonicalized and contained by DSH fs; built-in JS runner defaults use offline npm exec; locale translation defers to slot-provided t; GET status route declares requestBody:none.
- #30: client now injects and renders shared DSH DisclosureRow, removes the custom Unicode chevron, and uses --dsw-elevation-panel without a neutral border on the popover. Contract test added. Light/dark visual acceptance is not yet done.
- #31: outcome classification, mutation-path extraction, and decision-context composition moved into lib/host-events.js; direct tests cover these pure host helpers. Full suite now 93/93.
- One intermediate #31 contract test failed because it searched for additionalContexts in the old file location; updated it to assert the new module. No product behavior failure; final suite is green.
- Remaining: finish #24 public-source allowlist (no public writes), complete #31 module boundary, clean npm ci/full tests/preflight/package review, test exact candidate on isolated MiniPC including light/dark UI, post evidence to all ten Gitea issues, then one commit/branch/PR and await merge/release approvals.


## 2026-09-27 — implementation checkpoint 2
- Full suite: 96/96 passed, 0 failed/skipped; clean `npm ci` succeeded; syntax checks pass.
- DSH plugin preflight: FAIL=0, WARN=6. Warnings are heuristic/internal-file notices; manually checked the style and shared `DisclosureRow` usage.
- npm dry-run: 25 files, 150541 packed bytes; all three required README files included; internal plans, AGENTS.md, index.md, and package-lock.json excluded.
- #30 now uses DSH `DisclosureRow`, `--dsw-elevation-panel`, 0.5px neutral separators, and `corner-shape: round` for pill elements.
- #31 implementation complete: cohesive event and agent-tool responsibilities extracted into `lib/host-events.js` and `lib/agent-tools.js`, with direct contract tests.
- #24 allowlist documented: public tree may contain only product docs, license/changelog, `cordis.patch.yml`, `lib/**`, `media/**`, `package.json`, and `test/**`; exclude package-lock and internal workflow/planning. Historical public tree is not rewritten; actual sanitized tag-tree verification and lockfile removal remain gated on explicit public release approval.
- Remaining blockers before release claims: isolated MiniPC runtime/light-dark UI acceptance, exact sanitized GitHub-tree verification after approval, Gitea comments/PR checks, merge authorization, production acceptance, final public release authorization.


## 2026-09-27 — implementation checkpoint 3
- Full suite after workspace-scoped fetch control: 97/97 passed, 0 failed/skipped.
- #27 now has a per-workspace `allowNetworkFetch` setting, disabled by default. Built-in npm exec runners use offline mode unless explicitly enabled; opt-in is pinned to `registry.npmjs.org`. Custom commands are unchanged.
- Settings include localized English/Chinese opt-in control; README trio documents the behavior and default.
- Current source diff passes `git diff --check`. Clean-install/preflight/package allowlist must be rerun after final staged changes.
- Next: finish review, commit remaining feature/dependency/docs slices, post per-issue Gitea evidence, push one branch and open one PR. MiniPC runtime/theme acceptance and approval gates remain outstanding.


## 2026-09-27 — implementation checkpoint 4
- Full npm test: 97/97 passed. Plugin preflight: FAIL=0, WARN=6; package dry-run: 25 files, 151172 packed bytes, README trio included, internal plans/lockfile excluded.
- A transient ENOTEMPTY in post-execute test cleanup exposed that test hosts were not disposing plugin effects. Test teardown now calls registered disposers before deleting each owned temporary state directory. Focused file passed three consecutive runs; full suite and preflight passed afterward.
- No MiniPC, merge, production, or public release acceptance has been performed yet.


## 2026-09-27 — release-version reconciliation
- Authenticated Gitea #24 history states that public GitHub release/tag v0.1.2 and npm @goodandready/dsh-test-pilot@0.1.2 were already published before this ten-issue batch was opened. The current batch branch still carries package version 0.1.2.
- Do not republish the existing version. No package version change was made in this implementation batch; determine the next valid release version after merge and release checks.
