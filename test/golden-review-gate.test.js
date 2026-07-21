import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { enforceAuditProvenance } from "../src/audit-gate-verify.js";
import { createLoop } from "../src/loop.js";
import { validateReviewQualityGate } from "../src/review-gate.js";
import { reviewStyleQualityGate, runCli, tempRepo, writeEvidence, writeGenuineAuditVerdict, writeQualityGateArtifacts } from "./golden-helpers.js";

function reviewGateForSurface(surface, kinds, scope = {}) {
  const gate = reviewStyleQualityGate({ codeReview: ".superloopy/evidence/code-review.md", gateReview: ".superloopy/evidence/gate-review.md", cliPass: ".superloopy/evidence/cli-pass.txt", malformedReject: ".superloopy/evidence/malformed-reject.txt", auditVerdict: ".superloopy/evidence/review-audit-verdict.json" });
  gate.manualQa.artifactRefs = kinds.map((kind, index) => ({ id: `proof-${index}`, kind, path: `.superloopy/evidence/${kind}-${index}.txt`, description: `${kind} proof for ${surface}.` }));
  gate.manualQa.surfaceEvidence[0].surface = surface;
  Object.assign(gate.manualQa.surfaceEvidence[0], scope);
  gate.manualQa.surfaceEvidence[0].artifactRefs = gate.manualQa.artifactRefs.map((artifact) => artifact.id);
  gate.manualQa.adversarialCases[0].artifactRefs = [gate.manualQa.artifactRefs[0].id];
  return gate;
}

const identityArtifactPath = (value) => value;
const target = (id, platform, environment) => ({ id, platform, environment });

test("golden: checkpoint accepts Superloopy review quality gate", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], {
    cwd: repo
  });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], {
    cwd: repo
  });
  const gatePath = join(repo, ".superloopy", "evidence", "review-gate.json");
  const gate = reviewStyleQualityGate(await writeQualityGateArtifacts(repo));
  gate.manualQa.surfaceEvidence[0].surface = ["t", "m", "u", "x"].join("");
  // Completion-time provenance now re-derives every cited audit verdict, so the gate
  // must carry a genuine verdict bound to a real criterion's re-run, not a dummy.
  gate.audit.verdicts = [await writeGenuineAuditVerdict(repo, { criterion: "G001/C001", artifact: c1 })];
  await writeFile(gatePath, JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop",
    "checkpoint",
    "--goal-id",
    "G001",
    "--status",
    "complete",
    "--evidence",
    "done",
    "--quality-gate",
    ".superloopy/evidence/review-gate.json",
    "--json"
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.plan.aggregateCompletion.qualityGate.codeReview.recommendation, "APPROVE");
  assert.equal(parsed.plan.aggregateCompletion.qualityGate.manualQa.surfaceEvidence[0].surface, ["t", "m", "u", "x"].join(""));
});

test("golden: completion rejects a hand-written audit verdict not bound to a re-derived re-run", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], { cwd: repo });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], { cwd: repo });
  // Default helper cites a dummy {"verdict":"pass"} file — structurally resolvable, but
  // not a genuine hash-bound verdict. Completion-time provenance must reject it.
  const gate = reviewStyleQualityGate(await writeQualityGateArtifacts(repo));
  await writeFile(join(repo, ".superloopy", "evidence", "dummy-verdict-gate.json"), JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop", "checkpoint", "--goal-id", "G001", "--status", "complete", "--evidence", "done",
    "--quality-gate", ".superloopy/evidence/dummy-verdict-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /verdict|audit/i);
  const plan = JSON.parse(await readFile(join(repo, ".superloopy", "goals.json"), "utf8"));
  assert.equal(plan.aggregateCompletion, null); // never force-completed
});

test("audit provenance direct: rejects hand-written verdict artifacts", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], { cwd: repo });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], { cwd: repo });
  const gate = reviewStyleQualityGate(await writeQualityGateArtifacts(repo));

  await assert.rejects(
    enforceAuditProvenance(repo, undefined, gate.audit),
    /Audit verdict|verdict|audit/i
  );
});

test("audit provenance direct: rejects any passed command criterion whose floor no longer reproduces", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli([
    "loop",
    "evidence",
    "--goal-id",
    "G001",
    "--criterion-id",
    "C001",
    "--status",
    "pass",
    "--artifact",
    c1,
    "--command",
    "[\"node\",\"-e\",\"process.exit(1)\"]"
  ], { cwd: repo });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], { cwd: repo });

  await assert.rejects(
    enforceAuditProvenance(repo, undefined, undefined),
    /G001\/C001|passing floor/
  );
});

test("golden: completion re-derives EVERY passed criterion, not just cited ones (uncited failing command criterion is caught)", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], { cwd: repo });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], { cwd: repo });
  // C002 is command-backed but its command fails on re-run; the worker marked it pass
  // and cites a genuine verdict only for the OTHER (manual) criterion C001.
  const goalsPath = join(repo, ".superloopy", "goals.json");
  const plan = JSON.parse(await readFile(goalsPath, "utf8"));
  Object.assign(plan.goals[0].criteria[1], { command: ["node", "-e", "process.exit(1)"] });
  await writeFile(goalsPath, JSON.stringify(plan), "utf8");
  const gate = reviewStyleQualityGate(await writeQualityGateArtifacts(repo));
  gate.manualQa.surfaceEvidence[0].surface = ["t", "m", "u", "x"].join("");
  gate.audit.verdicts = [await writeGenuineAuditVerdict(repo, { criterion: "G001/C001", artifact: c1 })];
  await writeFile(join(repo, ".superloopy", "evidence", "partial-gate.json"), JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop", "checkpoint", "--goal-id", "G001", "--status", "complete", "--evidence", "done",
    "--quality-gate", ".superloopy/evidence/partial-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /C002|passing floor/i);
  const after = JSON.parse(await readFile(goalsPath, "utf8"));
  assert.equal(after.aggregateCompletion, null); // never force-completed
});

test("golden: review quality gate rejects weak manual QA evidence", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], {
    cwd: repo
  });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], {
    cwd: repo
  });
  const paths = await writeQualityGateArtifacts(repo);
  const gate = reviewStyleQualityGate(paths, {
    manualQa: {
      ...reviewStyleQualityGate(paths).manualQa,
      adversarialCases: [
        {
          id: "adv-skipped",
          criterionRef: "C002",
          scenario: "skipped adversarial probe",
          expectedBehavior: "must fail",
          verdict: "not_applicable",
          artifactRefs: ["artifact-malformed-reject"]
        }
      ]
    }
  });
  await writeFile(join(repo, ".superloopy", "evidence", "weak-gate.json"), JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop",
    "checkpoint",
    "--goal-id",
    "G001",
    "--status",
    "complete",
    "--evidence",
    "done",
    "--quality-gate",
    ".superloopy/evidence/weak-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /not_applicable|adversarialCases/);
});

test("golden: review quality gate now requires an audit section", async () => {
  const repo = await tempRepo();
  await createLoop(repo, ["--brief", "Ship"]);
  const c1 = await writeEvidence(repo, "c1.txt");
  const c2 = await writeEvidence(repo, "c2.txt");
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C001", "--status", "pass", "--artifact", c1], { cwd: repo });
  runCli(["loop", "evidence", "--goal-id", "G001", "--criterion-id", "C002", "--status", "pass", "--artifact", c2], { cwd: repo });
  const gate = reviewStyleQualityGate(await writeQualityGateArtifacts(repo));
  delete gate.audit; // a pre-audit review gate is still detected, but must now fail validation
  await writeFile(join(repo, ".superloopy", "evidence", "no-audit-gate.json"), JSON.stringify(gate), "utf8");

  const result = runCli([
    "loop", "checkpoint", "--goal-id", "G001", "--status", "complete", "--evidence", "done",
    "--quality-gate", ".superloopy/evidence/no-audit-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /audit/i);
});

test("review quality gate accepts literal mobile and tablet surfaces with native interaction and visual proof", () => {
  for (const surface of ["mobile", "tablet"]) {
    const gate = reviewGateForSurface(surface, ["app-automation-transcript", "screenshot", "accessibility-tree", "device-report"]);
    assert.doesNotThrow(() => validateReviewQualityGate(gate, identityArtifactPath), surface);
  }
});

test("review quality gate rejects screenshot-only native proof", () => {
  const gate = reviewGateForSurface("native", ["screenshot"]);

  assert.throws(
    () => validateReviewQualityGate(gate, identityArtifactPath),
    /native.*interaction|interaction.*native/i
  );
});

test("review quality gate preserves legacy full-surface proof when owner and claims are absent", () => {
  const cases = [
    ["browser", ["browser-automation", "screenshot", "accessibility-tree"]],
    ["native", ["app-automation-transcript", "screenshot", "accessibility-tree", "device-report", "package-lifecycle-report"]],
    ["hybrid", ["browser-automation", "app-automation-transcript", "screenshot", "accessibility-tree", "device-report", "package-lifecycle-report"]],
    ["renderer", ["app-automation-transcript", "screenshot", "accessibility-tree", "renderer-trace"]]
  ];

  for (const [surface, kinds] of cases) {
    const gate = reviewGateForSurface(surface, kinds);
    assert.doesNotThrow(() => validateReviewQualityGate(gate, identityArtifactPath), surface);
  }
});

test("review quality gate scopes composite proof to one affected owner and explicit claims", () => {
  const shellMenu = reviewGateForSurface(
    "Tauri desktop",
    ["app-automation-transcript", "device-report"],
    { target: target("windows-menu", "windows", "Windows 11 desktop"), owner: "native", claims: ["interaction", "target"], scopeReason: "Only the native menu owner changed." }
  );
  const embeddedClient = reviewGateForSurface(
    "Tauri desktop",
    ["client-automation-transcript"],
    { target: target("windows-client", "windows", "Embedded client on Windows 11 desktop"), owner: "browser", claims: ["interaction"], scopeReason: "Only the embedded client interaction changed." }
  );
  const flutterColor = reviewGateForSurface(
    "Flutter Android",
    ["screenshot"],
    { target: target("android-phone", "android", "Android 15 phone"), owner: "renderer", claims: ["visual"], scopeReason: "Only renderer-owned color output changed." }
  );

  assert.doesNotThrow(() => validateReviewQualityGate(shellMenu, identityArtifactPath));
  assert.doesNotThrow(() => validateReviewQualityGate(embeddedClient, identityArtifactPath));
  assert.doesNotThrow(() => validateReviewQualityGate(flutterColor, identityArtifactPath));
});

test("review quality gate requires a structured portable target without counting OS names in environment", () => {
  const missingTarget = reviewGateForSurface(
    "Tauri desktop",
    ["app-automation-transcript", "device-report"],
    { owner: "native", claims: ["interaction", "target"], scopeReason: "Only the native menu owner changed." }
  );
  const hostNamesInEnvironment = reviewGateForSurface(
    "native iOS app",
    ["app-automation-transcript", "device-report"],
    {
      owner: "native",
      claims: ["interaction", "target"],
      scopeReason: "The iOS deployment is exercised through cross-host tooling.",
      target: target("ios-simulator", "ios", "iOS simulator hosted on macOS and observed from a Windows runner")
    }
  );
  const stringTarget = reviewGateForSurface(
    "native iOS app",
    ["app-automation-transcript", "device-report"],
    { target: "iOS simulator", owner: "native", claims: ["interaction", "target"], scopeReason: "Old free-text schema." }
  );

  assert.throws(() => validateReviewQualityGate(missingTarget, identityArtifactPath), /target/i);
  assert.throws(() => validateReviewQualityGate(stringTarget, identityArtifactPath), /target.*object|object.*target/i);
  const parsed = validateReviewQualityGate(hostNamesInEnvironment, identityArtifactPath);
  assert.deepEqual(parsed.manualQa.surfaceEvidence[0].target, target("ios-simulator", "ios", "iOS simulator hosted on macOS and observed from a Windows runner"));

  const genericIds = [
    reviewGateForSurface("browser", ["browser-automation"], { target: target("web", "web", "Chrome 126 on Ubuntu 24.04"), owner: "browser", claims: ["interaction"], scopeReason: "One concrete Web run." }),
    reviewGateForSurface("browser", ["browser-automation"], { target: target("browser", "browser", "Firefox 128 on Windows 11"), owner: "browser", claims: ["interaction"], scopeReason: "One concrete browser run." }),
    reviewGateForSurface("native", ["app-automation-transcript", "device-report"], { target: target("desktop", "desktop", "Windows 11 workstation"), owner: "native", claims: ["interaction"], scopeReason: "One concrete desktop run." }),
    reviewGateForSurface("native", ["app-automation-transcript", "device-report"], { target: target("mobile", "mobile", "iPhone 15 running iOS 18"), owner: "native", claims: ["interaction"], scopeReason: "One concrete mobile run." }),
    reviewGateForSurface("native", ["app-automation-transcript", "device-report"], { target: target("android-emulator", "android", "Android emulator on Linux"), owner: "native", claims: ["interaction"], scopeReason: "One concrete emulator run." })
  ];
  for (const gate of genericIds) assert.doesNotThrow(() => validateReviewQualityGate(gate, identityArtifactPath));
});

test("review quality gate rejects nonportable or vague scoped target identifiers", () => {
  const invalidTargets = [
    target("Windows_Menu", "windows", "Windows desktop"),
    target("windows/menu", "windows", "Windows desktop"),
    target("all-windows", "windows", "Windows desktop"),
    target("supported-targets", "windows", "Windows desktop"),
    target("alltargets", "windows", "Windows desktop"), target("supporteddevices", "windows", "Windows desktop"), target("crossplatforms", "windows", "Windows desktop"),
    target("web", "web", "all supported browsers"), target("mobile", "mobile", "any devices"), target("desktop", "desktop", "cross-platform"),
    target("web", "web", "multiple browsers"), target("mobile", "mobile", "multi-device targets"), target("desktop", "desktop", "universal targets"),
    target("windows-menu", "Windows", "Windows desktop"),
    target("windows-menu", "windows-11", "Windows desktop"),
    target("windows-menu", "universal", "Windows desktop"),
    target("windows-menu", "windows", "")
  ];

  for (const invalidTarget of invalidTargets) {
    const gate = reviewGateForSurface(
      "native Windows app",
      ["app-automation-transcript", "device-report"],
      { target: invalidTarget, owner: "native", claims: ["interaction", "target"], scopeReason: "Target schema probe." }
    );
    assert.throws(() => validateReviewQualityGate(gate, identityArtifactPath), /target|portable|platform|environment|vague/i, JSON.stringify(invalidTarget));
  }
});

test("review quality gate keeps scoped rows and resolved artifacts one-to-one", () => {
  const duplicateScope = reviewGateForSurface("browser", ["browser-automation", "browser-automation"]);
  Object.assign(duplicateScope.manualQa.surfaceEvidence[0], { target: target("chrome-linux", "web", "Chrome on Linux"), owner: "browser", claims: ["interaction"], scopeReason: "Primary interaction proof.", artifactRefs: ["proof-0"] });
  duplicateScope.manualQa.surfaceEvidence.push({ ...structuredClone(duplicateScope.manualQa.surfaceEvidence[0]), id: "surface-second", artifactRefs: ["proof-1"] });

  const sharedArtifact = structuredClone(duplicateScope);
  sharedArtifact.manualQa.surfaceEvidence[1].target = target("firefox-linux", "web", "Firefox on Linux");
  sharedArtifact.manualQa.surfaceEvidence[1].artifactRefs = ["proof-0"];

  const duplicateResolvedDeclaration = reviewGateForSurface("browser", ["browser-automation", "browser-automation"]);
  duplicateResolvedDeclaration.manualQa.artifactRefs[0].path = ".superloopy/evidence/primary-proof.txt";
  duplicateResolvedDeclaration.manualQa.artifactRefs[1].path = ".superloopy/evidence/alias-proof.txt";
  const resolveAlias = (value) => value.endsWith("primary-proof.txt") || value.endsWith("alias-proof.txt")
    ? "/resolved/shared-proof.txt"
    : value;

  assert.throws(() => validateReviewQualityGate(duplicateScope, identityArtifactPath), /duplicate.*target.*owner|target.*owner.*duplicate/i);
  assert.throws(() => validateReviewQualityGate(sharedArtifact, identityArtifactPath), /artifact.*reused|reused.*artifact|distinct.*target/i);
  assert.throws(() => validateReviewQualityGate(duplicateResolvedDeclaration, resolveAlias), /duplicate.*resolved.*path|resolved.*path.*duplicate/i);
});

test("review quality gate rejects failed status or result aliases", () => {
  const failedSurfaceStatus = reviewGateForSurface("mobile Web", ["browser-automation"]);
  failedSurfaceStatus.manualQa.surfaceEvidence[0].status = "failed";
  const failedSurfaceResult = reviewGateForSurface("mobile Web", ["browser-automation"]);
  failedSurfaceResult.manualQa.surfaceEvidence[0].result = "failed";
  const failedAdversarialStatus = reviewGateForSurface("mobile Web", ["browser-automation"]);
  failedAdversarialStatus.manualQa.adversarialCases[0].status = "failed";
  const failedAdversarialResult = reviewGateForSurface("mobile Web", ["browser-automation"]);
  failedAdversarialResult.manualQa.adversarialCases[0].result = "failed";

  for (const gate of [failedSurfaceStatus, failedSurfaceResult, failedAdversarialStatus, failedAdversarialResult]) {
    assert.throws(() => validateReviewQualityGate(gate, identityArtifactPath), /status|result|passed/i);
  }
});

test("review quality gate rejects incomplete or incoherent claim-shaped scope", () => {
  const bridgeWithoutShell = reviewGateForSurface(
    "Tauri desktop",
    ["client-automation-transcript"],
    { target: target("windows-bridge", "windows", "Windows 11 desktop"), owner: "hybrid", claims: ["interaction"], scopeReason: "The bridge journey changed." }
  );
  const visualWithoutImage = reviewGateForSurface(
    "Flutter Android",
    ["app-automation-transcript"],
    { target: target("android-phone", "android", "Android 15 phone"), owner: "renderer", claims: ["visual"], scopeReason: "Renderer-owned visual output changed." }
  );
  const impossibleOwner = reviewGateForSurface(
    "native desktop",
    ["browser-automation"],
    { target: target("windows-client", "windows", "Windows 11 desktop"), owner: "browser", claims: ["interaction"], scopeReason: "Incorrectly attributes a native-only surface to a browser owner." }
  );
  const missingOwner = reviewGateForSurface(
    "native desktop",
    ["app-automation-transcript"],
    { claims: ["interaction"] }
  );
  const nativeVisualWithoutTarget = reviewGateForSurface(
    "native desktop",
    ["screenshot"],
    { target: target("windows-visual", "windows", "Windows 11 desktop"), owner: "native", claims: ["visual"], scopeReason: "Native visual output changed." }
  );
  const accessibilityWithoutInteraction = reviewGateForSurface(
    "Tauri desktop",
    ["accessibility-tree"],
    { target: target("windows-client", "windows", "Windows 11 desktop"), owner: "browser", claims: ["accessibility"], scopeReason: "Embedded client semantics changed." }
  );
  const duplicateClaims = reviewGateForSurface(
    "browser",
    ["browser-automation"],
    { target: target("linux-chrome", "web", "Chrome on Linux"), owner: "browser", claims: ["interaction", "interaction"], scopeReason: "Browser interaction changed." }
  );
  const missingReason = reviewGateForSurface(
    "browser",
    ["browser-automation"],
    { owner: "browser", claims: ["interaction"] }
  );
  const hybridVisualWithoutBothSides = reviewGateForSurface(
    "Tauri desktop",
    ["screenshot", "device-report"],
    { target: target("windows-bridge", "windows", "Windows 11 desktop"), owner: "hybrid", claims: ["visual"], scopeReason: "Bridge-owned visible state changed." }
  );
  const hybridTargetWithoutBothSides = reviewGateForSurface(
    "Tauri desktop",
    ["device-report"],
    { target: target("windows-bridge", "windows", "Windows 11 desktop"), owner: "hybrid", claims: ["target"], scopeReason: "Bridge target behavior changed." }
  );
  const hybridPackageWithoutBothSides = reviewGateForSurface(
    "Tauri desktop",
    ["package-lifecycle-report", "device-report"],
    { target: target("windows-bridge", "windows", "Windows 11 desktop"), owner: "hybrid", claims: ["package-lifecycle"], scopeReason: "Bridge package lifecycle changed." }
  );

  assert.throws(() => validateReviewQualityGate(bridgeWithoutShell, identityArtifactPath), /shell interaction/i);
  assert.throws(() => validateReviewQualityGate(visualWithoutImage, identityArtifactPath), /visual.*screenshot|screenshot.*visual/i);
  assert.throws(() => validateReviewQualityGate(impossibleOwner, identityArtifactPath), /owner.*browser.*not.*surface|browser.*owner.*surface/i);
  assert.throws(() => validateReviewQualityGate(missingOwner, identityArtifactPath), /owner.*claims|claims.*owner/i);
  assert.throws(() => validateReviewQualityGate(nativeVisualWithoutTarget, identityArtifactPath), /device|target/i);
  assert.throws(() => validateReviewQualityGate(accessibilityWithoutInteraction, identityArtifactPath), /accessibility.*interaction|interaction.*accessibility/i);
  assert.throws(() => validateReviewQualityGate(duplicateClaims, identityArtifactPath), /duplicate.*claim|claim.*duplicate/i);
  assert.throws(() => validateReviewQualityGate(missingReason, identityArtifactPath), /scopeReason/i);
  for (const gate of [hybridVisualWithoutBothSides, hybridTargetWithoutBothSides, hybridPackageWithoutBothSides]) {
    assert.throws(() => validateReviewQualityGate(gate, identityArtifactPath), /client interaction.*shell interaction|shell interaction.*client interaction/i);
  }
});

test("review quality gate accepts legacy browser visual proof and custom-renderer browser interaction proof", () => {
  const legacyBrowser = reviewGateForSurface("browser", ["screenshot"]);
  const customRenderer = reviewGateForSurface("custom-rendered Web", ["browser-automation", "screenshot", "accessibility-tree", "renderer-trace"]);

  assert.doesNotThrow(() => validateReviewQualityGate(legacyBrowser, identityArtifactPath));
  assert.doesNotThrow(() => validateReviewQualityGate(customRenderer, identityArtifactPath));
});

test("review quality gate limits screenshot-only compatibility to exact legacy browser literals", () => {
  for (const surface of ["PWA", "Chrome extension", "authenticated Web"]) {
    const gate = reviewGateForSurface(surface, ["screenshot"]);
    assert.throws(
      () => validateReviewQualityGate(gate, identityArtifactPath),
      /automation|interaction/i,
      surface
    );
  }
});

test("review quality gate keeps browser targets Web-only while embedded WebView remains composite", () => {
  for (const surface of ["mobile Web", "desktop browser", "mobile PWA", "Chrome extension on desktop"]) {
    const gate = reviewGateForSurface(surface, ["browser-automation"]);
    assert.doesNotThrow(() => validateReviewQualityGate(gate, identityArtifactPath), surface);
  }
  const embedded = reviewGateForSurface(
    "embedded mobile WebView",
    ["client-automation-transcript", "app-automation-transcript", "device-report"]
  );
  assert.doesNotThrow(() => validateReviewQualityGate(embedded, identityArtifactPath));
});

test("review quality gate enforces every owner in composite native and hybrid renderer surfaces", () => {
  const nativeWithoutTarget = reviewGateForSurface(
    "custom-rendered native desktop",
    ["app-automation-transcript", "accessibility-tree", "renderer-trace"]
  );
  const hybridWithoutClientInteraction = reviewGateForSurface(
    "custom-rendered WebView hybrid",
    ["app-automation-transcript", "accessibility-tree", "device-report", "renderer-trace"]
  );
  const completeHybrid = reviewGateForSurface(
    "custom-rendered WebView hybrid",
    ["app-automation-transcript", "client-automation-transcript", "accessibility-tree", "device-report", "renderer-trace"]
  );

  assert.throws(() => validateReviewQualityGate(nativeWithoutTarget, identityArtifactPath), /device|target/i);
  assert.throws(() => validateReviewQualityGate(hybridWithoutClientInteraction, identityArtifactPath), /client interaction/i);
  assert.doesNotThrow(() => validateReviewQualityGate(completeHybrid, identityArtifactPath));
});

test("review quality gate does not treat qualified native GUI or shell rows as legacy browser or CLI", () => {
  for (const surface of ["desktop GUI", "native shell"]) {
    const gate = reviewGateForSurface(surface, ["screenshot"]);
    assert.throws(
      () => validateReviewQualityGate(gate, identityArtifactPath),
      /native.*interaction|interaction.*native/i,
      surface
    );
  }
});

test("review quality gate preserves HTTP and data artifact boundaries", () => {
  const httpWithDataDiff = reviewGateForSurface("http", ["data-diff"]);
  const dataWithHttpDump = reviewGateForSurface("data", ["http-dump"]);

  assert.throws(() => validateReviewQualityGate(httpWithDataDiff, identityArtifactPath), /incompatible/);
  assert.throws(() => validateReviewQualityGate(dataWithHttpDump, identityArtifactPath), /incompatible/);
});

test("review quality gate accepts nonvisual claim-shaped proof without a decorative screenshot", () => {
  const cases = [
    ["browser", ["browser-automation"], "browser", ["interaction"]],
    ["native", ["app-automation-transcript", "accessibility-tree", "device-report"], "native", ["accessibility"]],
    ["hybrid", ["browser-automation", "app-automation-transcript", "device-report", "package-lifecycle-report"], "hybrid", ["interaction", "package-lifecycle"]],
    ["renderer", ["app-automation-transcript", "accessibility-tree", "renderer-trace"], "renderer", ["accessibility", "renderer"]]
  ];

  for (const [surface, kinds, owner, claims] of cases) {
    const scopedTarget = surface === "browser"
      ? target("linux-chrome", "web", "Chrome on Linux")
      : surface === "native" || surface === "hybrid"
        ? target("windows-desktop", "windows", "Windows 11 desktop")
        : target("linux-renderer", "linux", "Linux desktop");
    const gate = reviewGateForSurface(surface, kinds, { target: scopedTarget, owner, claims, scopeReason: "Only the named nonvisual claim changed." });
    assert.doesNotThrow(() => validateReviewQualityGate(gate, identityArtifactPath), surface);
  }
});

test("review quality gate rejects empty adversarial proof and duplicate proof-row IDs", () => {
  const emptyAdversarial = reviewGateForSurface("browser", ["browser-automation"]);
  emptyAdversarial.manualQa.adversarialCases[0].artifactRefs = [];

  const duplicateSurface = reviewGateForSurface("browser", ["browser-automation"]);
  duplicateSurface.manualQa.surfaceEvidence.push(structuredClone(duplicateSurface.manualQa.surfaceEvidence[0]));

  const duplicateAdversarial = reviewGateForSurface("browser", ["browser-automation"]);
  duplicateAdversarial.manualQa.adversarialCases.push(structuredClone(duplicateAdversarial.manualQa.adversarialCases[0]));
  const scopedAdversarial = reviewGateForSurface("browser", ["browser-automation"]);
  scopedAdversarial.manualQa.adversarialCases[0].target = target("web", "web", "Chrome on Linux");

  assert.throws(() => validateReviewQualityGate(emptyAdversarial, identityArtifactPath), /artifactRefs.*empty|must not be empty/i);
  assert.throws(() => validateReviewQualityGate(duplicateSurface, identityArtifactPath), /duplicate.*surface|surface.*duplicate/i);
  assert.throws(() => validateReviewQualityGate(duplicateAdversarial, identityArtifactPath), /duplicate.*adversarial|adversarial.*duplicate/i);
  assert.throws(() => validateReviewQualityGate(scopedAdversarial, identityArtifactPath), /adversarial.*scope|scope.*adversarial|target.*not.*allowed/i);
});
