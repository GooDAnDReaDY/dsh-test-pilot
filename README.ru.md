# @goodandready/dsh-test-pilot

<div align="center">

<h3>Ограниченный автоматический feedback тестов после каждого завершённого turn DSH</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@goodandready/dsh-test-pilot"><img src="https://img.shields.io/npm/v/@goodandready/dsh-test-pilot.svg?style=for-the-badge&color=6366f1&labelColor=1e1b4b" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/GooDAnDReaDY/dsh-test-pilot.svg?style=for-the-badge&color=10b981&labelColor=064e3b" alt="license"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-Plugin-8b5cf6.svg?style=for-the-badge&labelColor=2e1065" alt="DSH Plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-20%2B-f59e0b.svg?style=for-the-badge&labelColor=451a03" alt="Node version"></a>
</p>

<p align="center">
  <a href="https://goodandready.app/"><img src="https://img.shields.io/badge/Все_проекты-goodandready.app-ff4500.svg?style=for-the-badge&logo=rocket&logoColor=white&labelColor=1a1a2e" alt="GoodAndReady Showcase"></a>
</p>

<p align="center">
  <a href="README.md"><b>English</b></a> •
  <a href="README.zh.md"><b>中文说明</b></a> •
  <a href="README.ru.md"><b>Русский</b></a>
</p>

<table align="center">
  <tr>
    <td align="center">
      ⭐ <strong>Если вам нравится этот плагин, поставьте ему Star на GitHub</strong> — это покажет мне, что плагин полезен, и добавит мотивации продолжать его развитие.
      <br><br>
      🐛 <strong>Если вы нашли баг или хотите предложить новую функцию</strong>, создайте Issue на GitHub на любом языке — я рассмотрю предложение и реализую полезные улучшения в одной из следующих версий плагина.
    </td>
  </tr>
</table>

</div>

---

## Обзор

AI-изменения кода должны получать исполняемый сигнал качества сразу после
завершения turn. Иначе правдоподобный ответ может скрыть сломанный набор тестов.
Test Pilot читает снимок файловых изменений текущего хода DSH. Если для каждого
изменённого файла можно безопасно определить связанные тесты, запускаются только
они через штатный subprocess DSH. Ход без изменений не запускает тестовый процесс.
При неполном соответствии запускается весь набор с объяснением причины.

MVP является проверяющим плагином, а не автономным ремонтником. Он не изменяет
файлы, не запускает repair-turn, не коммитит, не пушит, не блокирует approval и
не отправляет телеметрию.

## Архитектура

~~~mermaid
graph LR
  A[Завершённый turn DSH] --> B[События изменений текущего хода]
  B --> C{Есть надёжные изменения файлов}
  C -- нет --> D[Записать no-tests; не запускать процесс]
  C -- да --> E[Планировщик связанных тестов]
  E --> F{Все изменения сопоставлены безопасно}
  F -- да --> G[Запустить связанные тесты]
  F -- нет --> H[Полный набор с указанием области]
  G --> I[Безопасный argv и ctx.subprocess]
  H --> I
  I --> J[Ограниченный вывод и runner parser]
  J --> K[Нормализованный результат и отчёт]
  K --> L[Сессия, события и диагностика]
~~~

## Возможности

- Lifecycle host: подписка на session/event. Сервис изменений core использует
  финальное workspace/changes; старый DSH опирается на успешные write/edit к turn/end.
- Отслеживание изменений: использует снимок ctx.workspaceChanges именно текущего
  хода и не принимает ранее изменённые файлы за новые. На старых версиях DSH
  используется только fallback по успешным вызовам встроенных write/edit-инструментов;
  Git status не используется для угадывания изменений хода.
- Безопасный запуск: tokenizer исполняемого файла и аргументов отклоняет shell
  operators, command substitution и backticks.
- Runner defaults: pytest, Jest, Vitest, Go, Rust/Cargo, TAP и TypeScript
  compiler; по умолчанию используется pytest.
- Выбор тестов: связанные тесты запускаются только при полном соответствии всех
  изменённых файлов; иначе запускается весь набор с объяснением причины.
  Ручной test_pilot_run всегда запускает полную настроенную команду.
- Parser: counts, duration, failure names/locations, exit status, timeout,
  bounded output и redaction значений, похожих на секреты.
- Idempotency: один session/turn key допускает только один запуск.
- Фоновый lifecycle: автоматический запуск проходит состояния queued/running/
  finished и не блокирует обработчик хода агента.
- Автоматические и ручные запуски сериализуются для каждой workspace-директории и не
  проверяют одну изменяемую директорию одновременно.
- Lifecycle events публикуют snapshots queued/running/terminal с runId и
  timestamps; в чат добавляется только terminal snapshot.
- Отчёт в чате: при наличии штатного session.append добавляется одно короткое
  assistant/message. Также публикуются события test-pilot/report и
  dsh-test-pilot/report.
- Диагностика: test_pilot_last_run показывает последний queued, running или
  завершённый результат; test_pilot_history возвращает краткую историю без
  полного output; test_pilot_run запускает команду вручную.
- Retention: в памяти сохраняются ограниченные run records и event keys.

### Модули исходного кода

| Модуль | Ответственность |
| --- | --- |
| lib/index.js | Cordis host, settings, события, tools и отчёты |
| lib/command.js | Безопасный tokenizer и runner defaults |
| lib/workspace-config.js | Workspace rules и ограниченное автоопределение runner |
| lib/runner.js | DSH subprocess, timeout, cancellation и лимиты потоков |
| lib/parser.js | Pytest/Jest/Vitest/Go/Rust/TAP/tsc/Deno/npm parser |
| lib/result.js | Нормализация, redaction и краткий отчёт |
| lib/workspace.js | Workspace сессии и её идентификатор |
| lib/turn-changes.js | Ограниченное отслеживание изменений хода и fallback write/edit |
| lib/changed-tests.js | Безопасный выбор связанных тестов и fallback на полный набор |
| lib/state.js | Idempotency, lifecycle запуска и ограниченное состояние результатов |

## Установка

~~~bash
dsh plugin --profile web add @goodandready/dsh-test-pilot
~~~

Плагин рассчитан на web profile DSH. В settings card выберите runner и команду.
Для работы нужны сервисы DSH filesystem, subprocess, tools и settings.

## Конфигурация

~~~yaml
enabled: true
runner: auto
command: ""
workspaceRules:
  - path: /absolute/path/to/repo
    enabled: true
    runner: auto
    command: ""
cwd: ""
timeoutMs: 120000
maxOutputBytes: 200000
~~~

| Параметр | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| enabled | boolean | true | Запускать после завершённого turn |
| runner | string | auto | auto, pytest, jest, vitest, go, rust/cargo, tap, tsc, deno или npm |
| command | string | пусто | Необязательная команда: исполняемый файл и аргументы; shell syntax запрещён |
| workspaceRules | array | [] | Правила рабочего пространства: путь, включение, runner и команда |
| cwd | string | пусто | Явная workspace-директория; пусто использует workspace сессии |
| timeoutMs | number | 120000 | Максимальное время выполнения в миллисекундах |
| maxOutputBytes | number | 200000 | Лимит сбора каждого output stream |

Правило выбирается по самому длинному совпадающему префиксу пути. При
`runner: auto` плагин проверяет `pytest.ini`, pytest-настройки в `pyproject.toml`,
тестовый скрипт `package.json`, `go.mod`, `Cargo.toml` и `deno.json` (или `deno.jsonc`). Если runner
не найден, автоматический запуск и сообщение пропускаются. Старые верхнеуровневые
`runner` и `command` остаются правилом для корня текущего workspace.
Для неизвестного фреймворка задайте `runner` явно; `command` переопределяет
найденную или стандартную команду.

## Выбор тестов для автозапуска

Если надёжные изменения файлов текущего хода не обнаружены, состояние записывается
как no-tests, а subprocess не запускается. Для изменённых файлов плагин проверяет
соглашения проекта (например, парные тестовые файлы или тесты Go-пакета). Сужать
запуск можно только при наличии поддерживаемого соответствия для каждого изменённого
файла. Если хотя бы один файл не сопоставлен, снимок обрезан или runner не умеет
безопасно принимать цели, запускается полный набор, а отчёт указывает причину и
область запуска. Ручной test_pilot_run всегда выполняет полный набор.

Новые версии DSH с ctx.workspaceChanges сообщают изменения именно текущего хода,
включая поддерживаемые изменения через file-tools и shell. Если core сообщил об
изменениях, но сводка недоступна или неполна, запускается полный набор тестов вместо
молчаливого пропуска. Fallback старого core отслеживает только успешные вызовы
встроенных write/edit; чистые shell-изменения там не видны и не запускают проверку.
Для полного отслеживания shell-изменений обновите DSH.

Команда является данными, а не shell-скриптом. Pipeline, redirect, command
substitution и shell chaining намеренно отклоняются.

## Tools и events

### Tools

- test_pilot_last_run — возвращает последний bounded human-readable и structured
  result.
- test_pilot_status — показывает число активных фоновых запусков и последний
  queued, running или завершённый результат.
- test_pilot_run — ручной запуск с необязательным override cwd.

### Events

Host публикует оба имени для совместимости:

- test-pilot/report
- dsh-test-pilot/report

Report содержит source, sessionId, correlationId, formatted text и normalized
result. result.output и failure messages нужно считать недоверенными данными.

HTTP routes в MVP отсутствуют.

## Статусы

- queued — запуск принят и ждёт фонового worker-а.
- running — тестовый процесс выполняется.
- passed — процесс завершился успешно и распознан summary.
- failed — ненулевой exit, зафиксированный failure или error.
- timeout — истёк deadline и процесс был завершён.
- error — выполнение или output непригодны для разбора.
- no-tests — надёжные изменения текущего хода не обнаружены или нет запускаемого набора тестов.

## Безопасность и ограничения

- Shell не вызывается.
- stdin игнорируется.
- stdout/stderr имеют лимиты subprocess service.
- Output и failure fields redacted и ограничены по длине.
- Test output не исполняется как prompt или команда.
- MVP не обращается в сеть и не меняет Git.
- Self-healing намеренно не входит в MVP: при падении плагин только сообщает
  результат основному агенту, а решение об исправлении остаётся за ним.
- Approval gate, regression baseline, persistent history, test generation и
  dashboard UI находятся в roadmap.

## Разработка

~~~bash
npm test
npm pack --dry-run
~~~

Перед публичной публикацией проверяется упакованный entry через DSH composition.
Публикация в GitHub и npm требует явного согласия владельца.

## Лицензия

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)
