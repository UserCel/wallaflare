import { ArticleBookmark } from "../types";
import { showToast } from "../components/toast";

const BLOCK_SELECTOR = "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre";

/**
 * Finds the DOM block element matching a saved bookmark anchor, disambiguating
 * repeated words using prefix context and character position.
 */
export function findBookmarkTargetElement(
  readerBody: HTMLElement | null,
  bookmark: ArticleBookmark | null | undefined
): HTMLElement | null {
  if (!readerBody || !bookmark) return null;
  const blocks = Array.from(readerBody.querySelectorAll(BLOCK_SELECTOR)) as HTMLElement[];
  const snippet = (bookmark.quote || "").replace(/\s+/g, " ").trim();
  const prefixNorm = (bookmark.prefix || "").replace(/\s+/g, " ").trim().toLowerCase();
  const hasPos = typeof bookmark.position === "number" && bookmark.position >= 0;

  if (snippet) {
    const shortSnippet = snippet.slice(0, 60).toLowerCase();
    const candidates: Array<{ block: HTMLElement; score: number }> = [];
    let charOffset = 0;

    for (const block of blocks) {
      const rawText = block.textContent || "";
      const blockText = rawText.replace(/\s+/g, " ").trim().toLowerCase();
      const blockStart = charOffset;
      charOffset += rawText.length;

      if (!blockText || !blockText.includes(shortSnippet)) continue;

      let score = 0;
      if (prefixNorm) {
        const tailPrefix = prefixNorm.slice(-20);
        if (tailPrefix && blockText.includes(tailPrefix + " " + shortSnippet)) {
          score += 200;
        } else if (tailPrefix && blockText.includes(tailPrefix)) {
          score += 100;
        }
      }
      if (hasPos) {
        const dist = Math.abs(blockStart - (bookmark.position as number));
        score -= dist / 100;
      }
      candidates.push({ block, score });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].block;
    }
  }

  if (hasPos) {
    let charCount = 0;
    for (const block of blocks) {
      const len = (block.textContent || "").length;
      if (charCount + len >= (bookmark.position as number)) {
        return block;
      }
      charCount += len;
    }
  }

  return null;
}

/**
 * Renders (or removes) the horizontal bookmark divider line above the bookmarked paragraph.
 */
export function applyBookmarkMarkerToReader(item: any): void {
  const readerBody = document.getElementById("readerBody");
  if (!readerBody) return;

  // Remove any existing bookmark line
  readerBody.querySelectorAll('[data-bookmark-marker="true"]').forEach((el) => el.remove());

  if (!item || !item.bookmark) return;

  const targetEl = findBookmarkTargetElement(readerBody, item.bookmark);
  if (!targetEl || !targetEl.parentNode) return;

  const line = document.createElement("div");
  line.className = "reader-bookmark-line";
  line.setAttribute("data-bookmark-marker", "true");

  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "reader-bookmark-marker";
  marker.title = "Bookmarked position — click to remove";
  marker.setAttribute("aria-label", "Remove bookmark");
  marker.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">' +
    '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>' +
    '<span>Bookmark</span>';
  marker.onclick = (e) => {
    e.stopPropagation();
    clearActiveBookmark();
  };

  line.appendChild(marker);
  targetEl.parentNode.insertBefore(line, targetEl);
}

/**
 * Scrolls the reader to the saved bookmark and briefly flashes the target paragraph.
 */
export function jumpToReaderBookmark(item: any): boolean {
  if (!item || !item.bookmark) return false;
  const readerBody = document.getElementById("readerBody");
  const scrollContainer = document.getElementById("readerScrollContainer");
  const targetEl = findBookmarkTargetElement(readerBody, item.bookmark);

  if (targetEl) {
    if (typeof targetEl.scrollIntoView === "function") {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    targetEl.classList.remove("reader-bookmark-flash");
    void targetEl.offsetWidth;
    targetEl.classList.add("reader-bookmark-flash");
    setTimeout(() => {
      targetEl.classList.remove("reader-bookmark-flash");
    }, 1800);
    return true;
  }

  if (scrollContainer && typeof item.bookmark.progress === "number") {
    const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    scrollContainer.scrollTop = Math.round(maxScroll * item.bookmark.progress);
    return true;
  }

  return false;
}

/**
 * Updates the reader top bar bookmark indicator and in-reader marker for the active article.
 */
export function updateReaderBookmarkUI(item: any): void {
  const btn = document.getElementById("readerBookmarkBtn");
  const icon = document.getElementById("readerBookmarkIcon");
  const hasBookmark = Boolean(item && item.bookmark);

  if (btn) {
    if (hasBookmark) {
      btn.classList.add("active-bookmark");
      btn.title = "Jump to bookmark";
    } else {
      btn.classList.remove("active-bookmark");
      btn.title = "No bookmark set — select text to bookmark";
    }
  }
  if (icon) {
    icon.setAttribute("fill", hasBookmark ? "currentColor" : "none");
  }
  applyBookmarkMarkerToReader(item);
}

function persistArticleBookmark(item: any, bookmark: ArticleBookmark | null): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  item.bookmark = bookmark;
  updateReaderBookmarkUI(item);
  if (typeof w.syncLocalEntriesCache === "function") {
    w.syncLocalEntriesCache(w.allEntries || [], w.cachedGlobalTags, w.serverLibraryCounts);
  }
  if (typeof w.enqueueMutation === "function") {
    w.enqueueMutation("set_bookmark", { id: item.id, bookmark });
  }
}

/**
 * Sets (or moves) the article's single bookmark to the currently selected text in the reader.
 */
export function handleBookmarkSelection(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const activeId = w.activeArticleId;
  if (!activeId) return;
  const item = (w.allEntries || []).find((e: any) => e.id === activeId);
  if (!item) return;

  const selInfo = typeof w.getActiveSelectionInfo === "function" ? w.getActiveSelectionInfo() : null;
  const sel = typeof window !== "undefined" && typeof window.getSelection === "function" ? window.getSelection() : null;
  const quote = ((selInfo && selInfo.quote) || (sel ? sel.toString() : "")).trim();
  const range = (selInfo && selInfo.range) || (sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null);

  if (!quote) {
    showToast("Select text to set a bookmark");
    return;
  }

  const readerBody = document.getElementById("readerBody");
  const scrollContainer = document.getElementById("readerScrollContainer");
  let progress = 0;
  if (scrollContainer) {
    const maxScroll = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight);
    if (maxScroll > 0) {
      progress = Math.min(1, Math.max(0, scrollContainer.scrollTop / maxScroll));
    }
  }

  let position = 0;
  let prefix = "";
  if (typeof w.getSelectionContext === "function" && range && readerBody) {
    const ctx = w.getSelectionContext(range, readerBody);
    position = ctx.position || 0;
    prefix = ctx.prefix || "";
  } else if (readerBody) {
    const fullText = (readerBody.textContent || "").replace(/\s+/g, " ");
    const idx = fullText.indexOf(quote.replace(/\s+/g, " ").slice(0, 60));
    if (idx >= 0) position = idx;
  }

  const bookmark: ArticleBookmark = {
    quote: quote.slice(0, 120),
    prefix: prefix || undefined,
    position,
    progress: Number(progress.toFixed(4)),
    updated_at: new Date().toISOString()
  };

  if (typeof w.clearActiveTextSelection === "function") {
    w.clearActiveTextSelection();
  }
  persistArticleBookmark(item, bookmark);
  showToast("Bookmark saved");
}

/**
 * Jumps to the active article's saved bookmark (top bar button action).
 */
export function jumpToActiveBookmark(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const activeId = w.activeArticleId;
  if (!activeId) return;
  const item = (w.allEntries || []).find((e: any) => e.id === activeId);
  if (!item || !item.bookmark) {
    showToast("No bookmark set — select text to bookmark");
    return;
  }
  if (!jumpToReaderBookmark(item)) {
    showToast("Could not locate bookmark position");
  }
}

/**
 * Clears the active article's saved bookmark (clicking the left-margin marker).
 */
export function clearActiveBookmark(): void {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const activeId = w.activeArticleId;
  if (!activeId) return;
  const item = (w.allEntries || []).find((e: any) => e.id === activeId);
  if (!item) return;
  persistArticleBookmark(item, null);
  showToast("Bookmark removed");
}

if (typeof window !== "undefined") {
  const w = window as any;
  w.handleBookmarkSelection = handleBookmarkSelection;
  w.jumpToActiveBookmark = jumpToActiveBookmark;
  w.clearActiveBookmark = clearActiveBookmark;
  w.updateReaderBookmarkUI = updateReaderBookmarkUI;
  w.applyBookmarkMarkerToReader = applyBookmarkMarkerToReader;
}
