#!/usr/bin/env node
// `npm test` preflight. The suite relies on `node --test` glob support (Node >= 21); on an older
// Node it dies with "Could not find 'test/**/*.test.js'", which hides the real cause.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function unmetNodeEngine(range, version) {
  const minimum = /^>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/u.exec(range.trim());
  if (minimum === null) throw new Error(`Unsupported engines.node range: ${range}`);
  const required = minimum.slice(1).map((part) => Number(part ?? 0));
  const actual = version.replace(/^v/u, "").split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] !== required[index]) return actual[index] < required[index];
  }
  return false;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { engines } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  if (unmetNodeEngine(engines.node, process.version)) {
    process.stderr.write(`Superloopy needs Node ${engines.node}; this is ${process.version}. Switch runtimes first (for example \`nvm use\`, which reads .nvmrc).\n`);
    process.exit(1);
  }
}
