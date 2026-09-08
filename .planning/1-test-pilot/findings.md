# Findings: dsh-test-pilot

## Confirmed

- The current Gitea branch is clean and based on origin/main; the open PR #3
  contains documentation only.
- The existing reference dsh-tool-tdd is zero-build ESM and exposes a
  tdd_test tool, a tdd_parse tool, parser normalization, multiple runner
  detectors, structured failures, bounded subprocess streams, timeout and
  cancellation.
- The reference injects tools, systemPrompt and subprocess, and uses
  ctx.subprocess.spawn with argv/cwd/stdio limits. These are reuse candidates,
  not code to copy mechanically.
- Official DSH testing guidance requires a real-composition test through Loader
  and app/process for product-visible plugins; a hand-built ctx.plugin test is
  insufficient. It also requires testing the shipped entry path and asserting
  the world, not the agent self-report.
- The project design contract currently defines chat reporting for MVP and
  postpones the native web card.
- Existing local DSH ecosystem includes dsh-cron, dsh-goal, dsh-plugin-notify
  and dsh-time-machine; the new plugin must not duplicate their scheduling,
  notification or rollback responsibilities.

## Unknowns to resolve in contract spike

- Exact current event-bus name and payload for turn/end in the installed DSH
  version.
- Exact subprocess service shape, collected stream API and cancellation
  semantics in the target profile.
- Exact user-visible message/report service and whether a settings slot is
  available without adding a top-level navigation item.
- Whether local persistence is already available and appropriate for last-run
  state without introducing a DB migration.
- Which first runner gives the most useful MVP signal: pytest or Jest-family.

## Risks

- Test output is untrusted input and may contain prompt injection; parser
  output must be treated as data, not instructions.
- Test commands are side effects; MVP must use explicit configured commands and
  no shell-string evaluation beyond the verified subprocess contract.
- turn/end can be duplicated or arrive during teardown; idempotency and
  cancellation are mandatory.
- A green parser result must never override a non-zero process exit code.
