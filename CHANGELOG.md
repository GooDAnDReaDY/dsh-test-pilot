# Changelog

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
