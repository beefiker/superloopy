<div align="center">

# 🌀 Superloopy

**面向 Codex 与 Claude Code 的循环工程。** 输入 `loopy <task>`，代理会完成任务，用真实证据验证每一部分，然后才报告完成。

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

安装后，在 Codex 或 Claude Code 中用 `loopy` 开头输入任务：

```
loopy 添加支付模块
```

代理会规划任务，用真实文件证明每一部分，然后返回结果。你不需要自己运行命令。随包提供的 Stop hook 只有在 `SUPERLOOPY_STOP_HOOK=on` 时才会介入。

## 为什么选择 Superloopy？

Superloopy 面向 Codex 与 Claude Code 的工作场景——在这些场景里，“完成”需要不止是一句自信的状态描述。

- 证据优先：每一遍都指向 `.superloopy/evidence/` 下的真实产物。
- 默认轻量：一个小巧的 CLI、仓库本地状态、零运行时依赖。
- 对代理友好：skills、hooks 以及可选的 crew 工作线在引导代理的同时，绝不隐藏最终的 gate。

**保证范围。** 基于命令的标准是强保证：完成时 Superloopy 会在进程内重新运行每条命令并要求其可复现，因此过时或伪造的 pass 无法到达“完成”。手动（无命令）标准通过非空的证据产物加上审计者/人工判断来验证——其正确性依赖于评审，而非确定性的重新运行。

## Skills

Superloopy 保持命令层很小。具体工作方式由 skills 负责：什么时候启用、需要检查什么，以及哪些证明必须写到 `.superloopy/evidence/`。

| Skill | 何时使用 | 产出 |
| --- | --- | --- |
| `superloopy-loop` | 用 `loopy <task>` 或 `loopy team <task>` 启动完整 loop；用 `loopywork`、`lpy`、`$lpy` 只注入 guidance。 | 完整 loop 会产出轻量计划、下一步指引、命令验证证明、质量 gate、最终 evidence report。Guidance alias 不会改状态。 |
| `superloopy-doctor` | 诊断安装、wrapper、plugin cache、hook/bootstrap、agent、Codex/Claude Code host wiring 或版本过旧问题时。 | 只读 health report：wrapper/cache/version 证据、失败检查，以及只有批准后才运行的精确修复命令。 |
| `superloopy-research` | 请求 `loopy research`、deep research、exhaustive investigation，或需要带引用的研究报告时。 | 研究轴、扩展 wave、claim ledger、验证笔记、带引用的 synthesis artifact。 |
| `superloopy-clone` | 请求 `loopy clone`、已授权的网站克隆、重建、迁移，或需要按像素恢复页面时。 | 浏览器截图、页面结构、设计 token、资产清单、实现笔记、build 输出、visual QA 证据。 |
| `superloopy-frontend` | 构建、设计样式或重新设计任何 UI/页面/组件，或要求让某个东西“看起来是设计过的”时（可视化工作会自动激活）。 | 一份 DESIGN.md token 契约、一份 anti-slop 预检结果，以及一份真实浏览器的 visual QA 证据产物。 |
| `humanize-korean` | 需要去掉韩文内容里的 AI 腔、修正翻译腔，或在不改事实的前提下让韩文更像真人写作时。 | 写入 `final.md`、`summary.md`、`audit.json`；在 Superloopy loop 中把证据记录到 `.superloopy/evidence/humanize-korean/`。 |

Loop skill 是默认护栏。`loopy` 会启动或继续 evidence loop；`loopy team` 会升级到 crew 模式。`loopywork`、`lpy`、`$lpy` 只注入起步 guidance。Research 和 clone 是显式启用的专门模式；它们也必须以 Superloopy evidence 收尾，而不是只给一句完成状态。

## 克隆演示

[![Transferloom.com 克隆参考](.github/assets/transferloom-clone-reference.png)](https://transferloom.com/)

`superloopy-clone` 在本地复现了 Transferloom.com，并通过 desktop/mobile 浏览器验证。这个参考运行保留了 sticky nav、animated hero、app preview sections、comparison table、security panel、sister app banner、footer、local assets 和 Superloopy evidence trail。

## Crew

对于更大的任务，Superloopy 提供六个可选子代理，每个代理负责一条工作线（在 Codex 上是 `.codex/agents/*.toml`，在 Claude Code 上是随包提供的 `agents/*.md`）。它们随插件一起提供（无需额外命令）；在 Codex 上，如果需要重新复制，运行 `superloopy agents install` 即可。它们的建议模型默认值记录在 `docs/superloopy-model-policy.md`（Codex）和 `docs/superloopy-model-policy-claude.md`（Claude Code）中，并由 `superloopy doctor` 检查。

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

当已跟踪的 crew handoff 完成时，Superloopy 可以在普通 `handoff` 或 `fleet` 状态前输出一句原创 crew line。它会从 assignment 或 scoped brief 中推断语言，只要该语言在支持的目录内就会跟随；无法推断时回退到英语。这句话只用于展示，真正权威仍然是 verdict、evidence artifact、outstanding 列表和 attention 列表。

## 安装

Superloopy 可以从同一个仓库同时安装到 **Codex** 和 **Claude Code**。核心部分（loop 状态、evidence gate、doctor）与宿主无关；每个宿主各有自己的轻量插件清单、hook 接线和 agent 格式。

### Codex

需要 Node.js ≥ 20，以及支持 `codex plugin add` 的 Codex CLI ≥ 0.131.0。Superloopy 没有依赖——零运行时依赖，只需要 Node。

```
codex plugin marketplace add https://github.com/beefiker/superloopy
codex plugin add superloopy@beefiker
```

安装插件后重启 Codex。如果 Codex 要求你审查 hooks，请批准它们；下一个已批准的会话会运行一次 `SessionStart` hook，做一次性 bootstrap——它会安装 `superloopy` 命令和 agents。如果找不到 `superloopy`，说明它所在目录不在 `PATH` 中；bootstrap 会打印需要添加的那一行。用 `superloopy doctor` 检查所有内容。

如果从 checkout 安装，请运行 `node src/cli.js install --json`。

### Claude Code

需要 Node.js ≥ 20。从同一个仓库：

```
/plugin marketplace add beefiker/superloopy
/plugin install superloopy@beefiker
```

重新加载插件（或重启 Claude Code），并在提示时批准 hooks。在 Claude Code 上，skills、子代理（`agents/*.md`）和 hooks（`hooks/hooks.json`）都是**随插件打包**的——没有 `~/.codex` 安装步骤，也没有 `superloopy` wrapper；hooks 通过 `${CLAUDE_PLUGIN_ROOT}` 直接调用 CLI，`SessionStart` 是一个干净的 no-op（没有任何需要 bootstrap 的东西）。用于本地开发时，用 `claude --plugin-dir <checkout>` 把 Claude Code 指向一个 checkout。用 `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json` 验证。子代理在 Claude 上的建议模型默认值记录在 `docs/superloopy-model-policy-claude.md` 中。

## 更新

### Codex

如果通过 Codex marketplace 安装，刷新 marketplace snapshot：

```
codex plugin marketplace upgrade beefiker
```

Superloopy 会在 `SessionStart` 检查更新。marketplace 安装由 Codex 管理，因此 Superloopy 不会为它启动 `npx` self-update；如果检测到有新版本，它会提示你运行 marketplace upgrade 并重新批准 Modified hooks。

升级后重启 Codex。如果 hooks 显示为 Modified，请批准它们；下一次已批准的会话会用新版本重新运行 `SessionStart` bootstrap。然后运行 `superloopy doctor`。

如果之后插件仍然像旧版本，或仍显示 degraded，请从已刷新的 marketplace 做一次 repair reinstall：

```
codex plugin add superloopy@beefiker
```

如果从 checkout 安装，请更新 checkout 并重新运行 installer：

```
git pull --ff-only
node src/cli.js install --json
superloopy doctor
```

checkout 安装不是 `npx` 管理的。`npx` self-update 只会在未来有稳定 installer、并在安装根目录写入 `superloopy-install.json` snapshot 之后启用。

### Claude Code

刷新 marketplace，重新安装以解析新版本，然后重新加载——无需重启：

```
/plugin marketplace update beefiker
/plugin install superloopy@beefiker
/reload-plugins
```

没有单独的 `/plugin update` 命令：从已刷新的 marketplace 重新安装即可解析出新版本，`/reload-plugins` 会在当前会话中应用它（无需重启 Claude Code，hooks 也不需要重新批准）。用 `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json` 验证。如果你用 `--plugin-dir` 加载了一个 checkout，只需 `git pull --ff-only` 再运行 `/reload-plugins`。

## 故障排除

如果插件安装或更新命令失败，请先更新 Codex CLI。`codex plugin add` 从 Codex CLI 0.131.0 开始可用；旧版本可能无法顺利处理当前的 plugin marketplace 命令和 hook 审批流程。

更新 CLI 后重启 Codex，再次运行 marketplace 安装或更新命令，批准所有 Modified hooks，然后用 `superloopy doctor` 检查。

在 Claude Code 上，如果 `/plugin` 命令失败或插件看起来像旧版本，请运行 `/reload-plugins`（或重启 Claude Code），再用 `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json` 验证。

## 卸载

### Codex

从 Codex 删除已安装插件：

```
codex plugin remove superloopy@beefiker
```

如果不再需要这个 marketplace source，也可以删除：

```
codex plugin marketplace remove beefiker
```

卸载后重启 Codex。可选的 local bootstrap cleanup：plugin 删除会移除 Codex 的 plugin config 和 cache，但 `superloopy` wrapper 以及复制到个人目录的 agents 可能会保留。删除前请先检查，尤其是你修改过 agent 文件时。

```
rm -f ~/.local/bin/superloopy
rm -f ~/.codex/agents/franky.toml ~/.codex/agents/zoro.toml ~/.codex/agents/usopp.toml ~/.codex/agents/jinbe.toml ~/.codex/agents/robin.toml ~/.codex/agents/nami.toml
```

如果安装时使用了 `CODEX_HOME`、`SUPERLOOPY_BIN_DIR` 或 `CODEX_LOCAL_BIN_DIR`，请清理对应路径。

### Claude Code

```
/plugin uninstall superloopy@beefiker
/plugin marketplace remove beefiker
```

然后运行 `/reload-plugins`。没有其他需要清理的东西——Claude Code 安装完全随插件打包（没有 `superloopy` wrapper，也不写入 `~/.codex`）。从最后一个作用域移除该 marketplace 也会一并卸载插件。

<sub>MIT 许可证。</sub>
