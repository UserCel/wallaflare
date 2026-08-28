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
  loadSiteCookies();
  const webTip = $id("siteCookieWebTip");
  if (webTip) webTip.style.display = isCapacitorApp() ? "none" : "block";
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




// -------------------------------------------------------------
// Logged-In Sites & Paywall Cookie Vault
// -------------------------------------------------------------

export interface SyncedSiteCookie {
  id?: number;
  domain: string;
  site_name?: string;
  created_at?: string;
  updated_at?: string;
}

let cachedSiteCookies: SyncedSiteCookie[] = [];

export async function loadSiteCookies(): Promise<void> {
  try {
    const res = await authFetch("/api/site-cookies");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.sites)) {
        cachedSiteCookies = data.sites;
        renderSiteCookiesList();

        if (typeof (window as any).AndroidNative !== "undefined" && typeof (window as any).AndroidNative.syncAllDomainCookies === "function") {
          (window as any).AndroidNative.syncAllDomainCookies(JSON.stringify(cachedSiteCookies));
        } else if (isCapacitorApp() && typeof (window as any).Capacitor !== "undefined") {
          const nativePlugin = (window as any).Capacitor.Plugins?.WallaflareNative;
          if (nativePlugin && typeof nativePlugin.syncAllDomainCookies === "function") {
            nativePlugin.syncAllDomainCookies({ sites: cachedSiteCookies }).catch(() => {});
          }
        }
      }
    }
  } catch (e) {
    console.warn("Failed to load site cookies:", e);
  }
}

export function renderSiteCookiesList(): void {
  const container = $id("activeSiteCookiesList");
  if (!container) return;

  if (cachedSiteCookies.length === 0) {
    container.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; padding: 0.4rem 0;">No logged-in sites configured yet. Tap a preset above or + Add Site.</div>';
    return;
  }

  container.innerHTML = cachedSiteCookies.map((site) => {
    const name = site.site_name || site.domain;
    const domain = site.domain;
    const isEnabled = site.is_enabled !== 0;
    const statusBadge = isEnabled
      ? '<span style="color: #22c55e; font-weight: 500;">🟢 Enabled</span>'
      : '<span style="color: var(--text-muted); font-weight: 500;">⚪ Disabled</span>';

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.45rem 0.65rem; font-size: 0.8rem; opacity: ${isEnabled ? '1' : '0.65'}; transition: opacity 0.2s;">
        <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
          <span style="font-size: 0.9rem;">🔑</span>
          <div style="overflow: hidden;">
            <div style="font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${domain} &bull; ${statusBadge}</div>
          </div>
        </div>
        <div style="display: flex; gap: 0.65rem; align-items: center;">
          <label class="site-cookie-switch" title="${isEnabled ? 'Disable authenticated scraping' : 'Enable authenticated scraping'}">
            <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="handleToggleSiteCookie('${domain}', this.checked)" />
            <span class="site-cookie-slider"></span>
          </label>
          <button class="btn btn-outline" style="padding: 2px 6px; font-size: 0.72rem; color: var(--danger, #ef4444);" onclick="handleDeleteSiteCookie('${domain}')" title="Remove logged-in session">
            Remove
          </button>
        </div>
      </div>
    `;
  }).join("");
}

export function openAddSiteCookieDialog(defaultDomain?: string, defaultName?: string): void {
  setInputValue("siteCookieDomainInput", defaultDomain || "");
  setInputValue("siteCookieValueInput", "");
  const titleEl = $id("siteCookieModalTitle");
  if (titleEl) titleEl.textContent = defaultName ? `Log In to ${defaultName}` : "Log In to Site";

  const isNative = isCapacitorApp();
  const mobileWrap = $id("siteCookieLoginActionWrap");
  const webBanner = $id("siteCookieWebBanner");
  const manualWrap = $id("siteCookieManualValueWrap");
  const manualInput = $id("siteCookieValueInput") as HTMLTextAreaElement;

  if (mobileWrap) mobileWrap.style.display = isNative ? "block" : "none";
  if (webBanner) webBanner.style.display = isNative ? "none" : "block";
  if (manualWrap) manualWrap.style.display = "block";
  if (manualInput) {
    manualInput.required = !isNative;
  }

  openModal("siteCookieModal");
  if (!isNative && defaultDomain && manualInput) {
    setTimeout(() => manualInput.focus(), 150);
  }
}

export async function handlePresetSiteLogin(domain: string, name: string, loginUrl: string): Promise<void> {
  if (isCapacitorApp() && typeof (window as any).Capacitor !== "undefined") {
    const plugins = (window as any).Capacitor.Plugins;
    const nativePlugin = plugins?.WallaflareNative || plugins?.WallaflareNativePlugin;
    if (nativePlugin && typeof nativePlugin.openSiteLogin === "function") {
      try {
        const res = await nativePlugin.openSiteLogin({ domain, name, url: loginUrl });
        if (res && res.cookies) {
          showToast(`✓ Captured login session for ${name}`);
          await saveSiteCookieToServer(res.domain || domain, res.name || name, res.cookies);
          await loadSiteCookies();
          return;
        }
      } catch (err) {
        console.warn("Native site login cancelled or failed:", err);
      }
    }
  }
  // Web fallback: open dialog to manually enter/paste cookies
  openAddSiteCookieDialog(domain, name);
}

export async function launchInAppSiteLogin(): Promise<void> {
  const domain = getInputValue("siteCookieDomainInput").trim();
  if (!domain) {
    showToast("Please enter a domain first", true);
    return;
  }
  const loginUrl = domain.startsWith("http://") || domain.startsWith("https://") ? domain : `https://${domain}`;
  closeModal("siteCookieModal");
  await handlePresetSiteLogin(domain, domain, loginUrl);
}

export async function saveSiteCookieToServer(domain: string, siteName: string, cookieValue: string): Promise<boolean> {
  try {
    const res = await authFetch("/api/site-cookies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, site_name: siteName, cookie_value: cookieValue })
    });
    if (res.ok) {
      showToast(`Saved session for ${domain}!`);
      return true;
    }
  } catch {}
  showToast("Failed to save session to server", true);
  return false;
}

export async function handleSaveSiteCookieSubmit(e: Event): Promise<void> {
  e.preventDefault();
  const domain = getInputValue("siteCookieDomainInput").trim();
  const cookieValue = getInputValue("siteCookieValueInput").trim();

  if (!domain || !cookieValue) {
    showToast("Please provide both domain and cookie string", true);
    return;
  }

  const ok = await saveSiteCookieToServer(domain, domain, cookieValue);
  if (ok) {
    closeModal("siteCookieModal");
    await loadSiteCookies();
  }
}


export async function handleToggleSiteCookie(domain: string, isEnabled: boolean): Promise<void> {
  const site = cachedSiteCookies.find((s) => s.domain === domain);
  if (site) site.is_enabled = isEnabled ? 1 : 0;
  renderSiteCookiesList();

  if (isCapacitorApp() && typeof (window as any).Capacitor !== "undefined") {
    if (typeof (window as any).AndroidNative !== "undefined" && typeof (window as any).AndroidNative.setDomainEnabled === "function") {
      (window as any).AndroidNative.setDomainEnabled(domain, isEnabled);
    } else {
      const nativePlugin = (window as any).Capacitor.Plugins?.WallaflareNative;
      if (nativePlugin && typeof nativePlugin.setDomainEnabled === "function") {
        nativePlugin.setDomainEnabled({ domain, enabled: isEnabled }).catch(() => {});
      }
    }
  }

  try {
    const res = await authFetch(`/api/site-cookies/${encodeURIComponent(domain)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_enabled: isEnabled })
    });
    if (res.ok) {
      showToast(`${domain} ${isEnabled ? 'enabled' : 'disabled'}`);
      return;
    }
  } catch {}
  showToast("Failed to update site toggle", true);
}

export async function handleDeleteSiteCookie(domain: string): Promise<void> {
  const confirmed = await (window as any).showConfirmDialog(
    "Remove Login Session",
    `Are you sure you want to remove the saved login session for ${domain}?\n\nThis will delete the stored cookies and revert to anonymous scraping for this domain.`,
    "Remove Session",
    true
  );
  if (!confirmed) return;

  try {
    const res = await authFetch(`/api/site-cookies/${encodeURIComponent(domain)}`, {
      method: "DELETE"
    });
    if (res.ok) {
      if (isCapacitorApp() && typeof (window as any).Capacitor !== "undefined") {
        const nativePlugin = (window as any).Capacitor.Plugins?.WallaflareNative;
        if (nativePlugin && typeof nativePlugin.clearDomainCookies === "function") {
          nativePlugin.clearDomainCookies({ domain }).catch(() => {});
        }
      }
      showToast(`Removed login session for ${domain}`);
      cachedSiteCookies = cachedSiteCookies.filter((s) => s.domain !== domain);
      renderSiteCookiesList();
      if (isCapacitorApp() && typeof (window as any).Capacitor !== "undefined") {
        const nativePlugin = (window as any).Capacitor.Plugins?.WallaflareNative;
        if (nativePlugin && typeof nativePlugin.syncAllDomainCookies === "function") {
          nativePlugin.syncAllDomainCookies({ sites: cachedSiteCookies }).catch(() => {});
        }
      }
    }
  } catch {
    showToast("Failed to delete site session", true);
  }
}

export async function handleClearAllSiteCookies(): Promise<void> {
  const ok = await showConfirmDialog(
    "Clear All Site Logins",
    "Are you sure you want to remove all saved site login cookies from both your Cloudflare server and this device?",
    "Clear All",
    true
  );
  if (!ok) return;

  try {
    const res = await authFetch("/api/site-cookies", { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    cachedSiteCookies = [];
    renderSiteCookiesList();

    if (typeof (window as any).AndroidNative !== "undefined" && typeof (window as any).AndroidNative.clearAllSiteCookies === "function") {
      (window as any).AndroidNative.clearAllSiteCookies();
    } else if (isCapacitorApp() && typeof (window as any).Capacitor !== "undefined") {
      const nativePlugin = (window as any).Capacitor.Plugins?.WallaflareNative;
      if (nativePlugin && typeof nativePlugin.clearAllSiteCookies === "function") {
        nativePlugin.clearAllSiteCookies().catch(() => {});
      }
    }

    showToast("✓ All site logins and cookies cleared");
  } catch (err: any) {
    showToast(`Failed to clear cookies: ${err.message || "Error"}`, true);
  }
}


if (typeof window !== "undefined") {
  const w = window as any;
  w.setParserEngine = setParserEngine;
  w.updateParserEngineUI = updateParserEngineUI;
  w.loadSiteCookies = loadSiteCookies;
  w.renderSiteCookiesList = renderSiteCookiesList;
  w.openAddSiteCookieDialog = openAddSiteCookieDialog;
  w.handlePresetSiteLogin = handlePresetSiteLogin;
  w.launchInAppSiteLogin = launchInAppSiteLogin;
  w.handleSaveSiteCookieSubmit = handleSaveSiteCookieSubmit;
  w.handleToggleSiteCookie = handleToggleSiteCookie;
  w.handleDeleteSiteCookie = handleDeleteSiteCookie;
  w.handleClearAllSiteCookies = handleClearAllSiteCookies;
}