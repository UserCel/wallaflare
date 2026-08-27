import { state } from "../state";
import { authFetch } from "./api";
import { reconcileDeltaSync } from "./reconciliation";
import { deduplicateEntries, saveEntriesToIndexedDB, loadEntriesFromIndexedDB, deleteEntryFromIndexedDB } from "../storage/db";
import { getPendingMutations, processOutboxMutations, enqueueMutation } from "../storage/outbox";
import { PREF_KEYS } from "../storage/preferences";
import { updateCounts, renderSidebarTags } from "../components/sidebar";
import { renderArticles, getFilteredEntries, loadMoreRenderedCards } from "../components/article-list";
import { openReader, closeReader } from "../reader/view";
import { showToast } from "../components/toast";

export let isOfflineMode = false;

export function updateOfflineUI(offline: boolean): void {
  isOfflineMode = offline;
  const btn = document.getElementById("addArticleBtn");
  const sidebarBtn = document.getElementById("sidebarAddArticleBtn");
  if (btn) {
    if (offline) {
      btn.classList.add("btn-offline-mode");
      btn.title = "Offline Mode — Reading from local cache (Tap to retry)";
    } else {
      btn.classList.remove("btn-offline-mode");
      btn.title = "Add URL or Custom Text";
    }
  }
  if (sidebarBtn) {
    if (offline) {
      sidebarBtn.classList.add("btn-offline-mode");
      sidebarBtn.title = "Offline Mode — Reading from local cache (Tap to retry)";
    } else {
      sidebarBtn.classList.remove("btn-offline-mode");
      sidebarBtn.title = "Add Article";
    }
  }
}

export function handleConnectionFailure(showToastNotice: boolean = true): void {
  updateOfflineUI(true);
  if (showToastNotice) {
    showToast("Offline mode: reading from local cache", false, 3500);
  }
}

export function updateArticlesFooterStatus(): void {
  const statusEl = document.getElementById("articlesFooterStatus");
  if (!statusEl) return;
  const filtered = getFilteredEntries();
  if (filtered.length === 0) {
    statusEl.textContent = "";
    return;
  }
  statusEl.textContent = `Showing ${Math.min(filtered.length, state.currentRenderLimit)} of ${filtered.length} articles`;
}

export async function downloadRemainingLibraryInBackground(): Promise<void> {
  // Background downloader
}

export function loadMoreArticles(): void {
  loadMoreRenderedCards();
  updateArticlesFooterStatus();
}

export function initInfiniteScroll(): void {
  const scrollContainer = document.getElementById("articlesScrollContainer");
  if (!scrollContainer) return;
  scrollContainer.addEventListener("scroll", () => {
    const filtered = getFilteredEntries();
    const canExpandLocally = state.currentRenderLimit < filtered.length;
    const canFetchMoreServer = state.currentArticlesPage < state.totalArticlesPages;
    if (!canExpandLocally && !canFetchMoreServer) return;
    if (state.isLoadingMoreArticles) return;

    const remaining = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
    if (remaining < 400) {
      loadMoreArticles();
    }
  });
}

export async function loadArticles(isBackground: boolean = false): Promise<void> {
  if (state.isFetchingArticles) return;
  state.isFetchingArticles = true;

  try {
    await processOutboxMutations(authFetch);

    const res = await authFetch("/api/sync");
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && Array.isArray(data.entries)) {
        state.allEntries = reconcileDeltaSync(state.allEntries, data, true);
        state.allEntries = deduplicateEntries(state.allEntries);
        await saveEntriesToIndexedDB(state.allEntries);
        updateOfflineUI(false);
      }
    } else {
      handleConnectionFailure(false);
      if (state.allEntries.length === 0) {
        state.allEntries = await loadEntriesFromIndexedDB();
      }
    }
  } catch (err) {
    handleConnectionFailure(false);
    if (state.allEntries.length === 0) {
      state.allEntries = await loadEntriesFromIndexedDB();
    }
  } finally {
    state.isFetchingArticles = false;
    updateCounts();
    renderSidebarTags();
    renderArticles();
    updateArticlesFooterStatus();
  }
}

export function initPullToRefresh(): void {
  const container = document.getElementById("articlesScrollContainer");
  if (!container) return;

  let startY = 0;
  let isPulling = false;

  container.addEventListener("touchstart", (e) => {
    if (container.scrollTop === 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  }, { passive: true });

  container.addEventListener("touchmove", (e) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    if (currentY - startY > 70) {
      // Pull indicator
    }
  }, { passive: true });

  container.addEventListener("touchend", () => {
    if (isPulling) {
      isPulling = false;
      loadArticles(false);
    }
  });
}
