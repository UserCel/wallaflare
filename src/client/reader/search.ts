export let readerSearchMatches: HTMLElement[] = [];
export let activeReaderSearchIndex: number = -1;
export let currentReaderSearchQuery: string = "";

export function toggleReaderSearchBar(): void {
  const bar = document.getElementById("readerSearchBar");
  if (bar && bar.style.display !== "none") {
    closeReaderSearchBar();
  } else {
    openReaderSearchBar();
  }
}

export function openReaderSearchBar(): void {
  const bar = document.getElementById("readerSearchBar");
  const input = document.getElementById("readerSearchInput") as HTMLInputElement | null;
  if (!bar || !input) return;

  const w = typeof window !== "undefined" ? (window as any) : {};
  if (typeof w.showReaderTopBar === "function") w.showReaderTopBar(true);

  bar.style.display = "flex";
  input.focus();
  if (typeof input.select === "function") input.select();
  const query = (input.value || "").trim();
  if (query) {
    const rememberedIndex = (query.toLowerCase() === currentReaderSearchQuery.toLowerCase() && activeReaderSearchIndex >= 0) ? activeReaderSearchIndex : 0;
    performReaderSearch(query, false, rememberedIndex);
  }
}

export function closeReaderSearchBar(): void {
  const bar = document.getElementById("readerSearchBar");
  if (bar) bar.style.display = "none";
  clearReaderSearchMarksOnly();
}

export function clearReaderSearchMarksOnly(): void {
  readerSearchMatches = [];
  const container = document.getElementById("readerBody");
  if (!container) return;
  const marks = container.querySelectorAll("mark.reader-search-match");
  marks.forEach(m => {
    const parent = m.parentNode;
    if (parent) {
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    }
  });
}

export function clearReaderSearchMatches(): void {
  clearReaderSearchMarksOnly();
  activeReaderSearchIndex = -1;
  currentReaderSearchQuery = "";
  const countEl = document.getElementById("readerSearchCount");
  if (countEl) countEl.textContent = "0/0";
}

export function handleReaderSearchInput(val: string): void {
  performReaderSearch(val, true, 0);
}

export function handleReaderSearchKeydown(e: KeyboardEvent): void {
  if (e.key === "Enter") {
    e.preventDefault();
    if (e.shiftKey) jumpReaderSearchMatch(-1);
    else jumpReaderSearchMatch(1);
  } else if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    closeReaderSearchBar();
    const w = typeof window !== "undefined" ? (window as any) : {};
    if (typeof w.setKeyboardPaneFocus === "function") w.setKeyboardPaneFocus("reader");
  } else if (e.key === "ArrowDown" || e.key === "PageDown" || (e.ctrlKey && e.key === "ArrowDown")) {
    e.preventDefault();
    const scrollEl = document.getElementById("readerScrollContainer");
    scrollEl?.scrollBy({ top: e.key === "ArrowDown" ? 80 : 250, behavior: "smooth" });
  } else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.ctrlKey && e.key === "ArrowUp")) {
    e.preventDefault();
    const scrollEl = document.getElementById("readerScrollContainer");
    scrollEl?.scrollBy({ top: e.key === "ArrowUp" ? -80 : -250, behavior: "smooth" });
  }
}

export function performReaderSearch(query: string, shouldScroll: boolean = true, targetIndex: number = 0): void {
  const q = (query || "").trim();
  clearReaderSearchMarksOnly();
  if (!q) {
    currentReaderSearchQuery = "";
    activeReaderSearchIndex = -1;
    const countEl = document.getElementById("readerSearchCount");
    if (countEl) countEl.textContent = "0/0";
    return;
  }

  currentReaderSearchQuery = q;
  const container = document.getElementById("readerBody");
  if (!container) return;

  const showTextFilter = typeof NodeFilter !== "undefined" && (NodeFilter as any).SHOW_TEXT ? (NodeFilter as any).SHOW_TEXT : 4;
  const walker = document.createTreeWalker(container, showTextFilter, null);
  let node: Node | null;
  const textNodes: Node[] = [];
  while ((node = walker.nextNode())) {
    if (node.parentElement && (node.parentElement.tagName === "SCRIPT" || node.parentElement.tagName === "STYLE")) continue;
    textNodes.push(node);
  }

  const qLower = q.toLowerCase();
  const matchElements: HTMLElement[] = [];

  for (const tNode of textNodes) {
    let text = tNode.nodeValue || "";
    let lower = text.toLowerCase();
    let idx = lower.indexOf(qLower);
    if (idx === -1) continue;

    let currentNode = tNode;
    while (idx !== -1) {
      const matchText = (currentNode.nodeValue || "").substring(idx, idx + q.length);
      const after = (currentNode.nodeValue || "").substring(idx + q.length);

      const mark = document.createElement("mark");
      mark.className = "reader-search-match";
      mark.textContent = matchText;

      currentNode.nodeValue = (currentNode.nodeValue || "").substring(0, idx);
      const afterNode = document.createTextNode(after);

      const parent = currentNode.parentNode;
      if (parent) {
        parent.insertBefore(mark, currentNode.nextSibling);
        parent.insertBefore(afterNode, mark.nextSibling);
      }

      matchElements.push(mark);

      currentNode = afterNode;
      lower = (currentNode.nodeValue || "").toLowerCase();
      idx = lower.indexOf(qLower);
    }
  }

  readerSearchMatches = matchElements;
  if (readerSearchMatches.length > 0) {
    activeReaderSearchIndex = Math.max(0, Math.min(targetIndex, readerSearchMatches.length - 1));
    updateActiveReaderSearchMatch(shouldScroll);
  } else {
    activeReaderSearchIndex = -1;
    const countEl = document.getElementById("readerSearchCount");
    if (countEl) countEl.textContent = "0/0";
  }
}

export function jumpReaderSearchMatch(delta: number): void {
  if (readerSearchMatches.length === 0) return;
  activeReaderSearchIndex = (activeReaderSearchIndex + delta + readerSearchMatches.length) % readerSearchMatches.length;
  updateActiveReaderSearchMatch(true);
}

export function updateActiveReaderSearchMatch(shouldScroll: boolean = true): void {
  readerSearchMatches.forEach((m, idx) => {
    if (idx === activeReaderSearchIndex) m.classList.add("active-match");
    else m.classList.remove("active-match");
  });

  const countEl = document.getElementById("readerSearchCount");
  if (countEl) {
    countEl.textContent = readerSearchMatches.length > 0 ? ((activeReaderSearchIndex + 1) + "/" + readerSearchMatches.length) : "0/0";
  }

  if (shouldScroll && readerSearchMatches.length > 0 && activeReaderSearchIndex >= 0) {
    const currentMark = readerSearchMatches[activeReaderSearchIndex];
    if (currentMark && typeof currentMark.scrollIntoView === "function") {
      currentMark.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

// Attach to window for global access & HTML inline event handlers
if (typeof window !== "undefined") {
  const w = window as any;
  w.toggleReaderSearchBar = toggleReaderSearchBar;
  w.openReaderSearchBar = openReaderSearchBar;
  w.closeReaderSearchBar = closeReaderSearchBar;
  w.clearReaderSearchMatches = clearReaderSearchMatches;
  w.handleReaderSearchInput = handleReaderSearchInput;
  w.handleReaderSearchKeydown = handleReaderSearchKeydown;
  w.jumpReaderSearchMatch = jumpReaderSearchMatch;
}
