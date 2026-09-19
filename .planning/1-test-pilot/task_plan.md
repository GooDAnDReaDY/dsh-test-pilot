# Execution plan: dsh-test-pilot MVP 0.1.0

## Objective

Deliver a usable DSH plugin that automatically runs a configured test command
after a completed code-changing turn, returns a bounded structured report, and
does not enter an uncontrolled repair loop.

## Current baseline

- Gitea issue: #1.
- Existing WIP PR: #3.
- Branch/worktree: docs/issue-1-baseline-dsh-test-pilot.
- Base: fresh origin/main.
- Current implementation commits: 63b59d0 plus the runner/parser expansion in
  the current worktree.
- One block, one branch, one worktree and one PR remain the execution boundary.

## MVP scope

In scope: configured runner adapters (pytest default plus Jest/Vitest, Go,
Rust/Cargo, TAP and TypeScript compiler parsing), subprocess execution through
the verified DSH service, bounded stdout/stderr, timeout/cancellation,
parser/result contract, turn/end listener, duplicate suppression, last-run
status and a concise user-visible report.

Out of scope for MVP: self-healing repair turns, commit blocking, test
generation, extended history/artifacts, web dashboard, arbitrary shell evaluation,
automatic commit/push/deploy and external telemetry.

## Ordered actions

1. Contract spike: completed. Native session/event, subprocess, tools,
   messaging and lifecycle contracts are recorded in the ADR.
2. Package skeleton: completed with package.json, cordis.patch.yml, host entry,
   tests, license and the scoped @goodandready identity.
3. RED/GREEN domain contracts: completed for result, failure, timeout,
   cancellation, bounded output and report rendering.
4. GREEN runner adapter: completed through the verified subprocess API with
   argv, normalization, timeout/cancellation and bounded output.
5. RED/GREEN parser fixtures: pytest/Jest baseline completed; Go, Rust/Cargo,
   TAP and TypeScript compiler support is implemented and awaits the deferred
   test cycle.
6. RED/GREEN event orchestration: completed with native turn/end listener,
   changed-workspace detection, idempotency and ctx.effect teardown.
7. Report and state: completed with concise session message, plugin-owned report
   event, latest safe result, diagnostic tools, redaction and bounds.
8. Real composition: Cordis Context/tool/event smoke completed; full Loader
   profile acceptance remains in the deferred test cycle.
9. Exact candidate validation: deferred by the explicit user decision to test
   later; then build the exact artifact, install on isolated MiniPC, run the
   matrix, clean up and record evidence.
10. MVP review: update README/docs/index.md/issue/PR/Memory Brain, then stop
    before deploy, version publication or GitHub/npm release.

## Test matrix

- Unit: result model, parser, runner detection, summary, redaction,
  timeout/cancel and idempotency.
- Contract: malformed subprocess outcome, non-zero exit, empty output, output
  cap and repeated turn/end.
- Real composition: actual Loader entry path, registration, event delivery,
  message/report path and teardown.
- Manual critical scenarios: all-pass, failure, timeout, no code diff,
  duplicate event and unavailable runner.
- Release gate: no known failures, complete docs, clean worktree, exact
  artifact tested on MiniPC, no changes to dsh-lanmode or foreign plugins.

## Approval gates

Stop and request explicit approval before changing persistent DB/schema,
profile/config/env, external services/credentials, production/deploy,
architecture/API/UI scope beyond this document, or a third attempt at the same
failure. Do not publish or bump version without the explicit publication
approval.

## Approved feature block: Gitea issues #4-#10 (2026-09-18)

Owner approved implementing issues #4-#10 together in existing WIP PR #3 and
branch docs/issue-1-baseline-dsh-test-pilot. This order supersedes the original
MVP-only sequence above:

1. #7 DONE: workspace runner rules with longest-prefix match; legacy flat
   settings remain rooted at the current workspace; bounded safe detection
   supports pytest, package.json scripts, Go, Cargo and Deno. Unknown projects
   stay silent in automatic mode.
2. #6 DONE: use the workspace/changes event and
   ctx.workspaceChanges.summary(sessionId, event.seq), capture per-turn changes,
   map source-to-test, explain conservative full-suite fallback and always run
   the full suite manually. Tests are authored but deliberately unrun.
3. #4 DONE (implementation): tools/post-execute observes successful file
   mutations; two-second per-turn debounce, stale-run cancellation through
   exec.signal, completed additionalContexts, turn/end failsafe and completion
   nudge. Integration tests are authored but deliberately unrun.
4. #9 DONE (implementation): versioned atomic state, per-workspace last result,
   50-row/30-day bounded history, and failed-test identities/counts only; never
   persist commands, absolute paths or full command output. Tests are authored,
   deliberately unrun.
5. #5 IMPLEMENTED: preserve report events and agent contexts; chat is silent on
   green/skips and repeated identical red results, and reports initial/new red
   compositions plus red-to-green recovery. Tests are authored, not run.
6. #8 PARTIAL: the native settings card, workspace rules and en/zh strings were
   implemented in 12646fb. The session-header status chip awaits the secure,
   session/workspace-bound read-only API tracked separately as issue #11.
7. #10 DONE: only test_pilot_status and test_pilot_run remain; old last-run and
   history tools were removed in 190fb6c, with optional status history bounded
   to 20 summaries.
8. Update spec, design, index, all README languages, Gitea and Memory Brain;
   inspect diff and run non-test static checks only.
9. Defer all test runs, package installation, profile changes/restarts, merge,
   deploy and publication until separately requested/approved.

## Current status (2026-09-18)

- #4, #5, #6, #7, #9 and #10 have implementation commits in PR #3; #8 settings
  card is implemented, but the header chip remains pending issue #11.
- Issues #4-#10 remain open until PR merge and the deferred verification cycle.
- Issue #11 is open as the API/security prerequisite; endpoint implementation
  is not included in the currently approved block.
- Unit/contract tests and MiniPC DSH composition/UI acceptance are intentionally
  deferred; only static checks have been run. No install/restart, merge, deploy
  or publication has occurred.

No self-healing, generated tests, commit gate, automatic edits or external
telemetry. Installed MiniAI source does not expose workspaceChanges or
workspaceFiles; preserve a safe optional fallback and verify the target version

before claiming compatibility. Ignore the approved DEV-root worktree registration
without changing/synchronizing the root.
## Errors encountered

| Error | Resolution |
|---|---|
| Initial SSH read had a bad nested cwd and continued after cd failed; read-only unrelated listing followed. | Verified exact worktree, then used PowerShell here-strings. No files changed. |
| Nested PowerShell quoting broke sed/jq; first diff dry-run had wrong hunk counts. | Used simpler remote commands and recalculated patch line counts. No files changed. |
| Patch construction had an unescaped delimiter and unavailable local base64 helpers. | Use ASCII payload and in-memory encoder. No remote files changed. |
| A combined patch had an incorrect hunk count and applied only its first hunk; a later parser hunk attached the existing TypeScript parser body to a new function. | Inspected the diff, applied remaining changes separately, and used node --check to find and fix the parser boundary. No tests were run. |
| PowerShell patch streams introduced mixed CRLF/LF and git diff --check flagged new lines. | Normalized touched text files to LF and reran git diff --check. |
| Gitea Python wrapper successfully posted all eight kickoff comments, then raised NameError at the heredoc tail; a later read-only request used the wrong credential JSON shape. | Verified all eight responses were HTTP 201; did not repost. Subsequent code work does not depend on that failed read. |
| A few read-only SSH wrappers failed on printf option parsing or nested quoting; an early grep also exceeded output limits. | Reissued targeted read-only commands with smaller output and safer quoting; no project/profile mutations resulted. |
| Some later plan/README patch hunks used mismatched counts or context and created exact .rej files. | Inspected and removed only those generated rejects, then reapplied intended edits; no source data was lost. |
| In-memory patch metadata/encoding was rejected before a documentation edit. | No files changed; switched to an exact-anchor-generated unified diff through the Git wrapper. |
| Initial PowerShell patch encoding/hunk counts failed; whitespace check found extra blank EOF lines. | Switched to UTF-8/base64 via the Git wrapper, corrected the patch, removed trailing blanks, and reran staged diff checks. |

## Authorized continuation: issue #11 (2026-09-18)
Status: research in progress.

The owner explicitly authorized finishing the remaining session-header chip
after issue #11 was created. Continue in the existing feature branch and PR #3.

### Next step

Verify current DSH route registration, browser authentication/origin checks,
and trusted session/workspace binding from official docs and the target source.
If no safe supported binding exists, stop plugin implementation and open a
separate DSH core issue. Tests/runtime/UI acceptance remain deferred.
## Issue #11 implementation update (2026-09-18)

This section supersedes the earlier issue #11 status above. Official and pinned
target-source research is complete: DSH Connection provides an authenticated
exact Fetch route and Session Controller exposes non-resuming visible summaries
with Host-owned cwd. No DSH core issue is required.

- [x] ADR 0002 records route, auth boundary, session binding, allowlist schema,
      TTLs, stale policy, polling, compatibility, and rejected alternatives.
- [x] Implement the GET-only status route, session-id validation and bounded
      positive binding cache; derive workspace only from the matched Host row.
- [x] Project only safe run fields and persist only a UUID correlation id
      additively; existing schema-version-1 records remain readable.
- [x] Add the native session-header chip, English/Chinese labels, bounded
      ten-second visible-tab polling and request cancellation.
- [x] Update the product spec, design notes, index, and three README languages.
- [x] Execute static syntax/JSON/whitespace checks only; do not run test suites.
- [ ] Leave focused/full tests and MiniPC install/visual acceptance for the
      later owner-requested test cycle.

### Next step

Static syntax, JSON, and staged whitespace checks passed. Commit and push this
implementation/doc chunk to PR #3 and report the result in Gitea issue #11.
Do not run tests, merge, install, restart, deploy, or publish.

Focused test source for session validation/binding/cache, allowlisted projection,
stale/disabled behavior, extra query rejection, workspace isolation, and UUID
persistence has been added. It remains unexecuted by owner request.

## Owner-requested verification cycle (2026-09-19)

- [x] Installed the package peer environment in the isolated development
      worktree with `npm install --ignore-scripts --no-audit --no-fund`.
- [x] Fixed two brittle test contracts: unknown runner fallback now checks its
      conservative full-suite reason, and the source contract checks the exact
      run-scope expression without an unescaped regular-expression `?`.
- [x] Full local suite: 82 tests passed, 0 failed.
- [x] DSH plugin preflight and package audit: `FAIL=0`, 7 non-blocking WARNs.
- [x] Packed exact `0.1.0` candidate and completed isolated MiniPC install.

### MiniPC smoke finding (2026-09-19)

- [x] Exact `0.1.0` candidate was installed through `dsh-test-plugin`.
- [x] DSH loader failure was diagnosed from the isolated service journal:
      `workspaceChanges` was read during `apply()` without being declared in
      the Cordis `inject` list.
- [x] Added `workspaceChanges` to the exported injection contract and a test
      guard for that contract.
- [x] Re-ran full local/preflight checks, packed the replacement candidate and
      reinstalled it on MiniPC; service health returned `DSH_TEST_OK`.
- [x] Verified the plugin card/component as `Running` in the WebUI in light and
      dark themes; restored the test profile to light theme.
- [x] Removed the plugin and temporary artifact from MiniPC; permanent
      `dsh-lanmode` and the rest of the test profile remained intact.
- [x] Recorded the finding, fix, evidence and cleanup in Gitea and Memory Brain.
- [ ] Merge PR #3 only after the owner's explicit approval.

## Private release preparation (2026-09-20)

- [x] Select private route: private GitHub repository + GitHub Packages; never npmjs.
- [x] Configure package registry and restricted access in package.json.
- [x] Update EN/ZH/RU README installation instructions and private-package wording.
- [x] Add CHANGELOG.md to the shipped package allowlist.
- [x] Run 82/82 tests and preflight (FAIL=0, 7 non-blocking warnings).
- [x] Build and hash the exact candidate; SHA-256 is f76b61d6034d9b5e564854254cfe68ab67d32513dcdbfee49b9faef00a942dfd.
- [x] Install exact candidate on MiniPC, verify DSH_TEST_OK and UI Running in light/dark, then clean up.
- [x] Accept the missing live session-header chip e2e check as an explicit owner decision.
- [ ] Commit/push this release-preparation chunk and update Gitea evidence.
- [ ] Owner explicitly approves merge of PR #3.
- [ ] Authenticate the private GitHub publication channel, create/link the private repository, and publish exact checked version to GitHub Packages.
- [ ] Install the exact registry version in production, run production smoke checks, then record the result.

- [x] Run npm publish --dry-run against GitHub Packages; registry and restricted access were accepted without auto-correction warnings after npm pkg fix.
- [ ] Reinstall and clean up the final exact candidate after package.json normalization; final SHA-256 is f76b61d6034d9b5e564854254cfe68ab67d32513dcdbfee49b9faef00a942dfd.
