<div align="center">

# 🌀 Superloopy

**Codex와 Claude Code를 위한 루프 엔지니어링.** `loopy <task>`로 시작하면 에이전트가 일을 맡습니다. 근거를 남기지 못한 작업은 완료로 치지 않습니다.

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

설치 후 Codex 또는 Claude Code에서 작업 앞에 `loopy`만 붙이세요.

```
loopy 결제 모듈 적용해줘
```

Superloopy가 계획을 세우고, 실행하고, 실제 파일로 각 조각을 검증한 뒤 결과를 보고합니다. 사용자가 중간에 명령을 직접 칠 필요는 없습니다. 패키징된 Stop hook은 기본으로 조용하고, `SUPERLOOPY_STOP_HOOK=on`일 때만 막아섭니다.

## 왜 Superloopy?

Superloopy는 "완료"가 자신 있는 상태 문장 이상을 뜻해야 하는 Codex·Claude Code 작업을 위한 것입니다.

- 근거 우선: 모든 pass가 `.superloopy/evidence/` 아래의 실제 artifact를 가리킵니다.
- 기본이 가벼움: 작은 CLI 하나, repo 로컬 상태, 런타임 의존성 0.
- 에이전트 친화적: 스킬, hook, 선택적 크루 레인이 최종 게이트를 숨기지 않으면서 에이전트를 안내합니다.

**보증 범위.** 명령 기반(command-backed) 기준이 강한 보증입니다. 완료 시점에 Superloopy가 각 명령을 프로세스 내에서 다시 실행해 재현을 요구하므로, 오래되었거나 위조된 pass는 "완료"에 도달할 수 없습니다. 수동(명령 없는) 기준은 비어있지 않은 증거 artifact 존재 + 감사자·사람 판단으로 검증됩니다 — 정확성은 결정론적 재실행이 아니라 검토에 의존합니다.

## 스킬

Superloopy는 명령을 작게 둡니다. 대신 스킬이 작업 방식을 잡습니다. 언제 켜져야 하는지, 무엇을 확인해야 하는지, 어떤 근거를 `.superloopy/evidence/` 아래에 남겨야 하는지가 스킬에 들어 있습니다.

| 스킬 | 언제 쓰나 | 남기는 것 |
| --- | --- | --- |
| `superloopy-loop` | full loop는 `loopy <task>` 또는 `loopy team <task>`로 시작합니다. `loopywork`, `lpy`, `$lpy`는 가벼운 guidance만 넣을 때 씁니다. | full loop는 가벼운 계획, 다음 행동, 명령으로 검증한 근거, 품질 게이트, 최종 evidence report를 남깁니다. guidance alias는 상태를 바꾸지 않습니다. |
| `superloopy-doctor` | install, wrapper, plugin cache, hook/bootstrap, agent, Codex/Claude Code host wiring, stale version 문제를 진단할 때. | 읽기 전용 health report: wrapper/cache/version 근거, 실패한 체크, 승인 후 실행할 정확한 복구 명령. |
| `superloopy-research` | `loopy research`, deep research, exhaustive investigation, 출처 있는 리서치 보고서를 요청할 때. | 리서치 축, 확장 wave, claim ledger, 검증 메모, 출처가 붙은 synthesis artifact. |
| `superloopy-clone` | `loopy clone`, 허가된 웹사이트 클론, 리빌드, 마이그레이션, 픽셀 기준 복구를 요청할 때. | 브라우저 캡처, 페이지 구조, 디자인 토큰, asset 목록, 구현 메모, build 출력, visual QA 근거. |
| `superloopy-frontend` | Codex에서 `$superloopy:superloopy-frontend`, Claude Code에서 `/superloopy:superloopy-frontend`를 직접 호출하거나, 선행 `loopy`/`루피`로 시각 작업을 시작할 때. UI를 언급하기만 해서는 켜지지 않습니다. | DESIGN.md 토큰 계약을 남기고, 웹은 anti-slop pre-flight와 브라우저 근거로, Qt는 Qt pre-flight와 네이티브 애플리케이션 렌더링 근거로 검증합니다. |
| `humanize-korean` | 한국어 글의 AI 티를 줄이거나 번역투를 고치고, 사실은 바꾸지 않은 채 사람이 쓴 것처럼 다듬어야 할 때. | `final.md`, `summary.md`, `audit.json`을 쓰고, Superloopy loop 안에서는 `.superloopy/evidence/humanize-korean/` 아래에 근거를 남깁니다. |
| `superloopy-slides` | 슬라이드·프레젠테이션·덱을 요청하거나 PPT/PPTX를 웹으로 변환할 때. | 고정 16:9 스테이지의 의존성 없는 단일 HTML 덱, 직접 고르는 스타일 미리보기 3종, `.superloopy/evidence/slides/` 아래 렌더링 스크린샷 visual-QA artifact. |

기본 안전장치는 loop 스킬입니다. 문장 맨 앞의 완전한 `loopy` 토큰은 evidence loop를 시작하거나 이어가고, `loopy team`은 크루 모드로 올립니다. 선행 `loopywork`, `lpy`, `$lpy`는 시작 안내만 넣고, 구조화된 `SUPERLOOPY_STEER`는 진행 중인 loop를 조정합니다. prompt hook은 일반 문장에서 frontend나 한국어 글쓰기 모드를 추측하지 않습니다. 전문 스킬은 직접 호출하거나, 이미 시작된 loop가 실제 전문 작업을 명시적으로 배정할 때만 사용합니다.

## 클론 데모

[![Transferloom.com 클론 레퍼런스](.github/assets/transferloom-clone-reference.png)](https://transferloom.com/)

`superloopy-clone`은 Transferloom.com을 로컬에서 재현했고 desktop/mobile 브라우저 검증을 통과했습니다. 이 레퍼런스 실행은 sticky nav, animated hero, app preview 섹션, comparison table, security panel, sister app banner, footer, local assets, Superloopy evidence trail을 보존했습니다.

## 슬라이드 데모

[![superloopy-slides로 만든 Fileloom 소개 덱](.github/assets/slides-demo-reference.png)](https://fileloom-slides.pages.dev)

`superloopy-slides`가 만든 **[라이브 다국어 덱 →](https://fileloom-slides.pages.dev)** — 고정 16:9 스테이지의 무설치 단일 HTML 프레젠테이션으로 English · 한국어 · 中文 · 日本語 · Español를 지원합니다. 실제 브라우저 비주얼 QA(단독·폰 레터박스·iframe 임베드)를 통과해 `.superloopy/evidence/slides/`에 증거를 남겼습니다.

## Qt 칸반 데모

[Northstar Qt 칸반 데모](examples/qt-kanban/)는 `superloopy-frontend` Qt 경로로 만든 실행 가능한 Qt Quick 검증 예제입니다. Qt 6.11.1, CMake, Ninja가 준비된 상태에서 저장소 루트에서 설정, 빌드, 실행하세요.

```bash
qt-cmake -S examples/qt-kanban -B build/qt-kanban -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/qt-kanban --parallel
build/qt-kanban/src/app/qtkanban --window-size 1600x1000
```

## 크루

큰 작업이라면 Superloopy가 제공하는 선택적 서브에이전트 여섯을 쓸 수 있습니다. 각자 하나의 레인을 맡습니다. Claude Code는 플러그인에 번들된 `agents/*.md`를 사용합니다. Codex에서는 bootstrap, `superloopy install`, `superloopy agents install`이 개인용 agent TOML을 `$CODEX_HOME/agents`에 만들면서 모델 라우팅도 확정합니다.

Codex는 유효한 모델 선택 기록이 없을 때, 정책 버전이나 설치 대상이 바뀌었을 때, 캐시가 24시간 이상 지났을 때, 또는 `--refresh-models`를 지정했을 때만 `model/list`를 조회합니다. 유효 기간 안의 기록과 managed agent 파일이 서로 맞으면 같은 manifest를 그대로 씁니다. 조회나 상태 기록은 반복하지 않습니다. 각 profile은 model/effort/tier를 한 묶음으로 보고 세 값이 모두 지원되는 첫 tuple을 고릅니다. `standard`는 `gpt-5.6-terra` / `high` / `priority`, `deep`은 `gpt-5.6-sol` / `xhigh` / `priority`, `fast`는 `gpt-5.6-luna` / `low` / `fast`가 우선입니다. 선호 모델을 쓸 수 없으면 해당 profile의 `gpt-5.5` compatibility tuple을 명시적으로 선택합니다. 첫 조회에서 지원 여부를 확인하지 못하면 policy compatibility를 보수적으로 선택합니다. 기존 기록을 갱신하는 조회가 실패하면 유효한 선택을 그대로 유지합니다. `--compat`을 쓰면 조회 없이 정해진 compatibility tuple을 선택합니다.

agent 정의가 실제로 바뀐 경우에만 Codex를 재시작해야 합니다. 유효 기간 안의 manifest와 파일이 그대로라면 재시작할 필요가 없습니다. 모델 선택은 launch 전에 끝납니다. launch 후 다시 시도하거나 모델을 바꾸지 않습니다. `superloopy doctor --refresh-models`는 모델 선택 기록과 agent 파일을 바꾸지 않는 읽기 전용 비교입니다. 자세한 정책은 `docs/superloopy-model-policy.md`(Codex)와 `docs/superloopy-model-policy-claude.md`(Claude Code)에 있습니다.

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

**크루를 부를 때**는 `loopy team <task>`를 씁니다. `loopy crew`, 한 단어 형태인 `loopycrew`, `ultrawork <task>`도 같은 흐름입니다. Superloopy는 일을 레인별로 병렬로 펼치지만, 각 조각을 근거로 증명한 뒤에야 끝난 것으로 봅니다. 그냥 `loopy <task>`로 시작하면 솔로로 진행하고, 조각이 확실히 독립적일 때만 나눕니다.

full 크루 실행에서는 부모 에이전트가 각 레인을 `superloopy loop handoff`로 기록하고 `superloopy loop fleet --json`으로 확인하며, 사람이 읽는 최종 게이트 보고서와 기계가 읽는 게이트 JSON을 섞지 않습니다. 게이트 보고서는 Markdown 근거일 수 있지만, `superloopy loop finish --artifact`는 `.json` 품질 게이트 출력용입니다.

추적 중인 크루 handoff가 끝나면 Superloopy가 일반 `handoff` 또는 `fleet` 상태 앞에 원본 크루 라인을 한 줄 붙일 수 있습니다. 지원 카탈로그에 맞으면 할당문이나 스코프 brief의 언어를 따르고, 아니면 안전하게 영어로 돌아갑니다. 이 문장은 분위기용일 뿐이고, 판정·근거 artifact·outstanding 목록·attention 목록이 실제 기준입니다.

## Superpowers와 함께 쓰기

Superloopy는 [Superpowers](https://github.com/obra/superpowers) 플러그인과 잘 맞습니다. 한 작업의 서로 다른 반쪽을 맡기 때문에 둘 중 하나를 고를 필요가 없습니다.

- Superpowers는 루프의 앞단을 담당합니다: 브레인스토밍, 계획, 그리고 TDD·코드리뷰 방법론.
- Superloopy는 마무리를 담당합니다: 완료 시점에 다시 실행되는 command 기반 기준. 그래서 "완료"가 말이 아니라 증거로 남습니다.

Superpowers가 설치돼 있으면(Codex든 Claude Code든) Superloopy가 이를 감지해서 자기 안내를 거기에 맞춰 조정합니다. 설계·계획·TDD는 Superpowers에 맡기고, 자신은 바깥쪽 증거 게이트로 남습니다. 감지는 best-effort이고 안내에만 영향을 줄 뿐 게이트를 약하게 만들지 않습니다. 끄려면 `SUPERLOOPY_SUPERPOWERS=off`, 강제로 켜려면 `on`으로 두고, `superloopy doctor`로 무엇을 찾았는지 확인할 수 있습니다. 자세한 내용은 [docs/superloopy-interop-superpowers.md](docs/superloopy-interop-superpowers.md)에 있습니다.

### Q&A

- **둘 다 설치해야 하나요?** 아니요. Superloopy는 단독으로도 동작합니다. Superpowers가 함께 있으면 겹치지 않고 서로 손발을 맞춥니다.
- **각자 어느 단계를 맡나요?** Superpowers가 브레인스토밍·계획·구현을 맡고, Superloopy가 마지막 증명을 맡습니다. 한 작업에는 운전자 하나만 두세요. 같은 슬라이스에 `loopy team`과 Superpowers 서브에이전트 흐름을 동시에 돌리지 마세요.
- **완료 판단은 누가 하나요?** Superloopy입니다. 마지막에 실제 command를 다시 실행해서 가짜 통과를 막습니다.
- **Superpowers 설치는 어떻게 감지하나요?** Codex와 Claude Code의 플러그인 폴더를 살펴봅니다. `SUPERLOOPY_SUPERPOWERS=on|off`로 언제든 바꿀 수 있습니다.

## 설치

Superloopy는 하나의 repo에서 **Codex**와 **Claude Code** 양쪽에 설치됩니다. 코어(loop 상태, evidence 게이트, doctor)는 호스트에 독립적이고, 각 호스트는 얇은 플러그인 manifest, hook 배선, agent 포맷을 따로 받습니다.

### Codex

Node.js 20 이상과 `codex plugin add`를 지원하는 Codex CLI 0.131.0 이상이 필요합니다. Superloopy는 의존성이 없습니다. 런타임 의존성 0, Node만 있으면 됩니다.

```
codex plugin marketplace add https://github.com/beefiker/superloopy
codex plugin add superloopy@beefiker
```

플러그인을 설치한 뒤 Codex를 재시작하세요. Codex가 hooks 검토를 요청하면 승인하세요. 승인된 다음 세션에서 `SessionStart` hook이 bootstrap을 한 번 실행합니다. 이때 `superloopy` 명령과 agents가 설치됩니다. `superloopy`를 찾지 못하면 설치 경로가 `PATH`에 없는 겁니다. bootstrap 출력에 추가할 줄이 나옵니다. 마지막으로 `superloopy doctor`를 돌려 확인하세요.

checkout에서 설치한다면 `node src/cli.js install --json`을 실행하세요.

### Claude Code

Node.js 20 이상이 필요합니다. 같은 repo에서:

```
/plugin marketplace add beefiker/superloopy
/plugin install superloopy@beefiker
```

플러그인을 다시 로드하거나 Claude Code를 재시작하고, 요청이 뜨면 hooks를 승인하세요. Claude Code에서는 스킬, 서브에이전트(`agents/*.md`), hooks(`hooks/hooks.json`)가 모두 **플러그인에 번들**되어 있습니다. `~/.codex` 설치 단계도 없고 `superloopy` wrapper도 없습니다. hooks는 `${CLAUDE_PLUGIN_ROOT}`를 통해 CLI를 직접 호출하며, `SessionStart`는 아무 일도 하지 않는 깨끗한 no-op입니다(bootstrap할 것이 없습니다). 로컬 개발에서는 `claude --plugin-dir <checkout>`로 Claude Code를 checkout에 연결하세요. 확인은 `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json`으로 합니다. Claude용 서브에이전트의 권고 모델 기본값은 `docs/superloopy-model-policy-claude.md`에 정리되어 있습니다.

## 업데이트

### Codex

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

### Claude Code

marketplace를 갱신하고, 새 버전을 받도록 다시 설치한 뒤 리로드하세요. 재시작은 필요 없습니다.

```
/plugin marketplace update beefiker
/plugin install superloopy@beefiker
/reload-plugins
```

별도의 `/plugin update` 명령은 없습니다. 갱신된 marketplace에서 다시 설치하면 새 버전이 잡히고, `/reload-plugins`가 현재 세션에 적용합니다(Claude Code 재시작이 필요 없고, hooks도 다시 승인할 필요가 없습니다). 확인은 `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json`으로 합니다. `--plugin-dir`로 checkout을 로드했다면 `git pull --ff-only` 후 `/reload-plugins`만 하면 됩니다.

## 트러블슈팅

플러그인 설치나 업데이트 명령이 실패하면 Codex CLI를 먼저 최신 버전으로 업데이트하세요. `codex plugin add`는 Codex CLI 0.131.0부터 사용할 수 있으므로, 구버전 Codex CLI에서는 현재 plugin marketplace 명령이나 hook 승인 흐름이 어려울 수 있습니다.

CLI를 업데이트한 뒤 Codex를 재시작하고 marketplace 설치 또는 업데이트 명령을 다시 실행하세요. Modified hooks가 보이면 승인한 다음 `superloopy doctor`로 확인하세요.

Claude Code에서는 `/plugin` 명령이 실패하거나 플러그인이 예전 상태처럼 보이면 `/reload-plugins`를 실행하거나(또는 Claude Code를 재시작하고) `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json`으로 확인하세요.

## 제거

### Codex

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

### Claude Code

```
/plugin uninstall superloopy@beefiker
/plugin marketplace remove beefiker
```

그런 다음 `/reload-plugins`를 실행하세요. 그 외에 정리할 것은 없습니다. Claude Code 설치는 완전히 플러그인에 번들되어 있습니다(`superloopy` wrapper도 없고 `~/.codex`에 쓰는 것도 없습니다). 마지막으로 남은 스코프에서 marketplace를 제거하면 플러그인도 함께 제거됩니다.

<sub>MIT 라이선스.</sub>
