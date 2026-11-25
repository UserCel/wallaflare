import { isCapacitorApp, authFetch } from "../sync/api";
import { showToast } from "../components/toast";
import { state } from "../state";
import { Article } from "../types";
import { saveArticleWithFallback } from "../extractor";

export function prependSavedArticles(articles: Article[]): void {
  if (!Array.isArray(articles) || articles.length === 0) return;
  state.allEntries = [...articles, ...state.allEntries];
  if ((window as any).renderArticles) (window as any).renderArticles();
  if ((window as any).updateCounts) (window as any).updateCounts();
}

export function prependSavedArticle(article: Article): void {
  prependSavedArticles([article]);
}

export function refreshArticlesSilently(): void {
  if ((window as any).loadArticles) (window as any).loadArticles(true);
}

export async function pollPendingSavedArticles(): Promise<void> {
  await checkNativePendingSavedArticles();
}

export async function handleAndroidSharedText(text: string): Promise<void> {
  if (!text || !text.trim()) return;
  const match = text.match(/https?:\/\/[^\s]+/i);
  const url = match ? match[0] : null;
  if (url) {
    showToast("Extracting shared article...");
    const res = await saveArticleWithFallback(url);
    if (res.ok) {
      showToast(res.alreadyExists ? "Article is already in your library!" : "Article saved!");
      if ((window as any).loadArticles) (window as any).loadArticles(false);
    } else {
      showToast(res.error || "Failed to save shared article", true);
    }
  } else {
    try {
      const res = await authFetch("/api/entries.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Shared Note",
          content: `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>`,
          url: "wallaflare://shared-text"
        })
      });
      if (res.ok) {
        showToast("Shared note saved!");
        if ((window as any).loadArticles) (window as any).loadArticles(false);
      } else {
        showToast("Failed to save shared note", true);
      }
    } catch {
      showToast("Network error saving shared note", true);
    }
  }
}

export function initCapacitorBridge(): void {
  if (typeof window !== "undefined") {
    const w = window as any;
    w.prependSavedArticles = prependSavedArticles;
    w.prependSavedArticle = prependSavedArticle;
    w.checkNativePendingSavedArticles = checkNativePendingSavedArticles;
    w.refreshArticlesSilently = refreshArticlesSilently;
    w.pollPendingSavedArticles = pollPendingSavedArticles;
    w.handleAndroidSharedText = handleAndroidSharedText;
  }

  if (!isCapacitorApp()) return;

  if (typeof (window as any).Capacitor !== "undefined" && (window as any).Capacitor.Plugins?.App) {
    (window as any).Capacitor.Plugins.App.addListener("backButton", () => {
      handleAndroidBackButton();
    });
  }

  checkNativePendingSavedArticles();
}

export function drainNativePendingIntents(): void {
  if (typeof window === "undefined") return;
  const w = window as any;
  const nativeBridge = w.AndroidNative;
  if (!nativeBridge) return;

  if (typeof nativeBridge.pollPendingOpenReaderId === "function" && typeof w.openReader === "function") {
    try {
      const articleId = Number(nativeBridge.pollPendingOpenReaderId());
      if (articleId > 0) {
        w.openReader(articleId);
      }
    } catch (e) {
      console.warn("Failed to poll pending open reader ID:", e);
    }
  }

  if (typeof nativeBridge.pollPendingSharedText === "function") {
    try {
      const sharedText = String(nativeBridge.pollPendingSharedText() || "");
      if (sharedText.trim()) {
        const handler = typeof w.handleAndroidSharedText === "function" ? w.handleAndroidSharedText : handleAndroidSharedText;
        void handler(sharedText);
      }
    } catch (e) {
      console.warn("Failed to poll pending shared text:", e);
    }
  }
}

export function handleAndroidBackButton(): void {
  const winBack = (window as any).handleAndroidBackButton;
  if (typeof winBack === "function" && winBack !== handleAndroidBackButton) {
    const handled = winBack();
    if (handled) return;
  }

  const openModalEl = document.querySelector(".modal-backdrop.open, .modal-overlay.open, .tag-modal-overlay.open, .speed-read-overlay.open, .modal.open");
  if (openModalEl) {
    openModalEl.classList.remove("open");
    return;
  }

  const readerPane = document.getElementById("paneReader");
  if (readerPane?.classList.contains("mobile-active") || (typeof document !== "undefined" && document.body.classList.contains("is-reading-mobile"))) {
    if ((window as any).closeReader) (window as any).closeReader();
    return;
  }

  if (typeof (window as any).Capacitor !== "undefined" && (window as any).Capacitor.Plugins?.App) {
    (window as any).Capacitor.Plugins.App.exitApp();
  }
}

export async function checkNativePendingSavedArticles(): Promise<void> {
  if (typeof window === "undefined") return;
  const w = window as any;
  const nativeBridge = w.AndroidNative;
  if (nativeBridge && (typeof nativeBridge.pollPendingSavedArticles === "function" || typeof nativeBridge.pollPendingSavedArticle === "function")) {
    try {
      const raw = typeof nativeBridge.pollPendingSavedArticles === "function"
        ? nativeBridge.pollPendingSavedArticles()
        : nativeBridge.pollPendingSavedArticle();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof w.prependSavedArticles === "function") {
          w.prependSavedArticles(parsed);
        } else if (Array.isArray(parsed)) {
          prependSavedArticles(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to poll native pending saved articles:", e);
    }
  }
  drainNativePendingIntents();
}
