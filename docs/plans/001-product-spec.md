## Задача

Создать @goodandready/dsh-test-pilot — проверяющий плагин DSH, который
автоматически запускает тесты после завершения изменения кода, даёт
структурированный red/green feedback в фоне и возвращает результат основному
агенту. Self-healing в MVP не выполняется.

## Продуктовый результат

После turn/end пользователь получает короткий проверяемый отчёт: runner,
статус, passed/failed/skipped, длительность, изменившиеся тесты и ссылку на
подробный результат. Падение не должно теряться в контексте и не должно
превращаться в бесконечную рекурсию агента.

## Reuse-first и базовая архитектура

Обязательный референс — dsh-tool-tdd. Повторить полезную модель dynamic test
tool: запуск команд через DSH subprocess API, адаптеры runners, парсинг
Jest/Vitest/Pytest/Go/Rust/TAP/tsc там, где это подтверждено контрактами, и
структурированный объект результата с failure details. Код референса не
копировать механически: выделить интерфейсы runner, result, policy и repair
orchestrator; все subprocess должны иметь timeout, bounded output и отмену
через ctx.effect.

Плагин состоит из host-половины и минимальной client-поверхности. Источником
событий является подтверждённый DSH session/event с turn/end; события
tree/settled подключать только после проверки их наличия в текущем host API.
Плагин не подменяет CI и не считается доказательством качества только по
самоотчёту агента.

## MVP 0.1.0

- Один конфигурируемый runner: pytest или Jest; выбор фиксируется первым
  техническим spike и отражается в ADR.
- Hook на окончание turn с защитой от повторного запуска для одного turn.
- Фоновый lifecycle каждого запуска: queued -> running -> terminal status;
  запуск не блокирует обработчик turn/end.
- Детектор изменившегося diff и безопасное определение рабочей директории.
- Запуск runner через штатный DSH subprocess, timeout, лимит вывода и
  нормализованный результат.
- Сообщение в чат вида «42 passed, 2 failed» с exit code и кратким списком
  failure; полный лог доступен только через bounded artifact.
- Сохранение последнего результата и correlation id в памяти плагина.
- Unit-тесты для parser/policy/state machine и real-composition smoke-тест
  с mock runner; сеть и реальные секреты в тестах запрещены.

## Self-healing и gates

Self-healing — отдельная policy state machine, а не рекурсивный hook:
run -> classify -> propose repair -> approval/policy -> repair turn -> rerun.
По умолчанию repair выключен; при включении обязательны max attempts, общий
deadline, изменённые файлы, запрет на опасные команды и отчёт каждого шага.
Регрессионный gate сравнивает baseline и текущий результат, различает новые и
уже известные падения и блокирует commit только через нормальный approval-gate.
Автоматически коммитить или пушить нельзя.

Генерация тестов по diff в MVP только предлагает план/патч в чат, не меняет
файлы и не маскирует красный результат. Любое действие с файлами проходит
штатное одобрение DSH.

## Out of scope

В этом issue не входят полноценная CI/CD-система, облачные runners,
автоматический deploy/rollback, произвольный package manager, безлимитный
agent loop и принудительное редактирование тестов.

## Roadmap 0.1.0–0.1.10

- 0.1.0 — один runner, turn/end, фоновый lifecycle, parser, чат-отчёт,
  bounded in-memory run state.
- 0.1.1 — второй runner и единый контракт adapters/result.
- 0.1.2 — diff-aware test selection и baseline новых падений.
- 0.1.3 — генератор предложений тестов по diff с объяснением покрытия.
- 0.1.4 — approval-gated self-healing с лимитами и отменой.
- 0.1.5 — commit regression gate и режимы warning/block.
- 0.1.6 — история прогонов, артефакты и сравнение запусков.
- 0.1.7 — web-карточка статуса, empty/loading/error/success states.
- 0.1.8 — дополнительные runners и parser contract tests.
- 0.1.9 — parallel-safe jobs, cancellation, flaky-test quarantine policy.
- 0.1.10 — real-composition acceptance suite, эксплуатационная документация
  и release candidate; публикация только после отдельного разрешения.

## Критерии приёмки и проверки

Есть тесты на повторный turn/end, queued/running lifecycle, timeout, malformed
output, non-zero exit и отмену. Real-composition test
проверяет загрузку settings card, регистрацию event listener/tool и
пользовательское сообщение. Smoke run даёт воспроизводимый structured result.
Документация описывает конфиг, threat model, ограничения и rollback policy.
