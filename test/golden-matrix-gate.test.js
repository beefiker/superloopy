import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { createLoop } from "../src/loop.js";
import { validateMatrixQualityGate } from "../src/matrix-gate.js";
import { qualityGateSurfaceFamilies, qualityGateSurfaceFamily } from "../src/review-gate.js";
import { cloneJson, matrixStyleQualityGate, runCli, tempRepo, writeEvidence, writeGenuineAuditVerdict, writeMatrixGateArtifacts } from "./golden-helpers.js";

function matrixGateForSurface(surface, kinds, scope = {}) {
  const gate = matrixStyleQualityGate({ cliRun: ".superloopy/evidence/matrix-cli-run.txt", redTeam: ".superloopy/evidence/matrix-risk-probe.txt", auditVerdict: ".superloopy/evidence/matrix-audit-verdict.json" });
  gate.executorQa.artifactRefs = kinds.map((kind, index) => ({ id: `proof-${index}`, kind, path: `.superloopy/evidence/${kind}-${index}.txt`, description: `${kind} proof for ${surface}.` }));
  gate.executorQa.surfaceEvidence[0].surface = surface;
  Object.assign(gate.executorQa.surfaceEvidence[0], scope);
  gate.executorQa.surfaceEvidence[0].artifactRefs = gate.executorQa.artifactRefs.map((artifact) => artifact.id);
  gate.executorQa.adversarialCases[0].artifactRefs = [gate.executorQa.artifactRefs[0].id];
  return gate;
}

const identityArtifactPath = (value) => value;
const target = (id, platform, environment) => ({ id, platform, environment });

test("quality-gate surface classification honors composed and named application targets", () => {
  const surfacesByFamily = {
    cli: ["shell"],
    hybrid: ["hybrid shell", "embedded HTML desktop", "mobile WebView", "Electron client", "Tauri shell", "MAUI Hybrid", "WKWebView", "WebView2", "Qt WebEngine", "CEF"],
    renderer: ["custom-rendered Web", "canvas UI", "Flutter", "Compose Desktop", "Qt Quick/QML"],
    browser: ["PWA", "gui", "browser extension", "Chrome extension", "Firefox extension", "Safari extension", "WebExtension", "mobile Web", "desktop browser", "mobile PWA", "Chrome extension on desktop"],
    native: ["Android", "iOS", "iPadOS", "macOS", "Windows", "SwiftUI", "React Native", "Tkinter GUI", "wxWidgets GUI", "JavaFX GUI", "Swing GUI", "Avalonia GUI", "WinForms GUI", "desktop GUI", "native shell"],
    tui: ["TUI"]
  };
  for (const [family, surfaces] of Object.entries(surfacesByFamily)) {
    for (const surface of surfaces) assert.equal(qualityGateSurfaceFamily(surface, "surface"), family, surface);
  }
  const composed = [
    ["embedded mobile WebView", ["hybrid", "native", "browser"]], ["Web + iOS + Android", ["browser"]],
    ["Web + native iOS app + native Android app", ["native", "browser"]], ["browser app and Android app", ["native", "browser"]],
    ["mobile Web on Android", ["browser"]], ["Safari PWA on iOS", ["browser"]], ["Chrome extension on Windows", ["browser"]],
    ["authenticated Web on macOS", ["browser"]], ["Safari on iOS", ["browser"]], ["Chrome on Android", ["browser"]],
    ["Firefox on Windows", ["browser"]], ["Chromium on Linux", ["browser"]], ["Microsoft Edge on Windows", ["browser"]],
    ["Edge browser on Windows", ["browser"]], ["edge device UI", ["native"]], ["edge computing desktop GUI", ["native"]],
    ["iPhone app", ["native"]], ["iPad app", ["native"]], ["Mac app", ["native"]], ["React Native Web", ["browser"]],
    ["Capacitor iOS", ["hybrid", "native", "browser"]], ["Cordova Android", ["hybrid", "native", "browser"]],
    ["Blazor WebAssembly", ["browser"]], ["Qt WebAssembly", ["renderer", "browser"]],
    ["QML on WebAssembly", ["renderer", "browser"]], ["WebGL browser", ["renderer", "browser"]],
    ["SwiftUI settings scene on iOS", ["native"]], ["SwiftUI WindowGroup scene", ["native"]],
    ["custom scene graph desktop", ["renderer", "native"]], ["embedded Linux Qt", ["native"]],
    ["embedded native touchscreen", ["native"]], ["embedded system GUI", ["native"]]
  ];
  for (const [surface, families] of composed) assert.deepEqual(qualityGateSurfaceFamilies(surface, "surface"), families, surface);
  assert.throws(() => qualityGateSurfaceFamilies("UnknownToolkit GUI", "surface"), /supported QA surface|ambiguous.*GUI/i);
});

test("quality-gate classifier prefers deployed facts over host OS and compatible framework brands", () => {
  const cases = [
    ["CLI on Windows 11", ["cli"]], ["shell on macOS", ["cli"]], ["tmux on Linux", ["cli"]],
    ["HTTP API on Windows", ["http"]], ["data package on macOS", ["data"]], ["algorithm on Android", ["data"]],
    ["native Safari browser on iOS", ["browser"]], ["native Chrome browser on Android", ["browser"]],
    ["React Native for Web", ["browser"]], ["react-native-web browser delivery", ["browser"]], ["React Native running in browser", ["browser"]],
    ["Avalonia WebAssembly", ["renderer", "browser"]], ["Slint browser delivery", ["renderer", "browser"]],
    ["Kivy WebAssembly", ["renderer", "browser"]], ["JUCE browser delivery", ["renderer", "browser"]],
    ["Capacitor PWA", ["browser"]], ["Cordova browser platform", ["browser"]], ["MAUI Blazor WebAssembly", ["browser"]],
    ["custom chrome desktop", ["native"]], ["window chrome desktop", ["native"]], ["native chrome desktop", ["native"]],
    ["Qt Quick/QML native app", ["renderer", "native"]], ["QML WASM browser", ["renderer", "browser"]],
    ["Three.js Web UI", ["renderer", "browser"]], ["PixiJS browser UI", ["renderer", "browser"]],
    ["Babylon.js Web UI", ["renderer", "browser"]], ["WebGPU browser UI", ["renderer", "browser"]]
  ];
  for (const [surface, families] of cases) assert.deepEqual(qualityGateSurfaceFamilies(surface, "surface"), families, surface);
  assert.deepEqual(qualityGateSurfaceFamilies("TUI on Windows", "surface"), ["tui"]);
  assert.deepEqual(qualityGateSurfaceFamilies("TUI plus browser dashboard", "surface"), ["tui", "browser"]);
  assert.deepEqual(qualityGateSurfaceFamilies("TUI inside native Qt Quick app", "surface"), ["tui", "renderer", "native"]);
  assert.deepEqual(qualityGateSurfaceFamilies("CLI inside native Qt Quick app", "surface"), ["cli", "renderer", "native"]);
  assert.deepEqual(qualityGateSurfaceFamilies("CLI inside Electron app", "surface"), ["cli", "hybrid", "native", "browser"]);
  assert.throws(() => qualityGateSurfaceFamilies("TUI plus UnknownToolkit GUI", "surface"), /supported QA surface|ambiguous.*GUI/i);
  assert.deepEqual(qualityGateSurfaceFamilies("email compose desktop", "surface"), ["native"]);
  assert.deepEqual(qualityGateSurfaceFamilies("message compose screen on iOS", "surface"), ["native"]);
  assert.throws(() => qualityGateSurfaceFamilies("UnknownToolkit GUI on Windows", "surface"), /supported QA surface|ambiguous.*GUI/i);
  assert.throws(() => qualityGateSurfaceFamilies("email compose", "surface"), /supported QA surface/i);
  assert.throws(() => qualityGateSurfaceFamilies("message compose", "surface"), /supported QA surface/i);
});

test("golden: @goal delimiters split executable stories and keep literals safe", async () => {
  const repo = await tempRepo();
  const result = runCli([
    "loop",
    "create",
    "--brief",
    [
      "Shared constraints stay in the brief, not as their own goal.",
      "",
      "@goal: Parse intake",
      "Parse CSV input.",
      "@goalish is literal text.",
      "  @goal: indented literal text",
      "",
      "@goal Export audit",
      "Export a reviewer-ready audit report."
    ].join("\n"),
    "--json"
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const goals = JSON.parse(result.stdout).plan.goals;
  assert.equal(goals.length, 2);
  assert.equal(goals[0].title, "Parse intake");
  assert.match(goals[0].objective, /@goalish is literal text/);
  assert.equal(goals[1].title, "Export audit");
});

test("golden: @goal delimiters reject empty executable blocks", async () => {
  const repo = await tempRepo();
  const result = runCli(["loop", "create", "--brief", "@goal:\n\n", "--json"], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /empty @goal/i);
});

test("golden: checkpoint accepts matrix quality gate", async () => {
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
  const gatePath = join(repo, ".superloopy", "evidence", "matrix-gate.json");
  const gate = matrixStyleQualityGate(await writeMatrixGateArtifacts(repo));
  gate.executorQa.surfaceEvidence[0].surface = ["t", "m", "u", "x"].join("");
  // Completion-time provenance re-derives every cited audit verdict, so the gate must
  // carry a genuine verdict bound to a real criterion's re-run, not a dummy.
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
    ".superloopy/evidence/matrix-gate.json",
    "--json"
  ], { cwd: repo });

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.plan.aggregateCompletion.qualityGate.architectReview.recommendation, "APPROVE");
  assert.equal(parsed.plan.aggregateCompletion.qualityGate.executorQa.contractCoverage[0].status, "covered");
});

test("golden: matrix quality gate rejects inline-only executor QA proof", async () => {
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
  const gate = matrixStyleQualityGate(await writeMatrixGateArtifacts(repo));
  gate.executorQa.artifactRefs[0] = {
    id: "cli-run",
    kind: "cli-transcript",
    description: "Inline-only proof is not enough.",
    inlineEvidence: "The CLI allegedly passed."
  };
  await writeFile(join(repo, ".superloopy", "evidence", "inline-only-gate.json"), JSON.stringify(gate), "utf8");

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
    ".superloopy/evidence/inline-only-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /inlineEvidence|artifactRefs/);
});

test("golden: matrix quality gate rejects not-applicable adversarial cases", async () => {
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
  const gate = cloneJson(matrixStyleQualityGate(await writeMatrixGateArtifacts(repo)));
  gate.executorQa.adversarialCases[0].status = "not_applicable";
  await writeFile(join(repo, ".superloopy", "evidence", "na-adversarial-gate.json"), JSON.stringify(gate), "utf8");

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
    ".superloopy/evidence/na-adversarial-gate.json"
  ], { cwd: repo });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /adversarialCases|not_applicable/);
});

test("matrix quality gate accepts literal mobile and tablet surfaces with native interaction and visual proof", () => {
  for (const surface of ["mobile", "tablet"]) {
    const gate = matrixGateForSurface(surface, ["app-automation-transcript", "screenshot", "accessibility-tree", "device-report"]);
    assert.doesNotThrow(() => validateMatrixQualityGate(gate, identityArtifactPath), surface);
  }
});

test("matrix quality gate rejects screenshot-only native proof", () => {
  const gate = matrixGateForSurface("native mobile app", ["screenshot"]);

  assert.throws(
    () => validateMatrixQualityGate(gate, identityArtifactPath),
    /native.*interaction|interaction.*native/i
  );
});

test("matrix quality gate preserves legacy full-surface proof when owner and claims are absent", () => {
  const cases = [
    ["browser", ["browser-automation", "screenshot", "accessibility-tree"]],
    ["native", ["app-automation-transcript", "screenshot", "accessibility-tree", "device-report", "package-lifecycle-report"]],
    ["hybrid", ["browser-automation", "app-automation-transcript", "screenshot", "accessibility-tree", "device-report", "package-lifecycle-report"]],
    ["renderer", ["app-automation-transcript", "screenshot", "accessibility-tree", "renderer-trace"]]
  ];

  for (const [surface, kinds] of cases) {
    const gate = matrixGateForSurface(surface, kinds);
    assert.doesNotThrow(() => validateMatrixQualityGate(gate, identityArtifactPath), surface);
  }
});

test("matrix quality gate scopes composite proof to one affected owner and explicit claims", () => {
  const shellMenu = matrixGateForSurface(
    "Tauri desktop",
    ["app-automation-transcript", "device-report"],
    { target: target("windows-menu", "windows", "Windows 11 desktop"), owner: "native", claims: ["interaction", "target"], scopeReason: "Only the native menu owner changed." }
  );
  const embeddedClient = matrixGateForSurface(
    "Tauri desktop",
    ["client-automation-transcript"],
    { target: target("windows-client", "windows", "Embedded client on Windows 11 desktop"), owner: "browser", claims: ["interaction"], scopeReason: "Only the embedded client interaction changed." }
  );
  const flutterColor = matrixGateForSurface(
    "Flutter Android",
    ["screenshot"],
    { target: target("android-phone", "android", "Android 15 phone"), owner: "renderer", claims: ["visual"], scopeReason: "Only renderer-owned color output changed." }
  );

  assert.doesNotThrow(() => validateMatrixQualityGate(shellMenu, identityArtifactPath));
  assert.doesNotThrow(() => validateMatrixQualityGate(embeddedClient, identityArtifactPath));
  assert.doesNotThrow(() => validateMatrixQualityGate(flutterColor, identityArtifactPath));
});

test("matrix quality gate requires a structured portable target without counting OS names in environment", () => {
  const missingTarget = matrixGateForSurface(
    "Tauri desktop",
    ["app-automation-transcript", "device-report"],
    { owner: "native", claims: ["interaction", "target"], scopeReason: "Only the native menu owner changed." }
  );
  const hostNamesInEnvironment = matrixGateForSurface(
    "native iOS app",
    ["app-automation-transcript", "device-report"],
    {
      owner: "native",
      claims: ["interaction", "target"],
      scopeReason: "The iOS deployment is exercised through cross-host tooling.",
      target: target("ios-simulator", "ios", "iOS simulator hosted on macOS and observed from a Windows runner")
    }
  );
  const stringTarget = matrixGateForSurface(
    "native iOS app",
    ["app-automation-transcript", "device-report"],
    { target: "iOS simulator", owner: "native", claims: ["interaction", "target"], scopeReason: "Old free-text schema." }
  );

  assert.throws(() => validateMatrixQualityGate(missingTarget, identityArtifactPath), /target/i);
  assert.throws(() => validateMatrixQualityGate(stringTarget, identityArtifactPath), /target.*object|object.*target/i);
  const parsed = validateMatrixQualityGate(hostNamesInEnvironment, identityArtifactPath);
  assert.deepEqual(parsed.executorQa.surfaceEvidence[0].target, target("ios-simulator", "ios", "iOS simulator hosted on macOS and observed from a Windows runner"));

  const genericIds = [
    matrixGateForSurface("browser", ["browser-automation"], {
      target: target("web", "web", "Chrome 126 on Ubuntu 24.04"), owner: "browser", claims: ["interaction"], scopeReason: "One concrete Web run."
    }),
    matrixGateForSurface("browser", ["browser-automation"], { target: target("browser", "browser", "Firefox 128 on Windows 11"), owner: "browser", claims: ["interaction"], scopeReason: "One concrete browser run." }),
    matrixGateForSurface("native", ["app-automation-transcript", "device-report"], {
      target: target("desktop", "desktop", "Windows 11 workstation"), owner: "native", claims: ["interaction"], scopeReason: "One concrete desktop run."
    }),
    matrixGateForSurface("native", ["app-automation-transcript", "device-report"], {
      target: target("mobile", "mobile", "iPhone 15 running iOS 18"), owner: "native", claims: ["interaction"], scopeReason: "One concrete mobile run."
    }), matrixGateForSurface("native", ["app-automation-transcript", "device-report"], {
      target: target("android-emulator", "android", "Android emulator on Linux"), owner: "native", claims: ["interaction"], scopeReason: "One concrete emulator run."
    })
  ];
  for (const gate of genericIds) assert.doesNotThrow(() => validateMatrixQualityGate(gate, identityArtifactPath));
});

test("matrix quality gate rejects nonportable or vague scoped target identifiers", () => {
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
    const gate = matrixGateForSurface(
      "native Windows app",
      ["app-automation-transcript", "device-report"],
      { target: invalidTarget, owner: "native", claims: ["interaction", "target"], scopeReason: "Target schema probe." }
    );
    assert.throws(() => validateMatrixQualityGate(gate, identityArtifactPath), /target|portable|platform|environment|vague/i, JSON.stringify(invalidTarget));
  }
});

test("matrix quality gate keeps scoped rows and resolved artifacts one-to-one", () => {
  const duplicateScope = matrixGateForSurface("browser", ["browser-automation", "browser-automation"]);
  Object.assign(duplicateScope.executorQa.surfaceEvidence[0], {
    target: target("chrome-linux", "web", "Chrome on Linux"),
    owner: "browser",
    claims: ["interaction"],
    scopeReason: "Primary interaction proof.",
    artifactRefs: ["proof-0"]
  });
  duplicateScope.executorQa.surfaceEvidence.push({
    ...structuredClone(duplicateScope.executorQa.surfaceEvidence[0]),
    id: "surface-second",
    artifactRefs: ["proof-1"]
  });
  duplicateScope.executorQa.contractCoverage[0].surfaceEvidenceRefs.push("surface-second");

  const sharedArtifact = structuredClone(duplicateScope);
  sharedArtifact.executorQa.surfaceEvidence[1].target = target("firefox-linux", "web", "Firefox on Linux");
  sharedArtifact.executorQa.surfaceEvidence[1].artifactRefs = ["proof-0"];

  const duplicateResolvedDeclaration = matrixGateForSurface("browser", ["browser-automation", "browser-automation"]);
  duplicateResolvedDeclaration.executorQa.artifactRefs[0].path = ".superloopy/evidence/primary-proof.txt";
  duplicateResolvedDeclaration.executorQa.artifactRefs[1].path = ".superloopy/evidence/alias-proof.txt";
  const resolveAlias = (value) => value.endsWith("primary-proof.txt") || value.endsWith("alias-proof.txt")
    ? "/resolved/shared-proof.txt"
    : value;

  assert.throws(() => validateMatrixQualityGate(duplicateScope, identityArtifactPath), /duplicate.*target.*owner|target.*owner.*duplicate/i);
  assert.throws(() => validateMatrixQualityGate(sharedArtifact, identityArtifactPath), /artifact.*reused|reused.*artifact|distinct.*target/i);
  assert.throws(() => validateMatrixQualityGate(duplicateResolvedDeclaration, resolveAlias), /duplicate.*resolved.*path|resolved.*path.*duplicate/i);
});

test("matrix quality gate rejects incomplete or incoherent claim-shaped scope", () => {
  const bridgeWithoutShell = matrixGateForSurface(
    "Tauri desktop",
    ["client-automation-transcript"],
    { target: target("windows-bridge", "windows", "Windows 11 desktop"), owner: "hybrid", claims: ["interaction"], scopeReason: "The bridge journey changed." }
  );
  const visualWithoutImage = matrixGateForSurface(
    "Flutter Android",
    ["app-automation-transcript"],
    { target: target("android-phone", "android", "Android 15 phone"), owner: "renderer", claims: ["visual"], scopeReason: "Renderer-owned visual output changed." }
  );
  const impossibleOwner = matrixGateForSurface(
    "native desktop",
    ["browser-automation"],
    { target: target("windows-client", "windows", "Windows 11 desktop"), owner: "browser", claims: ["interaction"], scopeReason: "Incorrectly attributes a native-only surface to a browser owner." }
  );
  const missingOwner = matrixGateForSurface(
    "native desktop",
    ["app-automation-transcript"],
    { claims: ["interaction"] }
  );
  const hybridVisualWithoutBothSides = matrixGateForSurface(
    "Tauri desktop",
    ["screenshot", "device-report"],
    { target: target("windows-bridge", "windows", "Windows 11 desktop"), owner: "hybrid", claims: ["visual"], scopeReason: "Bridge-owned visible state changed." }
  );

  assert.throws(() => validateMatrixQualityGate(bridgeWithoutShell, identityArtifactPath), /shell interaction/i);
  assert.throws(() => validateMatrixQualityGate(visualWithoutImage, identityArtifactPath), /visual.*screenshot|screenshot.*visual/i);
  assert.throws(() => validateMatrixQualityGate(impossibleOwner, identityArtifactPath), /owner.*browser.*not.*surface|browser.*owner.*surface/i);
  assert.throws(() => validateMatrixQualityGate(missingOwner, identityArtifactPath), /owner.*claims|claims.*owner/i);
  assert.throws(() => validateMatrixQualityGate(hybridVisualWithoutBothSides, identityArtifactPath), /client interaction.*shell interaction|shell interaction.*client interaction/i);
});

test("matrix quality gate accepts browser automation as custom-renderer interaction proof", () => {
  const gate = matrixGateForSurface("custom-rendered Web", ["browser-automation", "screenshot", "accessibility-tree", "renderer-trace"]);

  assert.doesNotThrow(() => validateMatrixQualityGate(gate, identityArtifactPath));
});

test("matrix quality gate keeps browser targets Web-only while embedded WebView remains composite", () => {
  for (const surface of ["mobile Web", "desktop browser", "mobile PWA", "Chrome extension on desktop"]) {
    const gate = matrixGateForSurface(surface, ["browser-automation"]);
    assert.doesNotThrow(() => validateMatrixQualityGate(gate, identityArtifactPath), surface);
  }
  const embedded = matrixGateForSurface(
    "embedded mobile WebView",
    ["client-automation-transcript", "app-automation-transcript", "device-report"]
  );
  assert.doesNotThrow(() => validateMatrixQualityGate(embedded, identityArtifactPath));
});

test("matrix quality gate preserves PTY proof for the existing TUI surface", () => {
  const gate = matrixGateForSurface("tui", ["pty-capture"]);

  assert.doesNotThrow(() => validateMatrixQualityGate(gate, identityArtifactPath));
});

test("matrix quality gate accepts nonvisual claim-shaped proof without a decorative screenshot", () => {
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
    const gate = matrixGateForSurface(surface, kinds, { target: scopedTarget, owner, claims, scopeReason: "Only the named nonvisual claim changed." });
    assert.doesNotThrow(() => validateMatrixQualityGate(gate, identityArtifactPath), surface);
  }
});

test("matrix quality gate preserves exact legacy surface proof while scoped rows use stronger claims", () => {
  for (const surface of ["native", "desktop", "tui"]) {
    assert.doesNotThrow(() => validateMatrixQualityGate(matrixGateForSurface(surface, ["screenshot"]), identityArtifactPath), surface);
  }
  assert.doesNotThrow(() => validateMatrixQualityGate(matrixGateForSurface("tui", ["app-automation-transcript"]), identityArtifactPath));
  assert.doesNotThrow(() => validateMatrixQualityGate(matrixGateForSurface("browser", ["browser-automation", "screenshot"]), identityArtifactPath));
  assert.throws(() => validateMatrixQualityGate(matrixGateForSurface("browser", ["browser-automation"]), identityArtifactPath), /screenshot|visual/i);
});

test("matrix quality gate rejects incompatible or missing HTTP and data proof", () => {
  const browserWithHttpDump = matrixGateForSurface("browser", ["browser-automation", "http-dump"]);
  const httpWithScreenshot = matrixGateForSurface("http", ["screenshot"]);
  const dataWithLog = matrixGateForSurface("data", ["log"]);

  assert.throws(() => validateMatrixQualityGate(browserWithHttpDump, identityArtifactPath), /incompatible/i);
  assert.throws(() => validateMatrixQualityGate(httpWithScreenshot, identityArtifactPath), /incompatible|HTTP.*dump/i);
  assert.throws(() => validateMatrixQualityGate(dataWithLog, identityArtifactPath), /incompatible|data.*diff|package.*report/i);
});

test("matrix quality gate enforces composite hybrid renderer ownership", () => {
  const incomplete = matrixGateForSurface(
    "custom-rendered WebView hybrid",
    ["app-automation-transcript", "accessibility-tree", "device-report", "renderer-trace"]
  );
  const complete = matrixGateForSurface(
    "custom-rendered WebView hybrid",
    ["app-automation-transcript", "client-automation-transcript", "accessibility-tree", "device-report", "renderer-trace"]
  );

  assert.throws(() => validateMatrixQualityGate(incomplete, identityArtifactPath), /client interaction/i);
  assert.doesNotThrow(() => validateMatrixQualityGate(complete, identityArtifactPath));
});

test("matrix contract coverage cannot borrow proof from an unrelated contract", () => {
  const mismatchedSurface = matrixGateForSurface(
    "Flutter Android",
    ["screenshot"],
    { target: target("android-phone", "android", "Android 15 phone"), owner: "renderer", claims: ["visual"], scopeReason: "Only renderer-owned color output changed." }
  );
  mismatchedSurface.executorQa.contractCoverage[0].contractRef = "approved-plan:critical-bridge";

  const mismatchedAdversarial = cloneJson(mismatchedSurface);
  mismatchedAdversarial.executorQa.surfaceEvidence[0].contractRef = "approved-plan:critical-bridge";

  const artifactOnly = matrixGateForSurface("mobile Web", ["browser-automation"]);
  artifactOnly.executorQa.contractCoverage[0].surfaceEvidenceRefs = [];
  artifactOnly.executorQa.contractCoverage[0].adversarialCaseRefs = [];
  artifactOnly.executorQa.contractCoverage[0].artifactRefs = ["proof-0"];

  assert.throws(() => validateMatrixQualityGate(mismatchedSurface, identityArtifactPath), /contractRef.*match|match.*contractRef/i);
  assert.throws(() => validateMatrixQualityGate(mismatchedAdversarial, identityArtifactPath), /contractRef.*match|match.*contractRef/i);
  assert.throws(() => validateMatrixQualityGate(artifactOnly, identityArtifactPath), /proof row|surfaceEvidenceRefs|adversarialCaseRefs/i);
});

test("matrix proof rows and coverage rows reject duplicate IDs", () => {
  const duplicateSurface = matrixGateForSurface("mobile Web", ["browser-automation"]);
  duplicateSurface.executorQa.surfaceEvidence.push(cloneJson(duplicateSurface.executorQa.surfaceEvidence[0]));

  const duplicateAdversarial = matrixGateForSurface("mobile Web", ["browser-automation"]);
  duplicateAdversarial.executorQa.adversarialCases.push(cloneJson(duplicateAdversarial.executorQa.adversarialCases[0]));

  const duplicateCoverage = matrixGateForSurface("mobile Web", ["browser-automation"]);
  duplicateCoverage.executorQa.contractCoverage.push(cloneJson(duplicateCoverage.executorQa.contractCoverage[0]));

  assert.throws(() => validateMatrixQualityGate(duplicateSurface, identityArtifactPath), /duplicate.*surface|surface.*duplicate/i);
  assert.throws(() => validateMatrixQualityGate(duplicateAdversarial, identityArtifactPath), /duplicate.*adversarial|adversarial.*duplicate/i);
  assert.throws(() => validateMatrixQualityGate(duplicateCoverage, identityArtifactPath), /duplicate.*contract|contract.*duplicate/i);
});

test("matrix rejects empty adversarial proof and proof fields hidden behind not-applicable", () => {
  const emptyAdversarial = matrixGateForSurface("mobile Web", ["browser-automation"]);
  emptyAdversarial.executorQa.adversarialCases[0].artifactRefs = [];

  const hiddenScope = matrixGateForSurface("browser", ["browser-automation"]);
  Object.assign(hiddenScope.executorQa.surfaceEvidence[0], {
    status: "not_applicable",
    reason: "This contract is outside the selected target.",
    owner: "browser"
  });
  const scopedAdversarial = matrixGateForSurface("mobile Web", ["browser-automation"]);
  scopedAdversarial.executorQa.adversarialCases[0].owner = "browser";
  const scopedCoverage = matrixGateForSurface("mobile Web", ["browser-automation"]);
  scopedCoverage.executorQa.contractCoverage[0].scopeReason = "Pretends to declare a target slice.";

  assert.throws(() => validateMatrixQualityGate(emptyAdversarial, identityArtifactPath), /artifactRefs.*empty|must not be empty/i);
  assert.throws(() => validateMatrixQualityGate(hiddenScope, identityArtifactPath), /not_applicable.*proof|proof.*not_applicable|owner/i);
  assert.throws(() => validateMatrixQualityGate(scopedAdversarial, identityArtifactPath), /adversarial.*scope|scope.*adversarial|owner.*not.*allowed/i);
  assert.throws(() => validateMatrixQualityGate(scopedCoverage, identityArtifactPath), /contractCoverage.*scope|scope.*contractCoverage|scopeReason.*not.*allowed/i);
});
