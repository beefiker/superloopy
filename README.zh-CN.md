<div align="center">

# 🌀 Superloopy

**面向 Codex 的循环工程。** 输入 `loopy <task>`，代理会完成任务，用真实证据验证每一部分，然后才报告完成。

<p>
  <a href="README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.zh-CN.md">中文(简体)</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md">Español</a>
</p>

<img src=".github/assets/franky.png" width="92" alt="franky" />&nbsp;<img src=".github/assets/zoro.png" width="92" alt="zoro" />&nbsp;<img src=".github/assets/usopp.png" width="92" alt="usopp" />&nbsp;<img src=".github/assets/jinbe.png" width="92" alt="jinbe" />&nbsp;<img src=".github/assets/robin.png" width="92" alt="robin" />&nbsp;<img src=".github/assets/nami.png" width="92" alt="nami" />

<sub><b>the crew</b> — 可选子代理，每个代理负责一个岗位</sub>

</div>

## 使用

安装后，在 Codex 中用 `loopy` 开头输入任务：

```
loopy 修复失败的登录测试并用证据验证
```

代理会规划任务，用真实文件证明每一部分，然后返回结果。你不需要自己运行命令。随包提供的 Stop hook 只有在 `SUPERLOOPY_STOP_HOOK=on` 时才会介入。

## Skills

Superloopy 保持命令层很小。具体工作方式由 skills 负责：什么时候启用、需要检查什么，以及哪些证明必须写到 `.superloopy/evidence/`。

| Skill | 何时使用 | 产出 |
| --- | --- | --- |
| `superloopy-loop` | 用 `loopy <task>` 或 `loopy team <task>` 启动完整 loop；用 `loopywork`、`lpy`、`$lpy` 只注入 guidance。 | 完整 loop 会产出轻量计划、下一步指引、命令验证证明、质量 gate、最终 evidence report。Guidance alias 不会改状态。 |
| `superloopy-research` | 请求 `loopy research`、deep research、exhaustive investigation，或需要带引用的研究报告时。 | 研究轴、扩展 wave、claim ledger、验证笔记、带引用的 synthesis artifact。 |
| `superloopy-clone` | 请求 `loopy clone`、已授权的网站克隆、重建、迁移，或需要按像素恢复页面时。 | 浏览器截图、页面结构、设计 token、资产清单、实现笔记、build 输出、visual QA 证据。 |

Loop skill 是默认护栏。`loopy` 会启动或继续 evidence loop；`loopy team` 会升级到 crew 模式。`loopywork`、`lpy`、`$lpy` 只注入起步 guidance。Research 和 clone 是显式启用的专门模式；它们也必须以 Superloopy evidence 收尾，而不是只给一句完成状态。

## Crew

对于更大的任务，Superloopy 在 `.codex/agents/` 下提供六个可选子代理，每个代理负责一条工作线。插件安装时会自动安装它们；如果需要重新复制，可以运行 `superloopy agents install`。建议模型默认值记录在 `docs/superloopy-model-policy.md` 中，并由 `superloopy doctor` 检查。

<table>
  <tr>
    <td align="center" width="33%"><img src=".github/assets/franky.png" width="190" alt="franky" /><br /><b>franky</b><br /><sub>实现</sub></td>
    <td align="center" width="33%"><img src=".github/assets/zoro.png" width="190" alt="zoro" /><br /><b>zoro</b><br /><sub>评审</sub></td>
    <td align="center" width="33%"><img src=".github/assets/usopp.png" width="190" alt="usopp" /><br /><b>usopp</b><br /><sub>测试</sub></td>
  </tr>
  <tr>
    <td align="center"><img src=".github/assets/jinbe.png" width="190" alt="jinbe" /><br /><b>jinbe</b><br /><sub>把关</sub></td>
    <td align="center"><img src=".github/assets/robin.png" width="190" alt="robin" /><br /><b>robin</b><br /><sub>审计</sub></td>
    <td align="center"><img src=".github/assets/nami.png" width="190" alt="nami" /><br /><b>nami</b><br /><sub>定位</sub></td>
  </tr>
</table>

使用 `loopy team <task>` 召集 crew。也可以使用 `loopy crew`、单词形式 `loopycrew`，或 `ultrawork <task>`。Superloopy 会把工作拆到并行工作线中，并在每一部分都有证据后才认为完成。普通的 `loopy <task>` 会保持单人模式，只有在任务片段明显独立时才委派。

完整 crew 运行中，父代理用 `superloopy loop handoff` 记录每条工作线，用 `superloopy loop fleet --json` 检查汇总。面向人的最终 gate 报告应与机器读取的 gate JSON 分开。gate 报告可以作为 Markdown 证据；`superloopy loop finish --artifact` 需要 `.json` 质量 gate。

当已跟踪的 crew handoff 完成时，Superloopy 可以在普通 `handoff` 或 `fleet` 状态前输出一句原创 crew line。它会从 assignment 或 scoped brief 中推断支持的语言；无法推断时回退到英语。这句话只用于展示，真正权威仍然是 verdict、evidence artifact、outstanding 列表和 attention 列表。

## 安装

需要 Node.js 20 或更高版本。Superloopy 没有运行时依赖。

```
codex plugin marketplace add https://github.com/beefiker/superloopy
codex plugin add superloopy@beefiker
```

安装插件后重启 Codex。如果 Codex 要求你审查 hooks，请批准它们；下一个已批准的会话会运行一次 `SessionStart` bootstrap，安装 `superloopy` 命令和 agents。如果找不到 `superloopy`，说明它所在目录不在 `PATH` 中；bootstrap 会打印需要添加的那一行。用 `superloopy doctor` 检查状态。

如果从 checkout 安装，请运行 `node src/cli.js install --json`。

<sub>MIT 许可证。</sub>
