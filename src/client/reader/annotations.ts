import { Annotation, Article } from "../types";
import { state } from "../state";
import { openModal, closeModal } from "../modals/manager";
import { showToast } from "../components/toast";
import { authFetch } from "../sync/api";
import { enqueueMutation } from "../storage/outbox";

export function isRtlText(text: string): boolean {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text || "");
}

export function clearActiveTextSelection(): void {
  state.activeSelectionRange = null;
  state.activeSelectedQuote = "";
  const toolbar = document.getElementById("readerSelectionToolbar");
  if (toolbar) toolbar.classList.remove("show");
}

export function updateHighlightsBadge(): void {
  const activeArticle = state.allEntries.find((e) => e.id === state.activeArticleId);
  const count = activeArticle?.annotations?.length || 0;
  const badge = document.getElementById("readerHighlightsBadge");
  if (badge) {
    badge.textContent = String(count);
    badge.style.display = count > 0 ? "inline-flex" : "none";
  }
}

export function highlightTextInNode(container: any, ann: any): void {
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
    mark.onclick = (e: any) => {
      e.stopPropagation();
      openHighlightPopover(ann, mark);
    };
    return mark;
  }

  // Fast path: Search single text nodes first
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let node: any;
  let candidates: any[] = [];
  let charCounter = 0;
  let pCounter = 0;
  let lastP: Element | null = null;

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
  const walker2 = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let textNodes: any[] = [];
  let fullText = "";
  let lastBlock: Element | null = null;
  while ((node = walker2.nextNode())) {
    if (node.parentElement && node.parentElement.closest("mark.reader-hl")) continue;
    const text = node.nodeValue || "";
    if (!text) continue;
    const block = node.parentElement ? node.parentElement.closest("p, div, li, blockquote, h1, h2, h3, h4, h5, h6, tr, article, section") : null;
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
    let occurrences: any[] = [];
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

export function getSortedAnnotations(item: any, sortMode: string = "position"): Annotation[] {
      if (!item || !item.annotations || !Array.isArray(item.annotations)) return [];
      const list = [...item.annotations];

      if (sortMode === "time") {
        return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }

      const markElements = Array.from(document.querySelectorAll("#readerBody mark.reader-hl"));
      if (markElements.length > 0 && state.activeArticleId === item.id) {
        const domIndexMap = new Map();
        markElements.forEach((m: any, idx) => {
          const id = parseInt(m.dataset.annotationId, 10);
          if (id && !domIndexMap.has(id)) domIndexMap.set(id, idx);
        });
        return list.sort((a, b) => {
          const posA = domIndexMap.has(a.id) ? domIndexMap.get(a.id) : 99999;
          const posB = domIndexMap.has(b.id) ? domIndexMap.get(b.id) : 99999;
          if (posA !== posB) return posA - posB;
          return (a.id || 0) - (b.id || 0);
        });
      }

      const fullText = (item.content || item.text || "").toLowerCase();
      return list.sort((a, b) => {
        const getOffset = (ann: any) => {
          if (ann.target && Array.isArray(ann.target.selector)) {
            const posSel = ann.target.selector.find((s: any) => s.type === "TextPositionSelector");
            if (posSel && typeof posSel.start === "number") return posSel.start;
          }
          if (ann.quote) {
            const idx = fullText.indexOf(ann.quote.toLowerCase().slice(0, 30));
            if (idx >= 0) return idx;
          }
          return 99999;
        };
        const offA = getOffset(a);
        const offB = getOffset(b);
        if (offA !== offB) return offA - offB;
        return (a.id || 0) - (b.id || 0);
      });
    }

export function openHighlightPopover(ann: any, el: HTMLElement): void {
  state.currentHighlightAnnotation = ann;
  const popover = document.getElementById("highlightPopover");
  if (!popover) return;

  const quoteEl = document.getElementById("popoverQuoteText");
  const noteEl = document.getElementById("popoverNoteText");
  if (quoteEl) quoteEl.textContent = ann.quote || "";
  if (noteEl) {
    noteEl.textContent = ann.text || "";
    noteEl.style.display = ann.text ? "block" : "none";
  }

  const rect = el.getBoundingClientRect();
  popover.style.top = `${rect.bottom + window.scrollY + 8}px`;
  popover.style.left = `${Math.max(10, rect.left + window.scrollX - 50)}px`;
  popover.style.display = "block";
}

export function closeHighlightPopover(): void {
  const popover = document.getElementById("highlightPopover");
  if (popover) popover.style.display = "none";
  state.currentHighlightAnnotation = null;
}

export function applyAnnotationsToReader(contentEl: HTMLElement, annotations: Annotation[]): void {
  if (!annotations || annotations.length === 0 || !contentEl) return;
  annotations.forEach((anno) => {
    highlightTextInNode(contentEl, anno);
  });
}

export function initReaderSelectionHandlers(): void {
  const readerContent = document.getElementById("readerArticleContent");
  const toolbar = document.getElementById("readerSelectionToolbar");
  if (!readerContent || !toolbar) return;

  document.addEventListener("selectionchange", () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      clearActiveTextSelection();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!readerContent.contains(range.commonAncestorContainer)) {
      clearActiveTextSelection();
      return;
    }

    state.activeSelectionRange = range.cloneRange();
    state.activeSelectedQuote = selection.toString().trim();

    const rect = range.getBoundingClientRect();
    toolbar.style.top = `${Math.max(10, rect.top - 50)}px`;
    toolbar.style.left = `${Math.max(10, rect.left + rect.width / 2 - 100)}px`;
    toolbar.classList.add("show");
  });
}
