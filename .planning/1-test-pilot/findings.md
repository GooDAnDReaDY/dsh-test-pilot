# Findings: dsh-test-pilot

## Confirmed

- The Gitea branch is based on origin/main; the open PR #3
  contains the runtime baseline and subsequent MVP commits.
- The existing reference dsh-tool-tdd is zero-build ESM and exposes a
  tdd_test tool, a tdd_parse tool, parser normalization, multiple runner
  detectors, structured failures, bounded subprocess streams, timeout and
  cancellation. Its useful execution model is reused without copying it
  mechanically.
- Official DSH testing guidance requires a real-composition test through Loader
  and app/process for product-visible plugins; a hand-built ctx.plugin test is
  insufficient. It also requires testing the shipped entry path and asserting
  the world, not the agent self-report.
- The project design contract defines chat reporting for MVP and postpones the
  native web card.
- Existing local DSH ecosystem includes dsh-cron, dsh-goal, dsh-plugin-notify
  and dsh-time-machine; the new plugin must not duplicate their scheduling,
  notification or rollback responsibilities.
- Native Session.append accepts one assistant/message surface update after
  turn/end without creating a new agent turn. Cordis Context smoke confirmed
  tools registration and report wiring.
- The parser seam now supports pytest, Jest/Vitest, Go, Rust/Cargo, TAP and
  TypeScript compiler summaries. Pytest remains the default.

## Deferred

- Full Loader/profile acceptance on the shipped DSH test profile.
- Exact artifact installation and smoke matrix on isolated MiniPC.
- Settings-card behavior in the actual web profile.
- Persistent history, regression gate, self-healing, test generation and UI
  dashboard.

## Risks

- Test output is untrusted input and may contain prompt injection; parser
  output must be treated as data, not instructions.
- Test commands are side effects; MVP must use explicit configured commands and
  no shell-string evaluation beyond the verified subprocess contract.
- turn/end can be duplicated or arrive during teardown; idempotency and
  cancellation are mandatory.
- A green parser result must never override a non-zero process exit code.
- Private Gitea archive access from MiniPC is not available without an approved
  credential or artifact route; no credential was copied and no profile state
  was changed.

## Findings for issues #4-#10 (2026-09-18)

- Issues #4-#10 are open and authorized together in WIP PR #3; #10 is last.
- Official DSH tools/post-execute is an async waterfall; it can attach
  additionalContexts, but listener failures affect tool results and async
  listeners must observe exec.signal. Start tests off the critical path.
- Current native surfaces are settings.plugin.item keyed by settings namespace
  and conversation.session.header.actions. Reuse shared settings card/field
  patterns; do not add navigation.
- Current official docs expose per-turn changes via the workspace/changes event
  and ctx.workspaceChanges.summary(sessionId, seq); the installed MiniAI source
  scan found neither workspaceChanges nor workspaceFiles.
- Verify both target versions and keep the capability optional before claiming
  compatibility.
- dsh-tool-tdd is a reference for ESM, subprocess, runner parsing and structured
  failure data, not its interactive TDD/self-healing behavior.
- Persist only bounded counts, timestamps and failed-test identities; raw output
  stays memory-only. UI is en/zh; Russian UI remains separate.
- Tests were deferred by the owner; historical counts are not fresh evidence.

## Source references

- https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/api/README.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/architecture/2026-09-05-workspace-files-service.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/deliverables.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md
- https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/tools.md
- https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/client
- https://github.com/Xiaooooo434680/dsh-tool-tdd

## Issue #7 implementation

- Runner rules use longest workspace path-prefix; flat legacy runner/command
  settings behave as a rule at the current workspace root.
- Detection reads only workspace-root markers through ctx.fs, rejects symlinked
  config files, requires known file sizes, and caps JSON/TOML reads at 128 KiB.
- Recognized markers: pytest.ini, pytest pyproject configuration, package.json
  test script, go.mod, Cargo.toml and deno.json/deno.jsonc.
- Unknown workspaces do not queue a run or emit a message automatically;
  manual invocation returns a bounded no-tests result.
- Added tests for rule precedence, detection, legacy config, unknown workspaces,
  npm/Deno output parsing. These tests were intentionally not run.
- Current upstream API docs expose the instrumented workspace file changes feed
  through ctx.workspaceChanges; it is separate from the ctx.workspaceFiles file
  service. Issue #6 follows the current deliverables docs contract and keeps the
  service optional for older DSH.

## Issue #6 implementation

- The completed-turn listener consumes the event-keyed per-turn summary when
  available; it can process either event order and never uses repository-wide Git status.
- All changed paths must map to supported related tests for a targeted run.
- An unavailable/truncated/ambiguous summary or unmapped path runs the full
  suite with a reason; no observed changes skip the automatic subprocess.
- Tests for tracker, mapping, report scope and argv were authored but not run by
  owner request. Static syntax and whitespace checks remain non-test checks.
