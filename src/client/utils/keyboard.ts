import { state } from "../state";
import { getFilteredEntries } from "../components/article-list";
import { openReader, closeReader } from "../reader/view";
import { toggleReaderFocusMode } from "../reader/typography";
import { $id } from "./dom";

export function initKeyboardShortcuts(): void {
  if (typeof document === "undefined") return;

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    const isTyping =
      activeEl &&
      (activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.getAttribute("contenteditable") === "true");
    if (isTyping) return;

    const openModalEl = document.querySelector(".modal-overlay.open");
    if (openModalEl) {
      if (e.key === "Escape") {
        openModalEl.classList.remove("open");
      }
      return;
    }

    if (e.key === "/") {
      e.preventDefault();
      const searchInput = $id<HTMLInputElement>("searchInput");
      searchInput?.focus();
      return;
    }

    if (e.key === "Escape") {
      if (state.activeArticleId) {
        closeReader();
      }
      return;
    }

    if (e.key === "f" || e.key === "F") {
      if (state.activeArticleId) {
        toggleReaderFocusMode();
      }
      return;
    }

    if (e.key === "s" || e.key === "S") {
      if (state.activeArticleId && (window as any).toggleActiveStar) {
        (window as any).toggleActiveStar();
      }
      return;
    }

    if (e.key === "a" || e.key === "A") {
      if (state.activeArticleId && (window as any).toggleActiveArchive) {
        (window as any).toggleActiveArchive();
      }
      return;
    }

    if (e.key === "j" || e.key === "ArrowDown") {
      const filtered = getFilteredEntries();
      if (filtered.length === 0) return;
      const currentIdx = filtered.findIndex((item) => item.id === state.activeArticleId);
      const nextIdx = currentIdx === -1 ? 0 : Math.min(filtered.length - 1, currentIdx + 1);
      openReader(filtered[nextIdx]);
      return;
    }

    if (e.key === "k" || e.key === "ArrowUp") {
      const filtered = getFilteredEntries();
      if (filtered.length === 0) return;
      const currentIdx = filtered.findIndex((item) => item.id === state.activeArticleId);
      const prevIdx = currentIdx <= 0 ? 0 : currentIdx - 1;
      openReader(filtered[prevIdx]);
      return;
    }
  });
}
