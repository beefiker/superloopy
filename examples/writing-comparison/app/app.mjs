import { SAMPLE_GROUPS, SAMPLES, VERSION_ORDER } from "./data.generated.mjs";
import { diffDocuments, summarizeDiff } from "./diff-core.mjs";
import { parseViewState, selectSample, selectVersion, serializeViewState, swapVersions } from "./state.mjs";
import { renderSideBySide, renderSource, renderUnified, labelFor } from "./views.mjs";
import { annotateNoteAnchors, installNoteTooltip } from "./notes.mjs";
import { applySearch } from "./search.mjs";
import { enhanceSelect } from "./combobox.mjs";
import { attachComparisonScrollUi } from "./scroll-sync.mjs";

export function navigateModeTabs(tabs, currentTab, key) {
  if (!["ArrowLeft", "ArrowRight"].includes(key) || tabs.length === 0) return false;
  const currentIndex = tabs.indexOf(currentTab);
  if (currentIndex < 0) return false;
  const offset = key === "ArrowRight" ? 1 : -1;
  const destination = tabs[(currentIndex + offset + tabs.length) % tabs.length];
  destination.focus();
  destination.click();
  return true;
}

export function setDisclosureState({ trigger, panel }, open, { restoreFocus = false } = {}) {
  trigger.setAttribute("aria-expanded", String(open));
  panel.hidden = !open;
  if (!open && restoreFocus) trigger.focus();
  return open;
}

export function overlayKeyboardAction({ key, open }) {
  return key === "Escape" && open ? "close" : null;
}

const browserAvailable = typeof document !== "undefined" && typeof window !== "undefined";

const elements = browserAvailable ? Object.freeze({
  sampleSelector: document.querySelector("#sample-select"),
  leftSelector: document.querySelector("#left-version-select"),
  rightSelector: document.querySelector("#right-version-select"),
  swap: document.querySelector("#swap-versions"),
  pairSummary: document.querySelector("#pair-summary"),
  pairMetrics: document.querySelector("#pair-metrics"),
  modeTabs: document.querySelector("#mode-tabs"),
  searchToggle: document.querySelector("#search-toggle"),
  searchPanel: document.querySelector("#search-panel"),
  search: document.querySelector("#document-search"),
  searchResults: document.querySelector("#search-results"),
  searchEmpty: document.querySelector("#search-empty"),
  syncScroll: document.querySelector("#sync-scroll"),
  showHighlights: document.querySelector("#show-highlights"),
  typeControl: document.querySelector(".type-control"),
  previousChange: document.querySelector("#previous-change"),
  nextChange: document.querySelector("#next-change"),
  changePosition: document.querySelector("#change-position"),
  documentView: document.querySelector("#document-view"),
  errorState: document.querySelector("#error-state"),
  errorMessage: document.querySelector("#error-message"),
  emptyState: document.querySelector("#empty-state"),
  notes: document.querySelector("#review-notes"),
  includeContent: document.querySelector("#include-content"),
  exportNotes: document.querySelector("#export-notes"),
  helpButton: document.querySelector("#help-button"),
  helpDialog: document.querySelector("#keyboard-help"),
  toolsToggle: document.querySelector("#more-tools"),
  toolsDialog: document.querySelector("#tools-dialog"),
  status: document.querySelector("#interface-status")
}) : null;

const numberFormatter = new Intl.NumberFormat("en-US");
const reducedMotion = browserAvailable ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: true };

let viewState = parseViewState(browserAvailable ? window.location.search : "");
// Built once and re-synced after each render; the native <select> underneath
// stays the value holder, so `change` handling below is unchanged.
let sampleCombobox = null;
let leftCombobox = null;
let rightCombobox = null;
let currentHunks = [];
let changedHunks = [];
let selectedChangeIndex = 0;
let selectedTypeSize = "medium";
let scrollUi = null;

function formatNumber(value) {
  return numberFormatter.format(value);
}

function formatDelta(value) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${formatNumber(Math.abs(value))}`;
}

function setStatus(message) {
  elements.status.textContent = "";
  window.requestAnimationFrame(() => {
    elements.status.textContent = message;
  });
}

// Grouped by language: twelve flat entries in one list gave no landmark for
// finding the Korean or the English half. An empty group is dropped rather
// than rendered as a heading with nothing under it.
export function populateSampleSelect(select, selectedId, samples = SAMPLES, groups = SAMPLE_GROUPS) {
  let count = 0;
  const groupNodes = groups.flatMap((group) => {
    const options = group.samples.filter((sampleId) => samples[sampleId]).map((sampleId) => {
      const option = document.createElement("option");
      option.value = sampleId;
      option.textContent = samples[sampleId].label;
      option.selected = selectedId === sampleId;
      count += 1;
      return option;
    });
    if (options.length === 0) return [];
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;
    optgroup.replaceChildren(...options);
    return [optgroup];
  });
  select.replaceChildren(...groupNodes);
  select.disabled = count === 0;
  select.setAttribute("aria-label", "Comparison sample");
}

export function populateVersionSelect(select, side, selectedId, versions) {
  const options = VERSION_ORDER.map((versionId) => {
    const version = versions[versionId];
    const option = document.createElement("option");
    option.value = versionId;
    option.textContent = versionId === "original"
      ? "Original"
      : version
        ? `${version.short} · ${version.label}`
        : `${versionId.toUpperCase()} · Unavailable`;
    option.disabled = !version?.text;
    option.selected = selectedId === versionId;
    return option;
  });
  select.replaceChildren(...options);
  select.setAttribute("aria-label", `${side === "left" ? "Left" : "Right"} version`);
}

function renderVersionSelectors(versions) {
  populateVersionSelect(elements.leftSelector, "left", viewState.left, versions);
  populateVersionSelect(elements.rightSelector, "right", viewState.right, versions);
  leftCombobox?.sync();
  rightCombobox?.sync();
}

function historyUrl() {
  const url = new URL(window.location.href);
  url.search = serializeViewState(viewState);
  return `${url.pathname}${url.search}${url.hash}`;
}

function writeHistory(method) {
  if (method === "push") window.history.pushState({ ...viewState }, "", historyUrl());
  else window.history.replaceState({ ...viewState }, "", historyUrl());
}

function changeState(nextState, { history = "push", announcement } = {}) {
  viewState = nextState;
  selectedChangeIndex = 0;
  if (history) writeHistory(history);
  renderInterface();
  if (announcement) setStatus(announcement);
}

function selectPairVersion(side, versionId) {
  const next = selectVersion(viewState, side, versionId);
  const selected = SAMPLES[viewState.sample]?.versions[versionId];
  changeState(next, {
    announcement: `${side === "left" ? "Earlier" : "Later"} version changed to ${selected?.label ?? versionId}.`
  });
}

function updateModeTabs() {
  for (const button of elements.modeTabs.querySelectorAll("[data-mode]")) {
    const selected = button.dataset.mode === viewState.mode;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  }
}

function updateTypeControls() {
  elements.documentView.dataset.typeSize = selectedTypeSize;
  for (const button of elements.typeControl.querySelectorAll("[data-size]")) {
    button.setAttribute("aria-pressed", String(button.dataset.size === selectedTypeSize));
  }
}

function updateMetrics(leftVersion, rightVersion, summary) {
  elements.pairMetrics.textContent = `${formatNumber(summary.changedTokens)} changed spans · ${formatDelta(rightVersion.metrics.characters - leftVersion.metrics.characters)} characters`;
}

function clearMetrics() {
  elements.pairMetrics.textContent = "—";
}

function changeMeta(hunk) {
  const tokenCount = hunk.tokens.filter((token) => token.type !== "equal").length;
  return `${labelFor(hunk.op)} · ${hunk.kind} · ${tokenCount} span${tokenCount === 1 ? "" : "s"}`;
}

function addPaneLabels(leftVersion, rightVersion) {
  const panes = elements.documentView.querySelectorAll("[data-side]");
  for (const pane of panes) {
    const side = pane.dataset.side;
    const version = side === "left" ? leftVersion : rightVersion;
    const label = document.createElement("header");
    label.className = "pane-label";
    label.textContent = `${side === "left" ? "Earlier" : "Later"} · ${version.short} — ${version.label}`;
    pane.prepend(label);
  }

  const unified = elements.documentView.querySelector(".unified-stream");
  if (unified) {
    const label = document.createElement("header");
    label.className = "pane-label";
    label.textContent = `${leftVersion.short} — ${leftVersion.label} → ${rightVersion.short} — ${rightVersion.label}`;
    unified.prepend(label);
  }
}

function renderDocuments(leftVersion, rightVersion) {
  const labels = {
    leftLabel: `Earlier version: ${leftVersion.short}, ${leftVersion.label}`,
    rightLabel: `Later version: ${rightVersion.short}, ${rightVersion.label}`
  };
  if (viewState.mode === "source") elements.documentView.innerHTML = renderSource(currentHunks, labels);
  else if (viewState.mode === "unified") elements.documentView.innerHTML = renderUnified(currentHunks);
  else elements.documentView.innerHTML = renderSideBySide(currentHunks, labels);

  elements.documentView.dataset.mode = viewState.mode;
  elements.documentView.classList.toggle("hide-highlights", !elements.showHighlights.checked);
  // Notes follow the version, not the side, so a swapped comparison keeps its
  // explanations. The unified stream has no [data-side] panes and stays bare.
  for (const pane of elements.documentView.querySelectorAll("[data-side]")) {
    const version = pane.dataset.side === "left" ? leftVersion : rightVersion;
    annotateNoteAnchors(pane, version.notes);
  }
  addPaneLabels(leftVersion, rightVersion);
  updateTypeControls();
  attachScrollUi();
}

function scrollToSelectedChange(hunk) {
  if (!hunk) return;
  const behavior = reducedMotion.matches ? "auto" : "smooth";
  // Both panes get their own centring scroll, so syncing would make them fight
  // mid-animation; it stays suppressed until the smooth scrolls settle.
  scrollUi?.suppressSync(reducedMotion.matches ? 200 : 700);
  const targets = elements.documentView.querySelectorAll(`[data-hunk-id="${hunk.id}"]`);
  for (const target of targets) target.scrollIntoView({ behavior, block: "center", inline: "nearest" });
}

function updateSelectedChange({ announce = false, scroll = false } = {}) {
  const count = changedHunks.length;
  const hunk = count > 0 ? changedHunks[selectedChangeIndex] : null;
  elements.changePosition.textContent = count > 0 ? `${selectedChangeIndex + 1} of ${count}` : "0 of 0";
  elements.previousChange.disabled = count === 0 || selectedChangeIndex === 0;
  elements.nextChange.disabled = count === 0 || selectedChangeIndex === count - 1;

  for (const node of elements.documentView.querySelectorAll(".selected-change")) node.classList.remove("selected-change");
  if (hunk) {
    for (const node of elements.documentView.querySelectorAll(`[data-hunk-id="${hunk.id}"]`)) node.classList.add("selected-change");
  }
  scrollUi?.updateSelection(hunk?.id ?? null);

  if (scroll) scrollToSelectedChange(hunk);
  if (announce && hunk) setStatus(`Change ${selectedChangeIndex + 1} of ${count}. ${changeMeta(hunk)}.`);
}

function chooseChange(index, options = {}) {
  if (changedHunks.length === 0) return;
  selectedChangeIndex = Math.max(0, Math.min(index, changedHunks.length - 1));
  updateSelectedChange({ announce: true, scroll: true, ...options });
}

function moveChange(offset) {
  chooseChange(selectedChangeIndex + offset);
}

function attachScrollUi() {
  scrollUi = attachComparisonScrollUi(elements.documentView, {
    syncEnabled: () => elements.syncScroll.checked,
    changedHunks: changedHunks.map(({ id, op }) => ({ id, op })),
    onSelectChange: (hunkId) => {
      const index = changedHunks.findIndex((hunk) => hunk.id === hunkId);
      if (index >= 0) chooseChange(index);
    }
  });
}

function showRenderError(error) {
  currentHunks = [];
  changedHunks = [];
  elements.errorState.hidden = false;
  elements.emptyState.hidden = true;
  elements.errorMessage.textContent = error instanceof Error ? error.message : "Choose another available version to continue.";
  elements.documentView.replaceChildren();
  elements.pairSummary.textContent = "Comparison unavailable";
  clearMetrics();
  updateSelectedChange();
}

function renderInterface() {
  populateSampleSelect(elements.sampleSelector, viewState.sample);
  sampleCombobox?.sync();
  updateModeTabs();
  elements.errorState.hidden = true;
  elements.emptyState.hidden = true;

  const sample = SAMPLES[viewState.sample];
  if (!sample) {
    showRenderError(new Error("No comparison samples are available."));
    return;
  }

  renderVersionSelectors(sample.versions);

  try {
    const leftVersion = sample.versions[viewState.left];
    const rightVersion = sample.versions[viewState.right];
    if (!leftVersion?.text || !rightVersion?.text) {
      throw new Error("One or both selected documents are missing from the embedded comparison data. Choose another available version.");
    }

    currentHunks = diffDocuments(leftVersion.text, rightVersion.text, { rightAudits: rightVersion.audits });
    changedHunks = currentHunks.filter((hunk) => hunk.op !== "equal");
    selectedChangeIndex = Math.min(selectedChangeIndex, Math.max(0, changedHunks.length - 1));
    const summary = summarizeDiff(currentHunks);

    elements.pairSummary.textContent = `${sample.label} · ${leftVersion.short} — ${leftVersion.label} → ${rightVersion.short} — ${rightVersion.label}`;
    updateMetrics(leftVersion, rightVersion, summary);
    renderDocuments(leftVersion, rightVersion);
    elements.emptyState.hidden = changedHunks.length !== 0;
    updateSelectedChange();
    applySearch(elements);
  } catch (error) {
    showRenderError(error);
  }
}

function openKeyboardHelp() {
  if (typeof elements.helpDialog.showModal === "function") elements.helpDialog.showModal();
  else elements.helpDialog.setAttribute("open", "");
}

function openSearch() {
  setDisclosureState({ trigger: elements.searchToggle, panel: elements.searchPanel }, true);
  elements.search.focus();
}

function closeSearch() {
  setDisclosureState({ trigger: elements.searchToggle, panel: elements.searchPanel }, false, { restoreFocus: true });
}

function openTools() {
  setDisclosureState({ trigger: elements.toolsToggle, panel: elements.toolsDialog }, true);
  if (typeof elements.toolsDialog.showModal === "function") elements.toolsDialog.showModal();
  else elements.toolsDialog.setAttribute("open", "");
}

function selectedHunkForExport() {
  const hunk = changedHunks[selectedChangeIndex];
  if (!hunk) return null;
  return {
    id: hunk.id,
    operation: hunk.op,
    type: hunk.kind,
    section: hunk.section || "Document start",
    preservation: hunk.preservation
  };
}

function exportReviewNotes() {
  const versions = SAMPLES[viewState.sample]?.versions ?? {};
  const leftVersion = versions[viewState.left];
  const rightVersion = versions[viewState.right];
  const payload = {
    sample: viewState.sample,
    pair: { left: viewState.left, right: viewState.right },
    mode: viewState.mode,
    timestamp: new Date().toISOString(),
    selectedHunk: selectedHunkForExport(),
    notes: elements.notes.value
  };

  if (elements.includeContent.checked) {
    payload.content = {
      left: { id: leftVersion?.id, label: leftVersion?.label, text: leftVersion?.text ?? null },
      right: { id: rightVersion?.id, label: rightVersion?.label, text: rightVersion?.text ?? null }
    };
  }

  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `comparison-${viewState.sample}-${viewState.left}-to-${viewState.right}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
  setStatus(`Review notes exported for ${viewState.left} to ${viewState.right}.`);
}

// Buttons are deliberately absent: keeping focus on a dock button must not
// disable the shortcuts, which is what alternating clicking and keying does.
// Notes describe one comparison. Carrying them into another one makes the
// export claim they were written about a document they never mentioned.
function discardNotesForComparisonChange() {
  if (elements.notes.value.trim().length === 0) return;
  const keep = window.confirm("Keep the review notes for this new comparison? Cancel clears them.");
  if (!keep) elements.notes.value = "";
}

function isFormControl(target) {
  return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

// Length in the ORIGINAL string whose folded form equals `needle`, or 0 when
// nothing matches at `start`. Not needle.length: folding can change length.
function handleShortcut(event) {
  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || isFormControl(event.target)) return;
  if (event.key === "[") {
    event.preventDefault();
    moveChange(-1);
  } else if (event.key === "]") {
    event.preventDefault();
    moveChange(1);
  } else if (event.key.toLocaleLowerCase() === "s") {
    event.preventDefault();
    changeState(swapVersions(viewState), { announcement: "Earlier and later versions swapped." });
  } else if (event.key === "/") {
    event.preventDefault();
    openSearch();
  } else if (event.key === "?") {
    event.preventDefault();
    openKeyboardHelp();
  }
}

function wireEvents() {
  elements.sampleSelector.addEventListener("change", (event) => {
    const sample = SAMPLES[event.target.value];
    discardNotesForComparisonChange();
    changeState(selectSample(viewState, event.target.value), {
      announcement: `Sample changed to ${sample?.label ?? event.target.value}.`
    });
  });
  elements.leftSelector.addEventListener("change", (event) => selectPairVersion("left", event.target.value));
  elements.rightSelector.addEventListener("change", (event) => selectPairVersion("right", event.target.value));
  elements.swap.addEventListener("click", () => {
    changeState(swapVersions(viewState), { announcement: "Earlier and later versions swapped." });
  });

  elements.modeTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button || button.dataset.mode === viewState.mode) return;
    changeState({ ...viewState, mode: button.dataset.mode }, { announcement: `${button.textContent} mode selected.` });
  });
  elements.modeTabs.addEventListener("keydown", (event) => {
    const tabs = [...elements.modeTabs.querySelectorAll("[data-mode]")];
    if (!navigateModeTabs(tabs, event.target, event.key)) return;
    event.preventDefault();
  });

  elements.searchToggle.addEventListener("click", () => {
    if (elements.searchPanel.hidden) openSearch();
    else closeSearch();
  });
  elements.search.addEventListener("input", () => applySearch(elements));
  elements.search.addEventListener("keydown", (event) => {
    if (overlayKeyboardAction({ key: event.key, open: !elements.searchPanel.hidden }) !== "close") return;
    event.preventDefault();
    closeSearch();
  });
  elements.showHighlights.addEventListener("change", () => {
    elements.documentView.classList.toggle("hide-highlights", !elements.showHighlights.checked);
  });
  elements.typeControl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-size]");
    if (!button) return;
    selectedTypeSize = button.dataset.size;
    updateTypeControls();
    setStatus(`${button.getAttribute("aria-label")} selected.`);
  });

  elements.previousChange.addEventListener("click", () => moveChange(-1));
  elements.nextChange.addEventListener("click", () => moveChange(1));
  elements.exportNotes.addEventListener("click", exportReviewNotes);
  elements.helpButton.addEventListener("click", openKeyboardHelp);
  elements.toolsToggle.addEventListener("click", openTools);
  elements.toolsDialog.addEventListener("close", () => {
    setDisclosureState({ trigger: elements.toolsToggle, panel: elements.toolsDialog }, false, { restoreFocus: true });
  });

  window.addEventListener("popstate", () => {
    viewState = parseViewState(window.location.search);
    selectedChangeIndex = 0;
    if (window.location.search !== serializeViewState(viewState)) writeHistory("replace");
    renderInterface();
    setStatus("Comparison restored from browser history.");
  });
  document.addEventListener("keydown", handleShortcut);
}

if (browserAvailable) {
  installNoteTooltip(elements.documentView);
  sampleCombobox = enhanceSelect(elements.sampleSelector, { labelledBy: "sample-select-label" });
  leftCombobox = enhanceSelect(elements.leftSelector, { labelledBy: "left-version-label" });
  rightCombobox = enhanceSelect(elements.rightSelector, { labelledBy: "right-version-label" });
  wireEvents();
  if (window.location.search !== serializeViewState(viewState)) writeHistory("replace");
  renderInterface();
}
