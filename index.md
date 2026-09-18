# dsh-test-pilot

## Purpose

Automatically run configured tests after a completed DSH turn and return bounded,
structured red/green feedback without starting an uncontrolled repair loop.

## Status

MVP runtime and runner/parser baseline implemented, including current-turn
changed-test selection and conservative full-suite fallback. The runner/parser
layer includes pytest, Jest/Vitest, Go, Rust/Cargo, TAP and TypeScript compiler
adapters. Full Loader profile validation and isolated MiniPC installation are
deferred to the later test cycle.

## Documents

- [Product specification and roadmap](docs/plans/001-product-spec.md)
- [Design contract](docs/design/DESIGN.md)
- [Reuse-first research](docs/research/reuse-first.md)
- [MVP runtime ADR](docs/adr/0001-mvp-contract.md)
- [English README](README.md)
- [Russian overview](README.ru.md)
- [中文概览](README.zh.md)

## Host surface

The host subscribes to the native session/event bus and reacts to completed
turns. Where available, it scopes automatic test runs to the native per-turn
workspace-change summary; older DSH uses only successful built-in write/edit
observations. It invokes ctx.subprocess.spawn with bounded streams and emits a
plugin-owned report. Diagnostic tools expose the latest structured result and a
manual full-suite run path.

Self-healing, commit blocking, test generation, dashboard UI and external
telemetry remain roadmap items.
