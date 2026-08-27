import { Article } from "../types";
import { state } from "../state";
import { isRtlText, applyAnnotationsToReader, updateHighlightsBadge, clearActiveTextSelection } from "./annotations";
import { escapeHtml } from "./export";
import { isCapacitorApp, authFetch } from "../sync/api";

export function setReaderStatusBar(): void {
  if (!isCapacitorApp() || typeof (window as any).Capacitor === "undefined") return;
  const StatusBar = (window as any).Capacitor.Plugins?.StatusBar;
  if (!StatusBar) return;

  try {
    let hexColor = "#0f172a";
    if (state.activeTheme === "light") hexColor = "#ffffff";
    else if (state.activeTheme === "sepia") hexColor = "#fbf0d9";
    else if (state.activeTheme === "oled") hexColor = "#000000";

    StatusBar.setBackgroundColor({ color: hexColor });
  } catch (e) {}
}

let isProgressTicking = false;

export function updateReadingProgress(): void {
  if (isProgressTicking) return;
  isProgressTicking = true;

  requestAnimationFrame(() => {
    isProgressTicking = false;
    const scrollContainer = document.getElementById("readerScrollContainer") || document.getElementById("paneReader");
    const bar = document.getElementById("readingProgress") || document.getElementById("readingProgressBar");
    if (!scrollContainer || !bar) return;

    const total = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    if (total <= 0) {
      bar.style.width = "0%";
      return;
    }
    const progress = Math.min(100, Math.max(0, (scrollContainer.scrollTop / total) * 100));
    bar.style.width = `${progress}%`;

    if (state.activeArticleId) {
      try {
        localStorage.setItem(`wf_scroll_${state.activeArticleId}`, String(scrollContainer.scrollTop / total));
      } catch (e) {}
    }
  });
}

export async function openReader(idOrArticle: any, pushHistory: boolean = true): Promise<void> {
  let item = typeof idOrArticle === "number" ? state.allEntries.find(e => e.id === idOrArticle) : idOrArticle;

  if (typeof idOrArticle === "number" && (!item || !item.content)) {
    try {
      const res = await authFetch("/api/entries/" + idOrArticle + ".json");
      if (res.ok) {
        const fetched = await res.json();
        const idx = state.allEntries.findIndex(e => e.id === idOrArticle);
        if (idx >= 0) state.allEntries[idx] = fetched;
        else state.allEntries.unshift(fetched);
        item = fetched;
      }
    } catch (e) {}
  }

  if (!item) return;

  state.activeArticleId = item.id;
  clearActiveTextSelection();

  const emptyPane = document.getElementById("readerEmptyPane");
  const readerView = document.getElementById("readerView");
  const titleEl = document.getElementById("readerTitle");
  const metaEl = document.getElementById("readerMeta");
  const coverWrap = document.getElementById("readerCoverWrap");
  const bodyEl = document.getElementById("readerBody");
  const starBtn = document.getElementById("readerStarBtn");
  const archiveBtn = document.getElementById("readerArchiveBtn");

  if (emptyPane) emptyPane.style.display = "none";
  if (readerView) {
    readerView.style.display = "flex";
    readerView.style.flexDirection = "column";
  }

  if (titleEl) {
    titleEl.textContent = item.title || "Untitled";
    if (isRtlText(item.title)) titleEl.setAttribute("dir", "rtl");
    else titleEl.removeAttribute("dir");
  }

  const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : "");
  const author = (rawAuthor && rawAuthor !== "wallaflare" && rawAuthor !== "Unknown") ? rawAuthor : "";
  let metaHtml = "<span>" + escapeHtml(item.domain_name || "") + "</span>";
  if (author) metaHtml += " &bull; <span style=\"font-weight: 500;\">by " + escapeHtml(author) + "</span>";
  metaHtml += " &bull; <span>" + (item.reading_time || 1) + " min read</span>" +
    " &bull; <span>" + (item.created_at ? new Date(item.created_at).toLocaleDateString() : "") + "</span>";
  if (item.url) {
    metaHtml += " &bull; <a href=\"" + escapeHtml(item.url) + "\" target=\"_blank\" rel=\"noopener\" class=\"reader-original-link\"><svg width=\"12\" height=\"12\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" style=\"vertical-align: middle;\"><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"></path><polyline points=\"15 3 21 3 21 9\"></polyline><line x1=\"10\" y1=\"14\" x2=\"21\" y2=\"3\"></line></svg><span>Original Link</span></a>";
  }
  if (metaEl) metaEl.innerHTML = metaHtml;

  if (coverWrap) {
    if (item.preview_picture) {
      coverWrap.innerHTML = "<div class=\"reader-cover\"><img src=\"" + escapeHtml(item.preview_picture) + "\" alt=\"Cover\" class=\"reader-cover-img\" onerror=\"this.parentElement.remove()\" /></div>";
    } else {
      coverWrap.innerHTML = "";
    }
  }

  if (bodyEl) {
    bodyEl.innerHTML = item.content || "<p>No content available.</p>";
    if (isRtlText(item.content || "")) bodyEl.setAttribute("dir", "rtl");
    else bodyEl.removeAttribute("dir");
    applyAnnotationsToReader(bodyEl, item.annotations || []);
  }

  if (starBtn) {
    if (item.is_starred) starBtn.classList.add("active");
    else starBtn.classList.remove("active");
  }

  if (archiveBtn) {
    if (item.is_archived) archiveBtn.classList.add("active");
    else archiveBtn.classList.remove("active");
  }

  updateHighlightsBadge();
  setReaderStatusBar();

  const readerPane = document.getElementById("paneReader");
  if (readerPane) {
    readerPane.classList.add("mobile-active");
  }

  const scrollContainer = document.getElementById("readerScrollContainer");
  if (scrollContainer) {
    try {
      const savedRatio = parseFloat(localStorage.getItem(`wf_scroll_${item.id}`) || "0");
      if (savedRatio > 0) {
        setTimeout(() => {
          scrollContainer.scrollTop = (scrollContainer.scrollHeight - scrollContainer.clientHeight) * savedRatio;
        }, 50);
      } else {
        scrollContainer.scrollTop = 0;
      }
    } catch (e) {
      scrollContainer.scrollTop = 0;
    }
  }
}

export function closeReader(): void {
  state.activeArticleId = null;
  clearActiveTextSelection();
  const readerPane = document.getElementById("paneReader");
  if (readerPane) {
    readerPane.classList.remove("mobile-active");
  }
  const emptyPane = document.getElementById("readerEmptyPane");
  const readerView = document.getElementById("readerView");
  if (emptyPane) emptyPane.style.display = "flex";
  if (readerView) readerView.style.display = "none";
}
