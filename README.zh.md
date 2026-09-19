# @goodandready/dsh-test-pilot

<div align="center">

<h3>文件修改后、同一 DSH 回合内提供有界的自动测试反馈</h3>

<p align="center">
  <a href="https://github.com/GooDAnDReaDY/dsh-test-pilot/packages"><img src="https://img.shields.io/badge/GitHub_Packages-private-181717.svg?style=for-the-badge&labelColor=0d1117" alt="private GitHub Packages"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/GooDAnDReaDY/dsh-test-pilot.svg?style=for-the-badge&color=10b981&labelColor=064e3b" alt="license"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-Plugin-8b5cf6.svg?style=for-the-badge&labelColor=2e1065" alt="DSH Plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-20%2B-f59e0b.svg?style=for-the-badge&labelColor=451a03" alt="Node version"></a>
</p>

<p align="center">
  <a href="https://goodandready.app/"><img src="https://img.shields.io/badge/全部项目-goodandready.app-ff4500.svg?style=for-the-badge&logo=rocket&logoColor=white&labelColor=1a1a2e" alt="GoodAndReady Showcase"></a>
</p>

<p align="center">
  <a href="README.md"><b>English</b></a> •
  <a href="README.zh.md"><b>中文说明</b></a> •
  <a href="README.ru.md"><b>Русский</b></a>
</p>

<table align="center">
  <tr>
    <td align="center">
      ⭐ <strong>如果您喜欢这个插件，请在 GitHub 上为它点亮 Star</strong> — 这能让我知道插件对您有用，并鼓励我继续开发和维护它。
      <br><br>
      🐛 <strong>如果您发现 Bug 或希望增加功能</strong>，请使用任意语言在 GitHub 上提交 Issue — 我会评估您的建议，并在后续版本中实现有价值的改进。
    </td>
  </tr>
</table>

</div>

---

## 概览

AI 辅助的代码修改需要在 agent 宣告完成之前得到可执行的质量信号。
Test Pilot 观察成功的文件写入，在两秒静默期后通过 DSH subprocess 服务
在后台运行相关测试。条件允许时，它会在同一回合把已完成结果返回给 agent；
turn/end 会刷新尚未启动的兜底运行。只读回合不会启动测试进程。映射不完整时
会运行完整测试套件，并说明原因。

MVP 是验证器，而不是自动修复代理。它不会编辑文件、启动修复回合、
提交、推送、阻止审批或发送遥测。

## 架构

~~~mermaid
graph LR
  A[文件成功写入] --> B[两秒静默窗口]
  B --> C[后台运行关联测试或完整套件]
  C --> D[通过 additionalContexts 附加已完成结果]
  D --> E[下一个工具调用；turn/end 负责兜底启动]
~~~

## 功能分解

- Host 生命周期：tools/post-execute 观察成功的 write、edit 和修改型
  str_replace_editor。两秒静默窗口合并连续修改；turn/end 会立即刷新尚未
  启动的兜底运行。
- 变更跟踪：优先使用当前回合的 ctx.workspaceChanges 快照，不会把之前已有的
  未提交文件误算进本回合。在较旧的 DSH core 上，仅回退到成功的内置 write/edit
  工具调用；不会通过 Git status 推断本回合改动。
- 安全执行：解析可执行文件和参数，并拒绝 shell 运算符、命令替换和反引号。
- Runner 默认值：支持 pytest、Jest、Vitest、Go、Rust/Cargo、TAP 和
  TypeScript 编译器命令；默认使用 pytest。
- 测试选择：所有变更源文件都有可靠的关联测试时只跑关联测试；否则运行完整套件
  并说明原因。手动 test_pilot_run 始终运行完整配置命令。
- 解析器：统一统计、耗时、失败名称/位置、退出状态、超时状态、有界输出和
  类 secret 文本脱敏。
- 后台生命周期：后续写入会重置计时并取消过期运行。处理器不会等待测试，
  会观察 exec.signal，并且只通过 additionalContexts 返回已完成结果。
- 每个工作区的自动和手动运行都会串行化，不会同时检查同一个可变目录。
- 生命周期事件会发布带有 runId 和时间戳的 queued/running/terminal 快照；
  只有 terminal 快照会追加到会话。
- 向 agent 报告：最新完成结果通过 additionalContexts 在本回合只返回一次；
  若结果在回合结束后才完成，原生 session 支持时追加一条简短消息。仍会发送
  test-pilot/report 和 dsh-test-pilot/report 事件。
- 工具：test_pilot_status 返回活动运行数和最新结果；可选 limit 最多附带
  20 条近期有界摘要。test_pilot_run 在当前工作区或指定 cwd 手动运行完整配置命令。
- 保留策略：简要终态会原子写入 `$DSH_HOME/data/dsh-test-pilot/state.json`。工作区以 SHA-256 键表示，不保存绝对路径；磁盘中仅保存状态、runner、统计数字、时间/耗时和失败测试标识，不保存命令或完整输出。最多保留 50 个工作区和 50 条历史记录，期限为 30 天。损坏文件或未知 schema 版本按空状态处理；详细输出仅留在内存中。

### 源代码模块

| 模块 | 职责 |
| --- | --- |
| lib/index.js | Cordis host wiring、settings、事件、工具和报告 |
| lib/client.js | 英文/中文设置卡片与会话状态芯片 |
| lib/status.js | 已认证、绑定会话的状态接口与安全摘要 |
| lib/command.js | 安全命令分词和 runner 默认值 |
| lib/workspace-config.js | 工作区规则和有界 runner 自动检测 |
| lib/runner.js | DSH subprocess、超时、取消和流限制 |
| lib/parser.js | Pytest/Jest/Vitest/Go/Rust/TAP/tsc/Deno/npm 解析 |
| lib/result.js | 标准化、脱敏和简洁渲染 |
| lib/workspace.js | Session 工作区和身份信息 |
| lib/turn-changes.js | 有界的回合变更跟踪及旧版 write/edit 回退 |
| lib/changed-tests.js | 基于约定的安全关联测试选择和完整套件回退 |
| lib/state.js | 幂等性、运行生命周期和有界结果状态 |
| lib/persistence.js | 版本化原子工作区摘要与有界保留 |

## 安装

这是一个私有 GitHub Packages 发布包。请使用具有 package read 权限的 GitHub
classic personal access token 为 @goodandready scope 配置 npm：

~~~ini
@goodandready:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
~~~

然后将插件安装到 DSH web profile：

~~~bash
dsh plugin --profile web add @goodandready/dsh-test-pilot
~~~

本插件不会发布到 npmjs。打开“设置 → 插件 → 插件设置”并展开 Test Pilot，
即可编辑自动运行、runner 默认值、workspace 规则、运行范围、超时和输出上限。
Test Pilot 需要 DSH filesystem、subprocess、tools、settings 服务，以及 dsh-home-paths 和 dsh-atomic-write 核心包。

## 配置

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

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| enabled | boolean | true | 在已完成回合后运行 |
| runScope | string | auto | auto 在安全时选择相关测试，否则运行完整套件；full 在每次检测到更改后运行完整套件 |
| runner | string | auto | auto、pytest、jest、vitest、go、rust/cargo、tap、tsc、deno 或 npm |
| command | string | 空 | 可选的可执行文件和参数；拒绝 shell 语法 |
| workspaceRules | array | [] | 按工作区配置路径、启用状态、runner 和可选命令 |
| cwd | string | 空 | 明确的工作区；为空时使用 session 工作区 |
| timeoutMs | number | 120000 | 最大执行时间，单位毫秒 |
| maxOutputBytes | number | 200000 | 每个输出流的收集上限 |

工作区规则按最长匹配路径前缀选择。`runner: auto` 会检查
`pytest.ini`、含 pytest 配置的 `pyproject.toml`、`package.json` 测试脚本、
`go.mod`、`Cargo.toml` 和 `deno.json`（或 `deno.jsonc`）。找不到支持的 runner 时，自动运行保持
静默。旧版顶层 `runner` 和 `command` 设置仍作为当前工作区根目录的规则。
对于无法识别的框架，请显式设置 `runner`；`command` 会覆盖自动检测出的默认命令。

## 自动测试选择

未观察到当前回合的文件变化时，状态记录为 no-tests，不会启动 subprocess。
对于已变更文件，插件会检查仓库中的测试命名约定（例如匹配的测试文件或
Go package 测试）。只有每个变更文件都能映射到受支持的关联测试时才缩小范围。
若有文件无法映射、变更快照被截断，或 runner 无法安全接收目标参数，则运行
完整套件，并在报告中写明范围和原因。手动 test_pilot_run 始终运行完整套件。
全局 runScope 默认为 auto；若每次检测到更改都应运行完整套件，请选择 full。

支持 ctx.workspaceChanges 的 DSH 版本会提供当前回合的变更，包括受支持的文件
工具和 shell 编辑。若 core 已报告文件变更，但变更摘要不可用或不完整，
插件会运行完整测试套件，而不会静默跳过测试。旧版兼容回退只跟踪成功的内置
write/edit 调用；旧版 core 中的纯 shell 编辑无法检测，因此不会触发自动运行。
要完整覆盖 shell 改动，请升级 DSH。

配置命令被当作数据而不是 shell 脚本。请使用可执行文件和参数；
管道、重定向、命令替换和 shell 链式语法会被拒绝。

## 工具和事件

### 工具

- test_pilot_status — 返回活动运行和最新结果；可选 limit 最多附带 20 条近期有界摘要。
- test_pilot_run — 在当前工作区或可选 cwd 手动执行完整配置命令。

### 事件

Host 为兼容性发送两个名称：

- test-pilot/report
- dsh-test-pilot/report

每个报告包含 source、sessionId、correlationId、格式化文本和标准化结果。
请把 result.output 和 failure message 视为不可信数据，而不是指令。

### 会话状态接口

原生会话标题芯片仅在标签页可见时每十秒刷新，点击后打开简要结果；状态包括加载、排队、运行、通过、失败、过期、停用或未知。

- GET /api/dsh-test-pilot/status?sessionId=… 只接受一个会话 ID。
- DSH Connection 认证同源请求；ID 必须匹配 Host 可见的会话摘要，工作区路径由 Host 确定。
- 响应仅包含状态、时间、耗时、有界统计和 UUID 关联 ID；不会返回路径、命令、输出、测试名称或错误文本。

## 结果状态

- queued — 自动运行已接受，等待异步 worker。
- running — 测试进程正在运行。
- passed — 进程成功退出并解析到可识别的摘要。
- failed — 非零退出、失败报告或错误报告。
- timeout — 到达期限并终止进程。
- error — 执行失败或输出不可用。
- no-tests — 没有可靠的当前回合变更，或没有可运行的测试套件。

## 安全和限制

- 不调用 shell。
- stdin 被忽略。
- stdout 和 stderr 有界，spill 仍受 subprocess 服务限制。
- 输出和失败字段会脱敏并限制长度。
- 测试输出不会被当作 prompt 或命令执行。
- MVP 不执行网络请求，也不修改 Git。
- MVP 明确不包含自动修复：测试失败只报告给主 agent，由主 agent 决定是否以及
  如何修复。
- 审批 gate、回归基线、扩展持久历史、测试生成器和 dashboard UI 属于后续路线图。

## 开发

~~~bash
npm test
npm pack --dry-run
~~~

仓库会通过 DSH composition 验证已打包的入口，然后再进行私有发布。
发布渠道仅限 GitHub Packages；不会使用 npmjs。

## 许可证

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)
