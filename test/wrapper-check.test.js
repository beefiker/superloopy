import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import test from "node:test";

import { binShimSupportsSiblingFallback, parseBinShimCliPath } from "../src/agents.js";
import { checkWrapper, evaluateWrapperCurrency } from "../src/wrapper-check.js";

function slPaths(root) {
  const superloopyDir = join(root, "cache", "superloopy");
  return {
    superloopyDir,
    binDir: join(root, "bin"),
    cliOf: (version) => join(superloopyDir, version, "src", "cli.js")
  };
}

function shimFor(cliPath) {
  return `#!/usr/bin/env sh\n# superloopy-generated bin shim\nexec node '${cliPath}' "$@"\n`;
}

function resilientShimFor(cliPath) {
  return [
    "#!/usr/bin/env sh",
    "# superloopy-generated bin shim",
    `SUPERLOOPY_SHIM_CLI='${cliPath}'`,
    "SUPERLOOPY_CLI=$(SUPERLOOPY_SHIM_CLI=\"$SUPERLOOPY_SHIM_CLI\" node -e 'const fs=require(\"node:fs\");fs.readdirSync(\".\")') || exit $?",
    "exec node \"$SUPERLOOPY_CLI\" \"$@\"",
    ""
  ].join("\n");
}

test("evaluateWrapperCurrency flags a stale versioned cache but not a current or checkout one", () => {
  const { superloopyDir, cliOf } = slPaths("wrktest");
  const present = new Set([cliOf("0.7.0"), cliOf("0.7.1")]);
  const fs = {
    existsSync: (p) => present.has(p),
    readdirSync: (p) => { if (p !== superloopyDir) throw new Error("ENOENT"); return ["0.7.0", "0.7.1"]; }
  };
  const stale = evaluateWrapperCurrency(cliOf("0.7.0"), fs);
  assert.equal(stale.state, "stale");
  assert.equal(stale.wrapperVersion, "0.7.0");
  assert.equal(stale.latestVersion, "0.7.1");
  assert.equal(stale.latestCliPath, cliOf("0.7.1"));
  assert.equal(evaluateWrapperCurrency(cliOf("0.7.1"), fs).state, "current");
  assert.equal(evaluateWrapperCurrency(join("home", "dev", "loopy", "src", "cli.js"), {
    existsSync: () => true,
    readdirSync: () => { throw new Error("unused"); }
  }).state, "untracked");
});

test("evaluateWrapperCurrency ignores a newer version dir with no cli.js", () => {
  const { superloopyDir, cliOf } = slPaths("wrktest");
  const present = new Set([cliOf("0.7.0")]);
  const fs = {
    existsSync: (p) => present.has(p),
    readdirSync: (p) => (p === superloopyDir ? ["0.7.0", "0.8.0"] : [])
  };
  assert.equal(evaluateWrapperCurrency(cliOf("0.7.0"), fs).state, "current");
});

test("parseBinShimCliPath decodes generated and resilient shims", () => {
  const apostropheShim = "#!/usr/bin/env sh\n# superloopy-generated bin shim\nexec node '/home/o'\\''connor/superloopy/0.7.1/src/cli.js' \"$@\"\n";
  assert.equal(parseBinShimCliPath(apostropheShim, "linux"), "/home/o'connor/superloopy/0.7.1/src/cli.js");
  assert.equal(parseBinShimCliPath(shimFor("/opt/superloopy/0.7.1/src/cli.js"), "linux"), "/opt/superloopy/0.7.1/src/cli.js");

  const posix = resilientShimFor("/opt/superloopy/0.7.1/src/cli.js");
  assert.equal(parseBinShimCliPath(posix, "linux"), "/opt/superloopy/0.7.1/src/cli.js");
  assert.equal(binShimSupportsSiblingFallback(posix, "linux"), true);

  const windows = '@echo off\r\n@rem superloopy-generated bin shim\r\nset "SUPERLOOPY_SHIM_CLI=C:\\Users\\me\\.codex\\plugins\\cache\\beefiker\\superloopy\\0.7.1\\src\\cli.js"\r\nfor /f "usebackq delims=" %%I in (`node -e "const fs=require(\'node:fs\');fs.readdirSync(\'.\')"`) do set "SUPERLOOPY_CLI=%%I"\r\nnode "%SUPERLOOPY_CLI%" %*\r\n';
  assert.equal(parseBinShimCliPath(windows, "win32"), "C:\\Users\\me\\.codex\\plugins\\cache\\beefiker\\superloopy\\0.7.1\\src\\cli.js");
  assert.equal(binShimSupportsSiblingFallback(windows, "win32"), true);
});

test("checkWrapper reports stale, dangling, recovered, foreign, and absent wrappers", () => {
  const current = slPaths("currentroot");
  const currentWrapper = join(current.binDir, "superloopy");
  const staleFiles = { [currentWrapper]: shimFor(current.cliOf("0.7.0")), [current.cliOf("0.7.0")]: "x", [current.cliOf("0.7.1")]: "x" };
  const stale = checkWrapper({ env: { PATH: current.binDir }, platform: "linux", fs: fakeFs(staleFiles, { [current.superloopyDir]: ["0.7.0", "0.7.1"] }) });
  assert.equal(stale.stale, true);
  assert.match(stale.message, /optional/i);

  const recovered = slPaths("recoverroot");
  const recoveredWrapper = join(recovered.binDir, "superloopy");
  const recoveredFiles = { [recoveredWrapper]: resilientShimFor(recovered.cliOf("0.7.0")), [recovered.cliOf("0.7.1")]: "x" };
  const recoveredResult = checkWrapper({ env: { PATH: recovered.binDir }, platform: "linux", fs: fakeFs(recoveredFiles, { [recovered.superloopyDir]: ["0.7.0", "0.7.1"] }) });
  assert.equal(recoveredResult.recovered, true);
  assert.equal(recoveredResult.resolvedCliPath, recovered.cliOf("0.7.1"));

  const dangling = slPaths("danglingroot");
  const danglingWrapper = join(dangling.binDir, "superloopy");
  const danglingResult = checkWrapper({ env: { PATH: dangling.binDir }, platform: "linux", fs: fakeFs({ [danglingWrapper]: shimFor(dangling.cliOf("0.7.0")) }) });
  assert.equal(danglingResult.dangling, true);
  assert.doesNotMatch(danglingResult.message, /`superloopy bin install/);

  const early = slPaths("earlyroot");
  const late = slPaths("lateroot");
  const earlyWrapper = join(early.binDir, "superloopy");
  const lateWrapper = join(late.binDir, "superloopy");
  const foreign = checkWrapper({
    env: { PATH: `${early.binDir}:${late.binDir}` },
    platform: "linux",
    fs: fakeFs({
      [earlyWrapper]: "#!/bin/sh\nexec some-other-tool \"$@\"\n",
      [lateWrapper]: shimFor(late.cliOf("0.7.0")),
      [late.cliOf("0.7.0")]: "x",
      [late.cliOf("0.7.1")]: "x"
    }, { [late.superloopyDir]: ["0.7.0", "0.7.1"] })
  });
  assert.equal(foreign.recognized, false);

  const absent = checkWrapper({ env: { PATH: "/nowhere" }, platform: "linux", fs: fakeFs({}) });
  assert.equal(absent.found, false);
});

test("checkWrapper warns when the generated command targets a different Superloopy root", () => {
  const wrapperRoot = join("home", "checkout", "superloopy");
  const diagnosedRoot = join("home", "cache", "superloopy", "0.9.0");
  const binDir = join("home", "bin");
  const wrapper = join(binDir, "superloopy");
  const cliPath = join(wrapperRoot, "src", "cli.js");

  const result = checkWrapper({
    env: { PATH: binDir },
    platform: "linux",
    diagnosedRoot,
    fs: fakeFs({ [wrapper]: shimFor(cliPath), [cliPath]: "x" })
  });

  assert.equal(result.ok, true);
  assert.equal(result.warning, true);
  assert.equal(result.splitBrain, true);
  assert.equal(result.cliPath, cliPath);
  assert.equal(result.diagnosedRoot, resolve(diagnosedRoot));
  assert.match(result.message, /different Superloopy root/u);
  assert.match(result.message, /bin install --force/u);
});

function fakeFs(files, dirs = {}) {
  return {
    existsSync: (p) => p in files || p in dirs,
    readFileSync: (p) => { if (!(p in files)) throw new Error("ENOENT"); return files[p]; },
    readdirSync: (p) => {
      if (!(p in dirs)) throw new Error("ENOENT");
      return dirs[p];
    }
  };
}
