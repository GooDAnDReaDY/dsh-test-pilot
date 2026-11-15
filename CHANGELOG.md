# Changelog

## 0.1.10

### Added
- Add standardized `deploy.sh` script for updating the plugin in the DSH web profile and verifying service health (#56).
- Add `scripts/publish-github.sh` for publishing a sanitized public mirror tree to GitHub, keeping test fixtures, planning documents, and operational scripts in upstream Gitea (#56).

### Security
- Update transitive dependency `zod` to 4.6.7 in `package-lock.json` resolving GHSA-mrhx-c7xc-m3w5 (#54).

## 0.1.9

### Fixed
- Use cordis entry ID `dsh-test-pilot` instead of scoped package name for client namespace and configForms query (#57).

## 0.1.8

### Fixed
- Ensure persistent header indicator setting resolves across heterogeneous DSH environments (#51).

## 0.1.7

### Added
- Add `showHeaderIndicator` setting in `Config` and settings card allowing users to hide the test status indicator in conversation header actions (#48).
- Add `StatusSummary` section to the plugin settings card providing persistent, direct access to the latest test run results even when the header indicator is hidden (#48).
- Support status queries without `sessionId` in `createStatusHandler`, returning the latest test run snapshot for settings panel inspection (#48).

## 0.1.6

### Fixed
- Fix settings namespace (`NS = 'dsh-test-pilot'`) matching profile entry ID so `settingsSvc.describe().find()` correctly resolves live configuration (#45).
- Add safe call guard for `settingsSvc.describe?.()?.find?.(...)` avoiding uncaught exceptions when describe returns null (#45).
- Add single-execution re-entry guard for `settings.configure({ auto: false })` (#45).

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
