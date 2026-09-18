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
generation, persistent history, web dashboard, arbitrary shell evaluation,
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
2. #6: verify the installed and current public workspace-change feed API
   (the issue says workspaceChanges; upstream docs expose
   ctx.workspaceFiles.changes), capture per-turn writes, map source-to-test,
   explain full-suite fallback and always run the full suite manually.
3. #4: tools/post-execute writes, 2-second debounce/coalescing, background run,
   observe exec.signal, return only completed additionalContexts, turn/end
   failsafe and a short system-prompt nudge.
4. #9: versioned atomic state, bounded history, persist counts/timestamps and
   failed-test identities only; never persist full command output.
5. #5: keep plugin report events; chat only on meaningful red/green transitions,
   silent green/skips, compare failed-test identities.
6. #8: native settings card and session-header status chip; en/zh UI only.
7. #10 last: keep test_pilot_status and test_pilot_run; remove two redundant
   tools after descriptions stabilize.
8. Update spec, design, index, all README languages, Gitea and Memory Brain;
   inspect diff and run non-test static checks only.
9. Defer all test runs, package installation, profile changes/restarts, merge,
   deploy and publication until separately requested/approved.

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
