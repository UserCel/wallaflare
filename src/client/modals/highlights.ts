import { state } from "../state";
import { openModal, closeModal } from "./manager";
import { getSortedAnnotations } from "../reader/annotations";

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

export function renderModalHighlightsList(): void {
  const container = document.getElementById("modalHighlightsList");
  if (!container) return;

  const activeArticle = state.allEntries.find((e) => e.id === state.activeArticleId);
  const annotations = activeArticle?.annotations || [];

  if (annotations.length === 0) {
    container.innerHTML = '<div class="empty-highlights-state">No highlights yet in this article.</div>';
    return;
  }

  const sorted = getSortedAnnotations(annotations, "position");
  let html = "";
  for (const anno of sorted) {
    const color = anno.color || "yellow";
    html += `<div class="highlight-item hl-${color}" onclick="scrollToAnnotation('${anno.id}')">
      <div class="highlight-quote">"${anno.quote}"</div>
      ${anno.text ? `<div class="highlight-note">${anno.text}</div>` : ""}
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
