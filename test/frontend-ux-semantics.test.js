import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = "skills/superloopy-frontend";
const reference = (name) => `${root}/references/${name}.md`;

async function read(path) {
  assert.equal(existsSync(path), true, `missing ${path}`);
  return (await readFile(path, "utf8")).replace(/\r\n?/gu, "\n");
}

function joinedPattern(flags, ...parts) {
  return new RegExp(parts.join(""), flags);
}

function assertContracts(content, contracts) {
  for (const [meaning, pattern] of contracts) {
    assert.match(content, pattern, `missing UX contract: ${meaning}`);
  }
}

function assertNoUniversalReversals(content, reversals) {
  for (const [meaning, pattern] of reversals) {
    assert.doesNotMatch(content, pattern, `unscoped UX reversal: ${meaning}`);
  }
}

const resourceIdentityContracts = [
  ["lifecycle verbs map to distinct transitions", /lifecycle verbs?.*distinct semantic transitions?/is],
  [
    "canonical, working, saved, and active identity stays attributable",
    joinedPattern(
      "is",
      String.raw`canonical resource.*working copy.*last[- ]saved.*active resource.*`,
      String.raw`dirty.*pending.*visible.*attributable`,
    ),
  ],
  ["copies disclose identity changes", /copy.*identity change.*disclos/is],
  [
    "portable contracts may use stable logical or owned-root-relative locators",
    /product contract.*portability.*stable logical identifier.*owned-root-relative locator/is,
  ],
  [
    "owner-required absolute locators state their boundary and recovery",
    joinedPattern(
      "is",
      String.raw`absolute locator remains valid.*actual platform.*provider.*integration owner.*`,
      String.raw`requires.*explicit reason.*resolution boundary.*relink.*recovery`,
    ),
  ],
  [
    "copy-based workflows remain valid when their lifecycle is truthful",
    /copy-based workflow remains valid.*identity.*lifecycle effects.*truthful/is,
  ],
  ["each intent takes its shortest truthful transition", /each user intent.*shortest.*truthful.*transition/is],
  [
    "safe owner updates avoid mandatory copy round trips",
    joinedPattern(
      "is",
      String.raw`current owner.*safely.*update.*reload.*original.*(?:do not|does not).*`,
      String.raw`require.*import.*modify.*apply.*round trip.*copy.*edit.*apply.*variant`,
    ),
  ],
  [
    "necessary staged copies preserve identity and expose reconciliation",
    joinedPattern(
      "is",
      String.raw`staged copy.*edit.*apply.*real owner.*boundary.*reason.*original identity.*`,
      String.raw`preserv.*reconcil.*apply.*save-back.*explicit.*commit path`,
    ),
  ],
];

const resourceIdentityUniversalReversals = [
  [
    "absolute locators are forbidden without a scoped exception",
    joinedPattern(
      "im",
      String.raw`(?:^|[.!?]\s+)(?:`,
      String.raw`absolute locators?\b[^.\n]{0,40}(?:are|must be)\s+`,
      String.raw`(?:(?:always|universally)\s+)?(?:banned|forbidden)`,
      String.raw`|(?:(?:always|universally)\s+)?(?:ban|forbid)\b`,
      String.raw`[^.\n]{0,60}absolute locators?\b`,
      String.raw`|never use (?:any\s+)?absolute locators?\b`,
      String.raw`|absolute locators?\b\s+(?:are|must be)\s+never\s+(?:allowed|valid|used)`,
      String.raw`)(?!\s+(?:only|for|when|within|on|in|by|where|if|unless|except)\b)`,
    ),
  ],
  [
    "copy-based workflows are forbidden without a scoped exception",
    joinedPattern(
      "im",
      String.raw`(?:^|[.!?]\s+)(?:`,
      String.raw`copy-based workflows?\b[^.\n]{0,40}(?:are|must be)\s+`,
      String.raw`(?:(?:always|universally)\s+)?(?:banned|forbidden)`,
      String.raw`|(?:(?:always|universally)\s+)?(?:ban|forbid)\b`,
      String.raw`[^.\n]{0,60}copy-based workflows?\b`,
      String.raw`|never use (?:any\s+)?copy-based workflows?\b`,
      String.raw`|copy-based workflows?\b\s+(?:are|must be)\s+never\s+(?:allowed|valid|used)`,
      String.raw`)(?!\s+(?:only|for|when|within|on|in|by|where|if|unless|except)\b)`,
    ),
  ],
  [
    "safe direct owner updates still mandate import-copy-apply round trips",
    joinedPattern(
      "im",
      String.raw`(?:^|[.!?]\s+)when\s+(?:(?:the\s+)?current owner`,
      String.raw`[^.\n]{0,100}(?:can|is able to)\s+safely[^.\n]{0,60}`,
      String.raw`(?:update|reload)[^.\n]{0,60}(?:the\s+)?original`,
      String.raw`|(?:a\s+)?safe direct owner update[^.\n]{0,40}(?:is\s+)?\bpossible\b)`,
      String.raw`[^.\n]{0,100}(?:(?:(?:always|universally|must(?:\s+always)?)\s+`,
      String.raw`(?:require|use|perform)|(?:still\s+)?requires)[^.\n]{0,120}`,
      String.raw`(?:import[^.\n]{0,60}(?:copy|modify|edit)[^.\n]{0,60}apply`,
      String.raw`|(?:import|copy|modify|edit)[^.\n]{0,80}round trip)`,
      String.raw`|[^.\n]{0,120}(?:import[^.\n]{0,60}(?:copy|modify|edit)`,
      String.raw`[^.\n]{0,60}apply|(?:import|copy|modify|edit)[^.\n]{0,80}round trip)`,
      String.raw`[^.\n]{0,40}(?:is|remains)\s+(?:always\s+)?(?:required|mandatory))`,
    ),
  ],
];

const resetProvenanceContracts = [
  [
    "revert, inherited defaults, and factory defaults remain distinct",
    /Revert.*current(?: or |\/)inherited defaults.*versioned factory defaults.*distinct.*baseline.*scope/is,
  ],
  ["reset values come from their real owner", /reset values.*read.*real owner.*not.*duplicated UI literals/is],
  [
    "reset proof covers applicable provenance and persistence cases",
    /proof.*non-default.*inherited.*changed[- ]default.*dirty.*Undo.*save.*apply.*restart.*relocation.*applicable/is,
  ],
];

const informationArchitectureContracts = [
  [
    "each task-bearing region has a distinct user-recognizable purpose",
    joinedPattern(
      "is",
      String.raw`within the affected surface or journey.*every task-bearing region.*affordance.*`,
      String.raw`distinct user-recognizable.*job.*outcome.*decision.*information gain.*parent.*siblings`,
    ),
  ],
  ["redundant or unsupported UI is resolved truthfully", /redundant.*unsupported.*merge.*relabel.*truthful output.*omit/is],
  ["disclosure priority is proportional", /task criticality.*frequency.*consequence.*urgency.*actionability/is],
  [
    "essential state and recovery remain in context",
    /essential state.*blockers.*errors.*recovery.*next action.*in context/is,
  ],
  [
    "dense expert work may require simultaneous visibility",
    /simultaneous.*dense.*comparison.*monitoring.*expert work.*requires/is,
  ],
  ["Advanced and More are not mechanically banned", /Advanced.*More.*not.*mechanical.*ban/is],
];

const informationArchitectureUniversalReversals = [
  [
    "dense comparison, monitoring, or expert content must always be hidden",
    joinedPattern(
      "im",
      String.raw`(?:^|[.!?]\s+)(?:(?:dense|comparison|monitoring|expert)`,
      String.raw`[^.\n]{0,60}(?:content|work)\b[^.\n]{0,40}`,
      String.raw`(?:(?:must|should)\s+(?:(?:always|universally)\s+)?`,
      String.raw`|(?:is|are)\s+(?:always|universally)\s+)(?:be\s+)?`,
      String.raw`(?:collaps(?:e|ed)\b|hid(?:e|den)\b|mov(?:e|ed)\s+behind disclosure\b)`,
      String.raw`|(?:(?:always|universally)\s+)?(?:collapse|hide)\b[^.\n]{0,80}`,
      String.raw`(?:dense|comparison|monitoring|expert)[^.\n]{0,40}(?:content|work)\b`,
      String.raw`|(?:(?:always|universally)\s+)?move\b[^.\n]{0,80}`,
      String.raw`(?:dense|comparison|monitoring|expert)[^.\n]{0,40}(?:content|work)\b`,
      String.raw`[^.\n]{0,40}behind disclosure\b)`,
      String.raw`(?!\s+(?:only|for|when|within|on|in|by|where|if|unless|except)\b)`,
    ),
  ],
  [
    "Advanced or More labels are universally forbidden",
    joinedPattern(
      "im",
      String.raw`(?:^|[.!?]\s+)(?:(?:Advanced(?:\s*(?:and|\/)\s*More)?|More)`,
      String.raw`[^.\n]{0,30}labels?\b[^.\n]{0,30}`,
      String.raw`(?:(?:are|must be|should be)\s+(?:(?:always|universally)\s+)?`,
      String.raw`(?:banned|forbidden|avoided)|(?:must|should)\s+never\s+be\s+used)`,
      String.raw`|(?:(?:always|universally)\s+)?(?:ban|forbid)\b[^.\n]{0,60}`,
      String.raw`(?:Advanced|More)[^.\n]{0,30}labels?\b`,
      String.raw`|never use\b[^.\n]{0,40}(?:Advanced|More)[^.\n]{0,30}labels?\b)`,
      String.raw`(?!\s+(?:only|for|when|within|on|in|by|where|if|unless|except)\b)`,
    ),
  ],
];

test("shared UX keeps resource identity and lifecycle transitions attributable", async () => {
  const ux = await read(reference("ux"));
  assertContracts(ux, resourceIdentityContracts);
  assertNoUniversalReversals(ux, resourceIdentityUniversalReversals);
});

test("shared UX distinguishes revert and reset provenance", async () => {
  const ux = await read(reference("ux"));
  assertContracts(ux, resetProvenanceContracts);
});

test("shared UX gives each task-bearing region purpose and proportional disclosure", async () => {
  const ux = await read(reference("ux"));
  assertContracts(ux, informationArchitectureContracts);
  assertNoUniversalReversals(ux, informationArchitectureUniversalReversals);
});
