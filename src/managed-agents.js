import { createHash, randomUUID } from "node:crypto";
import { link, lstat, mkdir, readFile, readlink, realpath, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { SUPERLOOPY_AGENT_NAMES } from "./agent-names.js";
import { withFileLock } from "./store.js";

export const MANAGED_AGENT_MARKER = "# superloopy-managed-agent v1";

const ROUTING_FIELDS = ["model", "model_reasoning_effort", "service_tier"];
const localInstallLocks = new Map();

export async function withManagedAgentInstallLocks(targetDir, statePath, operation, options = {}) {
  const realpathImpl = options.realpath ?? realpath;
  const [targetIdentity, stateIdentity] = await Promise.all([
    canonicalizeLockIdentity(targetDir, realpathImpl),
    canonicalizeLockIdentity(statePath, realpathImpl)
  ]);
  const targetLockPath = join(dirname(targetIdentity), `.${basename(targetIdentity)}.superloopy-managed-fleet`);
  const paths = [...new Set([stateIdentity, targetLockPath])].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const withFileLockImpl = options.withFileLock ?? withFileLock;
  return withLocalLocks(paths, () => withCrossProcessLocks(paths, withFileLockImpl, operation));
}

async function canonicalizeLockIdentity(path, realpathImpl) {
  let current = path;
  const missing = [];
  for (;;) {
    try {
      const existing = await realpathImpl(current);
      return join(existing, ...missing.reverse());
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
      const parent = dirname(current);
      if (parent === current) throw error;
      missing.push(basename(current));
      current = parent;
    }
  }
}

export async function renderManagedAgentFiles(sourceDir, targetDir, resolutionState) {
  let templates;
  try {
    templates = await Promise.all(SUPERLOOPY_AGENT_NAMES.map(async (name) => ({
      name,
      source: join(sourceDir, `${name}.toml`),
      target: join(targetDir, `${name}.toml`),
      content: await readFile(join(sourceDir, `${name}.toml`), "utf8")
    })));
  } catch (error) {
    if (error?.code === "ENOENT") return fail(`Missing bundled agent template: ${error.path ?? sourceDir}`);
    throw error;
  }

  const files = [];
  for (const template of templates) {
    const rendered = renderManagedAgentTemplate(template.name, template.content, resolutionState.agents?.[template.name]);
    if (!rendered.ok) return rendered;
    files.push({
      name: template.name,
      source: template.source,
      target: template.target,
      content: rendered.content,
      sha256: sha256(rendered.content)
    });
  }
  return { ok: true, files };
}

export function renderManagedAgentTemplate(name, sourceContent, resolution) {
  if (typeof sourceContent !== "string") return fail(`${name} agent template must be UTF-8 text.`);
  if (sourceContent.split(/\r?\n/gu).includes(MANAGED_AGENT_MARKER)) {
    return fail(`${name} agent template must not contain the managed marker.`);
  }
  const assignments = findTopLevelAssignments(sourceContent);
  const replacements = [];
  for (const field of ROUTING_FIELDS) {
    const matches = assignments.filter((assignment) => assignment.field === field);
    if (matches.length !== 1) return fail(`${name} agent template must contain exactly one top-level ${field} field.`);
    if (typeof resolution?.[field] !== "string" || resolution[field].length === 0) {
      return fail(`${name} model resolution is missing ${field}.`);
    }
    replacements.push({ ...matches[0], value: JSON.stringify(resolution[field]) });
  }

  let content = sourceContent;
  for (const replacement of replacements.sort((left, right) => right.valueStart - left.valueStart)) {
    content = `${content.slice(0, replacement.valueStart)}${replacement.value}${content.slice(replacement.valueEnd)}`;
  }
  return { ok: true, content: `${MANAGED_AGENT_MARKER}\n${content}` };
}

export function parseManagedAgentRouting(content) {
  if (typeof content !== "string") return fail("Managed agent must be UTF-8 text.");
  const assignments = findTopLevelAssignments(content);
  const routing = {};
  for (const field of ROUTING_FIELDS) {
    const matches = assignments.filter((assignment) => assignment.field === field);
    if (matches.length !== 1) return fail(`Managed agent must contain exactly one top-level ${field} field.`);
    let value;
    try {
      value = JSON.parse(content.slice(matches[0].valueStart, matches[0].valueEnd));
    } catch {
      return fail(`Managed agent ${field} must be a quoted string.`);
    }
    if (typeof value !== "string" || value.length === 0) return fail(`Managed agent ${field} must be a quoted string.`);
    routing[field] = value;
  }
  return { ok: true, routing };
}

export async function preflightManagedAgentFiles(files, previousFileManifest, force, legacyManifests = []) {
  const inspected = await Promise.all(files.map(async (file) => ({
    ...file,
    ...await inspectTarget(file.target)
  })));
  const legacyFleet = matchingLegacyFleet(inspected, legacyManifests);
  const planned = inspected.map((file) => ({
    ...file,
    status: plannedStatus(file, previousFileManifest, force, legacyFleet !== null)
  }));
  const hasConflict = planned.some(({ status }) => status === "conflict");
  const filesWithFinalStatus = hasConflict
    ? planned.map((file) => file.status === "installed" || file.status === "updated" ? { ...file, status: "blocked" } : file)
    : planned;
  return {
    ok: !hasConflict,
    files: filesWithFinalStatus,
    conflicts: filesWithFinalStatus.filter(({ status }) => status === "conflict")
  };
}

export async function commitManagedAgentFiles(files, statePath, state, writeState, options = {}) {
  const writeFileImpl = options.writeFile ?? writeFile;
  const linkImpl = options.link ?? link;
  const renameImpl = options.rename ?? rename;
  const unlinkImpl = options.unlink ?? unlink;
  const writeStateImpl = options.writeState ?? writeStateAtomically;
  const changed = files.filter(({ status }) => status === "installed" || status === "updated");
  const staged = [];
  let committed = false;
  try {
    for (const file of changed) {
      await mkdir(dirname(file.target), { recursive: true });
      const path = temporarySibling(file.target);
      staged.push({ path, target: file.target, file, backup: null, originalMoved: false, targetCreated: false, stagedIdentity: null });
      await writeFileImpl(path, file.content, { encoding: "utf8", flag: "wx" });
      staged.at(-1).stagedIdentity = (await inspectTarget(path, options)).existingIdentity;
    }
    await assertPreflightStillCurrent(files, options);
    for (const entry of staged) {
      if (entry.file.status === "updated") {
        entry.backup = temporarySibling(entry.target);
        await renameImpl(entry.target, entry.backup);
        entry.originalMoved = true;
        const moved = await inspectTarget(entry.backup, options);
        if (!sameSnapshot(moved, preflightSnapshot(entry.file))) {
          throw new Error(`Managed agent ${entry.file.name} target changed after preflight.`);
        }
      }
      await linkImpl(entry.path, entry.target);
      entry.targetCreated = true;
    }
    await assertFinalFleet(files, staged, options);
    if (writeState) await writeStateImpl(statePath, state);
    committed = true;
  } catch (error) {
    const rollbackErrors = await rollbackOperations(staged, { renameImpl, unlinkImpl, inspectOptions: options });
    if (rollbackErrors.length > 0) {
      throw new AggregateError([error, ...rollbackErrors], "Managed agent rollback failed after a commit error.");
    }
    throw error;
  } finally {
    await Promise.all(staged.map(({ path }) => unlinkImpl(path).catch(() => {})));
    if (committed) {
      const cleanup = await Promise.allSettled(staged
        .filter(({ backup }) => backup !== null)
        .map(({ backup }) => unlinkImpl(backup)));
      const failures = cleanup.filter(({ status }) => status === "rejected").map(({ reason }) => reason);
      if (failures.length > 0) throw new AggregateError(failures, "Managed agent backup cleanup failed.");
    }
  }
}

export function managedFileManifest(files) {
  return Object.fromEntries(files.map(({ name, sha256: hash }) => [name, { sha256: hash }]));
}

export function manifestsMatch(left, right) {
  return SUPERLOOPY_AGENT_NAMES.every((name) => left?.[name]?.sha256 === right?.[name]?.sha256)
    && Object.keys(left ?? {}).length === SUPERLOOPY_AGENT_NAMES.length
    && Object.keys(right ?? {}).length === SUPERLOOPY_AGENT_NAMES.length;
}

function plannedStatus(file, previousFileManifest, force, legacyFleet) {
  if (file.existingKind === "absent") return "installed";
  if (file.existingKind === "symlink") return force ? "updated" : "conflict";
  if (file.existingKind !== "file") return "conflict";
  if (file.existing === file.content) return "unchanged";
  if (force) return "updated";
  if (legacyFleet) return "updated";
  const previousHash = previousFileManifest?.[file.name]?.sha256;
  const stillManaged = file.existing.startsWith(`${MANAGED_AGENT_MARKER}\n`);
  return stillManaged && previousHash === sha256(file.existing) ? "updated" : "conflict";
}

function matchingLegacyFleet(files, manifests) {
  return manifests.find((manifest) => files.every((file) =>
    file.existingKind === "file"
      && manifest?.files?.[file.name]?.sha256 === sha256(file.existing)
  )) ?? null;
}

async function inspectTarget(path, options = {}) {
  const lstatImpl = options.lstat ?? lstat;
  const readFileImpl = options.readFile ?? readFile;
  const readlinkImpl = options.readlink ?? readlink;
  try {
    const stats = await lstatImpl(path);
    const existingIdentity = { dev: stats.dev, ino: stats.ino };
    if (stats.isSymbolicLink()) return { existingKind: "symlink", existing: await readlinkImpl(path), existingIdentity };
    if (!stats.isFile()) return { existingKind: "other", existing: null };
    return { existingKind: "file", existing: await readFileImpl(path, "utf8"), existingIdentity };
  } catch (error) {
    if (error?.code === "ENOENT") return { existingKind: "absent", existing: null };
    throw error;
  }
}

async function assertPreflightStillCurrent(files, options) {
  for (const file of files) {
    const expected = preflightSnapshot(file);
    const actual = await inspectTarget(file.target, options);
    if (!sameSnapshot(actual, expected)) {
      throw new Error(`Managed agent ${file.name} target changed after preflight.`);
    }
  }
}

async function assertFinalFleet(files, operations, options) {
  const operationByName = new Map(operations.map((operation) => [operation.file.name, operation]));
  for (const file of files) {
    const actual = await inspectTarget(file.target, options);
    if (actual.existingKind !== "file" || actual.existing !== file.content) {
      throw new Error(`Managed agent ${file.name} target changed during commit.`);
    }
    const operation = operationByName.get(file.name);
    if (operation !== undefined && !sameIdentity(actual.existingIdentity, operation.stagedIdentity)) {
      throw new Error(`Managed agent ${file.name} inode changed during commit.`);
    }
  }
}

function preflightSnapshot(file) {
  if (file.existingKind !== undefined) {
    return { existingKind: file.existingKind, existing: file.existing, existingIdentity: file.existingIdentity };
  }
  if (file.status === "installed") return { existingKind: "absent", existing: null };
  if (typeof file.existing === "string") return { existingKind: "file", existing: file.existing };
  throw new Error(`Managed agent ${file.name} is missing its preflight snapshot.`);
}

function sameSnapshot(left, right) {
  if (left.existingKind !== right.existingKind) return false;
  if ((left.existingKind === "file" || left.existingKind === "symlink") && left.existing !== right.existing) return false;
  return right.existingIdentity === undefined || sameIdentity(left.existingIdentity, right.existingIdentity);
}

function sameIdentity(left, right) {
  return left !== undefined && right !== undefined && left.dev === right.dev && left.ino === right.ino;
}

async function rollbackOperations(operations, options) {
  const errors = [];
  for (const operation of [...operations].reverse()) {
    try {
      if (operation.targetCreated) {
        const actual = await inspectTarget(operation.target, options.inspectOptions);
        if (actual.existingKind !== "file" || !sameIdentity(actual.existingIdentity, operation.stagedIdentity)) {
          throw new Error(`Managed agent ${operation.file.name} changed before rollback.`);
        }
        await options.unlinkImpl(operation.target);
        operation.targetCreated = false;
      }
      if (operation.originalMoved) {
        const target = await inspectTarget(operation.target, options.inspectOptions);
        if (target.existingKind !== "absent") {
          throw new Error(`Managed agent ${operation.file.name} original remains at ${operation.backup}.`);
        }
        await options.renameImpl(operation.backup, operation.target);
        operation.originalMoved = false;
      }
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

function withLocalLocks(paths, operation, index = 0) {
  if (index >= paths.length) return operation();
  return withLocalLock(paths[index], () => withLocalLocks(paths, operation, index + 1));
}

async function withLocalLock(path, operation) {
  const previous = localInstallLocks.get(path) ?? Promise.resolve();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const tail = previous.then(() => gate);
  localInstallLocks.set(path, tail);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (localInstallLocks.get(path) === tail) localInstallLocks.delete(path);
  }
}

function withCrossProcessLocks(paths, withFileLockImpl, operation, index = 0) {
  if (index >= paths.length) return operation();
  return withFileLockImpl(paths[index], () => withCrossProcessLocks(paths, withFileLockImpl, operation, index + 1));
}

async function writeStateAtomically(path, state) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = temporarySibling(path);
  try {
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(temporary, path);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}

function temporarySibling(path) {
  return join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function findTopLevelAssignments(content) {
  const assignments = [];
  let offset = 0;
  let multiline = null;
  let inTable = false;
  for (const segment of content.match(/[^\n]*(?:\n|$)/gu) ?? []) {
    if (segment.length === 0) continue;
    const line = segment.endsWith("\n") ? segment.slice(0, -1) : segment;
    if (multiline !== null) {
      if (line.includes(multiline)) multiline = null;
      offset += segment.length;
      continue;
    }
    if (/^\s*\[{1,2}[^\]]/u.test(line)) inTable = true;
    const assignment = inTable ? null : /^\s*([A-Za-z0-9_-]+)\s*=/u.exec(line);
    if (assignment !== null) {
      const equals = line.indexOf("=", assignment.index + assignment[0].indexOf("="));
      const valueStart = skipWhitespace(line, equals + 1);
      const comment = findUnquotedComment(line, valueStart);
      const valueEnd = trimWhitespaceEnd(line, comment === -1 ? line.length : comment);
      assignments.push({ field: assignment[1], valueStart: offset + valueStart, valueEnd: offset + valueEnd });
      const value = line.slice(valueStart, valueEnd);
      if (value.startsWith('"""') && value.indexOf('"""', 3) === -1) multiline = '"""';
      if (value.startsWith("'''") && value.indexOf("'''", 3) === -1) multiline = "'''";
    }
    offset += segment.length;
  }
  return assignments;
}

function findUnquotedComment(line, start) {
  let quote = null;
  let escaped = false;
  for (let index = start; index < line.length; index += 1) {
    const character = line[index];
    if (quote === '"' && character === "\\" && !escaped) {
      escaped = true;
      continue;
    }
    if (character === quote && !escaped) quote = null;
    else if (quote === null && (character === '"' || character === "'")) quote = character;
    else if (quote === null && character === "#") return index;
    escaped = false;
  }
  return -1;
}

function skipWhitespace(value, index) {
  while (index < value.length && /\s/u.test(value[index])) index += 1;
  return index;
}

function trimWhitespaceEnd(value, index) {
  while (index > 0 && /\s/u.test(value[index - 1])) index -= 1;
  return index;
}

function fail(message) {
  return { ok: false, message };
}
