# Reuse-first research: dsh-test-pilot

## Confirmed references

dsh-tool-tdd обязателен; dsh-watch, dsh-plugin-notify и dsh-time-machine — pattern references.

## Public references

- dsh-tool-tdd: https://github.com/Xiaooooo434680/dsh-tool-tdd
- dsh-watch: https://github.com/dshworks/dsh-watch
- DSH testing guidance: https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/testing.md
- JAWL product reference: https://github.com/th0r3nt/JAWL

## Decision

Reuse contracts and patterns only when compatible with the current DSH API; code не копировать механически. Каждый adopted interface проверять документацией и real-composition test.
