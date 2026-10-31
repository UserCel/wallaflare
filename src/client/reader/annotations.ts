import { openModal, closeModal } from "../modals/manager";
import { showToast } from "../components/toast";
import { copyDirectText } from "../utils/clipboard";
import {
  updateHighlightsBadge,
  renderModalHighlightsList,
  formatAnnotationReadable
} from "../modals/highlights";

export let activeSelectionRange: Range | null = null;
export let activeSelectedQuote: string = "";
export let activePopoverAnnotation: any = null;
export let activeModalAnnotation: any = null;
export let pendingHighlightData: any = null;
export let modalSelectedColor: string = "yellow";
let saveQuoteDebounceTimer: any = null;

export function isRtlText(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text || "");
}

export function getSelectionContext(range: Range | null, container: HTMLElement | null): { prefix: string; suffix: string; position: number } {
  if (!range || !container) return { prefix: "", suffix: "", position: 0 };
  let prefix = "";
  try {
    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    const preText = preRange.toString();
    prefix = preText.slice(Math.max(0, preText.length - 35));
  } catch (e) {}

  let suffix = "";
  try {
    const postRange = document.createRange();
    postRange.selectNodeContents(container);
    postRange.setStart(range.endContainer, range.endOffset);
    const postText = postRange.toString();
    suffix = postText.slice(0, 35);
  } catch (e) {}

  let position = 0;
  try {
    const fullPreRange = document.createRange();
    fullPreRange.selectNodeContents(container);
    fullPreRange.setEnd(range.startContainer, range.startOffset);
    position = fullPreRange.toString().length;
  } catch (e) {}

  return { prefix, suffix, position };
}

export function highlightTextInNode(container: HTMLElement, ann: any): void {
  const quote = (ann.quote || "").trim();
  if (!quote) return;

  const targetSelector = (ann.target && ann.target.selector) ? ann.target.selector : (ann.target || {});
  const expectedPrefix = (targetSelector.prefix || ann.prefix || "").trim();
  const expectedSuffix = (targetSelector.suffix || ann.suffix || "").trim();
  const koreader = (ann.target && ann.target.koreader) ? ann.target.koreader : {};
  let targetPIndex: number | null = null;
  let targetCharOffset: number | null = null;
  if (koreader.pos0) {
    const pMatch = String(koreader.pos0).match(/p\[(\d+)\]/i);
    if (pMatch) targetPIndex = parseInt(pMatch[1], 10);
    const offsetMatch = String(koreader.pos0).match(/text\(\)\.(\d+)/i);
    if (offsetMatch) targetCharOffset = parseInt(offsetMatch[1], 10);
  }
  const expectedPos = (ann.target && ann.target.position && typeof ann.target.position.start === "number")
    ? ann.target.position.start
    : (typeof ann.position === "number" ? ann.position : targetCharOffset);

  function createHighlightMark(matchedText: string, hasNote: boolean = false, contClass: string = ""): HTMLElement {
    const mark = document.createElement("mark");
    let cls = "reader-hl reader-hl-" + (ann.color || "yellow");
    if (hasNote) cls += " has-note";
    if (contClass) cls += " " + contClass;
    mark.className = cls;
    mark.dataset.annotationId = String(ann.id);
    mark.title = ann.text ? (ann.color + " highlight: " + ann.text) : (ann.color + " highlight");
    mark.textContent = matchedText;
    mark.onclick = (e) => {
      e.stopPropagation();
      const currentId = mark.dataset.annotationId;
      const w = typeof window !== "undefined" ? (window as any) : {};
      const allEntries = w.allEntries || [];
      const item = allEntries.find((entry: any) => entry.id === w.activeArticleId);
      const currentAnn = (item && item.annotations) ? (item.annotations.find((a: any) => String(a.id) === String(currentId)) || ann) : ann;
      openHighlightPopover(currentAnn, mark);
    };
    return mark;
  }

  const showTextFilter = typeof NodeFilter !== "undefined" && (NodeFilter as any).SHOW_TEXT ? (NodeFilter as any).SHOW_TEXT : 4;
  // Fast path: Search single text nodes first
  const walker = document.createTreeWalker(container, showTextFilter, null);
  let node: Node | null;
  let candidates: any[] = [];
  let charCounter = 0;
  let pCounter = 0;
  let lastP: HTMLElement | null = null;

  while ((node = walker.nextNode())) {
    if (node.parentElement && node.parentElement.closest("mark.reader-hl")) continue;
    const text = node.nodeValue || "";
    let idx = text.indexOf(quote);
    const parentP = node.parentElement ? node.parentElement.closest("p") : null;
    if (parentP && parentP !== lastP) {
      pCounter++;
      lastP = parentP;
    }

    const isWord = /^\w+$/.test(quote);
    while (idx !== -1) {
      const charBefore = idx > 0 ? text[idx - 1] : "";
      const charAfter = (idx + quote.length < text.length) ? text[idx + quote.length] : "";
      const isSubword = isWord && (/\w/.test(charBefore) || /\w/.test(charAfter));

      const beforeInNode = text.slice(Math.max(0, idx - 35), idx);
      const afterInNode = text.slice(idx + quote.length, idx + quote.length + 35);

      let score = isSubword ? -100 : 0;
      if (expectedPrefix && beforeInNode.endsWith(expectedPrefix.slice(-15))) score += 50;
      else if (expectedPrefix && beforeInNode.length > 0 && expectedPrefix.includes(beforeInNode.trim())) score += 20;

      if (expectedSuffix && afterInNode.startsWith(expectedSuffix.slice(0, 15))) score += 50;
      else if (expectedSuffix && afterInNode.length > 0 && expectedSuffix.includes(afterInNode.trim())) score += 20;

      if (targetPIndex !== null && parentP) {
        if (pCounter === targetPIndex || pCounter === targetPIndex - 1 || pCounter === targetPIndex + 1) {
          score += 50;
        }
      }

      const candidatePos = charCounter + idx;
      if (expectedPos !== null) {
        const dist = Math.abs(candidatePos - expectedPos);
        score += Math.max(0, 30 - Math.floor(dist / 20));
      }

      candidates.push({ node, idx, text, score, candidatePos });
      idx = text.indexOf(quote, idx + Math.max(1, quote.length));
    }
    charCounter += text.length;
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const targetNode = best.node;
    const idx = best.idx;
    const text = targetNode.nodeValue || "";
    const beforeText = text.slice(0, idx);
    const matchText = text.slice(idx, idx + quote.length);
    const afterText = text.slice(idx + quote.length);

    const mark = createHighlightMark(matchText, !!ann.text, "");
    const parent = targetNode.parentNode;
    if (!parent) return;

    if (beforeText) parent.insertBefore(document.createTextNode(beforeText), targetNode);
    parent.insertBefore(mark, targetNode);
    if (afterText) parent.insertBefore(document.createTextNode(afterText), targetNode);
    parent.removeChild(targetNode);
    return;
  }

  // Multi-node path: Handles highlights that span across formatting tags (em, strong, a, etc.)
  const walker2 = document.createTreeWalker(container, showTextFilter, null);
  let textNodes: any[] = [];
  let fullText = "";
  let lastBlock: HTMLElement | null = null;
  while ((node = walker2.nextNode())) {
    if (node.parentElement && node.parentElement.closest("mark.reader-hl")) continue;
    const text = node.nodeValue || "";
    if (!text) continue;
    const block = node.parentElement ? (node.parentElement.closest("p, div, li, blockquote, h1, h2, h3, h4, h5, h6, tr, article, section") as HTMLElement | null) : null;
    if (lastBlock && block !== lastBlock && fullText.length > 0 && !fullText.endsWith("\n")) {
      fullText += "\n";
    }
    lastBlock = block;
    const start = fullText.length;
    fullText += text;
    const end = fullText.length;
    textNodes.push({ node, start, end, text });
  }

  let matchStart = -1;
  let matchEnd = -1;

  // 1. Try exact search across concatenated text stream
  let exactIdx = fullText.indexOf(quote);
  if (exactIdx !== -1) {
    const occurrences: any[] = [];
    while (exactIdx !== -1) {
      const s = exactIdx;
      const e = exactIdx + quote.length;
      let score = 0;
      const beforeSnippet = fullText.slice(Math.max(0, s - 35), s);
      const afterSnippet = fullText.slice(e, e + 35);
      if (expectedPrefix && beforeSnippet.endsWith(expectedPrefix.slice(-15))) score += 50;
      if (expectedSuffix && afterSnippet.startsWith(expectedSuffix.slice(0, 15))) score += 50;
      if (expectedPos !== null) {
        const dist = Math.abs(s - expectedPos);
        score += Math.max(0, 30 - Math.floor(dist / 20));
      }
      occurrences.push({ start: s, end: e, score });
      exactIdx = fullText.indexOf(quote, exactIdx + Math.max(1, quote.length));
    }
    occurrences.sort((a, b) => b.score - a.score);
    matchStart = occurrences[0].start;
    matchEnd = occurrences[0].end;
  }

  // 2. Fallback: Fuzzy / flexible whitespace and quotation matching
  if (matchStart === -1) {
    try {
      const words = quote.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const regexParts = words.map((w: string) => {
          let esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          esc = esc.replace(/["\u201C\u201D]/g, '["\u201C\u201D]');
          esc = esc.replace(/['\u2018\u2019]/g, "['\u2018\u2019]");
          esc = esc.replace(/[\u2013\u2014-]/g, "[\u2013\u2014-]");
          return esc;
        });
        const flexRegex = new RegExp(regexParts.join("[\\s\\u00A0]+"), "i");
        const m = flexRegex.exec(fullText);
        if (m && typeof m.index === "number") {
          matchStart = m.index;
          matchEnd = m.index + m[0].length;
        }
      }
    } catch (e) {}
  }

  if (matchStart === -1 || matchEnd <= matchStart) return;

  const overlapping = textNodes.filter(tn => tn.end > matchStart && tn.start < matchEnd);
  if (overlapping.length === 0) return;

  const validOverlapping = overlapping.filter(tn => {
    const s = Math.max(0, matchStart - tn.start);
    const e = Math.min(tn.text.length, matchEnd - tn.start);
    return s < e;
  });
  if (validOverlapping.length === 0) return;

  validOverlapping.forEach((tn, idx) => {
    const isFirst = (idx === 0);
    const isLast = (idx === validOverlapping.length - 1);
    const isOnly = (validOverlapping.length === 1);
    const hasNote = isLast && !!ann.text;

    let contClass = "";
    if (!isOnly) {
      if (isFirst) contClass = "reader-hl-cont-start";
      else if (isLast) contClass = "reader-hl-cont-end";
      else contClass = "reader-hl-cont-mid";
    }

    const targetNode = tn.node;
    const text = tn.text;
    const startInNode = Math.max(0, matchStart - tn.start);
    const endInNode = Math.min(text.length, matchEnd - tn.start);

    const beforeText = text.slice(0, startInNode);
    const matchText = text.slice(startInNode, endInNode);
    const afterText = text.slice(endInNode);

    const mark = createHighlightMark(matchText, hasNote, contClass);
    const parent = targetNode.parentNode;
    if (!parent) return;

    if (beforeText) parent.insertBefore(document.createTextNode(beforeText), targetNode);
    parent.insertBefore(mark, targetNode);
    if (afterText) parent.insertBefore(document.createTextNode(afterText), targetNode);
    parent.removeChild(targetNode);
  });
}

export function applyAnnotationsToReader(item: any): void {
  if (!item) return;
  const annotations = item.annotations || [];
  const container = document.getElementById("readerBody");
  if (!container) return;

  const scrollEl = document.getElementById("readerScrollContainer");
  const prevScrollTop = scrollEl ? scrollEl.scrollTop : 0;

  // Always restore clean HTML before reapplying annotations
  const rawContent = (container as any)._rawCleanContent || item.content;
  if (rawContent) {
    container.innerHTML = rawContent;
    (container as any)._rawCleanContent = rawContent;
    try {
      container.querySelectorAll("*[style]").forEach(el => {
        const style = (el.getAttribute("style") || "").toLowerCase();
        if (/font-weight\s*:\s*(bold|[6-9]00)/.test(style) && el.tagName !== "STRONG" && el.tagName !== "B") {
          (el as HTMLElement).style.fontWeight = "700";
        }
        if (/font-style\s*:\s*italic/.test(style) && el.tagName !== "EM" && el.tagName !== "I") {
          (el as HTMLElement).style.fontStyle = "italic";
        }
      });
    } catch (e) {}
  } else {
    const existingMarks = container.querySelectorAll("mark.reader-hl");
    existingMarks.forEach(m => {
      const parent = m.parentNode;
      if (parent) {
        while (m.firstChild) parent.insertBefore(m.firstChild, m);
        parent.removeChild(m);
        parent.normalize();
      }
    });
  }

  for (const ann of annotations) {
    if (!ann || !ann.quote) continue;
    highlightTextInNode(container, ann);
  }

  if (scrollEl && prevScrollTop > 0) {
    scrollEl.scrollTop = prevScrollTop;
  }

  updateHighlightsBadge(annotations.length);
}

export function openHighlightPopover(ann: any, targetEl: HTMLElement): void {
  activePopoverAnnotation = ann;
  const popover = document.getElementById("highlightPopover");
  if (!popover) return;
  const noteEl = document.getElementById("popoverNoteText");
  if (noteEl) {
    noteEl.textContent = ann.text || "";
    noteEl.style.display = ann.text ? "block" : "none";
  }
  const quoteEl = document.getElementById("popoverQuoteText");
  if (quoteEl) quoteEl.textContent = ann.quote ? ("“" + ann.quote + "”") : "";
  const noteActionLabel = document.getElementById("popoverNoteActionLabel");
  if (noteActionLabel) noteActionLabel.textContent = ann.text ? "Edit Note" : "Add Note";

  popover.style.display = "block";
  const rect = targetEl.getBoundingClientRect();
  popover.style.top = Math.max(10, rect.bottom + 6) + "px";
  popover.style.left = Math.max(10, Math.min(window.innerWidth - 290, rect.left)) + "px";
}

export function closeHighlightPopover(): void {
  const popover = document.getElementById("highlightPopover");
  if (popover) popover.style.display = "none";
  activePopoverAnnotation = null;
}

export function saveAnnotationQuoteDebounced(ann: any): void {
  if (!ann || !ann.id || String(ann.id).startsWith("tmp_")) return;
  if (saveQuoteDebounceTimer) clearTimeout(saveQuoteDebounceTimer);
  saveQuoteDebounceTimer = setTimeout(() => {
    const w = typeof window !== "undefined" ? (window as any) : {};
    const authFetch = w.authFetch || fetch;
    authFetch("/api/annotations/" + ann.id + ".json", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quote: ann.quote,
        target: ann.target
      })
    }).catch((e: any) => console.error("[Annotations] Failed to patch adjusted selection:", e));
  }, 350);
}

export function adjustAnnotationSelection(ann: any, side: "start" | "end", action: "expand" | "shrink"): boolean {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const activeArticleId = w.activeArticleId;
  const allEntries = w.allEntries || [];
  if (!ann || !activeArticleId) return false;
  const item = allEntries.find((e: any) => e.id === activeArticleId);
  if (!item) return false;

  const container = document.getElementById("readerBody");
  if (!container) return false;

  const rawContent = (container as any)._rawCleanContent || item.content;
  const tempDiv = document.createElement("div");
  if (rawContent) {
    tempDiv.innerHTML = rawContent;
  } else {
    tempDiv.innerHTML = container.innerHTML;
    tempDiv.querySelectorAll("mark.reader-hl").forEach(m => {
      const p = m.parentNode;
      if (p) {
        while (m.firstChild) p.insertBefore(m.firstChild, m);
        p.removeChild(m);
        p.normalize();
      }
    });
  }

  const showTextFilter = typeof NodeFilter !== "undefined" && (NodeFilter as any).SHOW_TEXT ? (NodeFilter as any).SHOW_TEXT : 4;
  const walker = document.createTreeWalker(tempDiv, showTextFilter, null);
  let fullText = "";
  let lastBlock: HTMLElement | null = null;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue || "";
    if (!text) continue;
    const block = node.parentElement ? (node.parentElement.closest("p, div, li, blockquote, h1, h2, h3, h4, h5, h6, tr, article, section") as HTMLElement | null) : null;
    if (lastBlock && block !== lastBlock && fullText.length > 0 && !fullText.endsWith("\n")) {
      fullText += "\n";
    }
    lastBlock = block;
    fullText += text;
  }

  const quote = (ann.quote || "").trim();
  if (!quote || fullText.length === 0) return false;

  const targetSelector = (ann.target && ann.target.selector) ? ann.target.selector : (ann.target || {});
  const expectedPrefix = (targetSelector.prefix || ann.prefix || "").trim();
  const expectedSuffix = (targetSelector.suffix || ann.suffix || "").trim();
  const expectedPos = (ann.target && ann.target.position && typeof ann.target.position.start === "number")
    ? ann.target.position.start
    : (typeof ann.position === "number" ? ann.position : null);

  let matchStart = -1;
  let matchEnd = -1;

  // 1. Exact match with scoring
  let exactIdx = fullText.indexOf(quote);
  if (exactIdx !== -1) {
    let occurrences: { start: number; end: number; score: number }[] = [];
    while (exactIdx !== -1) {
      const s = exactIdx;
      const e = exactIdx + quote.length;
      let score = 0;
      const beforeSnippet = fullText.slice(Math.max(0, s - 35), s);
      const afterSnippet = fullText.slice(e, e + 35);
      if (expectedPrefix && beforeSnippet.endsWith(expectedPrefix.slice(-15))) score += 50;
      if (expectedSuffix && afterSnippet.startsWith(expectedSuffix.slice(0, 15))) score += 50;
      if (expectedPos !== null) {
        const dist = Math.abs(s - expectedPos);
        score += Math.max(0, 30 - Math.floor(dist / 20));
      }
      occurrences.push({ start: s, end: e, score });
      exactIdx = fullText.indexOf(quote, exactIdx + Math.max(1, quote.length));
    }
    occurrences.sort((a, b) => b.score - a.score);
    matchStart = occurrences[0].start;
    matchEnd = occurrences[0].end;
  }

  // 2. Fuzzy regex match fallback
  if (matchStart === -1) {
    try {
      const words = quote.split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const regexParts = words.map(w => {
          let esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          esc = esc.replace(/["\u201C\u201D]/g, '["\u201C\u201D]');
          esc = esc.replace(/['\u2018\u2019]/g, "['\u2018\u2019]");
          esc = esc.replace(/[\u2013\u2014-]/g, "[\u2013\u2014-]");
          return esc;
        });
        const flexRegex = new RegExp(regexParts.join("[\\s\\u00A0]+"), "i");
        const m = flexRegex.exec(fullText);
        if (m && typeof m.index === "number") {
          matchStart = m.index;
          matchEnd = m.index + m[0].length;
        }
      }
    } catch (e) {}
  }

  if (matchStart === -1 || matchEnd <= matchStart) return false;

  let curStart = matchStart;
  let curEnd = matchEnd;

  if (side === "start") {
    if (action === "shrink") {
      const sub = fullText.slice(curStart, curEnd);
      const m = sub.match(/^(\s*\S+\s*)/);
      if (m && m[1] && m[1].length < (curEnd - curStart)) {
        curStart += m[1].length;
      } else {
        return false;
      }
    } else if (action === "expand") {
      const before = fullText.slice(0, curStart);
      const m = before.match(/(\S+\s*)$/);
      if (m && m[1]) {
        curStart -= m[1].length;
      } else {
        return false;
      }
    }
  } else if (side === "end") {
    if (action === "shrink") {
      const sub = fullText.slice(curStart, curEnd);
      const m = sub.match(/(\s*\S+\s*)$/);
      if (m && m[1] && m[1].length < (curEnd - curStart)) {
        curEnd -= m[1].length;
      } else {
        return false;
      }
    } else if (action === "expand") {
      const after = fullText.slice(curEnd);
      const m = after.match(/^(\s*\S+)/);
      if (m && m[1]) {
        curEnd += m[1].length;
      } else {
        return false;
      }
    }
  }

  const newQuote = fullText.slice(curStart, curEnd).trim();
  if (!newQuote) return false;

  const newPrefix = fullText.slice(Math.max(0, curStart - 35), curStart);
  const newSuffix = fullText.slice(curEnd, Math.min(fullText.length, curEnd + 35));

  ann.quote = newQuote;
  if (!ann.target) ann.target = {};
  if (!ann.target.selector) ann.target.selector = { type: "TextQuoteSelector" };
  ann.target.selector.exact = newQuote;
  ann.target.selector.prefix = newPrefix;
  ann.target.selector.suffix = newSuffix;
  if (!ann.target.position) ann.target.position = {};
  ann.target.position.start = curStart;
  ann.target.position.end = curEnd;

  if (item.annotations && item.annotations.some((a: any) => a === ann || (a.id && a.id === ann.id))) {
    applyAnnotationsToReader(item);
    if (typeof w.syncLocalEntriesCache === "function") {
      w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
    }
    renderModalHighlightsList();
    saveAnnotationQuoteDebounced(ann);
  }

  return true;
}

export function adjustPopoverSelection(side: "start" | "end", action: "expand" | "shrink"): void {
  if (!activePopoverAnnotation) return;
  const success = adjustAnnotationSelection(activePopoverAnnotation, side, action);
  if (success) {
    const quoteEl = document.getElementById("popoverQuoteText");
    if (quoteEl) quoteEl.textContent = activePopoverAnnotation.quote ? ("“" + activePopoverAnnotation.quote + "”") : "";
    const mark = document.querySelector(`mark[data-annotation-id="${activePopoverAnnotation.id}"]`);
    const popover = document.getElementById("highlightPopover");
    if (mark && popover) {
      const rect = mark.getBoundingClientRect();
      popover.style.top = Math.max(10, rect.bottom + 6) + "px";
      popover.style.left = Math.max(10, Math.min(window.innerWidth - 290, rect.left)) + "px";
    }
  }
}

export function adjustModalSelection(side: "start" | "end", action: "expand" | "shrink"): void {
  const targetAnn = activeModalAnnotation || pendingHighlightData;
  if (!targetAnn) return;
  const success = adjustAnnotationSelection(targetAnn, side, action);
  if (success) {
    const preview = document.getElementById("annotationNoteQuotePreview");
    const quoteInput = document.getElementById("annotationNoteQuoteInput") as HTMLInputElement | null;
    if (preview) preview.textContent = targetAnn.quote || "";
    if (quoteInput) quoteInput.value = targetAnn.quote || "";
  }
}

export function copyPopoverQuote(): void {
  if (activePopoverAnnotation) {
    const text = formatAnnotationReadable(activePopoverAnnotation);
    if (text) copyDirectText(text, null, "✓ Copied note to clipboard");
  }
  closeHighlightPopover();
}

export async function changePopoverHighlightColor(color: string): Promise<void> {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const activeArticleId = w.activeArticleId;
  const allEntries = w.allEntries || [];
  if (!activePopoverAnnotation || !activeArticleId) return;
  const targetAnn = activePopoverAnnotation;
  const targetAnnId = targetAnn.id;
  targetAnn.color = color;
  const item = allEntries.find((e: any) => e.id === activeArticleId);
  if (item) {
    applyAnnotationsToReader(item);
    if (typeof w.syncLocalEntriesCache === "function") {
      w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
    }
  }
  closeHighlightPopover();
  try {
    const authFetch = w.authFetch || fetch;
    await authFetch("/api/annotations/" + targetAnnId + ".json", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color })
    });
  } catch (e) {
    console.error("[Annotations] Failed to patch annotation color:", e);
  }
}

export async function deletePopoverHighlight(): Promise<void> {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const activeArticleId = w.activeArticleId;
  const allEntries = w.allEntries || [];
  if (!activePopoverAnnotation || !activeArticleId) return;
  const targetAnn = activePopoverAnnotation;
  const annId = targetAnn.id;
  const item = allEntries.find((e: any) => e.id === activeArticleId);

  if (item && item.annotations) {
    item.annotations = item.annotations.filter((a: any) => a !== targetAnn && String(a.id) !== String(annId));
    applyAnnotationsToReader(item);
    if (typeof w.syncLocalEntriesCache === "function") {
      w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
    }
    if (typeof w.filterArticles === "function") {
      w.filterArticles(false);
    }
  }
  closeHighlightPopover();
  showToast("Highlight deleted");

  let realId = annId;
  if (targetAnn._createPromise) {
    try {
      const saved = await targetAnn._createPromise;
      if (saved && saved.id) realId = saved.id;
    } catch (e) {}
  }

  if (realId && !String(realId).startsWith("tmp_") && Number(realId) < 1000000000000) {
    try {
      const authFetch = w.authFetch || fetch;
      await authFetch("/api/annotations/" + realId + ".json", { method: "DELETE" });
    } catch (e) {}
  }
}

export function handleCreateHighlight(color: string = "yellow"): void {
  const sel = window.getSelection();
  const range = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0) : activeSelectionRange;
  const selQuote = sel ? sel.toString().trim() : "";
  const quote = (selQuote || activeSelectedQuote || (range ? range.toString().trim() : "")).trim();
  const w = typeof window !== "undefined" ? (window as any) : {};
  const activeArticleId = w.activeArticleId;
  const allEntries = w.allEntries || [];
  if (!quote || !activeArticleId) return;

  const item = allEntries.find((e: any) => e.id === activeArticleId);
  if (!item) return;

  const readerBody = document.getElementById("readerBody");
  const ctx = getSelectionContext(range, readerBody);

  const target = {
    selector: {
      type: "TextQuoteSelector",
      exact: quote,
      prefix: ctx.prefix,
      suffix: ctx.suffix
    },
    position: {
      start: ctx.position,
      end: ctx.position + quote.length
    }
  };

  const tempId = "tmp_" + Date.now();
  const newAnn: any = {
    id: tempId,
    entry_id: item.id,
    quote: quote,
    color: color,
    text: "",
    target: target,
    created_at: new Date().toISOString()
  };
  if (!item.annotations) item.annotations = [];
  item.annotations.push(newAnn);

  clearActiveTextSelection();
  applyAnnotationsToReader(item);
  if (typeof w.syncLocalEntriesCache === "function") {
    w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
  }
  if (typeof w.filterArticles === "function") {
    w.filterArticles(false);
  }

  const authFetch = w.authFetch || fetch;
  const createPromise = authFetch("/api/annotations/" + item.id + ".json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quote, color, text: "", target })
  }).then((res: any) => res.json()).then((saved: any) => {
    Object.assign(newAnn, saved);
    const idx = item.annotations.findIndex((a: any) => a.id === tempId || a.id === saved.id);
    if (idx >= 0) item.annotations[idx] = newAnn;
    const marks = document.querySelectorAll(`mark[data-annotation-id="${tempId}"]`);
    marks.forEach(m => (m as HTMLElement).dataset.annotationId = String(saved.id));
    if (activePopoverAnnotation && activePopoverAnnotation.id === tempId) {
      activePopoverAnnotation.id = saved.id;
    }
    if (typeof w.syncLocalEntriesCache === "function") {
      w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
    }
    if (typeof w.filterArticles === "function") {
      w.filterArticles(false);
    }
    return saved;
  }).catch(() => null);

  newAnn._createPromise = createPromise;
}

export function handleCreateHighlightWithNote(): void {
  const sel = window.getSelection();
  const range = (sel && sel.rangeCount > 0) ? sel.getRangeAt(0) : activeSelectionRange;
  const selQuote = sel ? sel.toString().trim() : "";
  const quote = (selQuote || activeSelectedQuote || (range ? range.toString().trim() : "")).trim();
  const w = typeof window !== "undefined" ? (window as any) : {};
  if (!quote || !w.activeArticleId) return;
  const readerBody = document.getElementById("readerBody");
  const ctx = getSelectionContext(range, readerBody);
  const target = {
    selector: {
      type: "TextQuoteSelector",
      exact: quote,
      prefix: ctx.prefix,
      suffix: ctx.suffix
    },
    position: {
      start: ctx.position,
      end: ctx.position + quote.length
    }
  };
  clearActiveTextSelection();
  openAnnotationNoteModal(null, { quote, color: "yellow", target });
}

export function handleCopySelection(): void {
  const sel = window.getSelection();
  const selQuote = sel ? sel.toString().trim() : "";
  const quote = (selQuote || activeSelectedQuote || (activeSelectionRange ? activeSelectionRange.toString().trim() : "")).trim();
  if (quote) copyDirectText(quote);
  clearActiveTextSelection();
}

export function selectModalNoteColor(color: string, btn?: HTMLElement | null): void {
  modalSelectedColor = color;
  document.querySelectorAll("#modalNoteColors .hl-color-btn").forEach(b => b.classList.remove("active-color"));
  if (btn) btn.classList.add("active-color");
}

export function openAnnotationNoteModal(ann: any = null, pendingData: any = null): void {
  const targetAnn = ann || activePopoverAnnotation || null;
  activeModalAnnotation = targetAnn;
  pendingHighlightData = pendingData || null;
  modalSelectedColor = (targetAnn ? targetAnn.color : (pendingData ? pendingData.color : "yellow")) || "yellow";
  closeHighlightPopover();

  const quoteInput = document.getElementById("annotationNoteQuoteInput") as HTMLInputElement | null;
  const preview = document.getElementById("annotationNoteQuotePreview");
  const input = document.getElementById("annotationNoteInput") as HTMLTextAreaElement | null;
  const quote = targetAnn ? targetAnn.quote : (pendingData ? pendingData.quote : "");
  if (quoteInput) quoteInput.value = quote || "";
  if (preview) preview.textContent = quote || "";
  if (input) input.value = targetAnn ? (targetAnn.text || "") : "";

  document.querySelectorAll("#modalNoteColors .hl-color-btn").forEach(b => {
    const c = b.getAttribute("data-color");
    if (c === modalSelectedColor) b.classList.add("active-color");
    else b.classList.remove("active-color");
  });

  openModal("annotationNoteModal");
  setTimeout(() => {
    if (input) input.focus();
  }, 60);
}

export function closeAnnotationNoteModal(): void {
  activeModalAnnotation = null;
  pendingHighlightData = null;
  closeModal("annotationNoteModal");
}

export async function handleSaveAnnotationNoteForm(e: Event): Promise<void> {
  if (e) e.preventDefault();
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const targetArticleId = w.activeArticleId || (activeModalAnnotation && activeModalAnnotation.entry_id);
  if (!targetArticleId) return;
  const item = allEntries.find((entry: any) => entry.id === targetArticleId);
  if (!item) return;

  const quoteInput = document.getElementById("annotationNoteQuoteInput") as HTMLInputElement | null;
  const input = document.getElementById("annotationNoteInput") as HTMLTextAreaElement | null;
  const text = input ? input.value.trim() : "";
  const color = modalSelectedColor || "yellow";

  if (pendingHighlightData) {
    const quote = (quoteInput ? quoteInput.value.trim() : "") || pendingHighlightData.quote || "";
    const target = pendingHighlightData.target || {
      selector: { type: "TextQuoteSelector", exact: quote }
    };
    if (target.selector && target.selector.type === "TextQuoteSelector") {
      target.selector.exact = quote;
    }
    closeAnnotationNoteModal();
    const tempId = "tmp_" + Date.now();
    const newAnn = { id: tempId, entry_id: item.id, quote, color, text, target, created_at: new Date().toISOString() };
    if (!item.annotations) item.annotations = [];
    item.annotations.push(newAnn);

    applyAnnotationsToReader(item);
    if (typeof w.syncLocalEntriesCache === "function") {
      w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
    }
    if (typeof w.filterArticles === "function") {
      w.filterArticles(false);
    }
    renderModalHighlightsList();

    const authFetch = w.authFetch || fetch;
    authFetch("/api/annotations/" + item.id + ".json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quote, color, text, target })
    }).then((res: any) => res.json()).then((saved: any) => {
      Object.assign(newAnn, saved);
      const idx = item.annotations.findIndex((a: any) => a.id === tempId || a.id === saved.id);
      if (idx >= 0) item.annotations[idx] = newAnn;
      const marks = document.querySelectorAll(`mark[data-annotation-id="${tempId}"]`);
      marks.forEach(m => (m as HTMLElement).dataset.annotationId = String(saved.id));
      if (activePopoverAnnotation && activePopoverAnnotation.id === tempId) {
        activePopoverAnnotation.id = saved.id;
      }
      if (typeof w.syncLocalEntriesCache === "function") {
        w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
      }
      if (typeof w.filterArticles === "function") {
        w.filterArticles(false);
      }
      renderModalHighlightsList();
    }).catch(() => {});
    return;
  }

  if (activeModalAnnotation) {
    const targetAnnId = activeModalAnnotation.id;
    const editedQuote = quoteInput ? quoteInput.value.trim() : "";
    const prevQuote = activeModalAnnotation.quote;
    activeModalAnnotation.text = text;
    activeModalAnnotation.color = color;
    if (editedQuote && editedQuote !== prevQuote) {
      activeModalAnnotation.quote = editedQuote;
      if (activeModalAnnotation.target && activeModalAnnotation.target.selector) {
        activeModalAnnotation.target.selector.exact = editedQuote;
      }
    }
    applyAnnotationsToReader(item);
    if (typeof w.syncLocalEntriesCache === "function") {
      w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
    }
    renderModalHighlightsList();
    closeAnnotationNoteModal();
    try {
      const authFetch = w.authFetch || fetch;
      const patchBody: any = { text, color };
      if (editedQuote && editedQuote !== prevQuote) {
        patchBody.quote = editedQuote;
      }
      await authFetch("/api/annotations/" + targetAnnId + ".json", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody)
      });
    } catch (e) {
      console.error("[Annotations] Failed to patch annotation note:", e);
    }
  }
}

export function copyCurrentAnnotationNoteModal(btn: HTMLElement | null = null): void {
  const quoteEl = document.getElementById("annotationNoteQuotePreview");
  const inputEl = document.getElementById("annotationNoteInput") as HTMLTextAreaElement | null;
  const quote = quoteEl?.textContent?.trim() || (activeModalAnnotation?.quote || pendingHighlightData?.quote || "").trim();
  const text = inputEl ? inputEl.value.trim() : (activeModalAnnotation?.text || "").trim();

  if (!quote && !text) {
    showToast("Nothing to copy");
    return;
  }

  const formatted = formatAnnotationReadable({ quote, text });
  if (formatted) {
    copyDirectText(formatted, btn, "✓ Copied note to clipboard");
  }
}

export function clearActiveTextSelection(): void {
  const sel = window.getSelection();
  if (sel) {
    try { sel.removeAllRanges(); } catch (e) {}
  }
  const toolbar = document.getElementById("readerHighlightToolbar");
  if (toolbar) toolbar.style.display = "none";

  const defaultHeader = document.getElementById("readerTopBarDefault");
  const annHeader = document.getElementById("readerTopBarAnnotation");
  if (defaultHeader) defaultHeader.style.display = "flex";
  if (annHeader) annHeader.style.display = "none";

  activeSelectionRange = null;
  activeSelectedQuote = "";
}

export function initReaderSelectionHandlers(): void {
  const handleSelection = () => {
    const readerView = document.getElementById("readerView");
    const readerBody = document.getElementById("readerBody");
    const desktopToolbar = document.getElementById("readerHighlightToolbar");
    const defaultHeader = document.getElementById("readerTopBarDefault");
    const annHeader = document.getElementById("readerTopBarAnnotation");

    const w = typeof window !== "undefined" ? (window as any) : {};
    if (!w.activeArticleId || !readerView || readerView.style.display === "none" || !readerBody) {
      if (desktopToolbar) desktopToolbar.style.display = "none";
      if (defaultHeader) defaultHeader.style.display = "flex";
      if (annHeader) annHeader.style.display = "none";
      activeSelectionRange = null;
      activeSelectedQuote = "";
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      const noteModal = document.getElementById("annotationNoteModal");
      if (noteModal && noteModal.classList.contains("open")) return;

      if (desktopToolbar && desktopToolbar.style.display !== "none") {
        desktopToolbar.style.display = "none";
      }
      if (annHeader && annHeader.style.display !== "none") {
        if (defaultHeader) defaultHeader.style.display = "flex";
        annHeader.style.display = "none";
      }
      activeSelectionRange = null;
      activeSelectedQuote = "";
      return;
    }

    const range = sel.getRangeAt(0);
    if (!readerBody.contains(range.commonAncestorContainer) && readerBody !== range.commonAncestorContainer) {
      if (desktopToolbar) desktopToolbar.style.display = "none";
      if (defaultHeader) defaultHeader.style.display = "flex";
      if (annHeader) annHeader.style.display = "none";
      activeSelectionRange = null;
      activeSelectedQuote = "";
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      if (desktopToolbar) desktopToolbar.style.display = "none";
      if (defaultHeader) defaultHeader.style.display = "flex";
      if (annHeader) annHeader.style.display = "none";
      activeSelectionRange = null;
      activeSelectedQuote = "";
      return;
    }

    activeSelectionRange = range.cloneRange();
    activeSelectedQuote = text;
    closeHighlightPopover();

    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) {
      if (defaultHeader) defaultHeader.style.display = "flex";
      if (annHeader) annHeader.style.display = "none";
      if (desktopToolbar) {
        desktopToolbar.style.display = "flex";
        const rect = range.getBoundingClientRect();
        const top = Math.max(10, rect.top - 48);
        const left = Math.max(10, Math.min(window.innerWidth - 250, rect.left + (rect.width / 2) - 110));
        desktopToolbar.style.top = top + "px";
        desktopToolbar.style.left = left + "px";
      }
    } else {
      if (desktopToolbar) desktopToolbar.style.display = "none";
      if (defaultHeader) defaultHeader.style.display = "none";
      if (annHeader) {
        annHeader.style.display = "flex";
        const countEl = document.getElementById("readerTopBarSelCount");
        if (countEl) {
          countEl.textContent = text.length > 14 ? (text.slice(0, 13) + "…") : text;
        }
      }
      if (typeof w.showReaderTopBar === "function") {
        w.showReaderTopBar(false);
      }
    }
  };

  document.addEventListener("selectionchange", handleSelection);
  document.addEventListener("mouseup", () => {
    setTimeout(handleSelection, 20);
  });
  document.addEventListener("touchend", () => {
    setTimeout(handleSelection, 40);
  });

  document.addEventListener("mousedown", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const insideToolbar = target.closest("#readerHighlightToolbar");
    const insideTopBar = target.closest("#readerTopBar");
    const insidePopover = target.closest("#highlightPopover");
    const insideMark = target.closest("mark.reader-hl");
    const insideModal = target.closest(".modal-backdrop");

    const toolbar = document.getElementById("readerHighlightToolbar");
    if (toolbar && toolbar.style.display !== "none" && !insideToolbar && !insideTopBar) {
      toolbar.style.display = "none";
      activeSelectionRange = null;
      activeSelectedQuote = "";
    }

    const popover = document.getElementById("highlightPopover");
    if (popover && popover.style.display !== "none" && !insidePopover && !insideMark && !insideModal) {
      closeHighlightPopover();
    }
  });
}

if (typeof window !== "undefined") {
  const w = window as any;
  w.isRtlText = isRtlText;
  w.getSelectionContext = getSelectionContext;
  w.highlightTextInNode = highlightTextInNode;
  w.applyAnnotationsToReader = applyAnnotationsToReader;
  w.openHighlightPopover = openHighlightPopover;
  w.closeHighlightPopover = closeHighlightPopover;
  w.adjustPopoverSelection = adjustPopoverSelection;
  w.adjustModalSelection = adjustModalSelection;
  w.adjustAnnotationSelection = adjustAnnotationSelection;
  w.copyPopoverQuote = copyPopoverQuote;
  w.changePopoverHighlightColor = changePopoverHighlightColor;
  w.deletePopoverHighlight = deletePopoverHighlight;
  w.handleCreateHighlight = handleCreateHighlight;
  w.handleCreateHighlightWithNote = handleCreateHighlightWithNote;
  w.handleCopySelection = handleCopySelection;
  w.selectModalNoteColor = selectModalNoteColor;
  w.openAnnotationNoteModal = openAnnotationNoteModal;
  w.closeAnnotationNoteModal = closeAnnotationNoteModal;
  w.handleSaveAnnotationNoteForm = handleSaveAnnotationNoteForm;
  w.clearActiveTextSelection = clearActiveTextSelection;
  w.initReaderSelectionHandlers = initReaderSelectionHandlers;
  w.copyCurrentAnnotationNoteModal = copyCurrentAnnotationNoteModal;
}
