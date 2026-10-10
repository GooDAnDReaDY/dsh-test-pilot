# Findings: dsh-test-pilot issues #36-#42

## Issue #36: DSH 0.2 Settings card registration
- `settings.plugin.item` was retired before DSH 0.2.
- The 0.2 contracts use `plugins.item` (`id: SETTINGS_ENTRY_ID`, `key: NS`) for plugin list and `plugins.row.config` (`key: NS + '#' + SETTINGS_ENTRY_ID`) for row config.
- Implemented dual-seat registration in `lib/client.js`.

## Issue #37: Reactive settings updates
- `getConfig` was captured at boot via `let getConfig = () => liveConfig(config);`.
- In DSH 0.2, settings changes emit `loader/volatile-update` and `settings/document-updated`.
- Implemented reactive `getConfig = readLive` on settings events in `lib/index.js`.

## Issue #38: allowNetworkFetch and npm exec
- `npm exec` with `--yes` is used when `allowNetworkFetch` is enabled.
- Confirmed that `defaultCommand` restricts `npmExec` strictly to allowlisted test runner binaries: `jest`, `vitest`, `tsc`.
- Custom user commands do not use `npmExec`.

## Issue #39: Duplicate report event names
- `lib/index.js` emits both `test-pilot/report` (primary) and `dsh-test-pilot/report` (legacy alias).
- Added explanatory documentation for the shim.

## Issue #40: record.paths count cap
- `addSnapshotPath` had a per-path string length limit (4096 chars) but no limit on the number of paths.
- Added `MAX_RECORD_PATHS = 1000`. Exceeding 1000 paths sets `record.overflow = true` and triggers a full-suite fallback rather than an unbounded Set.

## Issue #41: npm test failure in clean checkout
- In a clean checkout without global packages, `@deepseek-ai/dsh-tools` and `@deepseek-ai/schemastery` were missing because they were only in `peerDependencies`.
- Added `devDependencies` to `package.json` and documented `npm ci` before `npm test`.

## Issue #42: Unconfirmed command execution from repo manifests
- Auto-detected commands from third-party repo manifests (`package.json`, `pytest.ini`, etc.) should not run automatically without explicit workspace approval.
- Added `isAutoDetected` and `autoRunAllowed = !isAutoDetected` to `resolveWorkspaceTestConfig`.
- In automatic runs, auto-detected commands finish cleanly with status `no-tests` and request an explicit workspace rule.
- Manual execution via `test_pilot_run` remains supported.
