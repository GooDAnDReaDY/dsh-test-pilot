# dsh-test-pilot

## Purpose

Automatically run configured tests after a completed DSH turn and return bounded,
structured red/green feedback without starting an uncontrolled repair loop.

## Status

MVP runtime and runner/parser baseline implemented. The runner/parser layer
includes pytest, Jest/Vitest, Go, Rust/Cargo, TAP and TypeScript compiler
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

The host subscribes to the native session/event bus, reacts to completed
turn/end, invokes ctx.subprocess.spawn with bounded streams and emits a
plugin-owned report. When available, the native session receives one concise
assistant/message. Diagnostic tools expose the latest structured result and a
manual run path.

Self-healing, commit blocking, test generation, dashboard UI and external
telemetry remain roadmap items.
