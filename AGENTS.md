# AGENTS.md

Проект: dsh-test-pilot
Пакет: @goodandready/dsh-test-pilot
DEV: /mnt/external/Project/DEV/dsh-test-pilot

## Назначение

Автоматически проверять код после turn/end, выдавать structured red/green feedback и bounded self-healing.

## Статус

MVP runtime and runner/parser baseline implemented; full Loader/profile and isolated-server gates remain.

## Документация

- index.md — навигация.
- docs/plans/001-product-spec.md — ТЗ и roadmap.
- docs/design/DESIGN.md — дизайн-контракт.
- docs/research/reuse-first.md — reuse-first research.
- docs/adr/0001-mvp-contract.md — решение по runtime-контракту MVP.

Публичная архитектура с первого коммита; до отдельной команды владельца GitHub/npm publication не выполняется. Контракты DSH проверяются документацией и real-composition tests. Никаких force-операций, silent auto-fix, произвольного network egress или изменений чужих плагинов.
