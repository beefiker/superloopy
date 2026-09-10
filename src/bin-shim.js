// Generation and parsing of the small `superloopy` command wrapper (the "bin shim") that Codex and
// Antigravity installs place on PATH. Kept apart from the install flow in agents.js so the shell
// and cmd.exe quoting rules -- and the legacy shim shapes doctor still has to read -- stay in one
// reviewable place.

// A marker line embedded in every shim we generate, so a shim is recognized as ours regardless of
// the install directory name (checkout/fork dirs are not named `superloopy`) and a foreign shim
// without the marker is never overwritten.
const BIN_SHIM_MARKER = "superloopy-generated bin shim";

export function isGeneratedSuperloopyBinShim(content, platform) {
  const normalized = content.replace(/\r\n/gu, "\n");
  // Marked shims (this version onward) are ours in any directory.
  if (normalized.includes(BIN_SHIM_MARKER)) return true;
  // Legacy (pre-marker) shims are recognized by their generated structure with a `superloopy` path
  // segment, so existing marketplace installs still upgrade in place without --force.
  if (platform === "win32") {
    return /^@echo off\nnode "[^"\n]*[\\/]superloopy(?:[\\/][^"\n]*)?[\\/]src[\\/]cli\.js" %\*\n?$/iu.test(normalized);
  }
  return /^#!\/usr\/bin\/env sh\nexec node .*[\\/]superloopy(?:[\\/][^'"\n ]*)?[\\/]src[\\/]cli\.js'? "\$@"\n?$/u.test(normalized);
}

export function binShimContent(cliPath, platform, host) {
  const hostCmd = host ? `set "SUPERLOOPY_HOST=${host}"` : null;
  const hostSh = host ? `export SUPERLOOPY_HOST=${shellQuote(host)}` : null;
  if (platform === "win32") {
    const resolver = cmdDoubleQuote(shimCliResolverSource());
    const lines = ["@echo off", `@rem ${BIN_SHIM_MARKER}`, "setlocal"];
    if (hostCmd) lines.push(hostCmd);
    lines.push(
      `set "SUPERLOOPY_SHIM_CLI=${cmdSetValue(cliPath)}"`,
      `for /f "usebackq delims=" %%I in (\`node -e "${resolver}"\`) do set "SUPERLOOPY_CLI=%%I"`,
      "if not exist \"%SUPERLOOPY_CLI%\" (",
      "  echo Superloopy CLI target not found: %SUPERLOOPY_SHIM_CLI% 1>&2",
      "  exit /b 1",
      ")",
      "node \"%SUPERLOOPY_CLI%\" %*",
      ""
    );
    return lines.join("\r\n");
  }
  const lines = ["#!/usr/bin/env sh", `# ${BIN_SHIM_MARKER}`];
  if (hostSh) lines.push(hostSh);
  lines.push(
    `SUPERLOOPY_SHIM_CLI=${shellQuote(cliPath)}`,
    `SUPERLOOPY_CLI=$(SUPERLOOPY_SHIM_CLI="$SUPERLOOPY_SHIM_CLI" node -e ${shellQuote(shimCliResolverSource())}) || exit $?`,
    "if [ ! -f \"$SUPERLOOPY_CLI\" ]; then",
    "  echo \"Superloopy CLI target not found: $SUPERLOOPY_SHIM_CLI\" >&2",
    "  exit 1",
    "fi",
    "exec node \"$SUPERLOOPY_CLI\" \"$@\"",
    ""
  );
  return lines.join("\n");
}

export function parseBinShimHost(content, platform = process.platform) {
  if (typeof content !== "string" || !isGeneratedSuperloopyBinShim(content, platform)) return null;
  const normalized = content.replace(/\r\n/gu, "\n");
  const match = platform === "win32" ? /^set "SUPERLOOPY_HOST=([^"\n]*)"/mu.exec(normalized) : /^export SUPERLOOPY_HOST=(?:'((?:[^']|'\\'')*)'|(\S+))/mu.exec(normalized);
  return match === null ? null : (platform === "win32" ? match[1] : (match[1] ?? match[2]));
}

// Extract the cli.js path a generated Superloopy shim executes, or null when the content is
// not one of our shims. Recognizes both the marked form and the legacy structure, so doctor
// can read where an installed wrapper actually points (e.g. a stale versioned cache path).
export function parseBinShimCliPath(content, platform = process.platform) {
  if (typeof content !== "string" || !isGeneratedSuperloopyBinShim(content, platform)) return null;
  const normalized = content.replace(/\r\n/gu, "\n");
  if (platform === "win32") {
    const envMatch = /^set "SUPERLOOPY_SHIM_CLI=([^"\n]*)"/mu.exec(normalized);
    if (envMatch !== null) return cmdUnsetValue(envMatch[1]);
    const match = /^node "([^"\n]+)" %\*/mu.exec(normalized);
    return match === null ? null : match[1];
  }
  const envMatch = /^SUPERLOOPY_SHIM_CLI=(?:'((?:[^']|'\\'')*)'|(\S+))/mu.exec(normalized);
  if (envMatch !== null) return envMatch[1] === undefined ? envMatch[2] : envMatch[1].replaceAll("'\\''", "'");
  // Reverse shellQuote: a single-quoted token whose interior apostrophes are encoded as the
  // 4-char sequence '\'' — so the quoted branch must treat '\'' as content, not a close-quote,
  // or a path like /home/o'connor falls through to the raw \S+ token and never resolves.
  const match = /^exec node (?:'((?:[^']|'\\'')*)'|(\S+)) "\$@"/mu.exec(normalized);
  if (match === null) return null;
  return match[1] === undefined ? match[2] : match[1].replaceAll("'\\''", "'");
}

export function binShimSupportsSiblingFallback(content, platform = process.platform) {
  if (typeof content !== "string" || !isGeneratedSuperloopyBinShim(content, platform)) return false;
  const normalized = content.replace(/\r\n/gu, "\n");
  return normalized.includes("SUPERLOOPY_SHIM_CLI") && normalized.includes("fs.readdirSync");
}

function shimCliResolverSource() {
  return [
    "const fs=require('node:fs')",
    "const path=require('node:path')",
    "const start=process.env.SUPERLOOPY_SHIM_CLI||''",
    "function live(p){try{return p.length>0&&fs.existsSync(p)}catch{return false}}",
    "function parse(v){const m=/^(\\d+)\\.(\\d+)\\.(\\d+)(?:-([^+]+))?/.exec(v);return m&&{major:+m[1],minor:+m[2],patch:+m[3],pre:m[4]}}",
    "function cmp(a,b){for(const k of ['major','minor','patch']){if(a[k]>b[k])return 1;if(a[k]<b[k])return -1}if(a.pre===undefined&&b.pre!==undefined)return 1;if(a.pre!==undefined&&b.pre===undefined)return -1;if(a.pre!==undefined&&b.pre!==undefined)return String(a.pre).localeCompare(String(b.pre));return 0}",
    "let target=start",
    "if(!live(target)){let best=null,bv=null;try{const root=path.dirname(path.dirname(path.dirname(start)));for(const name of fs.readdirSync(root)){const v=parse(name);if(!v)continue;const cli=path.join(root,name,'src','cli.js');if(!live(cli))continue;if(!bv||cmp(v,bv)>0){bv=v;best=cli}}}catch{}target=best||start}",
    "process.stdout.write(target)"
  ].join(";");
}

function shellQuote(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function cmdDoubleQuote(value) {
  return String(value).replaceAll("\"", "\\\"");
}

function cmdSetValue(value) {
  return String(value)
    .replaceAll("^", "^^")
    .replaceAll("%", "%%")
    .replaceAll("&", "^&")
    .replaceAll("<", "^<")
    .replaceAll(">", "^>")
    .replaceAll("|", "^|");
}

function cmdUnsetValue(value) {
  return String(value)
    .replaceAll("^^", "^")
    .replaceAll("%%", "%")
    .replaceAll("^&", "&")
    .replaceAll("^<", "<")
    .replaceAll("^>", ">")
    .replaceAll("^|", "|");
}
