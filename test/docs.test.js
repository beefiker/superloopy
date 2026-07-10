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

test("frontend discovery rows publish routed web and Qt evidence", async () => {
  const locales = [
    {
      file: "README.md",
      invocation: "You explicitly invoke Codex `$superloopy:superloopy-frontend` or Claude Code `/superloopy:superloopy-frontend`, or start a visual task with a leading `loopy`/`루피`. Plain UI mentions do not activate it.",
      webEvidence: /for web,.*browser evidence/i,
      qtEvidence: /for Qt,.*native rendered-application evidence/i,
      scopedPreflight: /for web, the anti-slop pre-flight[^|]*for Qt, the Qt pre-flight/i
    },
    {
      file: "README.ko.md",
      invocation: "Codex에서 `$superloopy:superloopy-frontend`, Claude Code에서 `/superloopy:superloopy-frontend`를 직접 호출하거나, 선행 `loopy`/`루피`로 시각 작업을 시작할 때. UI를 언급하기만 해서는 켜지지 않습니다.",
      webEvidence: /웹.*브라우저.*근거/u,
      qtEvidence: /Qt.*네이티브.*애플리케이션.*렌더링.*근거/u,
      scopedPreflight: /웹은 anti-slop pre-flight[^|]*Qt는 Qt pre-flight/u
    },
    {
      file: "README.ja.md",
      invocation: "Codex で `$superloopy:superloopy-frontend`、Claude Code で `/superloopy:superloopy-frontend` を明示的に呼び出すか、先頭の `loopy`/`루피` で視覚タスクを始めるとき。UI への単なる言及では起動しません。",
      webEvidence: /Web.*ブラウザー.*証拠/u,
      qtEvidence: /Qt.*ネイティブアプリ.*レンダリング.*証拠/u,
      scopedPreflight: /Web は anti-slop の事前チェック[^|]*Qt は Qt の事前チェック/u
    },
    {
      file: "README.zh-CN.md",
      invocation: "在 Codex 中显式调用 `$superloopy:superloopy-frontend`，或在 Claude Code 中调用 `/superloopy:superloopy-frontend`，也可用开头的 `loopy`/`루피` 启动可视化任务。仅提到 UI 不会激活它。",
      webEvidence: /Web.*浏览器证据/u,
      qtEvidence: /Qt.*原生应用渲染证据/u,
      scopedPreflight: /Web 使用 anti-slop 预检[^|]*Qt 使用 Qt 预检/u
    },
    {
      file: "README.es.md",
      invocation: "Invocas `$superloopy:superloopy-frontend` en Codex o `/superloopy:superloopy-frontend` en Claude Code, o inicias una tarea visual con `loopy`/`루피` al principio. Una simple mención de UI no la activa.",
      webEvidence: /para web,.*evidencia del navegador/i,
      qtEvidence: /para Qt,.*aplicación nativa renderizada/i,
      scopedPreflight: /para web, la comprobación anti-slop previa[^|]*para Qt, la comprobación previa de Qt/i
    }
  ];

  for (const { file, invocation, webEvidence, qtEvidence, scopedPreflight } of locales) {
    const content = await readFile(file, "utf8");
    const row = content.split("\n").find((line) => line.startsWith("| `superloopy-frontend` |"));
    assert.ok(row, `${file} is missing the superloopy-frontend row`);
    const cells = row.split("|").map((cell) => cell.trim());
    assert.equal(cells[2], invocation, `${file} must preserve its complete localized invocation cell`);
    assert.match(row, /\$superloopy:superloopy-frontend/);
    assert.match(row, /\/superloopy:superloopy-frontend/);
    assert.match(row, /loopy.*루피/u);
    assert.match(row, webEvidence);
    assert.match(row, qtEvidence);
    assert.match(row, scopedPreflight, `${file} must scope anti-slop to web and Qt pre-flight to Qt`);
    assert.doesNotMatch(row, /for web[^|]*browser evidence for web|for Qt[^|]*evidence for Qt|para web[^|]*evidencia del navegador para web|para Qt[^|]*aplicación nativa renderizada para Qt/i);
    assert.equal(row.match(/\$superloopy:superloopy-frontend/g)?.length, 1, `${file} must preserve the Codex invocation once`);
    assert.equal(row.match(/\/superloopy:superloopy-frontend/g)?.length, 1, `${file} must preserve the Claude invocation once`);
  }
});

test("frontend agent metadata keeps explicit activation and routed rendered evidence", async () => {
  const agent = await readFile("skills/superloopy-frontend/agents/openai.yaml", "utf8");

  assert.match(agent, /only after explicit invocation or an explicit route from an active `loopy`\/`루피` task/u);
  assert.match(agent, /real-browser rendered-surface evidence for web/i);
  assert.match(agent, /native rendered-application evidence for Qt/i);
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

  assert.match(designRow, /browser evidence for web.*native rendered-application evidence for Qt/iu);
  assert.match(designRow, /original prose.*official Qt documentation/iu);
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
