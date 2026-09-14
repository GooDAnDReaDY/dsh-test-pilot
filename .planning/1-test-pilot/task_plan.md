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
