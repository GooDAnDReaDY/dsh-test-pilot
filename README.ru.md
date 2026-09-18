# @goodandready/dsh-test-pilot

<div align="center">

<h3>Ограниченный автоматический feedback тестов после правок, в том же ходе DSH</h3>

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

AI-изменения кода должны получать исполняемый сигнал качества до того, как
агент объявит задачу завершённой. Test Pilot замечает успешную запись файла,
ждёт две секунды тишины и запускает связанные тесты в фоне через subprocess DSH.
Когда возможно, готовый результат возвращается агенту в том же ходе; turn/end
запускает ожидающую проверку как страховку. Ход без изменений не запускает
тестовый процесс. При неполном соответствии запускается весь набор с объяснением причины.

MVP является проверяющим плагином, а не автономным ремонтником. Он не изменяет
файлы, не запускает repair-turn, не коммитит, не пушит, не блокирует approval и
не отправляет телеметрию.

## Архитектура

~~~mermaid
graph LR
  A[Успешная запись файла] --> B[Две секунды тишины]
  B --> C[Фоновый запуск связанных тестов или полного набора]
  C --> D[Готовый результат в additionalContexts]
  D --> E[Следующий вызов; turn/end запускает страховочный прогон]
~~~

## Возможности

- Lifecycle host: tools/post-execute замечает успешные write, edit и
  изменяющий str_replace_editor. Две секунды тишины объединяют серию правок;
  turn/end немедленно запускает ожидающий прогон как страховку.
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
- Фоновый lifecycle: новая запись сбрасывает таймер и отменяет устаревший
  прогон. Обработчик не ждёт тесты, учитывает exec.signal и прикладывает к
  additionalContexts только уже готовый результат, не повторяя его в этом ходе.
- Автоматические и ручные запуски сериализуются для каждой workspace-директории и не
  проверяют одну изменяемую директорию одновременно.
- Lifecycle events публикуют snapshots queued/running/terminal с runId и
  timestamps; в чат добавляется только terminal snapshot.
- Отчёт агенту: готовый последний результат один раз возвращается через
  additionalContexts. Если прогон завершился уже после конца хода, при наличии
  штатного session.append добавляется одно короткое сообщение. Также публикуются
  события test-pilot/report и dsh-test-pilot/report.
- Инструменты: test_pilot_status показывает число активных запусков и последний
  результат; необязательный limit добавляет до 20 кратких итогов без полного
  output. test_pilot_run запускает полную настроенную команду в текущем или
  заданном workspace.
- Retention: краткие итоги атомарно хранятся в `$DSH_HOME/data/dsh-test-pilot/state.json`. Вместо абсолютного пути workspace используется SHA-256-ключ; на диск попадают только статус, runner, числа, время/длительность и идентификаторы упавших тестов — не команда и не полный вывод. Хранятся максимум 50 workspace и 50 записей истории за 30 дней. Повреждённый файл или неизвестная версия схемы считаются пустым состоянием; подробный вывод остаётся только в памяти.

### Модули исходного кода

| Модуль | Ответственность |
| --- | --- |
| lib/index.js | Cordis host, settings, события, tools и отчёты |
| lib/client.js | Карточка настроек и чип статуса сессии на английском/китайском |
| lib/status.js | Аутентифицированный endpoint статуса сессии и безопасная сводка |
| lib/command.js | Безопасный tokenizer и runner defaults |
| lib/workspace-config.js | Workspace rules и ограниченное автоопределение runner |
| lib/runner.js | DSH subprocess, timeout, cancellation и лимиты потоков |
| lib/parser.js | Pytest/Jest/Vitest/Go/Rust/TAP/tsc/Deno/npm parser |
| lib/result.js | Нормализация, redaction и краткий отчёт |
| lib/workspace.js | Workspace сессии и её идентификатор |
| lib/turn-changes.js | Ограниченное отслеживание изменений хода и fallback write/edit |
| lib/changed-tests.js | Безопасный выбор связанных тестов и fallback на полный набор |
| lib/state.js | Idempotency, lifecycle запуска и ограниченное состояние результатов |
| lib/persistence.js | Версионированные атомарные итоги workspace и ограничение истории |

## Установка

~~~bash
dsh plugin --profile web add @goodandready/dsh-test-pilot
~~~

Плагин рассчитан на web profile DSH. Откройте Settings → Plugins → Plugin settings
и раскройте Test Pilot: там настраиваются автозапуск, runners, правила workspace,
область прогона, timeout и лимит вывода. Нужны сервисы DSH filesystem, subprocess,
tools и settings, а также core-пакеты dsh-home-paths и dsh-atomic-write.

## Конфигурация

~~~yaml
enabled: true
runScope: auto
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
| runScope | string | auto | auto выбирает связанные тесты, когда это безопасно, иначе — весь набор; full всегда запускает полный набор после обнаруженного изменения |
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
область запуска. Ручной test_pilot_run всегда выполняет полный набор. runScope по
умолчанию равен auto; выберите full, чтобы запускать все тесты после каждого
обнаруженного изменения.

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

- test_pilot_status — активные запуски и последний результат; необязательный
  limit добавляет до 20 кратких итогов без полного output.
- test_pilot_run — полный ручной запуск в текущем или заданном workspace.

### Events

Host публикует оба имени для совместимости:

- test-pilot/report
- dsh-test-pilot/report

Report содержит source, sessionId, correlationId, formatted text и normalized
result. result.output и failure messages нужно считать недоверенными данными.

### Endpoint статуса сессии

Нативный чип заголовка сессии обновляется раз в десять секунд только в видимой вкладке и по нажатию открывает краткую сводку; состояния: загрузка, очередь, запуск, успех, ошибка, устаревший, отключённый или неизвестный результат.

- GET /api/dsh-test-pilot/status?sessionId=… принимает ровно один ID сессии.
- DSH Connection аутентифицирует same-origin запрос; ID сверяется с доступной Host-сводкой сессий, а workspace определяет сам Host.
- Возвращаются только статус, время, длительность, ограниченные счётчики и UUID корреляции — без путей, команд, вывода, имён тестов и текста ошибок.

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
- Approval gate, regression baseline, расширенная persistent history,
  генерация тестов и dashboard UI находятся в roadmap.

## Разработка

~~~bash
npm test
npm pack --dry-run
~~~

Перед публичной публикацией проверяется упакованный entry через DSH composition.
Публикация в GitHub и npm требует явного согласия владельца.

## Лицензия

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)
