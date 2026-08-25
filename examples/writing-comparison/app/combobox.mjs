/*
 * A listbox that replaces a native <select> whose popup cannot be styled.
 * The <select> stays in the DOM as the value holder, so the controller keeps
 * reading and writing `select.value` and keeps listening for `change`; this
 * module only draws the closed trigger and the open popover over it.
 */

const CHEVRON = "M1.6 2.2 6 6.2l4.4-4";
const CHECK = "M1.8 5.4 4.4 8 10.2 2.2";

let instanceCount = 0;

// Returns the index the given key moves to, or null when the key is not a
// movement key or nothing selectable is left. Disabled rows are stepped over
// rather than landed on: a version a sample does not have is worth showing,
// but stopping on it would strand the keyboard on a row Enter cannot take.
// Exported so the traversal rules can be tested without a DOM.
export function nextActiveIndex({ count, activeIndex, key, isDisabled = () => false }) {
  if (count <= 0) return null;
  const wrap = (index) => ((index % count) + count) % count;
  const from = activeIndex >= 0 && activeIndex < count ? activeIndex : -1;

  const step = { ArrowDown: 1, ArrowUp: -1 }[key];
  if (step !== undefined) {
    const origin = from < 0 ? (step === 1 ? -1 : 0) : from;
    for (let offset = 1; offset <= count; offset += 1) {
      const index = wrap(origin + step * offset);
      if (!isDisabled(index)) return index;
    }
    return null;
  }

  if (key === "Home" || key === "End") {
    const direction = key === "Home" ? 1 : -1;
    const start = key === "Home" ? 0 : count - 1;
    for (let offset = 0; offset < count; offset += 1) {
      const index = start + direction * offset;
      if (!isDisabled(index)) return index;
    }
    return null;
  }

  return null;
}

// Type-to-jump: search after the active row first so repeated presses of the
// same letter cycle through the entries that share it.
export function typeaheadIndex(labels, query, activeIndex, isDisabled = () => false) {
  const needle = query.toLocaleLowerCase();
  if (needle === "") return null;
  const start = activeIndex >= 0 ? activeIndex : -1;
  for (let offset = 1; offset <= labels.length; offset += 1) {
    const index = (start + offset + labels.length) % labels.length;
    if (isDisabled(index)) continue;
    if (labels[index].toLocaleLowerCase().startsWith(needle)) return index;
  }
  return null;
}

function icon(path, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 12 10");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className);
  const shape = document.createElementNS("http://www.w3.org/2000/svg", "path");
  shape.setAttribute("d", path);
  shape.setAttribute("fill", "none");
  shape.setAttribute("stroke", "currentColor");
  shape.setAttribute("stroke-width", "1.7");
  shape.setAttribute("stroke-linecap", "round");
  shape.setAttribute("stroke-linejoin", "round");
  svg.append(shape);
  return svg;
}

export function enhanceSelect(select, { labelledBy } = {}) {
  if (!select || typeof document === "undefined") return null;
  instanceCount += 1;
  const idPrefix = `ui-select-${instanceCount}`;

  const root = document.createElement("div");
  root.className = "ui-select";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "ui-select-trigger";
  trigger.id = `${idPrefix}-trigger`;
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", `${idPrefix}-listbox`);
  if (labelledBy) trigger.setAttribute("aria-labelledby", `${labelledBy} ${idPrefix}-trigger`);

  const valueLabel = document.createElement("span");
  valueLabel.className = "ui-select-value";
  trigger.append(valueLabel, icon(CHEVRON, "ui-select-chevron"));

  const popover = document.createElement("div");
  popover.className = "ui-select-popover";
  popover.id = `${idPrefix}-listbox`;
  popover.setAttribute("role", "listbox");
  popover.hidden = true;
  if (labelledBy) popover.setAttribute("aria-labelledby", labelledBy);

  root.append(trigger, popover);
  select.parentNode.insertBefore(root, select);
  root.append(select);
  select.hidden = true;
  select.tabIndex = -1;

  let rows = [];
  let activeIndex = -1;
  let typeahead = "";
  let typeaheadTimer = 0;

  const isOpen = () => !popover.hidden;
  const isDisabled = (index) => Boolean(rows[index]?.disabled);

  function setActive(index) {
    activeIndex = index;
    rows.forEach((row, position) => {
      const active = position === index;
      row.element.classList.toggle("is-active", active);
    });
    // Only meaningful while the listbox is open; a collapsed combobox must not
    // point at a descendant that is not being presented.
    if (index >= 0 && isOpen()) {
      trigger.setAttribute("aria-activedescendant", rows[index].element.id);
      rows[index].element.scrollIntoView({ block: "nearest" });
    } else {
      trigger.removeAttribute("aria-activedescendant");
    }
  }

  // Rebuilt from the <select> rather than kept in parallel, so the controller
  // repopulating its options stays the single source of truth.
  function sync() {
    const fragment = document.createDocumentFragment();
    rows = [];

    for (const node of select.children) {
      const options = node.tagName === "OPTGROUP" ? [...node.children] : [node];
      if (node.tagName === "OPTGROUP") {
        const heading = document.createElement("div");
        heading.className = "ui-select-group";
        heading.setAttribute("aria-hidden", "true");
        heading.textContent = node.label;
        fragment.append(heading);
      }
      for (const option of options) {
        if (option.tagName !== "OPTION") continue;
        const row = document.createElement("div");
        row.className = "ui-select-option";
        row.id = `${idPrefix}-option-${rows.length}`;
        row.setAttribute("role", "option");
        row.setAttribute("aria-selected", String(option.selected));
        row.dataset.value = option.value;
        if (option.disabled) row.setAttribute("aria-disabled", "true");
        const text = document.createElement("span");
        text.textContent = option.textContent;
        // Indicator trails the label so every row's text starts on the same
        // left rail as the group heading.
        row.append(text, icon(CHECK, "ui-select-check"));
        fragment.append(row);
        rows.push({ element: row, value: option.value, label: option.textContent, disabled: option.disabled });
      }
    }

    popover.replaceChildren(fragment);
    const selected = rows.find((row) => row.value === select.value);
    valueLabel.textContent = selected?.label ?? "";
    trigger.disabled = select.disabled || rows.length === 0;
    setActive(selected ? rows.indexOf(selected) : -1);
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen()) return;
    popover.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.removeAttribute("aria-activedescendant");
    root.classList.remove("is-open");
    if (restoreFocus) trigger.focus();
  }

  function open() {
    if (isOpen() || trigger.disabled) return;
    popover.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    setActive(rows.findIndex((row) => row.value === select.value));
  }

  function commit(index) {
    const row = rows[index];
    if (!row || row.disabled) return;
    close();
    if (row.value === select.value) return;
    select.value = row.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  trigger.addEventListener("click", () => (isOpen() ? close() : open()));

  trigger.addEventListener("keydown", (event) => {
    if (!isOpen()) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        open();
      }
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") {
      close({ restoreFocus: event.key !== "Tab" });
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      commit(activeIndex);
      return;
    }
    const moved = nextActiveIndex({ count: rows.length, activeIndex, key: event.key, isDisabled });
    if (moved !== null) {
      event.preventDefault();
      setActive(moved);
      return;
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      // Consumed even without a match: while the listbox is open a printable
      // key is typeahead input and must not reach the page-level shortcuts.
      event.preventDefault();
      typeahead += event.key;
      window.clearTimeout(typeaheadTimer);
      typeaheadTimer = window.setTimeout(() => { typeahead = ""; }, 600);
      const match = typeaheadIndex(rows.map((row) => row.label), typeahead, activeIndex, isDisabled);
      if (match !== null) setActive(match);
    }
  });

  popover.addEventListener("click", (event) => {
    const row = event.target.closest(".ui-select-option");
    if (row) commit(rows.findIndex((entry) => entry.element === row));
  });

  // Rows are not focusable, so the default mousedown would move focus to
  // <body> and the focusout handler below would close the popover before its
  // click could commit the row.
  popover.addEventListener("pointerdown", (event) => event.preventDefault());

  popover.addEventListener("pointermove", (event) => {
    const row = event.target.closest(".ui-select-option");
    const index = rows.findIndex((entry) => entry.element === row);
    if (index >= 0 && index !== activeIndex && !isDisabled(index)) setActive(index);
  });

  document.addEventListener("pointerdown", (event) => {
    if (isOpen() && !root.contains(event.target)) close({ restoreFocus: false });
  });

  // Focus can also leave without a pointer or Tab key — for example a dialog
  // opening and calling focus(). An open popover must not outlive its focus.
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) close({ restoreFocus: false });
  });

  sync();
  return { root, trigger, popover, sync, close };
}
