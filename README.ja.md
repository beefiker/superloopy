<div align="center">

# 🌀 Superloopy

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

エージェントが計画を立て、各部分を実ファイルで証明し、結果を返します。ユーザーが自分でコマンドを実行する必要はありません。付属の Stop hook は `SUPERLOOPY_STOP_HOOK=on` のときだけ動作します。

## Skills

Superloopy はコマンド層を小さく保ちます。専門的な進め方は skills が持ちます。いつ使うか、何を見るか、どの証拠を `.superloopy/evidence/` に残すかを決めます。

| Skill | 使う場面 | 残すもの |
| --- | --- | --- |
| `superloopy-loop` | 完全な loop は `loopy <task>` または `loopy team <task>` で始めます。`loopywork`、`lpy`、`$lpy` は guidance だけが必要なときに使います。 | 完全な loop は軽量な計画、次の行動、コマンドで検証した証拠、品質 gate、最終 evidence report を残します。Guidance alias は状態を変更しません。 |
| `superloopy-research` | `loopy research`、deep research、exhaustive investigation、または引用付きレポートを求めるとき。 | 調査軸、拡張 wave、claim ledger、検証メモ、引用付き synthesis artifact。 |
| `superloopy-clone` | `loopy clone`、許可された Web サイトのクローン、再構築、移行、ピクセル単位の復元を求めるとき。 | ブラウザ取得、ページ構造、デザイントークン、アセット一覧、実装メモ、build 出力、visual QA 証拠。 |

Loop skill が標準のガードレールです。`loopy` は evidence loop を開始または再開し、`loopy team` は crew mode に上げます。`loopywork`、`lpy`、`$lpy` は最初の guidance だけを注入します。Research と clone は明示的に使う専門モードで、どちらも完了文だけではなく Superloopy evidence を残して終わります。

## Crew

大きな作業向けに、Superloopy は `.codex/agents/` に 6 つの任意サブエージェントを用意しています。それぞれが 1 つのレーンを担当します。プラグインのインストール時に自動で入ります。再コピーが必要なときは `superloopy agents install` を使えます。推奨モデル設定は `docs/superloopy-model-policy.md` に記録され、`superloopy doctor` が確認します。

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

`loopy team <task>` で crew を呼び出します。`loopy crew`、1 語の `loopycrew`、または `ultrawork <task>` も使えます。Superloopy は作業を並列レーンに分け、すべての部分が証明されるまで完了としません。通常の `loopy <task>` はソロモードで動き、明確に独立した部分がある場合だけ委任します。

フル crew 実行では、親が各レーンを `superloopy loop handoff` で記録し、`superloopy loop fleet --json` で確認します。人間向けの最終 gate レポートは、機械向けの gate JSON とは分けます。gate レポートは Markdown 証拠にできますが、`superloopy loop finish --artifact` には `.json` 品質 gate が必要です。

追跡中の crew handoff が完了すると、Superloopy は通常の `handoff` または `fleet` 状態の前にオリジナルの crew line を 1 行出せます。assignment または scoped brief から対応言語を推測し、推測できない場合は英語に戻ります。この行は表示用であり、verdict、evidence artifact、outstanding、attention が権威です。

## インストール

Node.js 20 以上が必要です。Superloopy はランタイム依存のないパッケージです。

```
codex plugin marketplace add https://github.com/beefiker/superloopy
codex plugin add superloopy@beefiker
```

プラグインをインストールしたら Codex を再起動します。Codex が hooks の確認を求めたら承認してください。次の承認済みセッションで `SessionStart` hook が一度だけ bootstrap を実行し、`superloopy` コマンドと agents をインストールします。`superloopy` が見つからない場合、そのフォルダが `PATH` にありません。bootstrap が追加すべき行を表示します。`superloopy doctor` で確認してください。

checkout からインストールする場合は `node src/cli.js install --json` を実行してください。

<sub>MIT ライセンス。</sub>
