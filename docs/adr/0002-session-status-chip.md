# ADR 0002: Authenticated Session Status Surface

- Status: accepted
- Date: 2026-09-18
- Related work: Gitea issues #8 and #11
- Decision scope: read-only session-header chip and status response; no test execution or UI installation

## Context

Issue #8 asks for a Test Pilot status chip in the active DSH session header and a compact last-result view on click. Issue #11 requires the status request to be bound to a session the current authenticated DSH connection can access. A browser-provided workspace path, workspace key, or cwd cannot establish that binding.

The status surface must not expose the detailed run report already available to the agent. It must remain safe when a session changes, a tab is hidden, an endpoint is unavailable, or persisted state is older than the current process.

## Decision

### Route and authentication

Register one exact GET route, `/api/dsh-test-pilot/status`, through the Host `ctx.connection.fetch.register()` API. Connection applies its normal Host/Origin trust and browser-session authentication before calling the plugin handler. Do not register this route through an unauthenticated web-server route or accept cross-origin credentials.

The only query parameter is one `sessionId`. Reject missing, duplicate, empty, over-256-character, or control-character-containing values. The route does not accept cwd, a workspace path, a workspace key, or a run identifier.

Resolve the submitted id by calling `ctx.sessionController.list({}, request.signal)`, then require an exact match in the Host-produced visible session summaries. Use that summary's Host-provided cwd. Do not inspect arbitrary caller-supplied paths, read a session transcript, resume an Agent, or activate a session. Missing/unavailable ids receive the same generic 404 response.

Positive `sessionId -> cwd` bindings may be cached only in process memory for at most 15 seconds and 128 entries. The bounded cache avoids listing every session on every poll; it is never persisted. The request abort signal is passed to the Session Controller.

### Status projection

Select only the latest active (queued/running) or latest terminal test run for the effective workspace. The effective workspace follows the same precedence as Test Pilot execution: configured `cwd`, otherwise the matched Host session cwd. Workspace state is addressed internally by the existing SHA-256 workspace key.

The response is an allowlist projection:

~~~json
{
  "status": "passed",
  "lastStatus": "passed",
  "updatedAt": 1790000000000,
  "startedAt": 1789999998000,
  "finishedAt": 1790000000000,
  "durationMs": 2000,
  "correlationId": "4a53c3f6-2cf7-4e5c-8b5a-9771f33ddf53",
  "counts": {
    "total": 42,
    "passed": 42,
    "failed": 0,
    "skipped": 0,
    "errors": 0,
    "xfail": 0,
    "xpass": 0
  }
}
~~~

`status` is one of `unknown`, `queued`, `running`, `passed`, `failed`, `stale`, or `disabled`. A run in `error` or `timeout` projects to `failed`; its bounded enum remains available in `lastStatus`. A terminal result older than seven days projects to `stale` while retaining its safe last status, timestamp, duration, counts, and UUID correlation id. No stored result projects to `unknown`. Global or matching workspace disablement projects to `disabled`, except that a currently active run remains visible.

The response never includes a session id, cwd, workspace key, runner command, arguments, output, prompt, file path, filename, test name, failure message, or raw error. The correlation id is emitted only if it matches a UUID; legacy automatic-run correlation strings can contain a session identity and therefore project as null. Counts are bounded non-negative integers. All responses use `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Errors use a small generic JSON code, without exception text.

The route performs no test execution and no mutation. A status lookup failure is a nonfatal unavailable/unknown state in the client.

### Browser behavior

Contribute one native `conversation.session.header.actions` entry, strictly scoped by DSH to the session whose `sessionId` it supplies. Fetch same-origin with credentials, GET only, and `cache: no-store`. Poll every ten seconds while the document is visible. Pause while hidden and abort the in-flight request on hide, unmount, or session change. A failed request is rendered as unknown and never interrupts DSH.

The chip exposes loading, unknown, queued, running, passed, failed, stale, and disabled states. Clicking it opens a compact accessible region containing only status, local timestamp, duration, bounded counts, and an allowlisted UUID correlation id. Green is shown only in this chip; the existing chat notification policy remains unchanged. Keyboard focus is visible; Escape closes the region and restores trigger focus; reduced-motion preferences are respected.

### Compatibility

The Host route requires the DSH Connection and Session Controller packages at `>=0.1.2-alpha.5 <1.0.0`. These are declared as peer dependencies. Older DSH versions that do not provide both Host services cannot load this feature; no insecure route fallback is provided.

## Alternatives rejected

- **Browser-provided cwd or workspace key:** allows one session to query another arbitrary workspace and is not an authorization proof.
- **Direct `ctx.webServer.register()` route:** does not establish the Connection authentication/trust contract used here.
- **Session inspection or transcript query:** reads more sensitive data than needed and can activate or resume runtime state; a visible summary already carries the authoritative cwd.
- **Gateway RPC for polling:** status is a small same-origin representation; the exact authenticated GET route has a smaller client and data contract.
- **Polling continuously or during hidden tabs:** wastes requests without improving a status surface that tolerates a ten-second refresh interval.

## Verification boundary

The feature is implemented with unit-test cases planned for status projection, route input validation, visible-session binding/cache limits, and browser cancellation. Per the owner's direction, test suites and DSH profile/UI acceptance are deferred to the later test cycle. Before that cycle, only static syntax, JSON, and diff checks are permitted.

## Pinned DSH source references

The design was checked against DSH core commit `f02c691a2120b8c53e1fcedeac1b4d59d91067fa`:

- [Connection Fetch route contract](https://github.com/deepseek-ai/deepseek-harness/blob/f02c691a2120b8c53e1fcedeac1b4d59d91067fa/packages/client/connection/src/rpc.ts)
- [Connection route registration and Host authentication boundary](https://github.com/deepseek-ai/deepseek-harness/blob/f02c691a2120b8c53e1fcedeac1b4d59d91067fa/packages/client/connection/README.md)
- [API Gateway security policy](https://github.com/deepseek-ai/deepseek-harness/blob/f02c691a2120b8c53e1fcedeac1b4d59d91067fa/docs/api-gateway.md)
- [Session Controller API](https://github.com/deepseek-ai/deepseek-harness/blob/f02c691a2120b8c53e1fcedeac1b4d59d91067fa/packages/api/session-controller/README.md)
- [Session Controller visible-list implementation](https://github.com/deepseek-ai/deepseek-harness/blob/f02c691a2120b8c53e1fcedeac1b4d59d91067fa/packages/api/session-controller/src/list.ts)
- [Native session-header slot contract](https://github.com/deepseek-ai/deepseek-harness/blob/f02c691a2120b8c53e1fcedeac1b4d59d91067fa/docs/subsystems/slots.md)
