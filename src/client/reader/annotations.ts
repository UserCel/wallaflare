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
      const quote = (ann.quote || '').trim();
      if (!quote) return;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
      let node: any;
      let candidates: any[] = [];

      while ((node = walker.nextNode())) {
        if (node.parentElement && node.parentElement.closest('mark.reader-hl')) continue;
        const text = node.nodeValue || '';
        let idx = text.indexOf(quote);
        while (idx !== -1) {
          candidates.push({ node, idx, text });
          idx = text.indexOf(quote, idx + Math.max(1, quote.length));
        }
      }

      if (candidates.length === 0) return;

      let best = candidates[0];
      const targetNode = best.node;
      const idx = best.idx;
      const text = targetNode.nodeValue || '';
      const beforeText = text.slice(0, idx);
      const matchText = text.slice(idx, idx + quote.length);
      const afterText = text.slice(idx + quote.length);

      const mark = document.createElement('mark');
      mark.className = 'reader-hl reader-hl-' + (ann.color || 'yellow') + (ann.text ? ' has-note' : '');
      mark.dataset.annotationId = String(ann.id);
      mark.title = ann.text ? (ann.color + ' highlight: ' + ann.text) : (ann.color + ' highlight');
      mark.textContent = matchText;
      mark.onclick = (e: any) => {
        e.stopPropagation();
        openHighlightPopover(ann, mark);
      };

      const parent = targetNode.parentNode;
      if (!parent) return;

      if (beforeText) parent.insertBefore(document.createTextNode(beforeText), targetNode);
      parent.insertBefore(mark, targetNode);
      if (afterText) parent.insertBefore(document.createTextNode(afterText), targetNode);
      parent.removeChild(targetNode);
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
