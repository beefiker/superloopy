import { mkdir, readFile, writeFile } from "node:fs/promises";
import { argv } from "node:process";
import { pathToFileURL } from "node:url";

const outputFile = new URL("./data.generated.mjs", import.meta.url);
const sampleModuleDirectory = new URL("./data/", import.meta.url);
const identifierFor = (id) => id.replace(/-([a-z])/gu, (_, letter) => letter.toUpperCase());
const VERSION_ORDER = ["original", "a", "b", "c"];
const versionMetadata = Object.freeze({
  original: { short: "Original", label: "Original" },
  a: { short: "A", label: "Humanize Korean" },
  b: { short: "B", label: "i-have-adhd" },
  c: { short: "C", label: "Say It Straight" }
});
// Samples are grouped by the language they are written in. The group order
// and labels live here so the selector never hard-codes a language list.
const sampleGroups = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" }
];
const sampleDefinitions = [
  { id: "release-note", language: "ko", label: "주간 배포 안내", description: "제목, 문단, 목록" },
  { id: "meeting-followup", language: "ko", label: "회의 후속 메모", description: "체크박스, 담당자, 기한" },
  { id: "incident-review", language: "ko", label: "장애 회고", description: "타임라인 표, 인용, 지표" },
  { id: "support-reply", language: "ko", label: "고객 지원 답변", description: "문단, 순서 목록" },
  { id: "internal-proposal", language: "ko", label: "내부 제안서", description: "장단점, 표" },
  { id: "api-migration", language: "ko", label: "API 전환 안내", description: "코드, 경고, 링크" },
  { id: "llm-wiki", language: "ko", label: "LLM 위키 도입 검토", description: "절차 목록, 사례 표, 인용" },
  { id: "release-note-en", language: "en", label: "Deployment notice", description: "Heading, paragraphs, list" },
  { id: "meeting-followup-en", language: "en", label: "Meeting follow-up", description: "Checkboxes, owners, due dates" },
  { id: "incident-review-en", language: "en", label: "Incident review", description: "Timeline table, quote, metrics" },
  { id: "support-reply-en", language: "en", label: "Support reply", description: "Paragraphs, ordered list" },
  { id: "internal-proposal-en", language: "en", label: "Internal proposal", description: "Benefits, costs table" },
  { id: "api-migration-en", language: "en", label: "API migration", description: "Code, warning, links" }
];
function metricsFor(text) {
  return {
    characters: text.length,
    words: text.match(/\S+/gu)?.length ?? 0,
    lines: text === "" ? 0 : text.split(/\r?\n/u).length - (text.endsWith("\n") ? 1 : 0)
  };
}

function countOccurrences(text, needle) {
  let count = 0;
  for (let index = text.indexOf(needle); index !== -1; index = text.indexOf(needle, index + 1)) count += 1;
  return count;
}

// Validates and embeds change-rationale notes onto their version objects.
// Every anchor must match its version's text exactly once, so a fixture edit
// that orphans a note fails the build instead of shipping a stale tooltip.
export function attachNotes(versions, notes, sampleId) {
  for (const note of notes) {
    const context = `${sampleId} note "${String(note.anchor ?? "").slice(0, 40)}"`;
    for (const field of ["version", "anchor", "rule", "note"]) {
      if (typeof note[field] !== "string" || note[field].length === 0) throw new Error(`${context}: missing required field "${field}"`);
    }
    const version = versions[note.version];
    if (!version) throw new Error(`${context}: version "${note.version}" does not exist for this sample`);
    const occurrences = countOccurrences(version.text, note.anchor);
    if (occurrences !== 1) throw new Error(`${context}: anchor must appear exactly once in ${note.version}.md, found ${occurrences}`);
    if (note.from !== undefined) {
      if (typeof note.from !== "string" || note.from.length === 0) throw new Error(`${context}: "from" must be a non-empty string when present`);
      if (!versions.original || !versions.original.text.includes(note.from)) throw new Error(`${context}: "from" not found in original.md`);
    }
    version.notes.push({ anchor: note.anchor, from: note.from ?? null, rule: note.rule, note: note.note });
  }
  return versions;
}

async function readSampleNotes(definition) {
  try {
    return JSON.parse(await readFile(new URL(`../samples/${definition.id}/notes.json`, import.meta.url), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw new Error(`${definition.id}/notes.json: ${error.message}`);
  }
}

async function buildSample(definition) {
  const versions = {};
  for (const versionId of VERSION_ORDER) {
    // A sample may omit a version whose treatment does not apply to it —
    // English samples have no Humanize Korean variant. The selector renders
    // the gap as a disabled "Unavailable" option.
    let text;
    try {
      // Normalise newlines: a Windows checkout yields CRLF, which would change
      // both the embedded text and its metrics against the committed modules.
      text = (await readFile(new URL(`../samples/${definition.id}/${versionId}.md`, import.meta.url), "utf8"))
        .replace(/\r\n/gu, "\n");
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    versions[versionId] = {
      id: versionId,
      ...versionMetadata[versionId],
      text,
      metrics: metricsFor(text),
      audits: [],
      notes: []
    };
  }
  attachNotes(versions, await readSampleNotes(definition), definition.id);
  return { ...definition, versions };
}

export async function buildSamples() {
  return Object.fromEntries(await Promise.all(sampleDefinitions.map(async (definition) => [definition.id, await buildSample(definition)])));
}

export const SAMPLE_IDS = sampleDefinitions.map(({ id }) => id);

// A group with no samples is dropped so the selector never renders an empty
// heading if a language's samples are removed.
export function sampleGroupsFor(definitions = sampleDefinitions) {
  return sampleGroups
    .map(({ id, label }) => ({ id, label, samples: definitions.filter((d) => d.language === id).map((d) => d.id) }))
    .filter((group) => group.samples.length > 0);
}

async function buildData() {
  const samples = await Promise.all(sampleDefinitions.map(async (definition) => [definition.id, await buildSample(definition)]));

  // One module per sample rather than a single blob: each stays small enough to
  // review on its own, and editing one sample produces a one-file diff.
  await mkdir(sampleModuleDirectory, { recursive: true });
  for (const [id, sample] of samples) {
    await writeFile(
      new URL(`./${id}.mjs`, sampleModuleDirectory),
      `export const sample = Object.freeze(${JSON.stringify(sample, null, 2)});\n`,
      "utf8"
    );
  }

  const ids = sampleDefinitions.map(({ id }) => id);
  const index = [
    "// Generated by build-data.mjs. Run `node build-data.mjs` after editing samples/.",
    ...ids.map((id) => `import { sample as ${identifierFor(id)} } from "./data/${id}.mjs";`),
    "",
    `export const SAMPLE_ORDER = ${JSON.stringify(ids)};`,
    "",
    `export const SAMPLE_GROUPS = Object.freeze(${JSON.stringify(sampleGroupsFor())}.map(Object.freeze));`,
    "",
    `export const VERSION_ORDER = ${JSON.stringify(VERSION_ORDER)};`,
    "",
    "export const SAMPLES = Object.freeze({",
    ...ids.map((id) => `  "${id}": ${identifierFor(id)},`),
    "});",
    ""
  ].join("\n");

  await writeFile(outputFile, index, "utf8");
}

// Importing this module must not write files; the staleness test imports it.
if (argv[1] && import.meta.url === pathToFileURL(argv[1]).href) await buildData();
