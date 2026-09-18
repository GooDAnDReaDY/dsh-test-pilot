# AGENTS.md

Проект: dsh-test-pilot
Пакет: @goodandready/dsh-test-pilot
DEV: /mnt/external/Project/DEV/dsh-test-pilot

## Назначение

Автоматически проверять изменения кода, выдавать structured red/green feedback. Автоисправление явно исключено из текущего согласованного объёма.

## Статус

MVP runtime baseline implemented; per-turn change-aware test selection is in progress. Tests and isolated-server acceptance are deliberately deferred by owner request.

## Документация

- index.md — навигация.
- docs/plans/001-product-spec.md — ТЗ и roadmap.
- docs/design/DESIGN.md — дизайн-контракт.
- docs/research/reuse-first.md — reuse-first research.
- docs/adr/0001-mvp-contract.md — решение по runtime-контракту MVP.

Публичная архитектура с первого коммита; до отдельной команды владельца GitHub/npm publication не выполняется. Контракты DSH проверяются документацией и real-composition tests. Никаких force-операций, silent auto-fix, произвольного network egress или изменений чужих плагинов.
