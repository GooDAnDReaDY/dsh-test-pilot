# Design Contract: dsh-test-pilot

## Product surface

Чат-отчёт в MVP; позже native card прогонов, history и regression gate.

## UX states

Определить loading, empty, success, error, stale/unknown и disabled/permission. Текстовая сводка доступна без графики; деструктивные и внешние действия требуют подтверждения.

## Native DSH rules

Использовать DSH design tokens и patterns settings/slot. Host logic не помещать в client bundle. Английский — source locale; RU/ZH добавляются при поставке UI. Обязательны keyboard navigation, focus и reduced motion.

## Privacy and performance

Не показывать credentials, raw prompts, unbounded tool arguments или случайные PII. Ограничивать память, output и retention.

## Visual acceptance

До release candidate проверить реальную DSH composition во всех states и зафиксировать evidence.
