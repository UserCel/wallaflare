import { openModal, closeModal } from "./manager";
import { showToast } from "../components/toast";
import { escapeHtml } from "../utils/dom";
import { copyDirectText } from "../utils/clipboard";

let activeModalHighlightsArticleId: number | null = null;
let activeModalHighlightsFilter = "all";
let activeModalHighlightsSort = "position";

export function getActiveModalHighlightsArticleId(): number | null {
  return activeModalHighlightsArticleId;
}

export function setActiveModalHighlightsArticleId(id: number | null): void {
  activeModalHighlightsArticleId = id;
}

export function updateHighlightsBadge(count: any): void {
  let num = 0;
  if (typeof count === "number") {
    num = count;
  } else if (typeof count === "object" && count !== null) {
    num = count.annotations ? count.annotations.length : 0;
  }
  const badgeMobile = document.getElementById("readerHighlightsBadgeMobile");
  if (badgeMobile) {
    badgeMobile.textContent = String(num);
    badgeMobile.style.display = num > 0 ? "flex" : "none";
  }
  const desktopBadge = document.getElementById("readerHighlightsBadge");
  if (desktopBadge) {
    desktopBadge.textContent = String(num);
    desktopBadge.style.display = num > 0 ? "inline-flex" : "none";
  }
}

export function getSortedAnnotations(item: any, sortMode: string = "position"): any[] {
  if (!item || !item.annotations || !Array.isArray(item.annotations)) return [];
  const list = [...item.annotations];

  if (sortMode === "time") {
    return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }

  const w = typeof window !== "undefined" ? (window as any) : {};
  const activeArticleId = w.activeArticleId;

  const markElements = Array.from(document.querySelectorAll("#readerBody mark.reader-hl"));
  if (markElements.length > 0 && activeArticleId === item.id) {
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

export function toggleReaderHighlightsModal(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const activeArticleId = w.activeArticleId;
  if (!activeArticleId) return;
  openArticleHighlightsModal(activeArticleId);
}

export function openArticleHighlightsModal(articleId?: number | null): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  activeModalHighlightsArticleId = articleId !== undefined ? articleId : (w.activeArticleId || null);
  activeModalHighlightsFilter = "all";
  renderModalHighlightsList();
  openModal("readerHighlightsModal");
}

export function filterHighlightsModalList(filterType: string, btn?: HTMLElement | null): void {
  activeModalHighlightsFilter = filterType;
  document.querySelectorAll("#highlightsFilterPills .hl-filter-pill").forEach(p => p.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderModalHighlightsList();
}

export function setHighlightsSort(sortMode: string, btn?: HTMLElement | null): void {
  activeModalHighlightsSort = sortMode;
  document.querySelectorAll("#highlightsSortWrap .hl-sort-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  renderModalHighlightsList();
}

export function renderModalHighlightsList(): void {
  const container = document.getElementById("modalHighlightsList");
  const countBadge = document.getElementById("modalHighlightsCountBadge");
  if (!container) return;

  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const item = allEntries.find((e: any) => e.id === activeModalHighlightsArticleId);
  const annotations = getSortedAnnotations(item, activeModalHighlightsSort);
  if (countBadge) countBadge.textContent = String(annotations.length);

  const copyAllBtn = document.getElementById("modalCopyAllBtn") as HTMLButtonElement | null;
  const footerCopyAllBtn = document.getElementById("modalFooterCopyAllBtn") as HTMLButtonElement | null;
  if (copyAllBtn) copyAllBtn.disabled = (annotations.length === 0);
  if (footerCopyAllBtn) footerCopyAllBtn.disabled = (annotations.length === 0);

  if (annotations.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No highlights or notes in this article yet.</div>';
    return;
  }

  let filtered = annotations;
  if (activeModalHighlightsFilter === "notes") {
    filtered = annotations.filter(a => a.text && a.text.trim().length > 0);
  } else if (activeModalHighlightsFilter !== "all") {
    filtered = annotations.filter(a => (a.color || "yellow") === activeModalHighlightsFilter);
  }

  container.innerHTML = filtered.map(ann => {
    const colorBorder = ann.color === "green" ? "#22c55e" : (ann.color === "blue" ? "#3b82f6" : (ann.color === "purple" ? "#a855f7" : "#eab308"));
    const rawQuote = (ann.quote || "").trim();
    const quoteDisplay = rawQuote ? ('\"' + escapeHtml(rawQuote) + '\"') : (ann.text ? '📌 <em>(Article Note)</em>' : '📌 <em>(Range Highlight)</em>');
    return '<div class="modal-hl-item" style="border-left: 4px solid ' + colorBorder + '; display: flex; flex-direction: column; gap: 0.35rem; position: relative;">' +
      '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">' +
        '<div style="font-weight: 500; font-size: 0.88rem; flex: 1; cursor: pointer;" onclick="scrollToAnnotation(' + ann.id + ', ' + activeModalHighlightsArticleId + ')">' + quoteDisplay + '</div>' +
        '<div style="display: flex; align-items: center; gap: 0.25rem; flex-shrink: 0;">' +
          '<button type="button" class="btn-icon" style="padding: 2px 5px; font-size: 0.75rem;" onclick="event.stopPropagation(); copyModalAnnotation(' + ann.id + ', ' + activeModalHighlightsArticleId + ', this)" title="Copy quote &amp; note"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>' +
          '<button type="button" class="btn-icon" style="padding: 2px 5px; font-size: 0.75rem;" onclick="event.stopPropagation(); editModalAnnotation(' + ann.id + ', ' + activeModalHighlightsArticleId + ')" title="Edit Note">✏️</button>' +
          '<button type="button" class="btn-icon" style="padding: 2px 5px; font-size: 0.75rem; color: var(--danger);" onclick="event.stopPropagation(); deleteModalAnnotation(' + ann.id + ', ' + activeModalHighlightsArticleId + ')" title="Delete Highlight">🗑️</button>' +
        '</div>' +
      '</div>' +
      (ann.text ? '<div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.2rem; cursor: pointer;" onclick="scrollToAnnotation(' + ann.id + ', ' + activeModalHighlightsArticleId + ')">💬 ' + escapeHtml(ann.text) + '</div>' : '') +
    '</div>';
  }).join('');
}

export async function scrollToAnnotation(annId: number | string, articleId: number | null = null): Promise<void> {
  closeModal("readerHighlightsModal");
  const targetArticleId = articleId || activeModalHighlightsArticleId;
  const highlightMarks = () => {
    const marks = document.querySelectorAll('mark[data-annotation-id="' + annId + '"]');
    if (marks.length > 0) {
      marks[0].scrollIntoView({ behavior: "smooth", block: "center" });
      marks.forEach(m => { m.classList.add("reader-hl-focused"); });
      setTimeout(() => { marks.forEach(m => { m.classList.remove("reader-hl-focused"); }); }, 2200);
      return true;
    }
    return false;
  };

  const w = typeof window !== "undefined" ? (window as any) : {};
  if (targetArticleId && w.activeArticleId !== targetArticleId) {
    if (typeof w.openReader === "function") {
      await w.openReader(targetArticleId);
    }
    setTimeout(() => {
      if (!highlightMarks()) {
        showToast("📌 Note is unanchored (no text position in reader)");
      }
    }, 250);
    return;
  }
  if (!highlightMarks()) {
    showToast("📌 Note is unanchored (no text position in reader)");
  }
}

export async function deleteModalAnnotation(annId: number | string, articleId: number | null = null): Promise<void> {
  const targetArticleId = articleId || activeModalHighlightsArticleId;
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const item = allEntries.find((e: any) => e.id === targetArticleId);
  if (!item || !item.annotations) return;

  const idx = item.annotations.findIndex((a: any) => String(a.id) === String(annId));
  if (idx === -1) return;

  const annToDelete = item.annotations[idx];
  item.annotations.splice(idx, 1);
  if (w.activeArticleId === targetArticleId) {
    if (typeof w.applyAnnotationsToReader === "function") {
      w.applyAnnotationsToReader(item);
    }
  }
  if (typeof w.syncLocalEntriesCache === "function") {
    w.syncLocalEntriesCache(allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
  }
  renderModalHighlightsList();
  if (typeof w.filterArticles === "function") {
    w.filterArticles(false);
  }
  showToast("Highlight deleted");

  let realId = annId;
  if (annToDelete && annToDelete._createPromise) {
    try {
      const saved = await annToDelete._createPromise;
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

export function editModalAnnotation(annId: number | string, articleId: number | null = null): void {
  const targetArticleId = articleId || activeModalHighlightsArticleId;
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const item = allEntries.find((e: any) => e.id === targetArticleId);
  if (!item || !item.annotations) return;

  const ann = item.annotations.find((a: any) => a.id === annId);
  if (!ann) return;

  closeModal("readerHighlightsModal");
  if (typeof w.openAnnotationNoteModal === "function") {
    w.openAnnotationNoteModal(ann);
  }
}

export function formatAnnotationReadable(ann: any): string {
  if (!ann) return "";
  const parts: string[] = [];
  const rawQuote = (ann.quote || "").trim();
  if (rawQuote) {
    if ((rawQuote.startsWith('"') && rawQuote.endsWith('"')) || (rawQuote.startsWith('“') && rawQuote.endsWith('”'))) {
      parts.push(rawQuote);
    } else {
      parts.push('"' + rawQuote + '"');
    }
  }
  const rawText = (ann.text || "").trim();
  if (rawText) {
    parts.push("Note: " + rawText);
  }
  return parts.join("\n");
}

export function formatAllAnnotationsReadable(annotations: any[], articleTitle: string = ""): string {
  if (!annotations || annotations.length === 0) return "";
  const formattedItems = annotations
    .map(ann => formatAnnotationReadable(ann))
    .filter(text => text.length > 0);

  if (formattedItems.length === 0) return "";

  const header = articleTitle && articleTitle.trim() ? ("Highlights & Notes: " + articleTitle.trim() + "\n\n") : "";
  return header + formattedItems.join("\n\n---\n\n");
}

export function copyModalAnnotation(annId: number | string, articleId: number | null = null, btn: HTMLElement | null = null): void {
  const targetArticleId = articleId || activeModalHighlightsArticleId;
  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries = w.allEntries || [];
  const item = allEntries.find((e: any) => e.id === targetArticleId);
  if (!item || !item.annotations) return;

  const ann = item.annotations.find((a: any) => String(a.id) === String(annId));
  if (!ann) return;

  const text = formatAnnotationReadable(ann);
  if (!text) {
    showToast("Nothing to copy");
    return;
  }

  copyDirectText(text, btn, "✓ Copied note to clipboard");
}

export function copyAllModalHighlights(btn: HTMLElement | null = null): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const targetArticleId = activeModalHighlightsArticleId || w.activeArticleId;
  const allEntries = w.allEntries || [];
  const item = allEntries.find((e: any) => e.id === targetArticleId);
  if (!item || !item.annotations || item.annotations.length === 0) {
    showToast("No highlights or notes to copy");
    return;
  }

  const annotations = getSortedAnnotations(item, activeModalHighlightsSort);
  let toCopy = annotations;
  if (activeModalHighlightsFilter === "notes") {
    toCopy = annotations.filter(a => a.text && a.text.trim().length > 0);
  } else if (activeModalHighlightsFilter !== "all") {
    toCopy = annotations.filter(a => (a.color || "yellow") === activeModalHighlightsFilter);
  }

  if (toCopy.length === 0) {
    showToast("No highlights or notes match current filter");
    return;
  }

  const text = formatAllAnnotationsReadable(toCopy, item.title);
  if (!text) {
    showToast("No highlights or notes to copy");
    return;
  }

  copyDirectText(text, btn, "✓ Copied all notes to clipboard");
}

export function batchOpenHighlights(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const selectedIds = w.selectedArticleIds;
  const ids = Array.isArray(selectedIds)
    ? selectedIds
    : selectedIds instanceof Set
    ? Array.from(selectedIds)
    : [];

  if (ids.length === 1) {
    if (typeof w.closeAllCardMenus === "function") {
      w.closeAllCardMenus();
    }
    openArticleHighlightsModal(Number(ids[0]));
  }
}

if (typeof window !== "undefined") {
  const w = window as any;
  w.updateHighlightsBadge = updateHighlightsBadge;
  w.getSortedAnnotations = getSortedAnnotations;
  w.toggleReaderHighlightsModal = toggleReaderHighlightsModal;
  w.openArticleHighlightsModal = openArticleHighlightsModal;
  w.filterHighlightsModalList = filterHighlightsModalList;
  w.setHighlightsSort = setHighlightsSort;
  w.renderModalHighlightsList = renderModalHighlightsList;
  w.scrollToAnnotation = scrollToAnnotation;
  w.deleteModalAnnotation = deleteModalAnnotation;
  w.editModalAnnotation = editModalAnnotation;
  w.formatAnnotationReadable = formatAnnotationReadable;
  w.formatAllAnnotationsReadable = formatAllAnnotationsReadable;
  w.copyModalAnnotation = copyModalAnnotation;
  w.copyAllModalHighlights = copyAllModalHighlights;
  w.batchOpenHighlights = batchOpenHighlights;
}
