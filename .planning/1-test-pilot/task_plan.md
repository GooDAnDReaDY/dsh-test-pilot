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
- Current commit: documentation baseline only; runtime implementation has not
  started.
- One block, one branch, one worktree and one PR remain the execution boundary.

## MVP scope

In scope: one selected runner adapter (pytest or Jest-family, chosen in the
contract spike), subprocess execution through the verified DSH service,
bounded stdout/stderr, timeout/cancellation, parser/result contract,
turn/end listener, duplicate suppression, last-run status and a concise
user-visible report.

Out of scope for MVP: self-healing repair turns, commit blocking, test
generation, persistent history, web dashboard, arbitrary shell evaluation,
automatic commit/push/deploy and external telemetry.

## Ordered actions

1. Contract spike: inspect the current DSH host event, subprocess, tools,
   messaging and lifecycle APIs; choose the first runner based on the real
   target contract and record an ADR.
2. Package skeleton: create package.json, cordis.patch.yml, lib host entry,
   test entry and license using the scoped @goodandready identity. Keep the
   client half minimal until a real UI is needed.
3. RED tests for domain contracts: TestRun, Failure, RunnerResult,
   timeout/cancel/error states, bounded output and report rendering.
4. GREEN runner adapter: execute argv through the verified subprocess API,
   normalize output and return exitCode/timedOut/runner/summary/failures.
5. RED/GREEN parser fixtures: pass, assertion failure, collection/compile
   error, timeout, malformed output and output truncation.
6. RED/GREEN event orchestration: subscribe to the verified turn/end event,
   detect whether code changed, apply idempotency and ensure teardown through
   ctx.effect or the host lifecycle contract.
7. Report and state: publish a concise message, retain the latest safe result,
   expose a diagnostic tool if justified by the host contract, and never
   include secrets, raw prompts or unbounded output.
8. Real-composition acceptance: boot a test-only Loader/Cordis composition,
   trigger the real event path, mock only nondeterministic/external boundaries,
   and assert the user-visible result.
9. Exact candidate validation: after the PR is merged only by the normal
   workflow, build the exact package artifact, install it on the isolated
   MiniPC DSH test profile, run the full matrix, clean up the test artifact
   and record evidence.
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
