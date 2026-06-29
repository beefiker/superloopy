<div align="center">

# 🌀 Superloopy

**Codex용 루프 엔지니어링.** `loopy <task>`로 시작하면 에이전트가 일을 맡습니다. 근거를 남기지 못한 작업은 완료로 치지 않습니다.

<p>
  <a href="README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.zh-CN.md">中文(简体)</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md">Español</a>
</p>

<img src=".github/assets/franky.png" width="92" alt="franky" />&nbsp;<img src=".github/assets/zoro.png" width="92" alt="zoro" />&nbsp;<img src=".github/assets/usopp.png" width="92" alt="usopp" />&nbsp;<img src=".github/assets/jinbe.png" width="92" alt="jinbe" />&nbsp;<img src=".github/assets/robin.png" width="92" alt="robin" />&nbsp;<img src=".github/assets/nami.png" width="92" alt="nami" />

<sub><b>the crew</b> — 필요할 때 부르는 서브에이전트들</sub>

</div>

## 사용하기

설치 후 Codex에서 작업 앞에 `loopy`만 붙이세요.

```
loopy 로그인 테스트가 깨졌어. 고치고 근거 남겨줘
```

Superloopy가 계획을 세우고, 실행하고, 검증 로그나 파일을 근거로 남깁니다. 사용자가 중간에 명령을 직접 칠 필요는 없습니다. Stop hook은 기본으로 조용합니다. `SUPERLOOPY_STOP_HOOK=on`일 때만 막아섭니다.

## 스킬

Superloopy는 명령을 작게 둡니다. 대신 스킬이 작업 방식을 잡습니다. 언제 켜져야 하는지, 무엇을 확인해야 하는지, 어떤 근거를 `.superloopy/evidence/` 아래에 남겨야 하는지가 스킬에 들어 있습니다.

| 스킬 | 언제 쓰나 | 남기는 것 |
| --- | --- | --- |
| `superloopy-loop` | full loop는 `loopy <task>` 또는 `loopy team <task>`로 시작합니다. `loopywork`, `lpy`, `$lpy`는 가벼운 guidance만 넣을 때 씁니다. | full loop는 가벼운 계획, 다음 행동, 명령으로 검증한 근거, 품질 게이트, 최종 evidence report를 남깁니다. guidance alias는 상태를 바꾸지 않습니다. |
| `superloopy-research` | `loopy research`, deep research, exhaustive investigation, 출처 있는 리서치 보고서를 요청할 때. | 리서치 축, 확장 wave, claim ledger, 검증 메모, 출처가 붙은 synthesis artifact. |
| `superloopy-clone` | `loopy clone`, 허가된 웹사이트 클론, 리빌드, 마이그레이션, 픽셀 기준 복구를 요청할 때. | 브라우저 캡처, 페이지 구조, 디자인 토큰, asset 목록, 구현 메모, build 출력, visual QA 근거. |

기본 안전장치는 loop 스킬입니다. `loopy`는 evidence loop를 시작하거나 이어가고, `loopy team`은 크루 모드로 올립니다. `loopywork`, `lpy`, `$lpy`는 시작 안내만 넣습니다. research와 clone은 명시적으로 켜는 전문 모드이고, 둘 다 마지막에는 말로 끝났다고 하지 않고 Superloopy evidence를 남깁니다.

## 클론 데모

[![Transferloom.com 클론 레퍼런스](.github/assets/transferloom-clone-reference.png)](https://transferloom.com/)

`superloopy-clone`은 Transferloom.com을 로컬에서 재현했고 desktop/mobile 브라우저 검증을 통과했습니다. 이 레퍼런스 실행은 sticky nav, animated hero, app preview 섹션, comparison table, security panel, sister app banner, footer, local assets, Superloopy evidence trail을 보존했습니다.

## 크루

큰 작업이라면 크루를 쓸 수 있습니다. Superloopy에는 `.codex/agents/` 아래 여섯 서브에이전트가 있습니다. 각자 하나의 레인을 맡습니다. 플러그인을 설치하면 함께 들어가고, 필요하면 `superloopy agents install`로 다시 복사합니다. 모델 기본값은 `docs/superloopy-model-policy.md`에 있고 `superloopy doctor`가 확인합니다.

<table>
  <tr>
    <td align="center" width="33%"><img src=".github/assets/franky.png" width="190" alt="franky" /><br /><b>franky</b><br /><sub>구현</sub></td>
    <td align="center" width="33%"><img src=".github/assets/zoro.png" width="190" alt="zoro" /><br /><b>zoro</b><br /><sub>리뷰</sub></td>
    <td align="center" width="33%"><img src=".github/assets/usopp.png" width="190" alt="usopp" /><br /><b>usopp</b><br /><sub>테스트</sub></td>
  </tr>
  <tr>
    <td align="center"><img src=".github/assets/jinbe.png" width="190" alt="jinbe" /><br /><b>jinbe</b><br /><sub>게이트 검토</sub></td>
    <td align="center"><img src=".github/assets/robin.png" width="190" alt="robin" /><br /><b>robin</b><br /><sub>감사</sub></td>
    <td align="center"><img src=".github/assets/nami.png" width="190" alt="nami" /><br /><b>nami</b><br /><sub>탐색</sub></td>
  </tr>
</table>

`loopy team <task>`로 크루를 부릅니다. `loopy crew`, 한 단어 형태인 `loopycrew`, `ultrawork <task>`도 같은 흐름입니다. Superloopy는 일을 병렬 레인으로 나눌 수 있지만, 각 레인이 근거를 남겨야 끝난 것으로 봅니다. 그냥 `loopy <task>`로 시작하면 솔로로 진행합니다. 독립된 조각이 보일 때만 나눕니다.

크루 실행에서는 부모 에이전트가 각 레인을 `superloopy loop handoff`로 기록하고 `superloopy loop fleet --json`으로 확인합니다. 사람이 읽는 최종 게이트 보고서와 기계가 읽는 게이트 JSON은 섞지 않습니다. Markdown 보고서는 근거로 남길 수 있지만, `superloopy loop finish --artifact`에는 `.json` 품질 게이트가 들어가야 합니다.

추적 중인 크루 handoff가 끝나면 Superloopy가 일반 `handoff` 또는 `fleet` 상태 앞에 짧은 크루 라인을 한 줄 붙일 수 있습니다. 할당문이나 세션 brief에서 언어를 알아보면 그 언어를 쓰고, 못 알아보면 영어를 씁니다. 이 문장은 분위기용입니다. 실제 기준은 판정, 근거 파일, outstanding 목록, attention 목록입니다.

## 설치

Node.js 20 이상과 `codex plugin add`를 지원하는 Codex CLI 0.131.0 이상이 필요합니다. Superloopy는 런타임 의존성이 없습니다.

```
codex plugin marketplace add https://github.com/beefiker/superloopy
codex plugin add superloopy@beefiker
```

플러그인을 설치한 뒤 Codex를 재시작하세요. Codex가 hooks 검토를 요청하면 승인하세요. 승인된 다음 세션에서 `SessionStart` hook이 bootstrap을 한 번 실행합니다. 이때 `superloopy` 명령과 agents가 설치됩니다. `superloopy`를 찾지 못하면 설치 경로가 `PATH`에 없는 겁니다. bootstrap 출력에 추가할 줄이 나옵니다. 마지막으로 `superloopy doctor`를 돌려 확인하세요.

checkout에서 설치한다면 `node src/cli.js install --json`을 실행하세요.

## 업데이트

Codex marketplace로 설치했다면 marketplace snapshot을 갱신합니다.

```
codex plugin marketplace upgrade beefiker
```

Superloopy는 `SessionStart` 때 업데이트를 확인합니다. marketplace 설치는 Codex가 관리하므로 Superloopy가 `npx` self-update를 시작하지 않습니다. 새 버전이 확인되면 marketplace upgrade를 실행하고 Modified hooks를 다시 승인하라고 안내합니다.

업데이트 뒤 Codex를 재시작하세요. hooks가 Modified로 보이면 정상입니다. 다시 승인하면 그 다음 승인된 세션에서 새 버전 기준으로 `SessionStart` bootstrap이 다시 실행됩니다. 끝나면 `superloopy doctor`를 돌려 확인하세요.

그래도 플러그인이 예전 상태처럼 보이거나 degraded가 남으면, 갱신된 marketplace에서 repair reinstall을 한 번 실행하세요.

```
codex plugin add superloopy@beefiker
```

checkout에서 설치했다면 checkout을 갱신하고 installer를 다시 실행합니다.

```
git pull --ff-only
node src/cli.js install --json
superloopy doctor
```

checkout 설치는 `npx` 관리 대상이 아닙니다. `npx` self-update는 안정적인 설치 위치에 `superloopy-install.json` snapshot을 남기는 별도 installer가 생긴 뒤에만 켭니다.

## 트러블슈팅

플러그인 설치나 업데이트 명령이 실패하면 Codex CLI를 먼저 최신 버전으로 업데이트하세요. `codex plugin add`는 Codex CLI 0.131.0부터 사용할 수 있으므로, 구버전 Codex CLI에서는 현재 plugin marketplace 명령이나 hook 승인 흐름이 어려울 수 있습니다.

CLI를 업데이트한 뒤 Codex를 재시작하고 marketplace 설치 또는 업데이트 명령을 다시 실행하세요. Modified hooks가 보이면 승인한 다음 `superloopy doctor`로 확인하세요.

## 제거

Codex에서 설치된 플러그인을 제거합니다.

```
codex plugin remove superloopy@beefiker
```

marketplace source도 더 이상 필요 없다면 같이 제거합니다.

```
codex plugin marketplace remove beefiker
```

제거 뒤 Codex를 재시작하세요. 선택적 local bootstrap cleanup: plugin 제거는 Codex의 plugin config와 cache를 지우지만, `superloopy` wrapper와 개인 agents 사본은 남을 수 있습니다. agent 파일을 수정한 적이 있다면 지우기 전에 꼭 확인하세요.

```
rm -f ~/.local/bin/superloopy
rm -f ~/.codex/agents/franky.toml ~/.codex/agents/zoro.toml ~/.codex/agents/usopp.toml ~/.codex/agents/jinbe.toml ~/.codex/agents/robin.toml ~/.codex/agents/nami.toml
```

`CODEX_HOME`, `SUPERLOOPY_BIN_DIR`, `CODEX_LOCAL_BIN_DIR`로 설치 위치를 바꿨다면 그 경로를 정리하세요.

<sub>MIT 라이선스.</sub>
