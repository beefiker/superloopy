import { validateAuditSection } from "./audit-verdict.js";
const REQUIRED_SECTIONS = ["codeReview", "manualQa", "gateReview", "iteration", "criteriaCoverage"];
const TERMINAL_MULTIPLEXER_SURFACE = ["t", "m", "u", "x"].join("");
const VAGUE_TARGET_TOKENS = new Set(["all", "any", "every", "multi", "multiple", "cross", "universal", "supported", "targets", "devices", "platforms", "browsers"]);
const VAGUE_AGGREGATE_SYMBOL = /^(?:(?:all|any|every|multi|multiple|cross|universal|supported)(?:targets?|devices?|platforms?|browsers?)|targets|devices|platforms|browsers)$/u;
export function isReviewQualityGate(value) { return REQUIRED_SECTIONS.every((key) => isRecord(value[key])); }
export function validateReviewQualityGate(value, resolveArtifactPath) {
  const codeReview = section(value.codeReview, "codeReview");
  const manualQa = section(value.manualQa, "manualQa");
  const gateReview = section(value.gateReview, "gateReview");
  const iteration = section(value.iteration, "iteration");
  const coverage = section(value.criteriaCoverage, "criteriaCoverage");
  const artifactRefs = parseArtifactRefs(manualQa.artifactRefs, resolveArtifactPath);
  const byId = new Map(artifactRefs.map((artifact) => [artifact.id, artifact]));

  return {
    codeReview: {
      by: textField(codeReview.by, "codeReview.by"),
      recommendation: literal(textField(codeReview.recommendation, "codeReview.recommendation"), "APPROVE", "codeReview.recommendation"),
      codeQualityStatus: literal(textField(codeReview.codeQualityStatus, "codeReview.codeQualityStatus"), "CLEAR", "codeReview.codeQualityStatus"),
      reportPath: artifactPath(codeReview.reportPath, "codeReview.reportPath", resolveArtifactPath),
      evidence: textField(codeReview.evidence, "codeReview.evidence"),
      blockers: emptyBlockers(codeReview.blockers, "codeReview.blockers")
    },
    manualQa: {
      by: textField(manualQa.by, "manualQa.by"),
      status: literal(textField(manualQa.status, "manualQa.status"), "passed", "manualQa.status"),
      evidence: textField(manualQa.evidence, "manualQa.evidence"),
      surfaceEvidence: parseSurfaceEvidence(manualQa.surfaceEvidence, byId),
      adversarialCases: parseAdversarialCases(manualQa.adversarialCases, byId),
      artifactRefs
    },
    gateReview: {
      by: textField(gateReview.by, "gateReview.by"),
      recommendation: literal(textField(gateReview.recommendation, "gateReview.recommendation"), "APPROVE", "gateReview.recommendation"),
      reportPath: artifactPath(gateReview.reportPath, "gateReview.reportPath", resolveArtifactPath),
      evidence: textField(gateReview.evidence, "gateReview.evidence"),
      blockers: emptyBlockers(gateReview.blockers, "gateReview.blockers")
    },
    iteration: {
      fullRerun: literal(iteration.fullRerun, true, "iteration.fullRerun"),
      status: literal(textField(iteration.status, "iteration.status"), "passed", "iteration.status"),
      rerunCommands: stringArray(iteration.rerunCommands, "iteration.rerunCommands"),
      evidence: textField(iteration.evidence, "iteration.evidence")
    },
    criteriaCoverage: validateCriteriaCoverage(coverage),
    audit: validateAuditSection(value.audit, resolveArtifactPath)
  };
}

function parseArtifactRefs(value, resolveArtifactPath) {
  if (!Array.isArray(value) || value.length === 0) fail("manualQa.artifactRefs must not be empty.");
  const seenIds = new Set();
  const seenPaths = new Set();
  return value.map((item, index) => {
    const ref = section(item, `manualQa.artifactRefs[${index}]`);
    const id = textField(ref.id, `manualQa.artifactRefs[${index}].id`);
    if (seenIds.has(id)) fail(`manualQa.artifactRefs contains duplicate ${id}.`);
    seenIds.add(id);
    const path = artifactPath(ref.path, `manualQa.artifactRefs[${index}].path`, resolveArtifactPath);
    if (seenPaths.has(path)) fail(`manualQa.artifactRefs contains duplicate resolved path ${path}.`);
    seenPaths.add(path);
    return {
      id,
      kind: qualityGateArtifactKind(ref.kind, `manualQa.artifactRefs[${index}].kind`),
      description: textField(ref.description, `manualQa.artifactRefs[${index}].description`),
      path
    };
  });
}

function parseSurfaceEvidence(value, byId) {
  if (!Array.isArray(value) || value.length === 0) fail("manualQa.surfaceEvidence must not be empty.");
  const seen = new Set();
  const seenScopes = new Set();
  const artifactScopes = new Map();
  return value.map((item, index) => {
    const row = section(item, `manualQa.surfaceEvidence[${index}]`);
    const id = textField(row.id, `manualQa.surfaceEvidence[${index}].id`);
    if (seen.has(id)) fail(`manualQa.surfaceEvidence contains duplicate ${id}.`);
    seen.add(id);
    const surfaceField = `manualQa.surfaceEvidence[${index}].surface`;
    const surface = textField(row.surface, surfaceField);
    const families = qualityGateSurfaceFamilies(surface, surfaceField);
    const scope = qualityGateEvidenceScope(row, families, `manualQa.surfaceEvidence[${index}]`);
    const artifactRefs = referencedArtifacts(row.artifactRefs, `manualQa.surfaceEvidence[${index}].artifactRefs`, byId);
    registerScopedEvidence(scope, artifactRefs, `manualQa.surfaceEvidence[${index}]`, seenScopes, artifactScopes);
    for (const artifact of artifactRefs) {
      if (!qualityGateArtifactCompatible(scope.proofFamilies, artifact.kind)) fail(`manualQa.surfaceEvidence ${surface} artifact ${artifact.kind} is incompatible.`);
    }
    requireQualityGateSurfaceProof(scope.proofFamilies, artifactRefs, `manualQa.surfaceEvidence[${index}]`, {
      claims: scope.claims,
      legacyBrowserProof: !scope.scoped && ["browser", "gui"].includes(surface.trim().toLowerCase())
    });
    requireReviewPassedOutcome(row, `manualQa.surfaceEvidence[${index}]`);
    return {
      id,
      criterionRef: textField(row.criterionRef, `manualQa.surfaceEvidence[${index}].criterionRef`),
      surface,
      invocation: textField(row.invocation, `manualQa.surfaceEvidence[${index}].invocation`),
      verdict: passedVerdict(row.verdict, `manualQa.surfaceEvidence[${index}].verdict`),
      artifactRefs: artifactRefs.map((artifact) => artifact.id),
      ...(scope.scoped ? { target: scope.target, owner: scope.owner, claims: scope.claims, scopeReason: scope.scopeReason } : {})
    };
  });
}

function parseAdversarialCases(value, byId) {
  if (!Array.isArray(value) || value.length === 0) fail("manualQa.adversarialCases must not be empty.");
  const seen = new Set();
  return value.map((item, index) => {
    const row = section(item, `manualQa.adversarialCases[${index}]`);
    rejectQualityGateScopeFields(row, `manualQa.adversarialCases[${index}]`);
    const id = textField(row.id, `manualQa.adversarialCases[${index}].id`);
    if (seen.has(id)) fail(`manualQa.adversarialCases contains duplicate ${id}.`);
    seen.add(id);
    const artifactRefs = referencedArtifacts(row.artifactRefs, `manualQa.adversarialCases[${index}].artifactRefs`, byId);
    requireReviewPassedOutcome(row, `manualQa.adversarialCases[${index}]`);
    return {
      id,
      criterionRef: textField(row.criterionRef, `manualQa.adversarialCases[${index}].criterionRef`),
      scenario: textField(row.scenario, `manualQa.adversarialCases[${index}].scenario`),
      expectedBehavior: textField(row.expectedBehavior, `manualQa.adversarialCases[${index}].expectedBehavior`),
      verdict: passedVerdict(row.verdict, `manualQa.adversarialCases[${index}].verdict`),
      artifactRefs: artifactRefs.map((artifact) => artifact.id)
    };
  });
}

function validateCriteriaCoverage(coverage) {
  const totalCriteria = numberField(coverage.totalCriteria, "criteriaCoverage.totalCriteria");
  const passCount = numberField(coverage.passCount, "criteriaCoverage.passCount");
  if (passCount < totalCriteria) fail("criteriaCoverage.passCount must cover totalCriteria.");
  return {
    totalCriteria,
    passCount,
    originalIntent: textField(coverage.originalIntent, "criteriaCoverage.originalIntent"),
    desiredOutcome: textField(coverage.desiredOutcome, "criteriaCoverage.desiredOutcome"),
    userOutcomeReview: textField(coverage.userOutcomeReview, "criteriaCoverage.userOutcomeReview"),
    adversarialClassesCovered: stringArray(coverage.adversarialClassesCovered, "criteriaCoverage.adversarialClassesCovered")
  };
}

export function artifactPath(value, field, resolveArtifactPath) { return resolveArtifactPath(textField(value, field)); }
export function section(value, field) { if (!isRecord(value)) fail(`${field} must be an object.`); return value; }

export function textField(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) fail(`${field} must be a non-empty string.`);
  const trimmed = value.trim();
  if (/^(todo|tbd|placeholder)$/iu.test(trimmed)) fail(`${field} must not be placeholder text.`);
  return trimmed;
}

function numberField(value, field) { if (typeof value !== "number" || !Number.isFinite(value)) fail(`${field} must be a number.`); return value; }

export function literal(value, expected, field) { if (value !== expected) fail(`${field} must be ${expected}.`); return expected; }

export function emptyBlockers(value, field) { if (!Array.isArray(value)) fail(`${field} must be an array.`); if (value.length !== 0) fail(`${field} must be empty.`); return []; }

export function stringArray(value, field) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.trim().length > 0)) fail(`${field} must be a string array.`);
  return value.map((item) => item.trim());
}

export function referencedArtifacts(value, field, byId) {
  const ids = stringArray(value, field);
  if (ids.length === 0) fail(`${field} must not be empty.`);
  return ids.map((id) => {
    const artifact = byId.get(id);
    if (artifact === undefined) fail(`${field} references unknown artifact ${id}.`);
    return artifact;
  });
}

export function passedVerdict(value, field) { if (value === "not_applicable") fail(`${field} must not be not_applicable.`); return literal(value, "passed", field); }

export function qualityGateSurfaceFamily(value, field) { return qualityGateSurfaceFamilies(value, field)[0]; }

export function qualityGateSurfaceFamilies(value, field) {
  const surface = textField(value, field);
  const normalized = surface.toLowerCase();
  if (normalized === TERMINAL_MULTIPLEXER_SURFACE) return ["cli"];
  const tui = /\btui\b/u.test(normalized);
  const namedExtension = /\b(?:chrome|firefox|safari|edge)\s+(?:extension|add-on)\b/u.test(normalized)
    || /\bwebextensions?\b/u.test(normalized);
  const namedBrowser = /\b(?:chrome|chromium|firefox|safari)\s+(?:(?:desktop|mobile)\s+)?browser\b/u.test(normalized)
    || /\b(?:chrome|chromium|firefox|safari)\s+on\s+(?:android|ios|ipados|macos|windows|linux|iphone|ipad|mac|macintosh)\b/u.test(normalized)
    || /\b(?:android|ios|ipados|macos|windows|linux|iphone|ipad|mac|macintosh)\s+(?:chrome|chromium|firefox|safari)\b/u.test(normalized)
    || /\bmicrosoft\s+edge(?:\s+browser)?(?:\s+on\s+(?:android|ios|ipados|macos|windows|linux|iphone|ipad|mac|macintosh))?\b/u.test(normalized)
    || /\bedge\s+(?:browser|on\s+(?:android|ios|ipados|macos|windows|linux|iphone|ipad|mac|macintosh))\b/u.test(normalized)
    || /^(?:chrome|chromium|firefox|safari|microsoft edge)$/u.test(normalized);
  const reactNativeBrand = /\breact[- ]native\b/u.test(normalized);
  const reactNativeWeb = /\breact[- ]native[- ]web\b/u.test(normalized)
    || /\breact[- ]native\s+(?:app\s+)?(?:for|on)\s+(?:the\s+)?web\b/u.test(normalized);
  const rendererWebLabel = /\b(?:pixijs|webgpu)\b/u.test(normalized)
    || /\b(?:three|babylon)\.js\b/u.test(normalized);
  const explicitBrowser = /\b(web|browser|pwa|html|webassembly|wasm|webgl|blazor)\b/u.test(normalized)
    || namedExtension
    || namedBrowser
    || rendererWebLabel
    || normalized === "gui";
  const reactNativeBrowserDelivery = reactNativeWeb || (explicitBrowser && reactNativeBrand);
  const compatibleWebBrand = /\b(?:avalonia|slint|kivy|juce|capacitor|cordova|maui)\b/u.test(normalized)
    || reactNativeBrowserDelivery;
  const browserDeployedCompatibleBrand = explicitBrowser && compatibleWebBrand;

  const embeddedWeb = /\bembedded\b/u.test(normalized) && /\b(web|html|browser)\b/u.test(normalized);
  const inherentHybrid = /\b(hybrid|webview2?|electron|tauri|pywebview|wkwebview|cef|webkitgtk|sfsafariviewcontroller)\b/u.test(normalized)
    || embeddedWeb
    || /\b(?:maui\s+hybrid|qt\s+webengine)\b/u.test(normalized);
  const compatibleHybrid = /\b(?:capacitor|cordova)\b/u.test(normalized) && !browserDeployedCompatibleBrand;
  const hybrid = inherentHybrid || compatibleHybrid;

  const qtWebAssembly = /\b(?:qt|qml)\b.*\b(webassembly|wasm)\b/u.test(normalized)
    || /\b(webassembly|wasm)\b.*\b(?:qt|qml)\b/u.test(normalized);
  const contentCompose = /\b(?:email|message)\s+compose\b/u.test(normalized)
    || /\bcompose\s+(?:email|message)\b/u.test(normalized);
  const composeFramework = !contentCompose && (
    /\bjetpack\s+compose\b/u.test(normalized)
    || /\bcompose\s+(?:ui|desktop|multiplatform|for\s+desktop)\b/u.test(normalized)
    || /\b(?:android|desktop)\s+compose\s+(?:app|ui)\b/u.test(normalized)
  );
  const qtRenderer = /\bqt\s+quick\b/u.test(normalized) || /\bqml\b/u.test(normalized);
  const visualToolkitWeb = explicitBrowser && /\b(?:avalonia|slint|kivy|juce)\b/u.test(normalized);
  const renderer = /\b(renderer|canvas|texture|flutter|skia|webgl|webgpu)\b/u.test(normalized)
    || /\bscene[- ]?graph\b/u.test(normalized)
    || /\bcustom[- ]rendered\b/u.test(normalized)
    || composeFramework
    || qtRenderer
    || qtWebAssembly
    || rendererWebLabel
    || visualToolkitWeb;

  const nativeAppTarget = /\bnative\s+(?:android|ios|ipados|macos|windows|linux|iphone|ipad|mac|macintosh)\b/u.test(normalized)
    || /\b(?:android|ios|ipados|macos|windows|linux|iphone|ipad|mac|macintosh)\s+(?:native\s+)?(?:app|application)\b/u.test(normalized);
  const browserOnlyNativeWord = explicitBrowser && !nativeAppTarget;
  const embeddedNative = /\bembedded\b.*\b(system|device|touchscreen|firmware|native)\b/u.test(normalized);
  const nativeKeyword = /\bnative\b/u.test(normalized) && !reactNativeBrowserDelivery && !browserOnlyNativeWord;
  const qtNative = /\b(qt|qml)\b/u.test(normalized) && !qtWebAssembly;
  const compatibleNativeFramework = /\b(?:avalonia|slint|kivy|juce|maui)\b/u.test(normalized)
    && !browserDeployedCompatibleBrand;
  const explicitNative = nativeKeyword
    || qtNative
    || /\b(swiftui|uikit|appkit|winui|wpf|gtk|tkinter|customtkinter|wxwidgets|wxpython|javafx|swing|winforms|windows\s+forms|xamarin|nativescript)\b/u.test(normalized)
    || compatibleNativeFramework
    || (reactNativeBrand && !reactNativeBrowserDelivery)
    || /\bmac\s+catalyst\b/u.test(normalized)
    || embeddedNative;
  const deviceUi = /\bdevice\s+(?:ui|app|application)\b/u.test(normalized);
  const genericTarget = /\b(desktop|mobile|tablet)\b/u.test(normalized);
  const concreteNativeTarget = /\b(android|ios|ipados|macos|windows|linux|iphone|ipad|mac|macintosh)\b/u.test(normalized);

  const strongCli = /\b(?:cli|terminal|tmux|command[- ]line)\b/u.test(normalized);
  const shell = /\bshell\b/u.test(normalized);
  const http = /\bhttp\b/u.test(normalized);
  const data = /\b(?:data|api|package|algorithm|math)\b/u.test(normalized);
  const gui = /\bgui\b/u.test(normalized);
  const platformGui = /\b(?:android|ios|ipados|macos|windows|linux|iphone|ipad|mac|macintosh)\s+gui\b/u.test(normalized);
  const supportedGui = normalized === "gui" || explicitBrowser || hybrid || renderer || explicitNative || deviceUi || genericTarget || platformGui;
  if (gui && !supportedGui) {
    fail(`${field} contains an ambiguous GUI; name a supported framework, delivery target, or owner.`);
  }
  const uiContext = tui || explicitBrowser || hybrid || renderer || explicitNative || deviceUi || /\b(?:gui|ui|app|application)\b/u.test(normalized);
  if (!uiContext && (strongCli || shell)) return ["cli"];
  if (!uiContext && http) return ["http"];
  if (!uiContext && data) return ["data"];

  const browser = explicitBrowser || hybrid;
  const native = explicitNative
    || (deviceUi && !explicitBrowser)
    || hybrid
    || (!tui && concreteNativeTarget && (!explicitBrowser || nativeAppTarget))
    || (!tui && genericTarget && !explicitBrowser);

  const families = [];
  if (tui) families.push("tui");
  if (strongCli) families.push("cli");
  if (hybrid) families.push("hybrid");
  if (renderer) families.push("renderer");
  if (native) families.push("native");
  if (browser) families.push("browser");
  if (tui && http) families.push("http");
  if (tui && data && !http) families.push("data");
  if (families.length > 0) return families;
  fail(`${field} must be a supported QA surface.`);
}

export function qualityGateEvidenceScope(row, surfaceFamilies, field) {
  const scopedFields = ["target", "owner", "claims", "scopeReason"];
  const present = scopedFields.filter((key) => Object.prototype.hasOwnProperty.call(row, key));
  if (present.length === 0) {
    return { scoped: false, proofFamilies: surfaceFamilies, claims: undefined };
  }
  if (present.length !== scopedFields.length) {
    fail(`${field}.target, ${field}.owner, ${field}.claims, and ${field}.scopeReason must be provided together.`);
  }

  const target = parseScopedTarget(row.target, `${field}.target`);
  const owner = textField(row.owner, `${field}.owner`).toLowerCase().replaceAll("_", "-");
  const allowedOwners = new Set(surfaceFamilies);
  if (allowedOwners.has("hybrid")) {
    allowedOwners.add("browser");
    allowedOwners.add("native");
  }
  if (!allowedOwners.has(owner)) {
    fail(`${field}.owner ${owner} is not an owner of the named surface.`);
  }

  const rawClaims = stringArray(row.claims, `${field}.claims`);
  if (rawClaims.length === 0) fail(`${field}.claims must not be empty.`);
  const claims = rawClaims.map((claim) => claim.toLowerCase().replaceAll("_", "-"));
  if (new Set(claims).size !== claims.length) fail(`${field}.claims must not contain duplicate claims.`);

  const claimsByOwner = {
    cli: ["interaction"],
    tui: ["interaction", "visual"],
    browser: ["interaction", "visual", "accessibility", "target", "package-lifecycle"],
    native: ["interaction", "visual", "accessibility", "target", "package-lifecycle"],
    hybrid: ["interaction", "visual", "accessibility", "target", "package-lifecycle"],
    renderer: ["interaction", "visual", "accessibility", "target", "renderer"],
    http: ["http"],
    data: ["data"]
  };
  for (const claim of claims) {
    if (!claimsByOwner[owner].includes(claim)) {
      fail(`${field}.claims ${claim} is not supported for owner ${owner}.`);
    }
  }

  return {
    scoped: true,
    proofFamilies: [owner],
    target,
    owner,
    claims,
    scopeReason: textField(row.scopeReason, `${field}.scopeReason`)
  };
}

export function rejectQualityGateScopeFields(row, field) { const key = ["target", "owner", "claims", "scopeReason"].find((name) => Object.prototype.hasOwnProperty.call(row, name)); if (key !== undefined) fail(`${field}.${key} is not allowed; target/owner slices belong only on surfaceEvidence rows.`); }

function parseScopedTarget(value, field) {
  const target = section(value, field);
  const id = textField(target.id, `${field}.id`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) fail(`${field}.id must be a portable lowercase hyphen slug.`);
  if (id.split("-").some((token) => VAGUE_TARGET_TOKENS.has(token)) || VAGUE_AGGREGATE_SYMBOL.test(id)) fail(`${field}.id must not contain vague target tokens or aggregate forms.`);

  const platform = textField(target.platform, `${field}.platform`);
  if (!/^[a-z0-9]+$/u.test(platform)) fail(`${field}.platform must be one lowercase alphanumeric symbolic ID.`);
  if (VAGUE_TARGET_TOKENS.has(platform) || VAGUE_AGGREGATE_SYMBOL.test(platform)) fail(`${field}.platform must not be a vague target token or aggregate form.`);
  const environment = textField(target.environment, `${field}.environment`);
  if (/\b(?:(?:all|any|every|multi|multiple|universal)[- ]+(?:supported[- ]+)?|supported[- ]+)(?:browsers?|devices?|platforms?|targets?)\b|\bcross[- ]platform\b/iu.test(environment)) fail(`${field}.environment must identify one concrete execution context, not an aggregate target set.`);
  return { id, platform, environment };
}

function registerScopedEvidence(scope, artifacts, field, seenScopes, artifactScopes) {
  if (!scope.scoped) return;
  const scopeKey = `${scope.target.id}\u0000${scope.target.platform}\u0000${scope.owner}`;
  if (seenScopes.has(scopeKey)) fail(`${field} duplicates scoped target ${scope.target.id} on platform ${scope.target.platform} for owner ${scope.owner}.`);
  seenScopes.add(scopeKey);
  for (const artifact of artifacts) {
    const priorScope = artifactScopes.get(artifact.path);
    if (priorScope !== undefined && priorScope !== scopeKey) fail(`${field} artifact path ${artifact.path} is reused across distinct scoped target/owner rows.`);
    artifactScopes.set(artifact.path, scopeKey);
  }
}

function requireReviewPassedOutcome(row, field) { for (const key of ["status", "result"]) if (row[key] !== undefined) passedVerdict(row[key], `${field}.${key}`); }

export function qualityGateArtifactKind(value, field) {
  const normalized = textField(value, field).toLowerCase().replaceAll("_", "-");
  const allowed = [
    "cli-transcript", "log", "failure-mode-test", "browser-automation", "screenshot", "image", "http-dump", "data-diff",
    "cli-replay", "pty-capture", "app-automation-transcript", "client-automation-transcript", "api-package-test-report",
    "accessibility-tree", "device-report", "package-lifecycle-report", "renderer-trace"
  ];
  if (allowed.includes(normalized)) return normalized;
  fail(`${field} must be a supported QA artifact kind.`);
}

export function requireQualityGateSurfaceProof(familyOrFamilies, artifacts, field, options = {}) {
  const families = Array.isArray(familyOrFamilies) ? familyOrFamilies : [familyOrFamilies];
  const kinds = artifacts.map((artifact) => artifact.kind);
  const has = (...expected) => kinds.some((kind) => expected.includes(kind));
  const visual = has("screenshot", "image");
  const appInteraction = has("app-automation-transcript");

  if (options.legacyMatrixSurface !== undefined) {
    const surface = options.legacyMatrixSurface;
    if (["browser", "gui", "web"].includes(surface)) {
      const automation = has("browser-automation", "app-automation-transcript");
      if (!automation || !visual) fail(`${field} for legacy GUI/web surfaces must reference automation plus screenshot artifacts.`);
      return;
    }
    if (["native", "desktop", "tui"].includes(surface)) {
      if (!has("screenshot", "image", "pty-capture", "app-automation-transcript")) {
        fail(`${field} for legacy native surfaces must reference screenshot, PTY, or app automation artifacts.`);
      }
      return;
    }
  }

  if (options.claims !== undefined) {
    for (const family of families) {
      requireClaimShapedProof(family, options.claims, { has, visual, appInteraction }, field);
    }
    return;
  }

  for (const family of families) {
    if (family === "cli" && !has("cli-transcript", "log", "cli-replay")) {
      fail(`${field} for CLI surfaces must reference CLI transcript, log, or replay artifacts.`);
    }
    if (family === "tui" && !has("pty-capture", "cli-transcript", "log", "cli-replay")) {
      fail(`${field} for TUI surfaces must reference PTY, CLI transcript, log, or replay artifacts.`);
    }
    if (family === "browser") {
      const automation = has("browser-automation", "client-automation-transcript", "app-automation-transcript");
      if (!automation && !(options.legacyBrowserProof && visual)) {
        fail(`${field} for browser surfaces must reference automation artifacts or exact-legacy visual proof.`);
      }
    }
    if (family === "native") {
      if (!appInteraction) {
        fail(`${field} for native/mobile/tablet surfaces must reference interaction artifacts; static visual proof alone is insufficient.`);
      }
      if (!has("device-report")) {
        fail(`${field} for native/mobile/tablet surfaces must reference a device report that identifies the real target.`);
      }
    }
    if (family === "hybrid") {
      const clientInteraction = has("browser-automation", "client-automation-transcript");
      if (!clientInteraction || !appInteraction) {
        fail(`${field} for hybrid surfaces must reference both client interaction and shell interaction artifacts.`);
      }
      if (!has("device-report")) {
        fail(`${field} for hybrid surfaces must reference a device report that identifies the real shell target.`);
      }
    }
    if (family === "renderer") {
      const rendererInteraction = has("browser-automation", "client-automation-transcript", "app-automation-transcript");
      const semantic = has("accessibility-tree");
      const renderer = has("renderer-trace");
      if (!rendererInteraction || !semantic || !renderer) {
        fail(`${field} for renderer surfaces must reference interaction, accessibility tree, and renderer trace artifacts.`);
      }
    }
    if (family === "http" && !has("http-dump")) {
      fail(`${field} for HTTP surfaces must reference an HTTP dump artifact.`);
    }
    if (family === "data" && !has("data-diff", "api-package-test-report")) {
      fail(`${field} for data/package surfaces must reference a data diff or API/package test report artifact.`);
    }
  }
}

export function qualityGateArtifactCompatible(familyOrFamilies, kind) {
  const families = Array.isArray(familyOrFamilies) ? familyOrFamilies : [familyOrFamilies];
  return families.some((family) => {
    if (family === "cli") return ["cli-transcript", "log", "cli-replay"].includes(kind);
    if (family === "tui") return ["pty-capture", "cli-transcript", "log", "cli-replay", "screenshot", "image", "app-automation-transcript"].includes(kind);
    if (family === "browser") return ["browser-automation", "client-automation-transcript", "app-automation-transcript", "screenshot", "image", "accessibility-tree", "device-report", "package-lifecycle-report"].includes(kind);
    if (family === "native") {
      return ["app-automation-transcript", "screenshot", "image", "accessibility-tree", "device-report", "package-lifecycle-report", "pty-capture"].includes(kind);
    }
    if (family === "hybrid") {
      return ["browser-automation", "client-automation-transcript", "app-automation-transcript", "screenshot", "image", "accessibility-tree", "device-report", "package-lifecycle-report", "renderer-trace"].includes(kind);
    }
    if (family === "renderer") {
      return ["browser-automation", "client-automation-transcript", "app-automation-transcript", "screenshot", "image", "accessibility-tree", "device-report", "renderer-trace"].includes(kind);
    }
    if (family === "http") return kind === "http-dump";
    if (family === "data") return ["data-diff", "api-package-test-report"].includes(kind);
    return false;
  });
}

function requireClaimShapedProof(family, claims, proof, field) {
  const { has, visual, appInteraction } = proof;
  const browserInteraction = has("browser-automation", "client-automation-transcript");
  const rendererInteraction = browserInteraction || appInteraction;

  const requireInteraction = (claim) => {
    if (family === "cli" && !has("cli-transcript", "log", "cli-replay")) {
      fail(`${field} ${claim} claim for CLI owner must reference CLI transcript, log, or replay artifacts.`);
    }
    if (family === "tui" && !has("pty-capture", "cli-transcript", "log", "cli-replay")) {
      fail(`${field} ${claim} claim for TUI owner must reference PTY, CLI transcript, log, or replay artifacts.`);
    }
    if (family === "browser" && !browserInteraction) {
      fail(`${field} ${claim} claim for browser owner must reference browser or client interaction artifacts.`);
    }
    if (family === "native" && !appInteraction) {
      fail(`${field} ${claim} claim for native owner must reference shell interaction artifacts.`);
    }
    if (family === "hybrid" && (!browserInteraction || !appInteraction)) {
      fail(`${field} ${claim} claim for hybrid owner must reference both client interaction and shell interaction artifacts.`);
    }
    if (family === "renderer" && !rendererInteraction) {
      fail(`${field} ${claim} claim for renderer owner must reference interaction artifacts.`);
    }
    if (["native", "hybrid"].includes(family) && !has("device-report")) {
      fail(`${field} ${claim} claim for ${family} owner must reference a device report that identifies the real target.`);
    }
  };

  if (family === "hybrid") requireInteraction("hybrid owner");

  for (const claim of claims) {
    if (claim === "interaction") requireInteraction("interaction");
    if (claim === "visual") {
      if (!visual && !(family === "tui" && has("pty-capture"))) {
        fail(`${field} visual claim for ${family} owner must reference screenshot or image artifacts.`);
      }
      if (["native", "hybrid"].includes(family) && !has("device-report")) {
        fail(`${field} visual claim for ${family} owner must reference a device report that identifies the real target.`);
      }
    }
    if (claim === "accessibility") {
      if (!has("accessibility-tree")) {
        fail(`${field} accessibility claim for ${family} owner must reference an accessibility tree artifact.`);
      }
      requireInteraction("accessibility");
    }
    if (claim === "target" && !has("device-report")) {
      fail(`${field} target claim for ${family} owner must reference a device report.`);
    }
    if (claim === "package-lifecycle") {
      if (!has("package-lifecycle-report")) {
        fail(`${field} package-lifecycle claim for ${family} owner must reference a package lifecycle report.`);
      }
      if (["native", "hybrid"].includes(family) && !has("device-report")) {
        fail(`${field} package-lifecycle claim for ${family} owner must reference a device report that identifies the real target.`);
      }
    }
    if (claim === "renderer" && !has("renderer-trace")) {
      fail(`${field} renderer claim must reference a renderer trace artifact.`);
    }
    if (claim === "http" && !has("http-dump")) {
      fail(`${field} HTTP claim must reference an HTTP dump artifact.`);
    }
    if (claim === "data" && !has("data-diff", "api-package-test-report")) {
      fail(`${field} data claim must reference a data diff or API/package test report artifact.`);
    }
  }
}

export function isRecord(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

export function fail(message) { throw new Error(message); }
