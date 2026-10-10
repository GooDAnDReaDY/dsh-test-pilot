# Changelog

## 0.1.5

### Fixed
- Register settings card on DSH 0.2 live seats `plugins.item` and `plugins.row.config`, removing retired `settings.plugin.item` (#36).
- Apply configuration updates reactively via `loader/volatile-update` and `settings/document-updated` without requiring DSH restart (#37).
- Prevent unbounded memory growth by capping recorded file mutation paths at 1000 per turn before falling back to full-suite run (#40).
- Add devDependencies to `package.json` ensuring clean-checkout test execution passes (`npm ci && npm test`) (#41).
- Prevent automatic background test execution of untrusted commands detected from repository manifests without an explicit user workspace rule (#42).

### Improved
- Document backward-compatibility shim for `test-pilot/report` and `dsh-test-pilot/report` events (#39).
- Clarify `allowNetworkFetch` runner allowlist restrictions and opt-in boundaries (#38).
- Include `commandSource` in structured run output and test pilot status reporting (#42).

## 0.1.4

### Security
- Publish the GitHub source tree from an explicit product allowlist; exclude package-lock.json and internal project material from the new tag tree.

### Notes
- Runtime behavior is unchanged from 0.1.3.

## 0.1.3

### Improved
- Automatic runs respect workspace boundaries and remain offline by default; package fetching is an explicit per-workspace opt-in.
- Settings, session status and locale handling follow current DSH client contracts.
- Test output truncation stays within the configured UTF-8 byte limit.

### Fixed
- Required DSH peers are declared for clean installs; persistence and status-route contracts have regression coverage.

## 0.1.2

### Fixed
- Format automatic test results as producer-owned message sources for DSH format v4 (#17).

## 0.1.1

### Fixed
- Settings no longer wait on the removed settingsScope service. The client uses configForms (#15).

## 0.1.0

Initial public release candidate for DSH Test Pilot.

- Runs bounded automatic tests after successful file changes, with a quiet-period debounce and turn-end safety flush.
- Selects related tests when the workspace mapping is complete and falls back to the configured full suite when it is not.
- Supports pytest, Jest, Vitest, Go, Rust/Cargo, TAP, TypeScript compiler, Deno and npm runner detection.
- Returns normalized, bounded and redacted results to the agent through the current DSH turn and publishes report events.
- Persists bounded workspace summaries and exposes the status and manual-run tools.
- Provides English and Chinese settings UI plus a session status chip.
- Does not perform self-healing, Git mutation, approval blocking, test generation or telemetry.

This package is distributed publicly through npmjs.
