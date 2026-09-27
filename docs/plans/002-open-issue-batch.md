# Active implementation plan — dsh-test-pilot issues #8, #24–#32

## Goal
Complete the ten assigned open issues in one Gitea branch, worktree and PR, preserve the accepted no-self-healing boundary, then run release checks for the already selected 0.1.2 version. Keep development records in Gitea; public writes and deployment remain behind approval gates.

## Issue-level scope and acceptance

### #8 — current DSH settings contract
- Replace stale settings registration with the current ConfigForms registration/disposal contract.
- Keep the existing client card and settings snapshot behavior.
- Add host-contract tests for registration, update, unavailable/read-only state and disposal/HMR; no silent catch may hide a missing card.

### #24 — public source-tree hygiene
- Define a reproducible public-source allowlist and classify every tracked path.
- Keep docs, AGENTS.md, planning/research artifacts and openwiki in Gitea; exclude internal-only material from public GitHub and npm artifacts.
- Do not rewrite public history or force-push. Public mirror writes stay behind the release approval gate.
- Verify the resulting public tree and npm pack contents against the allowlist.

### #25 — clean-install dependency contract
- Ensure modules imported at startup are installable from a clean consumer install.
- Test npm ci followed by the full suite; verify the declared dependency contract rather than relying on preinstalled server packages.

### #26 — persistence test isolation
- Inject a temporary state path and required clock/service dependency in tests.
- Prove tests never write to the operator's default DSH home; clean only test-owned temporary state.

### #27 — runner workspace and egress boundary
- Constrain manual runs to a verified/allowed workspace; reject traversal and out-of-scope absolute paths.
- Never silently use network-fetching npx defaults. Any opt-in network policy must be explicit, bounded and tested.

### #28 — UTF-8 output bound
- Trim by encoded bytes, preserve newest valid complete UTF-8 text, and respect the configured byte ceiling.
- Cover ASCII, Cyrillic, CJK and supplementary-plane characters.

### #29 — locale identity
- Preserve active locale identity and use the documented fallback chain so external locale providers can supply translations.
- Keep built-in locales English and Chinese only; test dictionary selection and fallback.

### #30 — native UI styling
- Replace hard-coded shadow/color and private glyph styling with DSH theme tokens/shared primitives.
- Preserve keyboard access, visible focus and reduced motion; visually verify light and dark themes on the isolated DSH test profile.

### #31 — host module size
- Extract cohesive responsibilities from the oversized host entry module without changing runtime behavior.
- Keep boundaries minimal; verify imports/contracts and remove the size warning or document why splitting further is harmful.

### #32 — ConnectionFetchRoute contract
- Supply the required route fields for the installed DSH Connection type and add a contract/type check.
- Preserve authenticated GET behavior and safe invalid-request responses.

## Phases

1. **Preflight and research** — confirm issue state, review current code/docs and DSH contracts, inspect the public mirror and reuse-first references. Record findings before implementation. **Status: in progress.**
2. **Implementation** — implement #8, #24–#32 on this branch; add issue-specific regression tests and update English/Chinese docs where user behavior or settings change.
3. **Verification** — run focused tests, clean-install npm ci plus full suite, plugin preflight, public allowlist/package audit, and isolated MiniPC candidate/UI acceptance as required. Do not claim an unverified check passed.
4. **Gitea handoff** — self-review, commit completed slices, push via the Codex Git wrapper, open one PR, record evidence in each issue, and await explicit owner merge approval.
5. **Release** — keep version 0.1.2; after merge and required test-server/production checks, obtain final public release approval before any public GitHub/tag/npm write. Do not close issues until acceptance and per-issue evidence are complete.

## Decisions and guardrails
- Preserve and exclude the existing dirty config-forms worktree: its sole package-lock diff synchronizes stale branch version 0.1.1; current origin/main is 0.1.2.
- One branch/worktree/PR covers the assigned issue set. No other repository, worktree or plugin is in scope.
- Self-healing, automatic code edits, production configuration edits, force operations, public pushes before approval, and history rewrites are out of scope.
- Any broader API/auth/data contract change beyond the written issue acceptance pauses for owner approval.
