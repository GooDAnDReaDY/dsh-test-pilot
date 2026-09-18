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
- tools/post-execute receives (exec, result, next) and returns PostToolDecision.
  Async listeners must observe exec.signal; additionalContexts may be attached
  only after next settles. The plugin starts test work without awaiting it.
- Verified tool-fs mutation names are write/edit; str_replace_editor mutates for
  create, str_replace, and insert. Read/view calls must not schedule runs.
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

- Commit bc7083d pushed to the shared feature branch and PR #3; issue #6 and PR
  comments contain the implementation report.
- Uses the event-keyed per-turn summary when available and never uses
  repository-wide Git status. All changed paths must map safely for targeted runs.
- An unavailable/truncated/ambiguous summary or unmapped path runs the full
  suite with a reason; no observed changes skip the automatic subprocess.
- Tests for tracker, mapping, report scope and argv were authored but not run by
  owner request.

## Issue #4 implementation in progress

- tools/post-execute is the trigger; two-second quiet-period debounce coalesces
  successful writes and cancels stale runs. Runs observe exec.signal and are
  never awaited by the hook.
- Completed, undelivered reports attach through additionalContexts once; turn/end
  flushes pending changes and appends a result only if not delivered in-turn.
- DSH completion nudge and README EN/RU/ZH, ADR, design contract, spec and index
  were updated. Debounce/cancellation/in-turn/failsafe integration tests are
  authored but intentionally unrun.

## Issue #11 research kickoff (2026-09-18)

- Owner explicitly authorized implementation after the separate Gitea issue
  was created; continue in the existing issue-block branch and PR #3.
- The design contract currently defers the session-header chip until its API
  has a safe authorization contract; there is no plugin-owned route today.
- Issue #11 requires server-derived access to the current session/workspace;
  browser-supplied cwd or workspace key is never sufficient authorization.
- No raw output, command/arguments, absolute path, file list, or prompt may be
  returned. If DSH cannot provide safe ownership binding, open a core issue.

## Upstream DSH transport findings (2026-09-18)

- Official Connection documentation separates direct WebServer routes from the
  authenticated Connection Fetch bridge. The browser-facing Connection owns
  `/api`, Host/Origin checks, browser-session auth, and exact Fetch routes.
- Third-party plugins cannot add generated Typert Remote descriptors without
  participating in the Harness build; upstream discussion points to `ctx.webServer`
  plus the supported Fetch bridge for out-of-tree plugins. Verify the exact API
  against the installed target source before implementation.
- Raw `ctx.webServer.register()` is not yet proven to inherit Connection auth;
  do not expose the status response on an unguarded route.

## Route research checkpoint (2026-09-18)
- The previous grouped upstream-page open was truncated and supplied no additional verifiable detail; do not treat it as proof of route registration or authorization.
- Project-specific AGENTS.md already exists and confirms the product/runtime constraints; no replacement file is needed.
- Official Connection docs state that the Web carrier owns the authenticated API bridge and exact Fetch-route dispatch, with Host/Origin checks and browser-session authentication before shared HTTP routes.
- Exact out-of-tree plugin registration and the trusted server-side session/workspace binding remain unproven.
- Next: inspect smaller upstream sections and the installed DSH source on MiniAI before choosing an endpoint. If either property is unsupported, stop feature code and file a DSH core issue.
- References: https://github.com/deepseek-ai/deepseek-harness/packages/client/connection/README.md and https://github.com/deepseek-ai/deepseek-harness/docs/api-gateway.md

## Installed DSH source checkpoint (2026-09-18)
- The inspected source tree is /opt/deepseek-harness-v0.1.2-alpha.5; the read-only server inspection found the Connection implementation under packages/client/connection.
- This target has an exact Fetch-route registration path (registerFetchRoute) exposed through the Connection route registry, separate from the raw WebServer API. Route registration is associated with an owner and returns lifecycle cleanup.
- The web carrier docs/source establish browser-session and Host/Origin checks for the shared API bridge.
- This is not yet proof that a route handler can safely resolve the selected/current session or that browser-auth maps to authorization for a given session/workspace. That boundary remains a gate.
- No DSH or production files were modified, and no service was restarted.

## Connection route contract (2026-09-18)
- Installed Connection exposes connection.fetch.register({ path, methods, fetch }); methods are GET/HEAD and the exact route is lifecycle-owned/disposed with the registering Cordis Context.
- The active Web carrier checks Host/Origin trust and browser-session auth before dispatch to exact Fetch handlers.
- The route callback receives a standard Request and can capture Host services in its closure; the Connection auth identity itself is not passed as a session/workspace identity.
- Therefore the transport solves browser authentication but not session/workspace authorization. Continue verifying whether the Host session controller offers an authoritative resolver for a client-selected session before coding.
- Source inspected read-only at /opt/deepseek-harness-v0.1.2-alpha.5/packages/client/connection/src/index.ts, rpc-host.ts, and rpc.ts.

## Session identity follow-up (2026-09-18)
- The installed Session Controller is a Host Cordis service and exposes inspect(sessionId, signal) for attached or persisted sessions; persisted inspection rejects unknown sessions and requires a canonical header cwd.
- inspect() also returns session events, so the endpoint must extract only the validated header identity/cwd and discard the event prefix; it must never serialize event contents.
- resolveAgent(sessionId) is not appropriate for this read-only status query because it may resume/activate an Agent.
- Session summaries also carry Host-derived sessionId and cwd, but whether this offers a better bounded lookup is still being checked.
- Tentative safe contract: browser sends only a session identity supplied by the native session UI; Host validates it through Session Controller and derives workspace from the stored Session header. Never accept cwd/workspace keys from the browser.

## Native header slot contract (2026-09-18)
- DSH's conversation.session.header.actions is a native session-scoped list slot, but the session skeleton invokes it with empty props.
- Session Controller exposes Host-only inspect() for stored Session data; the browser README documents session-addressed APIs and client session state separately.
- Therefore the chip cannot infer identity from slot props; it must read the native active-session hook/state, then send only that identifier to the authenticated exact route.
- Host must verify that identifier against the canonical Session Controller record and derive cwd itself; the browser must never select a workspace by supplying a path/key.
- Next: inspect the native UI job/session hook and the client Connection fetch API, then confirm the production core revision/version and whether the Session Controller record is sufficient host authorization.

## Header binding confirmation (2026-09-18)
- In DSH alpha.5, the session-header action slot is session-scoped and injects the native sessionId plus standard useSession/useSessions hooks; built-in JobListAction consumes sessionId with useSessions.
- The slot itself has no session props, but the installed renderer supplies them through the standard runtime binding. This is the supported current-session source, not a browser cwd/workspace choice.
- Session changes are a new strict session binding; the chip should abort/recreate its request lifecycle on sessionId change and render unknown while refreshing.
- The feature has an established native precedent (ui-jobs) for this slot and state binding.

## Client transport and current implementation (2026-09-18)
- Client Connection exposes generic RPC but no public exact-Fetch client helper; the Test Pilot package is web-only, so same-origin fetch to the exact authenticated /api route is the available browser transport.
- The route must use the native sessionId from the DSH session-header slot, then resolve a canonical Host session header before using workspace state. Existing sessionCwd() trusts event/session-shaped cwd values and is not the correct endpoint boundary.
- Test Pilot's state module retains bounded in-memory results; persistence keys workspaces by a hashed key and does not retain absolute cwd in restored rows.
- Endpoint projection must be workspace-specific and compact; it cannot return normalized full results because those can contain output, command, and paths.
- Next: inspect persistence/status summary helpers, official SessionId validation, and exact plugin/slot imports before ADR and implementation.

## Status projection boundary (2026-09-18)
- Persistence offers latestForWorkspace(cwd), backed by a SHA-256 workspace key and retained bounded summaries; raw commands/output and cwd are not persisted.
- In-memory normalized results do contain cwd, command, output, failure messages, filenames and test paths. The endpoint must use an explicit allowlist projection, never return a normalized result directly.
- Persisted summaries still contain bounded failure identities; the session chip should return only status, safe timestamps, counts and a correlation id, not failure rows.
- Connection exact-route tests confirm GET/HEAD dispatch, query handling and owner-lifecycle disposal; POST is not accepted by the exact route.
- Session-list validation and SessionId/path handling still need a precise safe contract before implementation.

## Session lookup safety checkpoint (2026-09-18)
- Session Controller's inspect() is intentionally non-activating, but its Host result includes the complete event prefix; a route can keep it private and select only meta.cwd, but that is a potentially expensive read.
- The native header UI receives a server-bound sessionId and exposes useSession/useSessions; its strict per-session scope remounts on selection changes.
- The Connection route takes query parameters only as untrusted input. Session ID must be validated before calling Host storage, and workspace must be derived from the inspected stored header.
- Still checking the core SessionId/path contract and whether a bounded native Host accessor exists; do not code the endpoint until that is resolved.

## Core SessionQuery contract (2026-09-18)
- SessionController.inspect delegates to SessionQuery.observeSession(sessionId, { projectionMode: 'none' }) for cold sessions; this returns an observation containing the complete event prefix and requires caller disposal.
- SessionQuery also exposes listSessions(signal), which reads the logical session corpus and may be broader than one item; neither is a bounded header-only lookup.
- The SessionId type is compile-time branded in this API; the route still needs its own strict input validation before any Host persistence read.
- Safe session-to-workspace binding appears possible only by validating the native UI sessionId, then reading its canonical persisted header and selecting header.cwd. Cost and identifier grammar remain unresolved.

## Bounded session resolution follow-up (2026-09-18)
- SessionController.list() delegates to SessionQuery.listSessions() for canonical host records, then derives summaries; the list is process-wide and not paginated.
- A repeated inspect() per poll would reread the full cold event prefix, so the endpoint must avoid repeated inspection and avoid including event data in any response.
- A bounded TTL cache of server-resolved immutable sessionId-to-cwd bindings is a candidate; cap entries, validate ID syntax before lookup, and expire bindings so deleted sessions do not stay visible indefinitely.
- Confirm SessionId generation/storage rules before choosing a conservative input grammar.

## Session identifier storage boundary (2026-09-18)
- The installed JSONL persistence does not join the raw SessionId into a path; it encodes the ID segment, then verifies the stored header identity and canonical project path.
- This removes the direct path-traversal concern, but an HTTP input length/character cap is still required to bound the request and query work.
- The authoritative Host inspect path uses SessionQuery observation and the persistence identity checks; the caller must still discard all event content and derive only the stored header cwd.

## Session binding decision (2026-09-18)
- DSH SessionId is a branded string, not a runtime validator; explicit IDs are accepted and the JSONL store separately encodes IDs and checks stored identity.
- Safe supported path exists in target alpha.5: browser uses the native session-scoped slot's sessionId; authenticated exact GET route bounds/validates it; Host SessionController.inspect resolves that identity to the persisted header; plugin derives cwd only from that Host header.
- The route must discard inspection events, never return sessionId/cwd, and expose only an allowlisted status/count/timestamp/correlation response.
- Cache only the immutable Host-resolved sessionId-to-cwd binding with strict entry and TTL bounds to avoid rereading a cold event prefix on every poll; check attached Session headers directly first when available.
- With the endpoint carrying no path, file, command, prompt, raw output, or failure detail, this fits DSH's process-level browser-auth model and native session visibility. No DSH core issue is needed.
- Proceed to ADR, endpoint/UI implementation, docs and authored tests; actual tests and isolated DSH UI acceptance remain deferred by owner request.

## Safer native-list binding refinement (2026-09-18)
- The Host SessionController.list({}, signal) is a better resolver than inspect(): it returns only visible SessionSummary records with host-derived sessionId/cwd and does not activate Agents.
- Its documented purpose is to list every visible attached and persisted Session. The route can accept only an ID, require an exact match in this Host-owned list, and derive cwd from that matching row.
- This avoids reading or retaining a cold Session's event prefix for each binding; the endpoint still never returns the path.
- Use a short-lived, bounded cache for the single resolved sessionId-to-cwd binding to avoid rebuilding the process-wide list on every poll; expiry bounds stale access after deletion.
- Treat missing/inaccessible IDs identically as not found; never accept browser cwd/workspace IDs.
- This resolves the security gate using existing DSH Host APIs; no core issue is required.

## Issue acceptance details (2026-09-18)
- Gitea #11 explicitly requires unknown, running, passed, failed, stale and disabled states, with timestamp, correlation ID and compact counts.
- Gitea #8 requires a session-header chip for green/red/running/stale, and clicking it to show the last result; the chip is the one allowed UI surface that shows green.
- Product choice for the ADR: no saved result means unknown; a terminal result older than seven days means stale; disabled config overrides the visible state while retaining only a compact last-result summary.
- Clicking shows status, time, duration and counts only. It never shows full output, command, args, paths, test names or filenames.

## Final endpoint/UI requirements (2026-09-18)
- The endpoint is GET-only and read-only; the client polls at a bounded cadence, cancels on session change/close, and degrades to unknown without affecting settings or DSH work.
- The native chip is the only UI surface that may show green. Click reveals the last compact result, not a raw report.
- Stale is defined as a terminal result more than seven days old; no result and transport failure are unknown; configured-off policy is disabled.
- The seven-day stale threshold is a product choice and must be recorded in the ADR/docs for future review.

## Exact DSH source reference (2026-09-18)
- The read-only inspected DSH source checkout reports core commit f02c691a2120b8c53e1fcedeac1b4d59d91067fa; Connection and Session Controller packages are 0.1.2-alpha.5.
- The ADR can pin evidence to that exact commit: packages/client/connection/README.md, packages/client/connection/src/rpc.ts, packages/api/session-controller/README.md, packages/api/session-controller/src/index.ts and src/list.ts.
- This keeps the route/auth/session-binding decision reproducible instead of referring only to a moving upstream branch.

## Exact route shape confirmation (2026-09-18)
- The alpha.5 Connection validator accepts slash-separated safe endpoint segments beneath /api and rejects empty, dot and dot-dot segments; /api/dsh-test-pilot/status is compatible.
- The supported exact Fetch contract dispatches GET/HEAD and binds cleanup to the registering Cordis owner.
## 2026-09-18 implementation decisions: session status chip

- The endpoint uses `ctx.connection.fetch.register` on exact path
  `/api/dsh-test-pilot/status`, GET only. This reuses DSH Connection's
  authenticated browser and Origin-trust boundary.
- Browser sends only `sessionId`. Host calls `sessionController.list({}, signal)`,
  requires an exact visible-row match and obtains cwd from that row. No browser
  path or workspace key is accepted; no Session inspect/resume is invoked.
- Positive session-to-cwd bindings are process-memory only, TTL 15 seconds,
  maximum 128 entries. The status body is no-store and allowlists statuses,
  timestamps, duration, counts and UUID correlation only.
- Route body omits sessionId, workspace key/path, runner command/args, output,
  prompts, filenames, test names, failure text and raw exceptions. Non-UUID
  legacy correlation strings are suppressed because they may contain session IDs.
- Client uses the native `conversation.session.header.actions` slot, polls at
  10-second intervals only while visible, and aborts on hide/unmount/session
  change. Endpoint failure maps to unknown and does not affect the DSH turn.
- Terminal data older than seven days maps to stale. Active runs remain active;
  global/workspace disablement maps to disabled unless a run is active.
- DSH Connection and Session Controller are required peer dependencies
  `>=0.1.2-alpha.5 <1.0.0`; no fallback route is allowed.
- ADR: `docs/adr/0002-session-status-chip.md`. Tests and profile/UI acceptance
  remain deferred under the owner's instruction.

- Focused test source covers the response allowlist, hidden session rejection,
  positive cache TTL, workspace-key isolation, stale/disabled projection,
  rejection of extra workspace parameters, and safe UUID persistence. It has
  not been executed.
