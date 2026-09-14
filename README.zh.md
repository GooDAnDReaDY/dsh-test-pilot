# @goodandready/dsh-test-pilot

<div align="center">

<h3>在每次 DSH 回合完成后提供有界的自动测试反馈</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@goodandready/dsh-test-pilot"><img src="https://img.shields.io/npm/v/@goodandready/dsh-test-pilot.svg?style=for-the-badge&color=6366f1&labelColor=1e1b4b" alt="npm version"></a>
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

AI 辅助的代码修改需要在回合结束后得到可执行的质量信号。否则，一段
看似合理的回答可能让测试套件保持损坏状态，直到很久以后才被发现。
Test Pilot 监听 DSH 原生 session/event 总线，检测 Git 工作区是否发生变化，
通过 DSH subprocess 服务运行配置好的测试命令，并把有界结果返回到当前会话。

MVP 是验证器，而不是自动修复代理。它不会编辑文件、启动修复回合、
提交、推送、阻止审批或发送遥测。

## 架构

~~~mermaid
graph LR
  A[已完成的 DSH 回合] --> B[session/event turn/end]
  B --> C{工作区是否变化}
  C -- 否 --> D[no-tests 报告]
  C -- 是 --> E[安全 argv 解析器]
  E --> F[ctx.subprocess.spawn]
  F --> G[有界 stdout/stderr]
  G --> H[Runner 解析器]
  H --> I[标准化和脱敏结果]
  I --> J[会话 assistant 报告]
  I --> K[test-pilot/report 事件]
  I --> L[Last-run 诊断工具]
~~~

## 功能分解

- Host 生命周期：订阅 session/event，并处理已完成的 turn/end。
- 工作区策略：使用 Git porcelain status 和 session 工作区约定。缺少
  Git/subprocess 服务时，系统会放行一次测试尝试。
- 安全执行：解析可执行文件和参数，并拒绝 shell 运算符、命令替换和反引号。
- Runner 默认值：支持 pytest、Jest、Vitest、Go、Rust/Cargo、TAP 和
  TypeScript 编译器命令；默认使用 pytest。
- 解析器：统一统计、耗时、失败名称/位置、退出状态、超时状态、有界输出和
  类 secret 文本脱敏。
- 幂等性：每个 session/turn key 只允许一次执行，重复事件会被忽略。
- 会话界面：原生 session 提供 append 时追加一条简短 assistant/message。
  同时发送 test-pilot/report 和 dsh-test-pilot/report，供其他界面渲染。
- 诊断工具：test_pilot_last_run 返回最新结果；test_pilot_run 在当前工作区
  手动执行有界命令。
- 保留策略：内存中只保留最新标准化结果和有界事件 key 集合。

### 源代码模块

| 模块 | 职责 |
| --- | --- |
| lib/index.js | Cordis host wiring、settings、事件、工具和报告 |
| lib/command.js | 安全命令分词和 runner 默认值 |
| lib/runner.js | DSH subprocess、超时、取消和流限制 |
| lib/parser.js | Pytest/Jest/Vitest/Go/Rust/TAP/tsc 解析 |
| lib/result.js | 标准化、脱敏和简洁渲染 |
| lib/workspace.js | 工作区和 Git 变更检测 |
| lib/state.js | 幂等性和最新结果状态 |

## 安装

~~~bash
dsh plugin --profile web add @goodandready/dsh-test-pilot
~~~

此软件包面向 DSH web profile。请通过 profile 的 settings card 启用或停用
自动运行并选择命令。Test Pilot 需要与 DSH subprocess、tools 和 settings
服务一起安装。

## 配置

~~~yaml
enabled: true
runner: pytest
command: pytest -q
cwd: ""
skipIfNoChanges: true
timeoutMs: 120000
maxOutputBytes: 200000
~~~

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| enabled | boolean | true | 在已完成回合后运行 |
| runner | string | pytest | pytest、jest、vitest、go、rust、cargo、tap 或 tsc |
| command | string | pytest -q | 可执行文件和参数；拒绝 shell 语法 |
| cwd | string | 空 | 明确的工作区；为空时使用 session 工作区 |
| skipIfNoChanges | boolean | true | Git 没有变更时跳过 |
| timeoutMs | number | 120000 | 最大执行时间，单位毫秒 |
| maxOutputBytes | number | 200000 | 每个输出流的收集上限 |

配置命令被当作数据而不是 shell 脚本。请使用可执行文件和参数；
管道、重定向、命令替换和 shell 链式语法会被拒绝。

## 工具和事件

### 工具

- test_pilot_last_run — 返回最新的有界文本和结构化结果。
- test_pilot_run — 手动执行配置命令，可选 cwd 覆盖。

### 事件

Host 为兼容性发送两个名称：

- test-pilot/report
- dsh-test-pilot/report

每个报告包含 source、sessionId、correlationId、格式化文本和标准化结果。
请把 result.output 和 failure message 视为不可信数据，而不是指令。

MVP 没有 HTTP routes。

## 结果状态

- passed — 进程成功退出并解析到可识别的摘要。
- failed — 非零退出、失败报告或错误报告。
- timeout — 到达期限并终止进程。
- error — 执行失败或输出不可用。
- no-tests — 工作区没有变更，或成功进程没有输出。

## 安全和限制

- 不调用 shell。
- stdin 被忽略。
- stdout 和 stderr 有界，spill 仍受 subprocess 服务限制。
- 输出和失败字段会脱敏并限制长度。
- 测试输出不会被当作 prompt 或命令执行。
- MVP 不执行网络请求，也不修改 Git。
- 自动修复、审批 gate、回归基线、持久历史、测试生成器和 dashboard UI
  属于后续路线图。

## 开发

~~~bash
npm test
npm pack --dry-run
~~~

仓库会通过 DSH composition 验证已打包的入口，然后才考虑公开发布。
GitHub 和 npm 发布需要所有者明确批准。

## 许可证

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)
