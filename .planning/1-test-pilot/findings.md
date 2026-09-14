# Findings: dsh-test-pilot

## Confirmed

- The current Gitea branch is clean and based on origin/main; the open PR #3
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
