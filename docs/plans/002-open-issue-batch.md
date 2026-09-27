# Active implementation plan — dsh-test-pilot issues #8, #24–#32

## Goal
Complete the ten assigned open issues in one Gitea branch, worktree and PR, preserving the accepted no-self-healing boundary. The Gitea history for #24 confirms that public 0.1.2 was already released before this issue batch; do not republish it or change the package version in this implementation PR. Resolve the next release version only after merge and release checks. Keep public writes and deployment behind approval gates.

## Issue-level scope and acceptance

### #8 — current DSH settings contract
- Keep the DSH ConfigForms profile-entry identity aligned and configure native settings policy with the current settings.configure API; verify host lifecycle and live settings on MiniPC.
- Keep the existing client card and settings snapshot behavior.
- Add host-contract tests for registration, update, unavailable/read-only state and disposal/HMR; no silent catch may hide a missing card.

### #24 — public source-tree hygiene
- Public GitHub allowlist: `CHANGELOG.md`, `LICENSE`, `README.md`, `README.ru.md`, `README.zh.md`, `cordis.patch.yml`, `lib/**`, `media/**`, `package.json`, and `test/**`.
- Explicitly exclude `package-lock.json`, `.gitignore`, `AGENTS.md`, `index.md`, `findings.md`, `progress.md`, `task_plan.md`, `.planning/**`, `docs/plans/**`, `openwiki/**`, and all generated/development-only files. Keep them in Gitea where tracked.
- The package uses its own `package.json.files` allowlist; npm dry-run confirms README trio is present and AGENTS/index/plans/lockfile are absent.
- Do not rewrite prior public history or force-push. The existing public tree still has the historical lockfile; remove it from the next approved sanitized tree and verify exact tag tree. No GitHub writes before final release approval.

### #25 — clean-install dependency contract
- Ensure modules imported at startup are installable from a clean consumer install.
- Test npm ci followed by the full suite; verify the declared dependency contract rather than relying on preinstalled server packages.

### #26 — persistence test isolation
- Pass an explicit temporary persistence file path through the test seam; assert persistence tests never touch the default DSH home and remove only test-created temp paths.
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
- Use the shared DisclosureRow component and theme-owned elevation token; remove custom glyph/hand-authored shadow.
- Preserve keyboard access, visible focus and reduced motion; visually verify light and dark themes on the isolated DSH test profile.

### #31 — host module size
- Extract cohesive responsibilities from the oversized host entry module without changing runtime behavior.
- Keep boundaries minimal; verify imports/contracts and remove the size warning or document why splitting further is harmful.

### #32 — ConnectionFetchRoute contract
- Declare the GET route requestBody as none and add a source contract assertion; verify compatibility against the installed MiniPC DSH runtime because its older local route type does not expose this field.
- Preserve authenticated GET behavior and safe invalid-request responses.

## Phases

1. **Preflight and research** — confirm issue state, review current code/docs and DSH contracts, inspect the public mirror and reuse-first references. Record findings before implementation. **Status: complete.**
2. **Implementation** — implement #8, #24–#32 on this branch; add issue-specific regression tests and update English/Chinese docs where user behavior or settings change. **Status: in progress; #24 publication-tree verification remains gated on the approved sanitized publication, while #31 implementation is complete.**
3. **Verification** — full suite is 97/97; clean-install npm ci and plugin preflight pass (FAIL=0/WARN=6). Still run MiniPC candidate/runtime/UI acceptance and verify the exact sanitized GitHub tag tree after publication approval. Do not claim an unverified check passed.
4. **Gitea handoff** — self-review, commit completed slices, push via the Codex Git wrapper, open one PR, record evidence in each issue, and await explicit owner merge approval.
5. **Release** — public 0.1.2 already exists per Gitea #24 history. After merge and required test-server/production checks, determine the next valid version and obtain final public release approval before any public GitHub/tag/npm write. Do not close issues until acceptance and per-issue evidence are complete.

## Decisions and guardrails
- Preserve and exclude the existing dirty config-forms worktree: its sole package-lock diff synchronizes stale branch version 0.1.1; current origin/main is 0.1.2.
- One branch/worktree/PR covers the assigned issue set. No other repository, worktree or plugin is in scope.
- Self-healing, automatic code edits, production configuration edits, force operations, public pushes before approval, and history rewrites are out of scope.
- Any broader API/auth/data contract change beyond the written issue acceptance pauses for owner approval.
