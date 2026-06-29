<div align="center">

# 🌀 Loopy

**Codex のためのループエンジニアリング。** `loopy <task>` と入力すると、エージェントが作業し、各部分を実際の証拠で検証してから完了を報告します。

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

インストール後、Codex でタスクの先頭に `loopy` を付けます。

```
loopy 失敗しているログインテストを直して証拠で検証して
```

エージェントが計画を立て、各部分を実ファイルで証明し、結果を返します。ユーザーが自分でコマンドを実行する必要はありません。付属の Stop hook は `LOOPY_STOP_HOOK=on` のときだけ動作します。

## Crew

大きな作業向けに、Loopy は `.codex/agents/` に 6 つの任意サブエージェントを用意しています。それぞれが 1 つのレーンを担当します。プラグインのインストール時に自動で入ります。再コピーが必要なときは `loopy agents install` を使えます。推奨モデル設定は `docs/loopy-model-policy.md` に記録され、`loopy doctor` が確認します。

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

`loopy team <task>` で crew を呼び出します。`loopy crew`、1 語の `loopycrew`、または `ultrawork <task>` も使えます。Loopy は作業を並列レーンに分け、すべての部分が証明されるまで完了としません。通常の `loopy <task>` はソロモードで動き、明確に独立した部分がある場合だけ委任します。

フル crew 実行では、親が各レーンを `loopy loop handoff` で記録し、`loopy loop fleet --json` で確認します。人間向けの最終 gate レポートは、機械向けの gate JSON とは分けます。gate レポートは Markdown 証拠にできますが、`loopy loop finish --artifact` には `.json` 品質 gate が必要です。

追跡中の crew handoff が完了すると、Loopy は通常の `handoff` または `fleet` 状態の前にオリジナルの crew line を 1 行出せます。assignment または scoped brief から対応言語を推測し、推測できない場合は英語に戻ります。この行は表示用であり、verdict、evidence artifact、outstanding、attention が権威です。

## インストール

Node.js 20 以上が必要です。Loopy はランタイム依存のないパッケージです。

```
codex plugin marketplace add https://github.com/beefiker/loopy
codex plugin add loopy@beefiker
```

Codex を 2 回再起動します。まず hooks を承認し、次に再読み込みします。最初に承認されたセッションは `SessionStart` hook で一度だけ bootstrap を実行し、`loopy` コマンドと agents をインストールします。`loopy` が見つからない場合、そのフォルダが `PATH` にありません。bootstrap が追加すべき行を表示します。`loopy doctor` で確認してください。

checkout からインストールする場合は `node src/cli.js install --json` を実行してください。

<sub>MIT ライセンス。</sub>
