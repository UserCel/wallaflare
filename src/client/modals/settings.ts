import { state } from "../state";
import { openModal, closeModal } from "./manager";
import { showToast } from "../components/toast";
import { authFetch, getEffectiveServerUrl, getAuthToken, setAuthToken, apiPost } from "../sync/api";
import { PREF_KEYS } from "../storage/preferences";
import { clearIndexedDB } from "../storage/db";
import { $id, setText, getInputValue, setInputValue } from "../utils/dom";

export function openSettingsModal(): void {
  updateSettingsStats();
  openModal("settingsModal");
}

export function openServerConnectModal(): void {
  setInputValue("serverUrlInput", getEffectiveServerUrl());
  setInputValue("serverTokenInput", getAuthToken());
  openModal("serverConnectModal");
}

export function handleSaveServerConnection(): void {
  const url = getInputValue("serverUrlInput");
  const token = getInputValue("serverTokenInput");
  if (url) localStorage.setItem(PREF_KEYS.SERVER_URL, url);
  setAuthToken(token);
  showToast("Server configuration saved!");
  closeModal("serverConnectModal");
  if ((window as any).loadArticles) (window as any).loadArticles(false);
}

export function openWipeDbModal(): void {
  openModal("wipeDbModal");
}

export async function handleConfirmWipeDatabase(): Promise<void> {
  try {
    const { ok } = await apiPost("/api/admin/reset-database.json");
    if (ok) {
      await clearIndexedDB();
      localStorage.removeItem(PREF_KEYS.SYNC_REV);
      localStorage.removeItem(PREF_KEYS.INSTANCE_ID);
      showToast("Database wiped successfully!");
      closeModal("wipeDbModal");
      closeModal("settingsModal");
      state.allEntries = [];
      if ((window as any).loadArticles) (window as any).loadArticles(false);
    } else {
      showToast("Failed to wipe database", true);
    }
  } catch (e) {
    showToast("Failed to wipe database", true);
  }
}

export function updateSettingsStats(): void {
  const total = state.allEntries.length;
  const unread = state.allEntries.filter((e) => !e.is_archived).length;
  const starred = state.allEntries.filter((e) => e.is_starred).length;
  const archive = state.allEntries.filter((e) => e.is_archived).length;

  setText("settingsStatsTotal", total);
  setText("settingsStatsUnread", unread);
  setText("settingsStatsStarred", starred);
  setText("settingsStatsArchive", archive);
}
