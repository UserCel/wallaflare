import { state } from "../state";
import { openModal, closeModal } from "./manager";
import { showToast } from "../components/toast";
import { authFetch, getEffectiveServerUrl, getAuthToken, setAuthToken, apiPost, isCapacitorApp } from "../sync/api";
import { PREF_KEYS } from "../storage/preferences";
import { clearIndexedDB } from "../storage/db";
import { getParserMode, setParserMode, ParserMode } from "../extractor";
import { $id, setText, getInputValue, setInputValue } from "../utils/dom";

export function setParserEngine(mode: ParserMode): void {
  setParserMode(mode);
  updateParserEngineUI();
  showToast(`Article extractor set to: ${mode.toUpperCase()}`);
}

export function updateParserEngineUI(): void {
  const currentMode = getParserMode();
  const isCap = isCapacitorApp();
  
  const btnsContainer = $id("settingsParserBtns");
  const webNotice = $id("settingsParserWebNotice");
  const descEl = $id("settingsParserEngineDesc");

  if (isCap) {
    if (btnsContainer) btnsContainer.style.display = "grid";
    if (webNotice) webNotice.style.display = "none";

    const btns = document.querySelectorAll("#settingsParserBtns .opt-parser-btn");
    btns.forEach((btn) => {
      const p = btn.getAttribute("data-parser");
      if (p === currentMode) {
        btn.classList.add("btn-primary");
        btn.classList.remove("btn-outline");
      } else {
        btn.classList.remove("btn-primary");
        btn.classList.add("btn-outline");
      }
    });

    if (descEl) {
      if (currentMode === "auto") {
        descEl.textContent = "Auto (Recommended): Extracts on-device via mobile connection to bypass bot checks & CPU limits; falls back to Cloudflare Worker if needed.";
      } else if (currentMode === "device") {
        descEl.textContent = "Device Only: Extracts articles entirely on your phone. Zero server-side scraping compute.";
      } else {
        descEl.textContent = "Server Only: Sends URL to Cloudflare Worker to scrape on edge.";
      }
    }
  } else {
    if (btnsContainer) btnsContainer.style.display = "none";
    if (webNotice) webNotice.style.display = "block";

    if (descEl) {
      descEl.textContent = "Web browsers enforce Same-Origin (CORS) security policies that block direct webpage scraping from external sites. Articles added from the web dashboard are parsed via your Cloudflare Worker. On-device extraction is active in the Wallaflare Android App.";
    }
  }
}

export function openSettingsModal(): void {
  updateSettingsStats();
  updateParserEngineUI();
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

if (typeof window !== "undefined") {
  (window as any).setParserEngine = setParserEngine;
  (window as any).updateParserEngineUI = updateParserEngineUI;
}
