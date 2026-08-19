// Document search, lifted out of the controller: it is self-contained, and
// app.mjs was over the repository's 550-line reviewability cap.

export function clearSearchMarks(elements) {
  for (const mark of elements.documentView.querySelectorAll("mark.search-match")) {
    const parent = mark.parentNode;
    mark.replaceWith(document.createTextNode(mark.textContent));
    parent?.normalize();
  }
}

export function applySearch(elements) {
  clearSearchMarks(elements);
  const query = elements.search.value.trim();
  elements.searchEmpty.hidden = true;
  if (!query) {
    elements.searchResults.textContent = "Search both";
    return;
  }

  const needle = query.toLocaleLowerCase();
  const walker = document.createTreeWalker(elements.documentView, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.toLocaleLowerCase().includes(needle)) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest(".visually-hidden, .pane-label, mark")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const matches = [];
  while (walker.nextNode()) matches.push(walker.currentNode);

  let count = 0;
  for (const textNode of matches) {
    const text = textNode.nodeValue;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    // Scan the original string and fold one candidate slice at a time. Folding
    // the whole node first desynchronises indices, because some characters
    // change length when lowercased (U+0130 becomes two code units).
    let matchIndex = indexOfFolded(text, needle, cursor);
    while (matchIndex !== -1) {
      const matchLength = foldedMatchLength(text, matchIndex, needle);
      fragment.append(document.createTextNode(text.slice(cursor, matchIndex)));
      const mark = document.createElement("mark");
      mark.className = "search-match";
      mark.textContent = text.slice(matchIndex, matchIndex + matchLength);
      fragment.append(mark);
      count += 1;
      cursor = matchIndex + matchLength;
      matchIndex = indexOfFolded(text, needle, cursor);
    }
    fragment.append(document.createTextNode(text.slice(cursor)));
    textNode.replaceWith(fragment);
  }

  elements.searchResults.textContent = `${count} match${count === 1 ? "" : "es"}`;
  elements.searchEmpty.hidden = count !== 0;
}

function foldedMatchLength(text, start, needle) {
  for (let length = 1; start + length <= text.length; length += 1) {
    const folded = text.slice(start, start + length).toLocaleLowerCase();
    if (folded === needle) return length;
    if (folded.length > needle.length) return 0;
  }
  return 0;
}

function indexOfFolded(text, needle, from) {
  for (let index = from; index < text.length; index += 1) {
    if (foldedMatchLength(text, index, needle) > 0) return index;
  }
  return -1;
}
