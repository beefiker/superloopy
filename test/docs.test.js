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
      invocation: "You explicitly invoke Codex `$superloopy:superloopy-frontend` or Claude Code `/superloopy:superloopy-frontend` for supported screen-based application UI across public Web, desktop, mobile/tablet, embedded/hybrid clients, custom-rendered UI, Qt, or mixed targets, or start that work with a leading `loopy`/`루피`. Plain UI, platform, or framework terms do not activate it, and specialized surfaces outside that scope stay excluded.",
      evidence: "One shared UX contract plus platform/composition routes; proof follows the claim: public-browser, native target/shell, and renderer evidence stay distinct, while mixed targets require independent evidence per target."
    },
    {
      file: "README.ko.md",
      invocation: "지원되는 화면 기반 애플리케이션 UI(공개 웹, 데스크톱, 모바일/태블릿, 임베디드/하이브리드 클라이언트, 커스텀 렌더링 UI, Qt, 혼합 타깃) 작업에 Codex의 `$superloopy:superloopy-frontend`나 Claude Code의 `/superloopy:superloopy-frontend`를 직접 호출하거나, 해당 작업을 선행 `loopy`/`루피`로 시작할 때만. 단순한 UI·플랫폼·프레임워크 용어로는 켜지지 않으며 범위 밖의 특수 화면은 제외됩니다.",
      evidence: "하나의 공통 UX 계약에 플랫폼/컴포지션 경로를 더하고, 주장에 맞춰 공개 웹의 브라우저, 네이티브 타깃/셸, 렌더러 근거를 구분합니다. 혼합 타깃은 타깃별 독립 근거가 필요합니다."
    },
    {
      file: "README.ja.md",
      invocation: "対応範囲の画面ベースのアプリ UI（公開 Web、デスクトップ、モバイル/タブレット、組み込み/ハイブリッドクライアント、カスタムレンダリング UI、Qt、混在ターゲット）の作業で Codex の `$superloopy:superloopy-frontend` または Claude Code の `/superloopy:superloopy-frontend` を明示的に呼び出すか、その作業を先頭の `loopy`/`루피` で始める場合だけ。UI・プラットフォーム・フレームワークの単なる用語では起動せず、範囲外の特殊画面は除外します。",
      evidence: "1 つの共通 UX 契約にプラットフォーム/コンポジションの経路を加え、主張に応じて公開 Web のブラウザー、ネイティブのターゲット/シェル、レンダラーの証拠を分けます。混在ターゲットではターゲットごとの独立した証拠が必要です。"
    },
    {
      file: "README.zh-CN.md",
      invocation: "仅在处理受支持的基于屏幕的应用 UI（公开 Web、桌面、移动设备/平板、嵌入式/混合客户端、自定义渲染 UI、Qt 或混合目标）时，在 Codex 中显式调用 `$superloopy:superloopy-frontend`，或在 Claude Code 中调用 `/superloopy:superloopy-frontend`，也可用开头的 `loopy`/`루피` 启动该工作。仅出现 UI、平台或框架词汇不会激活它，范围外的专用界面仍被排除。",
      evidence: "采用一份共享 UX 契约，并叠加平台/界面构成路径；证据随声明而定：公开 Web 的浏览器、原生目标/外壳和渲染器证据彼此区分，混合目标还需为每个目标提供独立证据。"
    },
    {
      file: "README.es.md",
      invocation: "Solo para interfaces de aplicaciones en pantalla dentro del alcance —web pública, escritorio, móvil/tableta, clientes embebidos/híbridos, UI con renderizado personalizado, Qt o destinos mixtos—, invocas explícitamente `$superloopy:superloopy-frontend` en Codex o `/superloopy:superloopy-frontend` en Claude Code, o inicias ese trabajo con `loopy`/`루피` al principio. La mera terminología de UI, plataforma o framework no la activa y las superficies especializadas fuera del alcance quedan excluidas.",
      evidence: "Un contrato de UX compartido más rutas de plataforma/composición; la prueba sigue a la afirmación: se distinguen la evidencia del navegador público, la del destino/shell nativo y la del motor de renderizado, y los destinos mixtos requieren evidencia independiente por destino."
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

test("frontend agent metadata keeps explicit screen-based routing and claim-shaped evidence", async () => {
  const agent = await readFile("skills/superloopy-frontend/agents/openai.yaml", "utf8");

  assert.match(agent, /short_description: "Explicit screen-based application UI routing"/u);
  assert.match(agent, /only after explicit invocation or an explicit route from an active leading `loopy`\/`루피` screen-based application-UI task/iu);
  assert.match(agent, /public Web, desktop, mobile\/tablet, embedded\/hybrid, Qt, custom-rendered, and mixed targets/iu);
  assert.match(agent, /plain UI\/platform\/framework vocabulary must remain inert/iu);
  assert.match(agent, /Exclude TV, wearable, XR, game UI, TUI, non-interactive visual deliverables, and backend\/API\/data\/infrastructure work/iu);
  assert.match(agent, /claim-shaped public-browser, native target\/shell, renderer, and independent mixed-target evidence/iu);
  assert.equal(agent.match(/\$superloopy:superloopy-frontend/g)?.length, 1);
  assert.equal(agent.match(/\/superloopy:superloopy-frontend/g)?.length, 1);
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

  assert.match(designRow, /one shared UX contract.*platform and composition routes/iu);
  assert.match(designRow, /public Web, desktop, mobile\/tablet, embedded\/hybrid, custom-rendered, Qt, and mixed surfaces/iu);
  assert.match(designRow, /mixed targets.*independent.*renderer.*shell.*package.*target evidence/iu);
  assert.match(designRow, /existing deep Qt specialization.*official Qt documentation/iu);
  assert.match(designRow, /shared UX and platform\/composition contracts.*original prose.*Superloopy/iu);
  assert.match(designRow, /no external runtime dependencies.*vendored/iu);

  const skillGoldenRows = golden.split("\n").filter((line) => line.startsWith("| `skills/superloopy-frontend/SKILL.md` |"));
  const agentGoldenRows = golden.split("\n").filter((line) => line.startsWith("| `skills/superloopy-frontend/agents/openai.yaml` |"));
  assert.equal(skillGoldenRows.length, 1, "frontend SKILL.md must have one exact golden-set row");
  assert.equal(agentGoldenRows.length, 1, "frontend agent metadata must have one exact golden-set row");
  assert.match(skillGoldenRows[0], /shared UX.*platform\/composition routes.*preserved Qt specialization.*independent evidence/iu);
  assert.match(skillGoldenRows[0], /original Superloopy prose/iu);
  assert.match(skillGoldenRows[0], /no vendored runtime dependenc(?:y|ies)/iu);
  assert.match(agentGoldenRows[0], /explicit screen-based application-UI discovery.*plain UI\/platform\/framework vocabulary inert.*unsupported specialized surfaces excluded/iu);
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
