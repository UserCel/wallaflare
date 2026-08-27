import { isCapacitorApp, authFetch } from "../sync/api";
import { showToast } from "../components/toast";
import { state } from "../state";
import { Article } from "../types";

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

export function initCapacitorBridge(): void {
  if (typeof window !== "undefined") {
    const w = window as any;
    w.prependSavedArticles = prependSavedArticles;
    w.prependSavedArticle = prependSavedArticle;
    w.checkNativePendingSavedArticles = checkNativePendingSavedArticles;
    w.refreshArticlesSilently = refreshArticlesSilently;
    w.pollPendingSavedArticles = pollPendingSavedArticles;
  }

  if (!isCapacitorApp()) return;

  if (typeof (window as any).Capacitor !== "undefined" && (window as any).Capacitor.Plugins?.App) {
    (window as any).Capacitor.Plugins.App.addListener("backButton", () => {
      handleAndroidBackButton();
    });
  }

  checkNativePendingSavedArticles();
}

export function handleAndroidBackButton(): void {
  const openModalEl = document.querySelector(".modal-overlay.open");
  if (openModalEl) {
    openModalEl.classList.remove("open");
    return;
  }

  const readerPane = document.getElementById("paneReader");
  if (readerPane?.classList.contains("mobile-active")) {
    if ((window as any).closeReader) (window as any).closeReader();
    return;
  }

  if (typeof (window as any).Capacitor !== "undefined" && (window as any).Capacitor.Plugins?.App) {
    (window as any).Capacitor.Plugins.App.exitApp();
  }
}

export async function checkNativePendingSavedArticles(): Promise<void> {
  if (!isCapacitorApp() || typeof (window as any).Capacitor === "undefined") return;
  const NativePlugin = (window as any).Capacitor.Plugins?.WallaflareNativePlugin;
  if (!NativePlugin || !NativePlugin.getPendingSharedUrls) return;

  try {
    const res = await NativePlugin.getPendingSharedUrls();
    if (res && Array.isArray(res.urls) && res.urls.length > 0) {
      for (const url of res.urls) {
        await authFetch("/api/entries.json", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url })
        });
      }
      showToast(`Imported ${res.urls.length} shared article(s)!`);
      await NativePlugin.clearPendingSharedUrls();
      if ((window as any).loadArticles) (window as any).loadArticles(false);
    }
  } catch (e) {
    console.warn("Failed to process shared URLs:", e);
  }
}

if (typeof window !== "undefined") {
  (window as any).prependSavedArticles = prependSavedArticles;
  (window as any).prependSavedArticle = prependSavedArticle;
  (window as any).checkNativePendingSavedArticles = checkNativePendingSavedArticles;
  (window as any).refreshArticlesSilently = refreshArticlesSilently;
  (window as any).pollPendingSavedArticles = pollPendingSavedArticles;
  // window.prependSavedArticles
  // window.prependSavedArticle
  // window.checkNativePendingSavedArticles
  // window.refreshArticlesSilently
}
