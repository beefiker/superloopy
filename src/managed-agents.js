import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { SUPERLOOPY_AGENT_NAMES } from "./agent-names.js";

export const MANAGED_AGENT_MARKER = "# superloopy-managed-agent v1";

const ROUTING_FIELDS = ["model", "model_reasoning_effort", "service_tier"];

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

export async function preflightManagedAgentFiles(files, previousState, force) {
  const inspected = await Promise.all(files.map(async (file) => {
    try {
      return { ...file, existing: await readFile(file.target, "utf8") };
    } catch (error) {
      if (error?.code === "ENOENT") return { ...file, existing: null };
      throw error;
    }
  }));
  const planned = inspected.map((file) => ({ ...file, status: plannedStatus(file, previousState, force) }));
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
  const changed = files.filter(({ status }) => status === "installed" || status === "updated");
  const staged = [];
  try {
    for (const file of changed) {
      await mkdir(dirname(file.target), { recursive: true });
      const path = temporarySibling(file.target);
      staged.push({ path, target: file.target });
      await writeFileImpl(path, file.content, { encoding: "utf8", flag: "wx" });
    }
    for (const file of staged) await rename(file.path, file.target);
  } finally {
    await Promise.all(staged.map(({ path }) => unlink(path).catch(() => {})));
  }
  if (writeState) await writeStateAtomically(statePath, state);
}

export function managedFileManifest(files) {
  return Object.fromEntries(files.map(({ name, sha256: hash }) => [name, { sha256: hash }]));
}

export function manifestsMatch(left, right) {
  return SUPERLOOPY_AGENT_NAMES.every((name) => left?.[name]?.sha256 === right?.[name]?.sha256)
    && Object.keys(left ?? {}).length === SUPERLOOPY_AGENT_NAMES.length
    && Object.keys(right ?? {}).length === SUPERLOOPY_AGENT_NAMES.length;
}

function plannedStatus(file, previousState, force) {
  if (file.existing === null) return "installed";
  if (file.existing === file.content) return "unchanged";
  if (force) return "updated";
  const previousHash = previousState?.files?.[file.name]?.sha256;
  const stillManaged = file.existing.startsWith(`${MANAGED_AGENT_MARKER}\n`);
  return stillManaged && previousHash === sha256(file.existing) ? "updated" : "conflict";
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
