// The doctor wrapper check reads PATH, so a developer's own `superloopy` (stale, dangling, or
// absent) would leak into doctor test results. This puts a foreign, executable `superloopy` first
// on PATH: it is what the shell would run, and the check reports it as untracked and healthy.
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

export function pathWithForeignWrapper(rest = process.env.PATH ?? "") {
  const dir = mkdtempSync(join(tmpdir(), "superloopy-doctor-wrapper-"));
  const name = process.platform === "win32" ? "superloopy.cmd" : "superloopy";
  writeFileSync(join(dir, name), process.platform === "win32" ? "@exit /b 0\r\n" : "#!/bin/sh\nexit 0\n", "utf8");
  if (process.platform !== "win32") chmodSync(join(dir, name), 0o755);
  return `${dir}${delimiter}${rest}`;
}
