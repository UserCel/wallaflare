import { enqueueMutation } from "../storage/outbox";

export const PROGRESS_SYNC_STORAGE_KEY = "wf_sync_reading_progress";

const lastSyncedByEntry = new Map<number, number>();

export function isReadingProgressSyncEnabled(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(PROGRESS_SYNC_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setReadingProgressSyncEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(PROGRESS_SYNC_STORAGE_KEY, enabled ? "1" : "0");
    }
  } catch {}
}

export function getEffectiveRestoreProgress(item: any): number {
  const id = item?.id;
  let localRatio = 0;
  try {
    if (id && typeof localStorage !== "undefined") {
      localRatio = parseFloat(localStorage.getItem("wf_scroll_" + id) || "0") || 0;
    }
  } catch {}

  // When disabled, never read server-synced reading_progress
  if (!isReadingProgressSyncEnabled()) {
    return Math.min(1, Math.max(0, localRatio));
  }

  const serverRatio = Number(item?.reading_progress || 0);
  const clampedServer = isNaN(serverRatio) ? 0 : Math.min(1, Math.max(0, serverRatio));
  return Math.max(Math.min(1, Math.max(0, localRatio)), clampedServer);
}

export function syncReadingProgressIfEnabled(entryId: number | null | undefined, ratio: number): boolean {
  if (!entryId || !isReadingProgressSyncEnabled()) return false;
  const clamped = Math.min(1, Math.max(0, Number(ratio) || 0));
  const prev = lastSyncedByEntry.get(entryId);
  if (prev !== undefined && Math.abs(clamped - prev) < 0.02) {
    return false;
  }

  lastSyncedByEntry.set(entryId, clamped);
  const w = typeof window !== "undefined" ? (window as any) : {};
  if (Array.isArray(w.allEntries)) {
    const item = w.allEntries.find((e: any) => e && e.id === entryId);
    if (item) item.reading_progress = Number(clamped.toFixed(4));
  }

  enqueueMutation("set_reading_progress", {
    id: entryId,
    reading_progress: Number(clamped.toFixed(4)),
  });
  return true;
}

export function getCurrentReaderScrollRatio(): number {
  if (typeof document === "undefined") return 0;
  const scrollEl = document.getElementById("readerScrollContainer");
  if (!scrollEl) return 0;
  const total = scrollEl.scrollHeight - scrollEl.clientHeight;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, scrollEl.scrollTop / total));
}

export function initReadingProgressSyncListeners(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const syncActive = () => {
    const w = window as any;
    if (w.activeArticleId && isReadingProgressSyncEnabled()) {
      syncReadingProgressIfEnabled(w.activeArticleId, getCurrentReaderScrollRatio());
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") syncActive();
  });
  window.addEventListener("pagehide", syncActive);
}
