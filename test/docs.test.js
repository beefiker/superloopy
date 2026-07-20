import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public docs describe hook proof-plan context and active evidence receipts", async () => {
  const readme = await readFile("README.md", "utf8");
  const skill = await readFile("skills/superloopy-loop/SKILL.md", "utf8");

  assert.match(skill, /next command, proof target, recorded evidence.*proof plan, capture template, and evidence template/s);
  assert.match(skill, /SUPERLOOPY_EVIDENCE: <path-under-active-evidence-root>/);
});

test("public docs describe guide, trace, report, and check evidence surfaces", async () => {
  const readme = await readFile("README.md", "utf8");
  const skill = await readFile("skills/superloopy-loop/SKILL.md", "utf8");
  const notes = await readFile("docs/superloopy-gate-notes.md", "utf8");
  const audit = await readFile("docs/superloopy-file-audit.md", "utf8");

  assert.match(skill, /manual evidence notes/i);
  assert.match(skill, /flow checklist/i);
  assert.match(notes, /Evidence trace:.*summary counts/is);
  assert.match(notes, /Flow checklist guide:/);
  assert.match(audit, /src\/trace\.js.*summary counts/is);
  assert.match(audit, /src\/report\.js.*Evidence Summary section/is);
});

test("gate notes document proportional owner-and-claim surface evidence", async () => {
  const notes = await readFile("docs/superloopy-gate-notes.md", "utf8");

  assert.match(notes, /scoped row.*exactly one concrete target and one affected owner/is);
  assert.match(notes, /target.*owner.*claims.*scopeReason.*all-or-nothing/is);
  assert.match(notes, /target.*object.*id.*platform.*environment/is);
  assert.match(notes, /id.*stable portable slug.*lowercase ASCII.*single hyphens/is);
  assert.match(notes, /aggregate tokens.*`all`.*`any`.*`every`.*`multi`.*`multiple`.*`cross`.*`universal`.*`supported`.*`targets`.*`devices`.*`platforms`.*`browsers`/is);
  assert.match(notes, /short ID.*`desktop`.*`mobile`.*`web`.*syntactically valid.*concrete `environment`/is);
  assert.match(notes, /platform.*one lowercase alphanumeric symbolic platform ID/is);
  assert.match(notes, /environment.*exact runtime.*device.*browser build.*host OS/is);
  assert.match(notes, /browser.*native.*hybrid.*renderer.*cli.*tui.*http.*data/is);
  assert.match(notes, /interaction.*visual.*accessibility.*target.*package-lifecycle.*renderer.*http.*data/is);
  assert.match(notes, /hybrid.*client.*shell.*bridge/is);
  assert.match(notes, /complete accepted artifact-kind vocabulary.*cli-transcript.*renderer-trace/is);
  assert.match(notes, /Scoped owner\/claim proof minimums/);
  assert.match(notes, /structured target description never substitutes for a `device-report`/i);
  assert.match(notes, /Within `surfaceEvidence`.*each scoped `target\.id` \+ `owner` pair.*only once.*different scoped pairs.*same resolved artifact path/is);
  assert.match(notes, /`adversarialCases`.*`contractCoverage`.*do not declare their own `target` or `owner`.*inherit the relevant surface slice/is);
  assert.match(notes, /same `contractRef`.*direct artifact-only coverage.*fail closed/is);
  assert.match(notes, /"artifactRefs".*"surfaceEvidence".*"target".*"id".*"platform".*"environment"/is);
  assert.match(notes, /all four.*target.*owner.*claims.*scopeReason.*absent.*unscoped/is);
  assert.match(notes, /Review exact normalized `browser` or `gui`.*image-only/is);
  assert.match(notes, /Matrix exact normalized `browser`.*`gui`.*`web`.*automation plus image/is);
  assert.match(notes, /Matrix exact normalized `native`.*`desktop`.*`tui`.*screenshot\/image, PTY, or app-automation/is);
  assert.match(notes, /legacy unscoped literal contracts retain their former meaning/is);
  assert.match(notes, /mechanical minimum.*truth of the declared scope/is);

  for (const kind of [
    "cli-transcript", "log", "failure-mode-test", "browser-automation", "screenshot", "image", "http-dump",
    "data-diff", "cli-replay", "pty-capture", "app-automation-transcript", "client-automation-transcript",
    "api-package-test-report", "accessibility-tree", "device-report", "package-lifecycle-report", "renderer-trace"
  ]) {
    assert.ok(notes.includes(`\`${kind}\``), `gate notes must list accepted artifact kind ${kind}`);
  }
});

test("frontend context references preserve authority and approval boundaries", async () => {
  const designIndex = await readFile("skills/superloopy-frontend/references/design/_INDEX.md", "utf8");
  const redesign = await readFile("skills/superloopy-frontend/references/redesign.md", "utf8");
  const systemMap = await readFile("skills/superloopy-frontend/references/system-map.md", "utf8");
  const fileAudit = await readFile("docs/superloopy-file-audit.md", "utf8");
  const golden = await readFile("docs/superloopy-loop-golden-set.md", "utf8");

  assert.match(designIndex, /scoped reference input.*never as automatic token authority/is);
  assert.match(designIndex, /current design source remains authoritative.*DESIGN\.md.*synchronized scoped mapping\/receipt/is);
  assert.match(redesign, /Information architecture stays by default/is);
  assert.match(redesign, /broken IA.*actually in scope.*explicitly approved/is);
  assert.match(systemMap, /implementation was requested.*execute the one verified package-manager command/is);
  assert.match(systemMap, /advice only.*present that one command without running it/is);
  assert.match(systemMap, /verify lockfile\/package resolution, imports\/build integration/is);
  for (const audit of [fileAudit, golden]) {
    assert.match(audit, /Qt Widgets.*Qt Quick.*mixed (?:Qt )?WebAssembly.*browser.*renderer/is);
    assert.match(audit, /information architecture stays by default.*explicitly approved|IA by default.*explicitly approved/is);
    assert.match(audit, /(?:implementation request.*one verified package-manager command|one verified package-manager command.*implementation request).*advice-only|advice only.*one verified package-manager command/is);
  }
});

test("public docs describe doctor checks", async () => {
  const readme = await readFile("README.md", "utf8");
  const audit = await readFile("docs/superloopy-file-audit.md", "utf8");
  const skill = await readFile("skills/superloopy-loop/SKILL.md", "utf8");
  const designAudit = await readFile("docs/superloopy-design-audit.md", "utf8");
  const modelPolicy = await readFile("docs/superloopy-model-policy.md", "utf8");

  assert.match(audit, /Superloopy-native boundary/i);
  assert.match(audit, /Compatibility boundary/i);
  assert.match(skill, /generic comparison scan/i);
  assert.match(skill, /design audit, generic comparison scan status/);
  assert.match(skill, /model policy/i);
  assert.match(designAudit, /## Design Decisions/);
  assert.match(designAudit, /## Compatibility Boundary/);
  assert.match(modelPolicy, /steering, not proof/i);
  assert.match(modelPolicy, /gpt-5\.4-mini/);
  assert.match(modelPolicy, /exact legacy.*without `--force`/is);
  assert.match(modelPolicy, /model_unverified/);
  assert.match(modelPolicy, /split-brain/i);
});

test("public docs describe real marketplace install and bootstrap", async () => {
  const readme = await readFile("README.md", "utf8");
  const skill = await readFile("skills/superloopy-loop/SKILL.md", "utf8");
  const notes = await readFile("docs/superloopy-gate-notes.md", "utf8");

  assert.match(readme, /codex plugin marketplace add https:\/\/github\.com\/beefiker\/superloopy/);
  assert.match(readme, /codex plugin add superloopy@beefiker/);
  assert.match(readme, /Codex CLI ≥ 0\.131\.0/);
  assert.match(readme, /## Why Superloopy\?/);
  assert.match(readme, /Evidence-first: every pass points at a real artifact/);
  assert.match(readme, /codex plugin marketplace upgrade beefiker/);
  assert.match(readme, /repair reinstall.*codex plugin add superloopy@beefiker/is);
  assert.match(readme, /hooks.*Modified/s);
  assert.match(readme, /SessionStart.*automatically reconciles.*wrapper.*agents.*routing/is);
  assert.doesNotMatch(readme, /following approved session.*Then run `superloopy doctor`/is);
  assert.doesNotMatch(readme, /Built on the Codex marketplace bootstrap shape/i);
  assert.doesNotMatch(readme, /Restart Codex twice/i);
  assert.match(readme, /Restart Codex after installing the plugin/);
  assert.match(readme, /approve them; the next approved session runs a `SessionStart` hook/);
  assert.match(readme, /SessionStart.*one-time bootstrap/s);
  assert.match(readme, /node src\/cli\.js install --json/);
  assert.match(readme, /git pull --ff-only/);
  assert.match(readme, /codex plugin remove superloopy@beefiker/);
  assert.match(readme, /codex plugin marketplace remove beefiker/);
  assert.match(readme, /## Troubleshooting/);
  assert.match(readme, /codex plugin add.*Codex CLI 0\.131\.0/is);
  assert.match(readme, /older builds can have trouble/);
  assert.match(readme, /optional local bootstrap cleanup/i);
  assert.doesNotMatch(readme, /\/Users\/bee|<repo-url>/);
  assert.match(skill, /first approved `SessionStart` hook/);
  assert.match(notes, /one-time SessionStart bootstrap/);
});

test("agent install guide gives host-specific marketplace flows", async () => {
  const readme = await readFile("README.md", "utf8");
  const install = await readFile("installation.md", "utf8");

  assert.match(readme, /install https:\/\/github\.com\/beefiker\/superloopy/);
  assert.match(readme, /\[installation\.md\]\(installation\.md\)/);
  assert.match(install, /install https:\/\/github\.com\/beefiker\/superloopy/);
  assert.match(install, /codex plugin marketplace add https:\/\/github\.com\/beefiker\/superloopy/);
  assert.match(install, /codex plugin add superloopy@beefiker/);
  assert.match(install, /\/plugin marketplace add beefiker\/superloopy/);
  assert.match(install, /\/plugin install superloopy@beefiker/);
  assert.match(install, /node "\$\{CLAUDE_PLUGIN_ROOT\}\/src\/cli\.js" doctor --json/);
  assert.match(install, /Do not add dependencies/);
  assert.match(install, /no (?:Superloopy )?migration command is required/i);
});

test("README locales are discoverable and do not point at removed PDF manuals", async () => {
  const locales = ["README.md", "README.ko.md", "README.zh-CN.md", "README.ja.md", "README.es.md"];
  const root = await readFile("README.md", "utf8");

  for (const file of locales) {
    const content = await readFile(file, "utf8");
    assert.match(content, /README\.ko\.md/);
    assert.match(content, /README\.zh-CN\.md/);
    assert.match(content, /README\.ja\.md/);
    assert.match(content, /README\.es\.md/);
    assert.match(content, /codex plugin marketplace add https:\/\/github\.com\/beefiker\/superloopy/);
    assert.match(content, /codex plugin add superloopy@beefiker/);
    assert.match(content, /0\.131\.0/);
    assert.match(content, /codex plugin marketplace upgrade beefiker/);
    assert.match(content, /codex plugin remove superloopy@beefiker/);
    assert.match(content, /superloopy doctor/);
    assert.doesNotMatch(content, /manual(?:-ko)?\.pdf/);
    assert.doesNotMatch(content, /loopy add a \/health endpoint that returns 200/);
  }

  assert.match(root, /English/);
  assert.match(root, /한국어/);
  assert.match(root, /中文\(简体\)/);
  assert.match(root, /日本語/);
  assert.match(root, /Español/);
  assert.match(root, /loopy add the payments module/);
  assert.match(await readFile("README.ko.md", "utf8"), /loopy 결제 모듈 적용해줘/);
  assert.match(await readFile("README.zh-CN.md", "utf8"), /loopy 添加支付模块/);
  assert.match(await readFile("README.ja.md", "utf8"), /loopy 決済モジュールを追加して/);
  assert.match(await readFile("README.es.md", "utf8"), /loopy agrega el módulo de pagos/);
});

test("README lists the packaged Superloopy skills and their jobs", async () => {
  const locales = ["README.md", "README.ko.md", "README.zh-CN.md", "README.ja.md", "README.es.md"];

  for (const file of locales) {
    const content = await readFile(file, "utf8");
    assert.match(content, /superloopy-loop/);
    assert.match(content, /superloopy-research/);
    assert.match(content, /superloopy-clone/);
    assert.match(content, /humanize-korean/);
    assert.match(content, /superloopy-doctor/);
    assert.match(content, /superloopy-slides/);
    assert.match(content, /transferloom-clone-reference\.png/);
    assert.match(content, /Transferloom\.com/);
    assert.match(content, /AI|Korean|한국어|한글|윤문/u);
    assert.match(content, /loopy research/);
    assert.match(content, /loopy clone/);
    assert.match(content, /loopywork/);
    assert.match(content, /\blpy\b/);
    assert.match(content, /\$lpy/);
    assert.match(content, /\.superloopy\/evidence/);
    assert.match(content, /\$superloopy:superloopy-frontend/);
    assert.match(content, /\/superloopy:superloopy-frontend/);
  }
  assert.match(await readFile("README.md", "utf8"), /Guidance aliases do not mutate state/);
  assert.match(await readFile("README.ko.md", "utf8"), /guidance alias는 상태를 바꾸지 않습니다/);
});

test("frontend discovery rows publish explicit screen-based scope and claim-shaped evidence", async () => {
  const locales = [
    {
      file: "README.md",
      invocation: "You explicitly invoke Codex `$superloopy:superloopy-frontend` or Claude Code `/superloopy:superloopy-frontend` for supported screen-based application UI across browser-hosted Web (public, authenticated, private/internal, installed PWA, or extension), interactive deployed content-led Web (campaign, publication, or landing experiences with a user journey), desktop, mobile/tablet, embedded/hybrid clients, custom-rendered UI, Qt, or mixed targets, or start that work with a leading `loopy`/`루피`. Plain UI, platform, or framework terms do not activate it; TV, wearable, XR, automotive, game UI, TUI, static media/document artifacts, and non-UI work stay excluded.",
      evidence: "One shared UX contract plus platform/composition routes. Evidence is proportional to changed claims and independently covers each browser, native target/shell, renderer, and mixed target. Standalone runs retain run-scoped receipts; active loops bind them to the goal and criterion."
    },
    {
      file: "README.ko.md",
      invocation: "지원되는 화면 기반 애플리케이션 UI(공개·인증·비공개/내부용·설치형 PWA/확장을 포함한 브라우저 호스팅 웹, 사용자 여정이 있는 인터랙티브 배포형 콘텐츠 중심 웹(캠페인·출판·랜딩 경험 등), 데스크톱, 모바일/태블릿, 임베디드/하이브리드 클라이언트, 커스텀 렌더링 UI, Qt, 혼합 타깃) 작업에 Codex의 `$superloopy:superloopy-frontend`나 Claude Code의 `/superloopy:superloopy-frontend`를 직접 호출하거나, 해당 작업을 선행 `loopy`/`루피`로 시작할 때만. 단순한 UI·플랫폼·프레임워크 용어로는 켜지지 않으며 TV·웨어러블·XR·자동차·게임 UI·TUI·정적 미디어/문서 결과물·비 UI 작업은 제외됩니다.",
      evidence: "하나의 공통 UX 계약에 플랫폼/컴포지션 경로를 더합니다. 근거는 변경한 주장에 비례하며 브라우저, 네이티브 타깃/셸, 렌더러, 혼합 타깃의 각 소유자를 독립적으로 검증합니다. 독립 실행에서는 실행별 영수증을 보존하고 활성 루프에서는 goal과 criterion에 연결합니다."
    },
    {
      file: "README.ja.md",
      invocation: "対応範囲の画面ベースのアプリ UI（公開・認証済み・非公開/社内向け・インストール型 PWA/拡張機能を含むブラウザーホスト Web、ユーザージャーニーを備えたインタラクティブなデプロイ済みコンテンツ主導 Web（キャンペーン、出版、ランディング体験など）、デスクトップ、モバイル/タブレット、組み込み/ハイブリッドクライアント、カスタムレンダリング UI、Qt、混在ターゲット）の作業で Codex の `$superloopy:superloopy-frontend` または Claude Code の `/superloopy:superloopy-frontend` を明示的に呼び出すか、その作業を先頭の `loopy`/`루피` で始める場合だけ。単なる UI・プラットフォーム・フレームワーク用語では起動せず、TV、ウェアラブル、XR、自動車、ゲーム UI、TUI、静的なメディア/文書成果物、非 UI 作業は除外します。",
      evidence: "1 つの共通 UX 契約にプラットフォーム/コンポジション経路を加えます。証拠は変更した主張に比例し、ブラウザー、ネイティブのターゲット/シェル、レンダラー、混在ターゲットの各所有者を独立して検証します。単独実行では実行単位の証跡を保持し、アクティブなループでは goal と criterion に関連付けます。"
    },
    {
      file: "README.zh-CN.md",
      invocation: "仅在处理受支持的基于屏幕的应用 UI（浏览器托管 Web，包括公开、需认证、私有/内部、已安装 PWA 或扩展；具有用户旅程的已部署交互式内容型 Web，例如营销活动、出版物或着陆页体验；以及桌面、移动设备/平板、嵌入式/混合客户端、自定义渲染 UI、Qt 或混合目标）时，在 Codex 中显式调用 `$superloopy:superloopy-frontend`，或在 Claude Code 中调用 `/superloopy:superloopy-frontend`，也可用开头的 `loopy`/`루피` 启动该工作。仅出现 UI、平台或框架词汇不会激活它；TV、可穿戴设备、XR、汽车、游戏 UI、TUI、静态媒体/文档产物和非 UI 工作仍被排除。",
      evidence: "采用一份共享 UX 契约，并叠加平台/界面构成路径。证据与变更声明成比例，并分别验证浏览器、原生目标/外壳、渲染器和每个混合目标。独立运行保留按次划分的证据；活动循环则把证据绑定到 goal 和 criterion。"
    },
    {
      file: "README.es.md",
      invocation: "Solo para interfaces de aplicaciones en pantalla dentro del alcance —Web alojada en navegador (pública, autenticada, privada/interna, PWA instalada o extensión), Web interactiva de contenido ya desplegada (campañas, publicaciones o experiencias de landing con un recorrido de usuario), escritorio, móvil/tableta, clientes embebidos/híbridos, UI con renderizado personalizado, Qt o destinos mixtos—, invocas explícitamente `$superloopy:superloopy-frontend` en Codex o `/superloopy:superloopy-frontend` en Claude Code, o inicias ese trabajo con `loopy`/`루피` al principio. La mera terminología de UI, plataforma o framework no la activa; se excluyen TV, wearables, XR, automoción, UI de juegos, TUI, artefactos estáticos de medios/documentos y trabajo que no sea de UI.",
      evidence: "Un contrato de UX compartido más rutas de plataforma/composición. La evidencia es proporcional a las afirmaciones modificadas y verifica por separado cada navegador, destino/shell nativo, renderizador y destino mixto. Las ejecuciones independientes conservan recibos por ejecución; los bucles activos los vinculan al goal y criterion."
    }
  ];

  for (const { file, invocation, evidence } of locales) {
    const content = await readFile(file, "utf8");
    const row = content.split("\n").find((line) => line.startsWith("| `superloopy-frontend` |"));
    assert.ok(row, `${file} is missing the superloopy-frontend row`);
    const cells = row.split("|").map((cell) => cell.trim());
    assert.equal(cells[2], invocation, `${file} must preserve its complete localized invocation cell`);
    assert.equal(cells[3], evidence, `${file} must preserve its complete localized evidence cell`);
    assert.match(row, /\$superloopy:superloopy-frontend/);
    assert.match(row, /\/superloopy:superloopy-frontend/);
    assert.match(row, /loopy.*루피/u);
    assert.equal(row.match(/\$superloopy:superloopy-frontend/g)?.length, 1, `${file} must preserve the Codex invocation once`);
    assert.equal(row.match(/\/superloopy:superloopy-frontend/g)?.length, 1, `${file} must preserve the Claude invocation once`);
  }
});

test("English and Korean READMEs publish the runnable Qt Kanban demo", async () => {
  const readmes = [
    await readFile("README.md", "utf8"),
    await readFile("README.ko.md", "utf8")
  ];
  const commands = [
    "qt-cmake -S examples/qt-kanban -B build/qt-kanban -G Ninja -DCMAKE_BUILD_TYPE=Release",
    "cmake --build build/qt-kanban --parallel",
    "build/qt-kanban/src/app/qtkanban --window-size 1600x1000"
  ];

  for (const readme of readmes) {
    assert.match(readme, /\]\(examples\/qt-kanban\/?\)/);
    for (const command of commands) {
      assert.ok(readme.includes(command), `README must publish: ${command}`);
    }
  }
});

test("Qt Kanban docs publish the prototype acceptance boundary", async () => {
  const design = await readFile("examples/qt-kanban/DESIGN.md", "utf8");
  const english = await readFile("README.md", "utf8");
  const korean = await readFile("README.ko.md", "utf8");
  const audit = await readFile("docs/superloopy-file-audit.md", "utf8");
  const golden = await readFile("docs/superloopy-loop-golden-set.md", "utf8");

  assert.match(design, /prototype acceptance fixture.*not production-editor proof/is);
  assert.match(design, /Timeline.*Inbox.*passive.*demo-only/is);
  assert.match(design, /Settings.*Help.*absent/is);
  assert.match(design, /persistence.*Undo.*out of scope/is);
  assert.match(
    design,
    /Board.*return to Board overview.*clear.*selected task.*detail.*close.*overlay.*Board.*focus/is,
  );
  assert.match(english, /prototype acceptance fixture.*not production-editor proof/is);
  assert.match(english, /persistence.*Undo.*out of scope/is);
  assert.match(korean, /프로토타입 인수 검증 픽스처.*프로덕션 편집기.*증명하지/is);
  assert.match(korean, /영속성.*Undo.*범위 밖/is);
  assert.match(audit, /Sidebar\.qml.*passive demo-only Timeline\/Inbox/is);
  assert.match(golden, /Sidebar\.qml.*passive demo-only Timeline\/Inbox/is);
  assert.match(
    golden,
    /KanbanView\.qml.*Board.*clear.*selection.*close.*overlay.*focus/is,
  );
  for (const icon of ["inbox", "timeline"]) {
    const row = audit.split("\n").find((line) =>
      line.startsWith(`| \`examples/qt-kanban/src/Northstar/Kanban/assets/icons/${icon}.svg\` |`));
    assert.ok(row, `missing ${icon} icon audit row`);
    assert.match(row, /passive demo-context asset/i);
    assert.doesNotMatch(row, /navigation asset/i);
  }
  assert.doesNotMatch(audit, /assets\/icons\/(?:help|settings)\.svg/u);
  assert.doesNotMatch(golden, /assets\/icons\/(?:help|settings)\.svg/u);
});

test("frontend agent metadata keeps explicit screen-based routing and claim-shaped evidence", async () => {
  const agent = await readFile("skills/superloopy-frontend/agents/openai.yaml", "utf8");

  assert.match(agent, /short_description: "Explicit cross-platform application UI workflow"/u);
  assert.match(agent, /Use `\$superloopy:superloopy-frontend` only after explicit invocation/iu);
  assert.match(agent, /browser-hosted or interactive content-led Web, desktop, mobile\/tablet, embedded\/hybrid, Qt, custom-rendered, or mixed application UI/iu);
  assert.match(agent, /exclude TV, wearable, XR, automotive, game UI, TUI, static media\/document artifacts, and non-UI work/iu);
  assert.match(agent, /proportional evidence per owner and target/iu);
  assert.match(agent, /allow_implicit_invocation: false/u);
  assert.equal(agent.match(/\$superloopy:superloopy-frontend/g)?.length, 1);
  assert.equal(agent.match(/\/superloopy:superloopy-frontend/g)?.length ?? 0, 0);
  assert.doesNotMatch(agent, /auto-activat|when in doubt|plain UI mention|frontend vocabulary/i);
});

test("frontend audit inventories cover each routed reference and contract test once", async () => {
  const designAudit = await readFile("docs/superloopy-design-audit.md", "utf8");
  const fileAudit = await readFile("docs/superloopy-file-audit.md", "utf8");
  const golden = await readFile("docs/superloopy-loop-golden-set.md", "utf8");
  const routedFiles = [
    {
      path: "skills/superloopy-frontend/references/web.md",
      fileProvenance: /original prose/iu,
      goldenProvenance: /Original-prose contract/u
    },
    {
      path: "skills/superloopy-frontend/references/qt.md",
      fileProvenance: /original prose/iu,
      goldenProvenance: /Original-prose contract/u,
      officialSource: "https://doc.qt.io/qt-6/qguiapplication.html"
    },
    {
      path: "skills/superloopy-frontend/references/qt-widgets.md",
      fileProvenance: /original prose/iu,
      goldenProvenance: /Original-prose contract/u,
      officialSource: "https://doc.qt.io/qt-6/qstyle.html"
    },
    {
      path: "skills/superloopy-frontend/references/qt-quick.md",
      fileProvenance: /original prose/iu,
      goldenProvenance: /Original-prose contract/u,
      officialSource: "https://doc.qt.io/qt-6/qtquickcontrols-styles.html"
    },
    {
      path: "skills/superloopy-frontend/references/qt-qa.md",
      fileProvenance: /original prose/iu,
      goldenProvenance: /Original-prose contract/u,
      officialSource: "https://doc.qt.io/qt-6/qttest-best-practices.html"
    },
    {
      path: "test/frontend-qt-contract.test.js",
      fileProvenance: /Superloopy-native test/u,
      goldenProvenance: /node --test test\/frontend-qt-contract\.test\.js/u
    },
    {
      path: "test/frontend-routing-scenarios.test.js",
      fileProvenance: /Superloopy-native regression test/u,
      goldenProvenance: /node --test test\/frontend-routing-scenarios\.test\.js/u
    },
    {
      path: "skills/superloopy-frontend/scripts/evidence-root.mjs",
      fileProvenance: /Superloopy-native Node-built-in helper/u,
      goldenProvenance: /test\/frontend-routing-scenarios\.test\.js/u
    }
  ];

  const designRows = designAudit.split("\n").filter((line) => line.startsWith("| `frontend-quality-skill` |"));
  assert.equal(designRows.length, 1, "frontend-quality-skill must have one exact design-audit row");
  const designRow = designRows[0];

  for (const { path, fileProvenance, goldenProvenance, officialSource } of routedFiles) {
    assert.ok(designRow.includes(`\`${path}\``), `${path} must occur in the frontend-quality-skill decision row`);

    const fileRows = fileAudit.split("\n").filter((line) => line.startsWith(`| \`${path}\` |`));
    const goldenRows = golden.split("\n").filter((line) => line.startsWith(`| \`${path}\` |`));
    assert.equal(fileRows.length, 1, `${path} must have one exact file-audit row`);
    assert.equal(goldenRows.length, 1, `${path} must have one exact golden-set row`);
    assert.match(fileRows[0], fileProvenance, `${path} file-audit row must state its provenance`);
    assert.match(goldenRows[0], goldenProvenance, `${path} golden-set row must state its provenance`);

    if (officialSource) {
      assert.ok(fileRows[0].includes(officialSource), `${path} file-audit row must link its official Qt source`);
      assert.ok(goldenRows[0].includes(officialSource), `${path} golden-set row must link its official Qt source`);
    }
  }

  assert.match(designRow, /one shared UX contract.*exact platform and composition routes/iu);
  assert.match(designRow, /browser-hosted public\/authenticated\/private Web.*interactive deployed content-led Web.*PWA\/extensions.*desktop.*mobile\/tablet.*embedded\/hybrid.*custom-rendered.*Qt.*mixed surfaces/iu);
  assert.match(designRow, /current-state and affected-user evidence.*capability availability.*enabled\/visible\/invocable\/feedback state.*async\/auth\/offline\/conflict.*recovery paths/iu);
  assert.match(designRow, /scales design, visual, accessibility, package, and real-target artifacts.*changed claims/iu);
  assert.match(designRow, /mixed targets.*independent.*renderer.*shell.*package.*target evidence/iu);
  assert.match(designRow, /standalone runs.*run-scoped receipts.*active loops.*goal and criterion/iu);
  assert.match(designRow, /Native, hybrid, and custom-rendered claims cannot pass on screenshots alone/iu);
  assert.match(designRow, /SEO applies when the current Web target is crawlable and public.*native or embedded.*distinct public Web deployment/iu);
  assert.match(designRow, /Qt specialization.*desktop and mobile\/tablet.*official Qt documentation/iu);
  assert.match(designRow, /dependency-free helper.*portable run roots.*path escape.*symlink.*duplicate-root.*empty-artifact evidence/iu);
  assert.match(designRow, /shared UX and platform\/composition contracts.*original prose.*Superloopy/iu);
  assert.match(designRow, /no external runtime dependencies.*vendored/iu);

  const skillGoldenRows = golden.split("\n").filter((line) => line.startsWith("| `skills/superloopy-frontend/SKILL.md` |"));
  const agentGoldenRows = golden.split("\n").filter((line) => line.startsWith("| `skills/superloopy-frontend/agents/openai.yaml` |"));
  assert.equal(skillGoldenRows.length, 1, "frontend SKILL.md must have one exact golden-set row");
  assert.equal(agentGoldenRows.length, 1, "frontend agent metadata must have one exact golden-set row");
  assert.match(skillGoldenRows[0], /shared UX.*target-specific platform\/composition routes.*Qt specialization.*desktop and mobile\/tablet.*independent proportional evidence/iu);
  assert.match(skillGoldenRows[0], /standalone receipts.*without invented loop state/iu);
  assert.match(skillGoldenRows[0], /original Superloopy prose/iu);
  assert.match(skillGoldenRows[0], /no vendored runtime dependenc(?:y|ies)/iu);
  assert.match(agentGoldenRows[0], /explicit-only discovery metadata.*cross-platform application-UI workflow.*unsupported specialized surfaces.*proportional owner\/target evidence/iu);
});

test("public docs describe loose prompt triggers as guidance-only", async () => {
  const readme = await readFile("README.md", "utf8");
  const skill = await readFile("skills/superloopy-loop/SKILL.md", "utf8");
  const agent = await readFile("skills/superloopy-loop/agents/openai.yaml", "utf8");

  assert.match(skill, /loopywork/);
  assert.match(skill, /never mutate/i);
  assert.match(agent, /loopywork/);
  assert.match(agent, /lpy/);
});

test("project custom agents define Superloopy subagent workflow", async () => {
  const readme = await readFile("README.md", "utf8");
  const skill = await readFile("skills/superloopy-loop/SKILL.md", "utf8");
  const agents = ["franky", "zoro", "usopp", "jinbe", "robin", "nami"];

  assert.match(readme, /\.codex\/agents/);
  assert.match(readme, /superloopy agents install/);
  assert.match(skill, /## Optional Subagent-Driven Mode/);
  assert.match(skill, /superloopy agents install/);
  assert.match(skill, /allowed files, active evidence root, report artifact target/i);

  for (const agent of agents) {
    const content = await readFile(`.codex/agents/${agent}.toml`, "utf8");
    assert.match(content, new RegExp(`name = "${agent}"`));
    assert.match(content, /model = "gpt-5/);
    assert.match(content, /model_reasoning_effort = "(low|high|xhigh)"/);
    assert.match(content, /service_tier = "(priority|fast)"/);
    assert.match(content, /developer_instructions = """/);
    if (agent !== "nami") assert.match(content, /active evidence root/);
  }
});

test("public docs encode crew retrospective guardrails", async () => {
  const skill = await readFile("skills/superloopy-loop/SKILL.md", "utf8");
  const hostContract = await readFile("docs/superloopy-host-contract.md", "utf8");

  assert.match(skill, /jinbe-final-gate-report\.md/);
  assert.match(skill, /\.superloopy\/evidence\/gate\.json/);
  assert.match(skill, /quality gate artifact.*JSON/s);
  assert.match(skill, /For full crew, record each dispatch with `superloopy loop handoff/s);
  assert.match(skill, /run `superloopy loop fleet --json` before the final gate/);
  assert.match(skill, /must own a real bounded implementation slice before the parent edits or completes that slice/);
  assert.match(skill, /If the requested repository path differs from `cwd`/);
  assert.match(skill, /git status --short --untracked-files=all/);
  assert.match(skill, /git ls-files --others --exclude-standard/);
  assert.match(hostContract, /full-crew handoffs are mandatory bookkeeping/);
});

test("public docs describe crew lines as presentation-only status", async () => {
  const readme = await readFile("README.md", "utf8");
  const skill = await readFile("skills/superloopy-loop/SKILL.md", "utf8");
  const crewLines = await readFile("docs/superloopy-crew-lines.md", "utf8");
  const designAudit = await readFile("docs/superloopy-design-audit.md", "utf8");

  assert.match(readme, /one original crew line/);
  assert.match(readme, /supported catalog/);
  assert.match(skill, /presentation only/);
  assert.match(skill, /SUPERLOOPY_CREW_LANGUAGE/);
  assert.match(crewLines, /Do not copy source-character quotes/);
  assert.match(crewLines, /`en`, `ko`, `ja`, `zh`, `es`, `fr`, `de`, `it`, `pt`, `id`, `hi`, `tr`, `vi`, `ru`, `ar`, and `th`/);
  assert.match(crewLines, /fall back to English/);
  assert.match(crewLines, /Evidence artifacts.*remain the authority/s);
  assert.match(designAudit, /`crew-lines`/);
});

test("loop golden set lists every Git-visible file with strict evidence", async () => {
  const golden = await readFile("docs/superloopy-loop-golden-set.md", "utf8");
  const missing = listRepoFiles().filter((file) => !golden.includes(`\`${file}\``));

  assert.deepEqual(missing, []);
  assert.match(golden, /## File Evidence Inventory/);
  assert.match(golden, /Strict pass rule/);
  assert.match(golden, /Each new score must be greater than the previous score/);
  assert.doesNotMatch(golden, /\bTBD\b|\bTODO\b|pending validation/i);
});

test("loop golden set records threshold history for this turn", async () => {
  const golden = await readFile("docs/superloopy-loop-golden-set.md", "utf8");

  assert.match(golden, /## Threshold Model/);
  assert.match(golden, /20/);
  assert.match(golden, /100/);
  assert.match(golden, /Turn 2\s*\|\s*96/);
  assert.match(golden, /Turn 3\s*\|\s*100/);
  assert.match(golden, /Recorded judgment trail/);
  assert.match(golden, /npm test/);
  assert.match(golden, /node src\/cli\.js doctor --json/);
});

test("clone skill blocks approximating JS-driven hero and animation sections", async () => {
  const skill = await readFile("skills/superloopy-clone/SKILL.md", "utf8");

  assert.match(skill, /verbatim port/i);
  assert.match(skill, /dependency graph/i);
  assert.match(skill, /DOM subtree.*CSS class block.*JS driver/is);
  assert.match(skill, /approximation.*blocker/is);
  assert.match(skill, /section crop/i);
  assert.match(skill, /Transferloom\.com is a reference result/);
  assert.match(skill, /desktop\/mobile browser validation/);
});

function listRepoFiles() {
  const result = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => existsSync(file))
    .sort();
}
