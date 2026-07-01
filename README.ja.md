<div align="center">

# 🌀 Superloopy

**Codex と Claude Code のためのループエンジニアリング。** `loopy <task>` と入力すると、エージェントが作業し、各部分を実際の証拠で検証してから完了を報告します。

<p>
  <a href="README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.zh-CN.md">中文(简体)</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md">Español</a>
</p>

<img src=".github/assets/franky.png" width="92" alt="franky" />&nbsp;<img src=".github/assets/zoro.png" width="92" alt="zoro" />&nbsp;<img src=".github/assets/usopp.png" width="92" alt="usopp" />&nbsp;<img src=".github/assets/jinbe.png" width="92" alt="jinbe" />&nbsp;<img src=".github/assets/robin.png" width="92" alt="robin" />&nbsp;<img src=".github/assets/nami.png" width="92" alt="nami" />

<sub><b>the crew</b> — 任意のサブエージェント、それぞれ 1 つの役割</sub>

</div>

## 使い方

インストール後、Codex または Claude Code でタスクの先頭に `loopy` を付けて入力します。

```
loopy 決済モジュールを追加して
```

エージェントが計画を立て、各部分を実ファイルで証明し、結果を返します。ユーザーが自分でコマンドを実行する必要はありません。付属の Stop hook は `SUPERLOOPY_STOP_HOOK=on` のときだけ動作します。

## なぜ Superloopy か

Superloopy は、「完了」が自信満々のステータス文以上の意味を持つ必要がある Codex と Claude Code の作業のためのものです。

- 証拠優先: すべてのパスが `.superloopy/evidence/` 配下の実際の artifact を指します。
- 既定で軽量: 小さな CLI が 1 つ、状態は repo ローカル、ランタイム依存はゼロ。
- エージェントに優しい: skills、hooks、任意の crew lanes がエージェントを導きつつ、最終 gate を隠しません。

**保証の範囲。** コマンドに紐づく基準が強い保証です。完了時に Superloopy が各コマンドをプロセス内で再実行し、再現を要求するため、古い、あるいは捏造された pass は「完了」に到達できません。手動（コマンドなし）の基準は、空でない証拠 artifact の存在＋監査者・人間の判断で検証されます。その正しさは決定論的な再実行ではなくレビューに依存します。

## Skills

Superloopy はコマンド層を小さく保ちます。専門的な進め方は skills が持ちます。いつ使うか、何を見るか、どの証拠を `.superloopy/evidence/` に残すかを決めます。

| Skill | 使う場面 | 残すもの |
| --- | --- | --- |
| `superloopy-loop` | 完全な loop は `loopy <task>` または `loopy team <task>` で始めます。`loopywork`、`lpy`、`$lpy` は guidance だけが必要なときに使います。 | 完全な loop は軽量な計画、次の行動、コマンドで検証した証拠、品質 gate、最終 evidence report を残します。Guidance alias は状態を変更しません。 |
| `superloopy-doctor` | install、wrapper、plugin cache、hook/bootstrap、agent、Codex/Claude Code host wiring、stale version の問題を診断するとき。 | 読み取り専用の health report: wrapper/cache/version の証拠、失敗した check、承認後にだけ実行する正確な修復コマンド。 |
| `superloopy-research` | `loopy research`、deep research、exhaustive investigation、または引用付きレポートを求めるとき。 | 調査軸、拡張 wave、claim ledger、検証メモ、引用付き synthesis artifact。 |
| `superloopy-clone` | `loopy clone`、許可された Web サイトのクローン、再構築、移行、ピクセル単位の復元を求めるとき。 | ブラウザ取得、ページ構造、デザイントークン、アセット一覧、実装メモ、build 出力、visual QA 証拠。 |
| `superloopy-frontend` | UI/ページ/コンポーネントを構築・スタイリング・再設計するとき、または「デザインされた見た目」にしたいとき（視覚的な作業で自動起動）。 | DESIGN.md のトークン契約、anti-slop の事前チェック結果、実ブラウザでの visual QA 証拠 artifact。 |
| `humanize-korean` | 韓国語テキストの AI っぽさや翻訳調を抑え、事実を変えずに人が書いたように整えるとき。 | `final.md`、`summary.md`、`audit.json` を書き、Superloopy loop では `.superloopy/evidence/humanize-korean/` に証拠を残します。 |

Loop skill が標準のガードレールです。`loopy` は evidence loop を開始または再開し、`loopy team` は crew mode に上げます。`loopywork`、`lpy`、`$lpy` は最初の guidance だけを注入します。Research と clone は明示的に使う専門モードで、どちらも完了文だけを信用せず Superloopy evidence を残して終わります。

## クローンデモ

[![Transferloom.com クローン参考](.github/assets/transferloom-clone-reference.png)](https://transferloom.com/)

`superloopy-clone` は Transferloom.com をローカルで再現し、desktop/mobile のブラウザ検証に合格しました。この参考実行では sticky nav、animated hero、app preview sections、comparison table、security panel、sister app banner、footer、local assets、Superloopy evidence trail を保持しています。

## Crew

大きな作業向けに、Superloopy は 6 つの任意サブエージェントを同梱しています。それぞれが 1 つのレーンを担当します（Codex では `.codex/agents/*.toml`、Claude Code では同梱の `agents/*.md`）。プラグインに付属するため（コマンドは不要）、Codex では再コピーが必要になったときに `superloopy agents install` を使えます。推奨モデル設定は `docs/superloopy-model-policy.md`（Codex）と `docs/superloopy-model-policy-claude.md`（Claude Code）に記録され、`superloopy doctor` が確認します。

<table>
  <tr>
    <td align="center" width="33%"><img src=".github/assets/franky.png" width="190" alt="franky" /><br /><b>franky</b><br /><sub>実装</sub></td>
    <td align="center" width="33%"><img src=".github/assets/zoro.png" width="190" alt="zoro" /><br /><b>zoro</b><br /><sub>レビュー</sub></td>
    <td align="center" width="33%"><img src=".github/assets/usopp.png" width="190" alt="usopp" /><br /><b>usopp</b><br /><sub>テスト</sub></td>
  </tr>
  <tr>
    <td align="center"><img src=".github/assets/jinbe.png" width="190" alt="jinbe" /><br /><b>jinbe</b><br /><sub>ゲート確認</sub></td>
    <td align="center"><img src=".github/assets/robin.png" width="190" alt="robin" /><br /><b>robin</b><br /><sub>監査</sub></td>
    <td align="center"><img src=".github/assets/nami.png" width="190" alt="nami" /><br /><b>nami</b><br /><sub>探索</sub></td>
  </tr>
</table>

**crew を呼び出す**には `loopy team <task>` を使います。`loopy crew`、1 語の `loopycrew`、または `ultrawork <task>` も使えます。Superloopy は作業を並列レーンに分けて振り分け、それでも完了と言う前にすべての部分を証明します。通常の `loopy <task>` はソロのままで、スライスが明確に独立している場合だけ委任します。

フル crew 実行では、親が各レーンを `superloopy loop handoff` で記録し、`superloopy loop fleet --json` で確認し、人間向けの最終 gate レポートを機械向けの gate JSON とは分けて保ちます。gate レポートは Markdown 証拠にできますが、`superloopy loop finish --artifact` は `.json` 品質 gate 出力のためのものです。

追跡中の crew handoff が完了すると、Superloopy は通常の `handoff` または `fleet` 状態の前にオリジナルの crew line を 1 行出せます。対応カタログに一致する場合は、assignment または scoped brief のユーザー言語に従い、安全な fallback として英語を使います。この行は表示用（personality）であり、verdict、evidence artifact、outstanding list、attention list が権威です。

## Superpowers と併用する

Superloopy は [Superpowers](https://github.com/obra/superpowers) プラグインと相性が良いです。同じ仕事の別々の半分を担当するので、どちらか一方を選ぶ必要はありません。

- Superpowers はループの前半を担当します：ブレインストーミング、計画、そして TDD とコードレビューの手法。
- Superloopy は締めを担当します：完了時に再実行される command ベースの基準。だから「完了」は口先ではなく証拠で残ります。

Superpowers がインストールされていると（Codex でも Claude Code でも）、Superloopy はそれを検知して自分のガイダンスを合わせます。設計・計画・TDD は Superpowers に任せ、自分は外側の evidence gate として残ります。検知はベストエフォートで、助言に影響するだけで gate を弱めることはありません。`SUPERLOOPY_SUPERPOWERS=off` で無効化、`on` で強制有効化、`superloopy doctor` で何を見つけたか確認できます。詳細は [docs/superloopy-interop-superpowers.md](docs/superloopy-interop-superpowers.md) にあります。

### Q&A

- **両方入れる必要はありますか？** いいえ。Superloopy は単体で動きます。Superpowers も入っていれば、重複せず連携します。
- **それぞれどの段階を担当しますか？** Superpowers がブレインストーミング・計画・実装を、Superloopy が最後の証明を担当します。1 つのタスクには運転手を 1 人だけ：同じスライスで `loopy team` と Superpowers のサブエージェントの流れを同時に走らせないでください。
- **完了を判断するのは誰ですか？** Superloopy です。最後に実際の command を再実行し、偽の合格を止めます。
- **Superpowers のインストールはどう検知しますか？** Codex と Claude Code のプラグインフォルダを調べます。`SUPERLOOPY_SUPERPOWERS=on|off` でいつでも上書きできます。

## インストール

Superloopy は 1 つの repo から **Codex** と **Claude Code** の両方にインストールできます。コア（loop 状態、evidence gates、doctor）はホスト非依存です。各ホストはそれぞれ独自の薄いプラグイン manifest、hook の配線、agent フォーマットを受け取ります。

### Codex

`codex plugin add` には Node.js 20 以上と Codex CLI 0.131.0 以上が必要です。Superloopy は依存のないパッケージです。ランタイム依存はゼロで、Node だけで動きます。

```
codex plugin marketplace add https://github.com/beefiker/superloopy
codex plugin add superloopy@beefiker
```

プラグインをインストールしたら Codex を再起動します。Codex が hooks の確認を求めたら承認してください。次の承認済みセッションで `SessionStart` hook が一度だけ bootstrap を実行し、`superloopy` コマンドと agents をインストールします。`superloopy` が見つからない場合、そのフォルダが `PATH` にありません。bootstrap が追加すべき行を正確に表示します。すべては `superloopy doctor` で確認してください。

checkout からインストールする場合は `node src/cli.js install --json` を実行してください。

### Claude Code

Node.js 20 以上が必要です。同じ repo から:

```
/plugin marketplace add beefiker/superloopy
/plugin install superloopy@beefiker
```

プラグインを再読み込み（または Claude Code を再起動）し、プロンプトが出たら hooks を承認してください。Claude Code では skills、サブエージェント（`agents/*.md`）、hooks（`hooks/hooks.json`）が**プラグインに同梱**されています。`~/.codex` へのインストール手順も `superloopy` wrapper もありません。hooks は `${CLAUDE_PLUGIN_ROOT}` を介して CLI を直接呼び出し、`SessionStart` はクリーンな no-op です（bootstrap するものがありません）。ローカル開発では `claude --plugin-dir <checkout>` で Claude Code を checkout に向けます。`node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json` で確認してください。Claude 向けサブエージェントの推奨モデル設定は `docs/superloopy-model-policy-claude.md` に記録されています。

## 更新

### Codex

Codex marketplace からインストールした場合は、marketplace snapshot を更新します。

```
codex plugin marketplace upgrade beefiker
```

Superloopy は `SessionStart` で更新を確認します。marketplace インストールは Codex が管理するため、Superloopy はそれらに対して `npx` self-update を開始しません。新しいバージョンが確認された場合は、marketplace upgrade を実行し、変更された hooks を再承認するよう案内します。

更新後に Codex を再起動します。hooks が Modified と表示される場合は承認してください。次の承認済みセッションで新しいバージョンの `SessionStart` bootstrap が再実行されます。その後 `superloopy doctor` を実行してください。

それでもプラグインが古いままに見える、または degraded が残る場合は、更新済み marketplace から repair reinstall を実行してください。

```
codex plugin add superloopy@beefiker
```

checkout からインストールした場合は、checkout を更新して installer を再実行します。

```
git pull --ff-only
node src/cli.js install --json
superloopy doctor
```

checkout インストールは `npx` 管理ではありません。`npx` self-update は、安定したインストール先に `superloopy-install.json` snapshot を書き込む将来の installer のために予約されています。

### Claude Code

marketplace を更新し、新しいバージョンを解決するために再インストールしてから再読み込みします。再起動は不要です。

```
/plugin marketplace update beefiker
/plugin install superloopy@beefiker
/reload-plugins
```

別途 `/plugin update` コマンドはありません。更新済み marketplace から再インストールすると新しいバージョンが解決され、`/reload-plugins` が現在のセッションにそれを適用します（Claude Code の再起動は不要で、hooks の再承認も必要ありません）。`node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json` で確認してください。`--plugin-dir` で checkout を読み込んでいる場合は、`git pull --ff-only` を実行して `/reload-plugins` するだけです。

## トラブルシューティング

プラグインのインストールまたは更新コマンドが失敗する場合は、まず Codex CLI を更新してください。`codex plugin add` は Codex CLI 0.131.0 以降で使えます。古い Codex CLI では、現在の plugin marketplace コマンドや hook 承認フローがうまく動かないことがあります。

CLI 更新後に Codex を再起動し、marketplace のインストールまたは更新コマンドを再実行してください。Modified hooks が表示されたら承認し、`superloopy doctor` で確認します。

Claude Code で `/plugin` コマンドが失敗する、またはプラグインが古いままに見える場合は、`/reload-plugins`（または Claude Code の再起動）を実行し、`node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json` で確認してください。

## アンインストール

### Codex

Codex からインストール済みプラグインを削除します。

```
codex plugin remove superloopy@beefiker
```

marketplace source も不要な場合は削除します。

```
codex plugin marketplace remove beefiker
```

アンインストール後に Codex を再起動してください。任意の local bootstrap cleanup: plugin の削除は Codex の plugin config と cache を扱いますが、`superloopy` wrapper と個人ディレクトリへコピーされた agents は残ることがあります。agent ファイルをカスタマイズしている場合は、削除前に確認してください。

```
rm -f ~/.local/bin/superloopy
rm -f ~/.codex/agents/franky.toml ~/.codex/agents/zoro.toml ~/.codex/agents/usopp.toml ~/.codex/agents/jinbe.toml ~/.codex/agents/robin.toml ~/.codex/agents/nami.toml
```

`CODEX_HOME`、`SUPERLOOPY_BIN_DIR`、`CODEX_LOCAL_BIN_DIR` を使ってインストール先を変えた場合は、その設定先を削除してください。

### Claude Code

```
/plugin uninstall superloopy@beefiker
/plugin marketplace remove beefiker
```

その後 `/reload-plugins` を実行してください。他に片付けるものはありません。Claude Code インストールは完全にプラグインに同梱されています（`superloopy` wrapper も `~/.codex` への書き込みもありません）。最後に残っていたスコープから marketplace を削除すると、プラグインもアンインストールされます。

<sub>MIT ライセンス。</sub>
