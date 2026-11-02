import { isCapacitorApp } from "../sync/api";
import { saveArticleWithFallback } from "../extractor";
import { showToast } from "../components/toast";

/**
 * Initializes Progressive Web App (PWA) capabilities on desktop and mobile browsers.
 * Bypassed when running inside the native Capacitor Android app.
 */
export function initPwa(): void {
  if (typeof window === "undefined" || isCapacitorApp()) return;

  // 1. Register Service Worker for PWA installability & offline asset caching
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          // Service worker registered successfully
        })
        .catch((err) => {
          console.warn("PWA Service Worker registration failed:", err);
        });
    });
  }

  // 2. Process incoming Web Share Target URLs
  handlePwaShareTarget();
}

/**
 * Parses and ingests shared URLs when the PWA is launched via Web Share Target.
 */
export async function handlePwaShareTarget(): Promise<void> {
  if (typeof window === "undefined" || isCapacitorApp()) return;

  try {
    const urlObj = new URL(window.location.href);
    const isShareTarget = urlObj.pathname === "/share-target";
    const rawUrl = urlObj.searchParams.get("url") || "";
    const rawText = urlObj.searchParams.get("text") || "";
    const rawTitle = urlObj.searchParams.get("title") || "";

    if (!isShareTarget && !rawUrl && !rawText) return;

    // Extract target URL from query parameters or text body
    let targetUrl = rawUrl.trim();
    if (!targetUrl && rawText) {
      const match = rawText.match(/https?:\/\/[^\s]+/i);
      if (match) targetUrl = match[0];
    }

    // Clean address bar so refreshing won't re-trigger ingestion
    if (window.history && typeof window.history.replaceState === "function") {
      window.history.replaceState({}, "", "/");
    }

    if (!targetUrl || !targetUrl.startsWith("http")) return;

    showToast("Saving shared article from PWA...", 2800);

    const result = await saveArticleWithFallback(targetUrl, undefined, {
      title: rawTitle.trim() || undefined
    });

    const isOk = Boolean(result.ok || (result as any).success);

    if (isOk) {
      const item = result.data;
      const w = typeof window !== "undefined" ? (window as any) : {};
      if (item && item.id) {
        if (Array.isArray(w.allEntries)) {
          w.allEntries.unshift(item);
        }
        if (typeof w.syncLocalEntriesCache === "function") {
          w.syncLocalEntriesCache(w.allEntries, w.cachedGlobalTags, w.serverLibraryCounts);
        }
        if (typeof w.updateCounts === "function") w.updateCounts();
        if (typeof w.renderSidebarTags === "function") w.renderSidebarTags();
        if (typeof w.filterArticles === "function") w.filterArticles();
      }

      if (result.alreadyExists) {
        showToast("Article is already in your library!", 3000);
      } else if (result.emptyContent) {
        showToast("⚠️ Saved link only (article text was blocked or empty)", 4000);
      } else {
        showToast("✓ Article saved successfully!", 2500);
      }

      if (typeof w.loadArticles === "function") {
        w.loadArticles(false);
      }
    } else {
      showToast(`Failed to save: ${result.error || "Unknown error"}`, 4000);
    }
  } catch (e) {
    console.warn("Error processing PWA share target:", e);
  }
}
