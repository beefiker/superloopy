<div align="center">

# 🌀 Loopy

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

代理会规划任务，用真实文件证明每一部分，然后返回结果。你不需要自己运行命令。随包提供的 Stop hook 只有在 `LOOPY_STOP_HOOK=on` 时才会介入。

## Crew

对于更大的任务，Loopy 在 `.codex/agents/` 下提供六个可选子代理，每个代理负责一条工作线。插件安装时会自动安装它们；如果需要重新复制，可以运行 `loopy agents install`。建议模型默认值记录在 `docs/loopy-model-policy.md` 中，并由 `loopy doctor` 检查。

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

使用 `loopy team <task>` 召集 crew。也可以使用 `loopy crew`、单词形式 `loopycrew`，或 `ultrawork <task>`。Loopy 会把工作拆到并行工作线中，并在每一部分都有证据后才认为完成。普通的 `loopy <task>` 会保持单人模式，只有在任务片段明显独立时才委派。

完整 crew 运行中，父代理用 `loopy loop handoff` 记录每条工作线，用 `loopy loop fleet --json` 检查汇总。面向人的最终 gate 报告应与机器读取的 gate JSON 分开。gate 报告可以作为 Markdown 证据；`loopy loop finish --artifact` 需要 `.json` 质量 gate。

当已跟踪的 crew handoff 完成时，Loopy 可以在普通 `handoff` 或 `fleet` 状态前输出一句原创 crew line。它会从 assignment 或 scoped brief 中推断支持的语言；无法推断时回退到英语。这句话只用于展示，真正权威仍然是 verdict、evidence artifact、outstanding 列表和 attention 列表。

## 安装

需要 Node.js 20 或更高版本。Loopy 没有运行时依赖。

```
codex plugin marketplace add https://github.com/beefiker/loopy
codex plugin add loopy@beefiker
```

重启 Codex 两次：先批准 hooks，再重新加载。第一次批准的会话会运行一次 `SessionStart` bootstrap，安装 `loopy` 命令和 agents。如果找不到 `loopy`，说明它所在目录不在 `PATH` 中；bootstrap 会打印需要添加的那一行。用 `loopy doctor` 检查状态。

如果从 checkout 安装，请运行 `node src/cli.js install --json`。

<sub>MIT 许可证。</sub>
