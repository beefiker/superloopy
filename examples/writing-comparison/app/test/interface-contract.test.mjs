import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
import { createInterface } from "node:readline";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Surface a real import failure. Swallowing it turned a broken module into a
// confusing "X is not a function" several assertions later.
const controllerModule = import(new URL("../app.mjs", import.meta.url)).catch((error) => {
  throw new Error(`app.mjs failed to load: ${error?.message ?? error}`, { cause: error });
});

function makeSelectDouble() {
  const attributes = new Map();
  return {
    attributes,
    disabled: false,
    options: [],
    replaceChildren(...options) {
      this.options = options;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    }
  };
}

function withDocumentOptionFactory(callback) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      assert.ok(["option", "optgroup"].includes(tagName), `unexpected element ${tagName}`);
      if (tagName === "optgroup") {
        return {
          tagName: "OPTGROUP",
          label: "",
          options: [],
          replaceChildren(...options) {
            this.options = options;
          }
        };
      }
      return { tagName: "OPTION", disabled: false, selected: false, textContent: "", value: "" };
    }
  };
  try {
    return callback();
  } finally {
    globalThis.document = previousDocument;
  }
}

function focusableControl(name, activity) {
  const attributes = new Map();
  const children = new Set();
  return {
    children,
    dataset: {},
    hidden: false,
    inert: false,
    click() {
      activity.activated = name;
      activity.order.push(`activate:${name}`);
    },
    contains(control) {
      return control === this || children.has(control);
    },
    focus() {
      activity.focused = name;
      activity.order.push(`focus:${name}`);
    },
    getAttribute(attribute) {
      return attributes.get(attribute) ?? null;
    },
    hasAttribute(attribute) {
      return attributes.has(attribute);
    },
    setAttribute(attribute, value) {
      attributes.set(attribute, String(value));
    },
    toggleAttribute(attribute, force) {
      if (force) attributes.set(attribute, "");
      else attributes.delete(attribute);
    }
  };
}

test("sample selector groups every sample under its language", async () => {
  const { populateSampleSelect } = await controllerModule;
  const select = makeSelectDouble();
  withDocumentOptionFactory(() => populateSampleSelect(select, "incident-review"));

  assert.deepEqual(
    select.options.map((group) => [group.label, group.options.map(({ value, textContent, selected }) => ({ value, textContent, selected }))]),
    [
      ["한국어", [
        { value: "release-note", textContent: "주간 배포 안내", selected: false },
        { value: "meeting-followup", textContent: "회의 후속 메모", selected: false },
        { value: "incident-review", textContent: "장애 회고", selected: true },
        { value: "support-reply", textContent: "고객 지원 답변", selected: false },
        { value: "internal-proposal", textContent: "내부 제안서", selected: false },
        { value: "api-migration", textContent: "API 전환 안내", selected: false },
        { value: "llm-wiki", textContent: "LLM 위키 도입 검토", selected: false }
      ]],
      ["English", [
        { value: "release-note-en", textContent: "Deployment notice", selected: false },
        { value: "meeting-followup-en", textContent: "Meeting follow-up", selected: false },
        { value: "incident-review-en", textContent: "Incident review", selected: false },
        { value: "support-reply-en", textContent: "Support reply", selected: false },
        { value: "internal-proposal-en", textContent: "Internal proposal", selected: false },
        { value: "api-migration-en", textContent: "API migration", selected: false }
      ]]
    ]
  );
  assert.equal(select.attributes.get("aria-label"), "Comparison sample");
});

test("a language group with no available sample is dropped, not left empty", async () => {
  const { populateSampleSelect } = await controllerModule;
  const { SAMPLES } = await import("../data.generated.mjs");
  const select = makeSelectDouble();
  const groups = [
    { id: "ko", label: "한국어", samples: ["release-note"] },
    { id: "en", label: "English", samples: ["missing-sample"] }
  ];
  withDocumentOptionFactory(() => populateSampleSelect(select, "release-note", SAMPLES, groups));

  assert.deepEqual(select.options.map((group) => group.label), ["한국어"]);
  assert.equal(select.disabled, false);
});

test("empty sample collection disables selection", async () => {
  const { populateSampleSelect } = await controllerModule;
  const select = makeSelectDouble();
  withDocumentOptionFactory(() => populateSampleSelect(select, "release-note", {}, []));
  assert.equal(select.disabled, true);
  assert.deepEqual(select.options, []);
});

test("version selectors expose the active sample versions with accessibility state", async () => {
  const { populateVersionSelect } = await controllerModule;
  assert.equal(typeof populateVersionSelect, "function", "the browser controller must populate native version selectors");

  const select = makeSelectDouble();
  const versions = {
    original: { id: "original", short: "Original", label: "Original", text: "original", metrics: {}, audits: [] },
    a: { id: "a", short: "A1", label: "First sample A", text: "a", metrics: {}, audits: [] },
    b: { id: "b", short: "B1", label: "Missing sample B", text: "", metrics: {}, audits: [] },
    c: { id: "c", short: "C1", label: "First sample C", text: "c", metrics: {}, audits: [] }
  };
  withDocumentOptionFactory(() => populateVersionSelect(select, "right", "c", versions));

  assert.deepEqual(
    select.options.map(({ value, textContent, disabled, selected }) => ({ value, textContent, disabled, selected })),
    [
      { value: "original", textContent: "Original", disabled: false, selected: false },
      { value: "a", textContent: "A1 · First sample A", disabled: false, selected: false },
      { value: "b", textContent: "B1 · Missing sample B", disabled: true, selected: false },
      { value: "c", textContent: "C1 · First sample C", disabled: false, selected: true }
    ]
  );
  assert.equal(select.attributes.get("aria-label"), "Right version");
});

test("version selectors show a disabled placeholder when a version object is absent", async () => {
  const { populateVersionSelect } = await controllerModule;
  const select = makeSelectDouble();
  const versions = {
    original: { id: "original", short: "Original", label: "Original", text: "original", metrics: {}, audits: [] },
    a: { id: "a", short: "A", label: "Humanize Korean", text: "a", metrics: {}, audits: [] },
    c: { id: "c", short: "C", label: "Say It Straight", text: "c", metrics: {}, audits: [] }
  };

  withDocumentOptionFactory(() => populateVersionSelect(select, "left", "a", versions));

  assert.deepEqual(
    select.options.map(({ value, textContent, disabled, selected }) => ({ value, textContent, disabled, selected })),
    [
      { value: "original", textContent: "Original", disabled: false, selected: false },
      { value: "a", textContent: "A · Humanize Korean", disabled: false, selected: true },
      { value: "b", textContent: "B · Unavailable", disabled: true, selected: false },
      { value: "c", textContent: "C · Say It Straight", disabled: false, selected: false }
    ]
  );
});

test("mode-tab arrow navigation focuses each wrapped destination before activating it", async () => {
  const { navigateModeTabs } = await controllerModule;
  assert.equal(typeof navigateModeTabs, "function", "the browser controller must expose its mode-tab keyboard behavior");

  const activity = { activated: null, focused: null, order: [] };
  const tabs = ["rendered", "source", "unified"].map((name) => focusableControl(name, activity));

  assert.equal(navigateModeTabs(tabs, tabs[0], "ArrowRight"), true);
  assert.equal(navigateModeTabs(tabs, tabs[1], "ArrowRight"), true);
  assert.deepEqual(activity.order, ["focus:source", "activate:source", "focus:unified", "activate:unified"]);

  activity.order.length = 0;
  assert.equal(navigateModeTabs(tabs, tabs[0], "ArrowLeft"), true);
  assert.deepEqual(activity.order, ["focus:unified", "activate:unified"]);
});

test("compact disclosures expose state and restore opener focus", async () => {
  const { setDisclosureState } = await controllerModule;
  const activity = { activated: null, focused: null, order: [] };
  const trigger = focusableControl("trigger", activity);
  const panel = focusableControl("panel", activity);

  setDisclosureState({ trigger, panel }, true, { restoreFocus: false });
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  assert.equal(panel.hidden, false);

  setDisclosureState({ trigger, panel }, false, { restoreFocus: true });
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.equal(panel.hidden, true);
  assert.equal(activity.focused, "trigger");
});

test("Escape requests closure only for an open compact overlay", async () => {
  const { overlayKeyboardAction } = await controllerModule;
  assert.equal(overlayKeyboardAction({ key: "Escape", open: true }), "close");
  assert.equal(overlayKeyboardAction({ key: "Escape", open: false }), null);
  assert.equal(overlayKeyboardAction({ key: "Tab", open: true }), null);
});


test("the confined static server serves app assets and rejects encoded traversal", async (context) => {
  const server = spawn(process.execPath, [fileURLToPath(new URL("../server.mjs", import.meta.url))], {
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const output = createInterface({ input: server.stdout });
  let stderr = "";
  server.stderr.setEncoding("utf8");
  server.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  context.after(async () => {
    if (server.exitCode === null) {
      server.kill("SIGTERM");
      await once(server, "exit");
    }
  });

  const startup = Promise.race([
    once(output, "line").then(([line]) => JSON.parse(line)),
    once(server, "exit").then(([code]) => {
      throw new Error(`server exited before startup (code ${code}): ${stderr}`);
    })
  ]);
  const { url } = await startup;

  for (const [path, contentType] of [
    ["", "text/html; charset=utf-8"],
    ["styles.css", "text/css; charset=utf-8"],
    ["app.mjs", "text/javascript; charset=utf-8"]
  ]) {
    const response = await fetch(new URL(path, url));
    assert.equal(response.status, 200, path || "/");
    assert.equal(response.headers.get("content-type"), contentType, path || "/");
  }

  const serverUrl = new URL(url);
  const traversalStatus = await new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: serverUrl.hostname,
        port: serverUrl.port,
        path: "/%2e%2e/package.json",
        method: "GET"
      },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode));
      }
    );
    request.on("error", reject);
    request.end();
  });
  assert.equal(traversalStatus, 404);
});
