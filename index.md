# dsh-test-pilot

## Purpose

Automatically run configured tests after successful file changes and return
bounded, structured red/green feedback within the same DSH turn when possible,
without starting an uncontrolled repair loop.

## Status

MVP runtime and runner/parser baseline implemented, including current-turn
changed-test selection, in-turn background runs and versioned bounded persistence
of compact per-workspace outcomes. The runner/parser layer includes pytest,
Jest/Vitest, Go, Rust/Cargo, TAP and TypeScript compiler adapters. Full Loader
profile validation and isolated MiniPC installation are deferred to the later
test cycle.

## Documents

- [Product specification and roadmap](docs/plans/001-product-spec.md)
- [Design contract](docs/design/DESIGN.md)
- [Reuse-first research](docs/research/reuse-first.md)
- [MVP runtime ADR](docs/adr/0001-mvp-contract.md)
- [English README](README.md)
- [Russian overview](README.ru.md)
- [中文概览](README.zh.md)

## Host surface

The host observes successful file mutations in tools/post-execute, coalesces
writes behind a two-second quiet period, and runs tests in the background. A
later write cancels a stale run; exec.signal cancels pending and active work.
The handler never waits for the test process and attaches only a completed,
undelivered result through additionalContexts. turn/end flushes pending work
as a safety net. Diagnostic tools expose the latest structured result and a
manual full-suite run path. Compact terminal summaries survive restarts; raw
output and absolute workspace paths do not enter the state file.

Self-healing, commit blocking, test generation, dashboard UI and external
telemetry remain roadmap items.
