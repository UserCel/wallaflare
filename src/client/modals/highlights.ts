import { state } from "../state";
import { openModal, closeModal } from "./manager";
import { getSortedAnnotations } from "../reader/annotations";
import { copyToClipboard } from "../utils/clipboard";
import { showToast } from "../components/toast";

export function toggleReaderHighlightsModal(): void {
  const modal = document.getElementById("readerHighlightsModal");
  if (modal?.classList.contains("open")) {
    closeModal("readerHighlightsModal");
  } else {
    openArticleHighlightsModal();
  }
}

export function openArticleHighlightsModal(): void {
  renderModalHighlightsList();
  openModal("readerHighlightsModal");
}

export function formatAnnotationReadable(ann: any): string {
  if (!ann) return "";
  const parts: string[] = [];
  const rawQuote = (ann.quote || "").trim();
  if (rawQuote) {
    if ((rawQuote.startsWith('"') && rawQuote.endsWith('"')) || (rawQuote.startsWith('“') && rawQuote.endsWith('”'))) {
      parts.push(rawQuote);
    } else {
      parts.push(`"${rawQuote}"`);
    }
  }
  const rawText = (ann.text || "").trim();
  if (rawText) {
    parts.push(`Note: ${rawText}`);
  }
  return parts.join("\n");
}

export function formatAllAnnotationsReadable(annotations: any[], articleTitle: string = ""): string {
  if (!annotations || annotations.length === 0) return "";
  const formattedItems = annotations
    .map(ann => formatAnnotationReadable(ann))
    .filter(text => text.length > 0);

  if (formattedItems.length === 0) return "";

  const header = articleTitle && articleTitle.trim() ? (`Highlights & Notes: ${articleTitle.trim()}\n\n`) : "";
  return header + formattedItems.join("\n\n---\n\n");
}

export async function copyModalAnnotation(annoId: string | number): Promise<void> {
  const activeArticle = state.allEntries.find((e) => e.id === state.activeArticleId);
  const anno = activeArticle?.annotations?.find((a) => String(a.id) === String(annoId));
  if (!anno) return;
  const text = formatAnnotationReadable(anno);
  if (text) {
    await copyToClipboard(text, "✓ Copied note to clipboard");
  }
}

export async function copyAllModalHighlights(): Promise<void> {
  const activeArticle = state.allEntries.find((e) => e.id === state.activeArticleId);
  const annotations = activeArticle?.annotations || [];
  if (annotations.length === 0) {
    showToast("No highlights or notes to copy");
    return;
  }
  const text = formatAllAnnotationsReadable(annotations, activeArticle?.title);
  if (text) {
    await copyToClipboard(text, "✓ Copied all notes to clipboard");
  }
}

export function renderModalHighlightsList(): void {
  const container = document.getElementById("modalHighlightsList");
  if (!container) return;

  const activeArticle = state.allEntries.find((e) => e.id === state.activeArticleId);
  const annotations = activeArticle?.annotations || [];

  const copyAllBtn = document.getElementById("modalCopyAllBtn") as HTMLButtonElement | null;
  const footerCopyAllBtn = document.getElementById("modalFooterCopyAllBtn") as HTMLButtonElement | null;
  if (copyAllBtn) copyAllBtn.disabled = (annotations.length === 0);
  if (footerCopyAllBtn) footerCopyAllBtn.disabled = (annotations.length === 0);

  if (annotations.length === 0) {
    container.innerHTML = '<div class="empty-highlights-state">No highlights yet in this article.</div>';
    return;
  }

  const sorted = getSortedAnnotations(annotations, "position");
  let html = "";
  for (const anno of sorted) {
    const color = anno.color || "yellow";
    html += `<div class="highlight-item hl-${color}">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
        <div class="highlight-quote" onclick="scrollToAnnotation('${anno.id}')">"${anno.quote}"</div>
        <button type="button" class="btn-icon" style="padding: 2px 5px; font-size: 0.75rem;" onclick="event.stopPropagation(); copyModalAnnotation('${anno.id}')" title="Copy quote &amp; note">📋</button>
      </div>
      ${anno.text ? `<div class="highlight-note" onclick="scrollToAnnotation('${anno.id}')">${anno.text}</div>` : ""}
    </div>`;
  }
  container.innerHTML = html;
}

export function scrollToAnnotation(annoId: string | number): void {
  closeModal("readerHighlightsModal");
  const el = document.querySelector(`[data-annotation-id="${annoId}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("highlight-pulse");
    setTimeout(() => el.classList.remove("highlight-pulse"), 2000);
  }
}
