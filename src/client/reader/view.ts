import { isCapacitorApp } from "../sync/api";

let isProgressTicking = false;
let scrollSaveTimer: any = null;

export function setReaderStatusBar(hidden?: boolean): void {
  try {
    const w = typeof window !== "undefined" ? (window as any) : {};
    if (w.Capacitor?.Plugins?.StatusBar) {
      if (hidden) {
        w.Capacitor.Plugins.StatusBar.hide();
      } else {
        w.Capacitor.Plugins.StatusBar.show();
      }
    }
  } catch (e) {}
}

export function updateReadingProgress(): void {
  const container = document.getElementById("readerScrollContainer");
  if (!container) return;
  const total = container.scrollHeight - container.clientHeight;
  const progress = total > 0 ? Math.min(100, Math.max(0, (container.scrollTop / total) * 100)) : 0;
  const progressEl = document.getElementById("readingProgress");
  if (progressEl) progressEl.style.width = progress + "%";

  const w = typeof window !== "undefined" ? (window as any) : {};
  const activeArticleId = w.activeArticleId;

  if (activeArticleId && total > 0) {
    const ratio = Math.min(1, Math.max(0, container.scrollTop / total));
    if (typeof w.updateCardReadingProgress === "function") {
      w.updateCardReadingProgress(activeArticleId, ratio);
    }
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => {
      localStorage.setItem("wf_scroll_" + activeArticleId, ratio.toFixed(4));
    }, 120);
  }
}

// Attach to window for global access & HTML inline event handlers
if (typeof window !== "undefined") {
  const w = window as any;
  w.setReaderStatusBar = setReaderStatusBar;
  w.updateReadingProgress = updateReadingProgress;
}
