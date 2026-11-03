import { openModal, closeModal } from "./manager";
import { pushOverlayHistory, popOverlayHistory } from "../utils/overlay-history";
import { showToast } from "../components/toast";
import { showConfirmDialog } from "./confirm";
import { showPromptDialog } from "./prompt";
import { showCreatedTokenModal } from "./token-display";
import { authFetch, apiJson, apiPost, setAuthToken, isCapacitorApp } from "../sync/api";
import { clearIndexedDB } from "../storage/db";
import { getParserMode, setParserMode, ParserMode } from "../extractor";
import { escapeHtml } from "../utils/dom";
import { normalizeUrl, formatCardDate } from "../utils/format";

let activeSettingsTab = "appearance";
let lastDataTabSyncTime = 0;
let lastCookiesTabFetchTime = 0;
let lastTagsTabFetchTime = 0;

export function updateSettingsStats(): void {
  const localEl = document.getElementById("statsLocalArticles");
  const serverEl = document.getElementById("statsServerArticles");
  const compEl = document.getElementById("statsSyncComparison");
  const revEl = document.getElementById("statsSyncRevision");

  const w = typeof window !== "undefined" ? (window as any) : {};
  const allEntries: any[] = w.allEntries || [];
  const serverLibraryCounts = w.serverLibraryCounts;
  const currentSyncRev = w.currentSyncRev;
  const isOfflineMode = Boolean(w.isOfflineMode);

  const localTotal = allEntries.length;
  const unreadCount = allEntries.filter((e: any) => !e.is_archived).length;
  const serverTotal = (serverLibraryCounts && typeof serverLibraryCounts.total === "number") ? serverLibraryCounts.total : localTotal;
  const currentRev = Number(localStorage.getItem("wf_sync_rev") || currentSyncRev || 1);
  const isOffline = (typeof navigator !== "undefined" && !navigator.onLine) || isOfflineMode;

  if (localEl) {
    localEl.textContent = localTotal + " (" + unreadCount + " unread)";
  }
  if (serverEl) {
    serverEl.textContent = isOffline ? (serverTotal + " (from last sync)") : String(serverTotal);
  }
  if (compEl) {
    if (isOffline) {
      compEl.textContent = "Offline (Cached from Rev " + currentRev + ")";
      compEl.style.color = "var(--warning, #f59e0b)";
    } else if (localTotal === serverTotal) {
      compEl.textContent = "In Sync ✓ (" + localTotal + "/" + serverTotal + ")";
      compEl.style.color = "var(--accent, #3b82f6)";
    } else {
      const diff = localTotal - serverTotal;
      compEl.textContent = (diff > 0 ? ("+" + diff) : String(diff)) + " diff (Local: " + localTotal + ", Server: " + serverTotal + ")";
      compEl.style.color = "var(--warning, #f59e0b)";
    }
  }
  if (revEl) {
    revEl.textContent = "Rev " + currentRev;
  }

  // Populate Overview Stats in Server & Data Panel
  const unreadStatEl = document.getElementById("settingsStatUnread");
  const starredStatEl = document.getElementById("settingsStatStarred");
  const timeStatEl = document.getElementById("settingsStatReadingTime");

  const unread = allEntries.filter((e: any) => !e.is_archived).length;
  const starred = allEntries.filter((e: any) => e.is_starred).length;
  const totalReadingMins = allEntries
    .filter((e: any) => !e.is_archived)
    .reduce((sum: number, e: any) => sum + (e.reading_time || Math.max(1, Math.round((e.content?.length || 500) / 1000))), 0);

  if (unreadStatEl) unreadStatEl.textContent = String(unread);
  if (starredStatEl) starredStatEl.textContent = String(starred);
  if (timeStatEl) timeStatEl.textContent = totalReadingMins >= 60 ? Math.floor(totalReadingMins / 60) + "h " + (totalReadingMins % 60) + "m" : totalReadingMins + "m";
}

export function setParserEngine(mode: ParserMode): void {
  setParserMode(mode);
  updateParserEngineUI();
  showToast(`Article extractor set to: ${mode.toUpperCase()}`);
}

export function updateParserEngineUI(): void {
  const currentMode = getParserMode();
  const isCap = isCapacitorApp();
  
  const btnsContainer = document.getElementById("settingsParserBtns");
  const webNotice = document.getElementById("settingsParserWebNotice");
  const descEl = document.getElementById("settingsParserEngineDesc");

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

export function formatTokenTimestamp(isoStr: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export async function populateServerConfigInputs(): Promise<void> {
  let savedServerUrl = localStorage.getItem("wf_server_url") || "";
  let savedAuthToken = localStorage.getItem("wf_auth_token") || "";

  const w = typeof window !== "undefined" ? (window as any) : {};
  if (isCapacitorApp() && (!savedServerUrl || !savedAuthToken) && w.Capacitor?.Plugins?.WallaflareNative?.getServerConfig) {
    try {
      const res = await w.Capacitor.Plugins.WallaflareNative.getServerConfig();
      if (res) {
        if (res.server_url && !savedServerUrl) {
          savedServerUrl = res.server_url;
          localStorage.setItem("wf_server_url", savedServerUrl);
        }
        if (res.auth_token && !savedAuthToken) {
          savedAuthToken = res.auth_token;
          localStorage.setItem("wf_auth_token", savedAuthToken);
        }
      }
    } catch (e) {}
  }

  const effectiveServerUrl = (isCapacitorApp() ? savedServerUrl : (savedServerUrl || (typeof window !== "undefined" ? window.location.origin : ""))) || (typeof window !== "undefined" ? window.location.origin : "");

  const serverUrlEl = document.getElementById("syncServerUrl");
  if (serverUrlEl) {
    serverUrlEl.textContent = effectiveServerUrl;
  }

  const initialHasReadToken = w.WF_HAS_READ_TOKEN !== undefined 
    ? Boolean(w.WF_HAS_READ_TOKEN)
    : (localStorage.getItem("wf_has_read_token") === "true");
  
  if (typeof w.updateOpdsTokenBadge === "function") {
    w.updateOpdsTokenBadge(initialHasReadToken);
  }

  const tokenParam = initialHasReadToken ? "?token=READ_TOKEN" : "?token=AUTH_TOKEN";

  const opdsUrlEl = document.getElementById("syncOpdsUrl");
  if (opdsUrlEl) {
    opdsUrlEl.textContent = effectiveServerUrl + "/opds";
  }

  const opdsAuthUrlEl = document.getElementById("syncOpdsAuthUrl");
  if (opdsAuthUrlEl) {
    opdsAuthUrlEl.textContent = effectiveServerUrl + "/opds" + tokenParam;
    opdsAuthUrlEl.removeAttribute("data-full-url");
  }

  const rssUnreadEl = document.getElementById("syncRssUnreadUrl");
  if (rssUnreadEl) {
    rssUnreadEl.textContent = effectiveServerUrl + "/feed/unread" + tokenParam;
    rssUnreadEl.removeAttribute("data-full-url");
  }

  const rssStarredEl = document.getElementById("syncRssStarredUrl");
  if (rssStarredEl) {
    rssStarredEl.textContent = effectiveServerUrl + "/feed/starred" + tokenParam;
    rssStarredEl.removeAttribute("data-full-url");
  }

  const rssArchiveEl = document.getElementById("syncRssArchiveUrl");
  if (rssArchiveEl) {
    rssArchiveEl.textContent = effectiveServerUrl + "/feed/archive" + tokenParam;
    rssArchiveEl.removeAttribute("data-full-url");
  }

  // Fetch and populate active dedicated feed token from Cloudflare D1
  try {
    const { ok, data: feedRes } = await apiJson("/api/feed-token");
    if (ok && feedRes?.success && feedRes.feed_token) {
      const feedToken = feedRes.feed_token;
      const feedTokenEl = document.getElementById("activeFeedTokenDisplay");
      if (feedTokenEl) {
        feedTokenEl.textContent = feedToken;
      }
      if (opdsAuthUrlEl) {
        opdsAuthUrlEl.textContent = feedRes.opds_url || `${effectiveServerUrl}/opds?token=${feedToken}`;
      }
      if (rssUnreadEl) {
        rssUnreadEl.textContent = feedRes.rss_urls?.unread || `${effectiveServerUrl}/feed/unread?token=${feedToken}`;
      }
      if (rssStarredEl) {
        rssStarredEl.textContent = feedRes.rss_urls?.starred || `${effectiveServerUrl}/feed/starred?token=${feedToken}`;
      }
      if (rssArchiveEl) {
        rssArchiveEl.textContent = feedRes.rss_urls?.archive || `${effectiveServerUrl}/feed/archive?token=${feedToken}`;
      }
    } else {
      const feedTokenEl = document.getElementById("activeFeedTokenDisplay");
      if (feedTokenEl && feedTokenEl.textContent === "Loading...") {
        feedTokenEl.textContent = "Error loading token";
      }
    }
  } catch (e) {
    const feedTokenEl = document.getElementById("activeFeedTokenDisplay");
    if (feedTokenEl && feedTokenEl.textContent === "Loading...") {
      feedTokenEl.textContent = "Error loading token";
    }
  }

  const urlInputs = [
    document.getElementById("settingsServerUrlInput"),
    document.getElementById("serverUrlInput")
  ].filter(Boolean) as HTMLInputElement[];

  const tokenInputs = [
    document.getElementById("settingsServerTokenInput"),
    document.getElementById("serverTokenInput")
  ].filter(Boolean) as HTMLInputElement[];

  urlInputs.forEach(input => {
    input.value = effectiveServerUrl;
  });

  tokenInputs.forEach(input => {
    input.value = "";
    if (savedAuthToken) {
      input.placeholder = "•••••••••••• (Saved - leave blank to keep)";
    } else {
      input.placeholder = "Master password or device token";
    }
  });

  loadPersonalTokens();
}

let loadedPatTokens: any[] = [];

export interface PatSortOption {
  id: string;
  label: string;
  iconSvg: string;
}

export const PAT_SORT_OPTIONS: PatSortOption[] = [
  {
    id: "last_used_desc",
    label: "Recently Used",
    iconSvg: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>'
  },
  {
    id: "unused_first",
    label: "Unused First",
    iconSvg: '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
  },
  {
    id: "created_desc",
    label: "Newest Added",
    iconSvg: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>'
  },
  {
    id: "created_asc",
    label: "Oldest Added",
    iconSvg: '<polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>'
  },
  {
    id: "label_asc",
    label: "Label (A–Z)",
    iconSvg: '<path d="M4 19V5h3v14H4zM10 19l4.5-14h2L21 19h-2.4l-.8-2.6h-3.6l-.8 2.6H10zm4.2-4.7h2.6L15.5 9.2h-.1l-1.2 5.1z"></path>'
  }
];

export function getPatSortOrder(): string {
  try {
    return localStorage.getItem("wf_pat_sort") || "last_used_desc";
  } catch (e) {
    return "last_used_desc";
  }
}

export function generatePatSortMenuHtml(currentOrder: string = "last_used_desc"): string {
  return PAT_SORT_OPTIONS.map((opt) => {
    const isActive = opt.id === currentOrder;
    const checkmark = isActive
      ? '<span style="margin-left: auto; font-weight: 700; color: var(--accent); font-size: 0.9rem;">✓</span>'
      : '';

    return (
      `<button type="button" class="menu-item ${isActive ? "active" : ""}" onclick="setPatSortOrder('${opt.id}');">` +
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">` +
          opt.iconSvg +
        `</svg>` +
        `<span>${opt.label}</span>` +
        checkmark +
      `</button>`
    );
  }).join("");
}

export function closePatSortMenu(): void {
  const menu = document.getElementById("patSortDropdownMenu");
  if (menu) menu.classList.remove("open");
}

export function togglePatSortMenu(): void {
  const menu = document.getElementById("patSortDropdownMenu");
  if (!menu) return;
  const isOpen = menu.classList.contains("open");
  if (typeof (window as any).closeAllCardMenus === "function") {
    (window as any).closeAllCardMenus();
  } else {
    document.querySelectorAll(".card-dropdown-menu.open").forEach((m) => m.classList.remove("open"));
  }
  if (!isOpen) {
    const currentSort = getPatSortOrder();
    menu.innerHTML = generatePatSortMenuHtml(currentSort);
    menu.classList.add("open");
  }
}

export function setPatSortOrder(order: string): void {
  try {
    localStorage.setItem("wf_pat_sort", order);
  } catch (e) {}
  closePatSortMenu();
  renderPersonalTokens();
}

export function setLoadedPatTokens(tokens: any[]): void {
  loadedPatTokens = tokens;
}

export function sortPatTokens(tokens: any[], sortBy: string): any[] {
  const list = [...tokens];
  switch (sortBy) {
    case "unused_first":
      return list.sort((a, b) => {
        if (Boolean(a.revoked_at) !== Boolean(b.revoked_at)) {
          return a.revoked_at ? 1 : -1;
        }
        const aUsed = Boolean(a.last_used_at);
        const bUsed = Boolean(b.last_used_at);
        if (aUsed !== bUsed) return aUsed ? 1 : -1;
        if (!aUsed) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return new Date(a.last_used_at).getTime() - new Date(b.last_used_at).getTime();
      });
    case "created_desc":
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "created_asc":
      return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case "label_asc":
      return list.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
    case "last_used_desc":
    default:
      return list.sort((a, b) => {
        if (Boolean(a.revoked_at) !== Boolean(b.revoked_at)) {
          return a.revoked_at ? 1 : -1;
        }
        const aTime = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
        const bTime = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }
}

export function renderPersonalTokens(): void {
  const container = document.getElementById("patTokensContainer");
  const sortBar = document.getElementById("patSortBar");
  const countEl = document.getElementById("patTokensCount");
  const sortLabelEl = document.getElementById("patSortBtnLabel");
  if (!container) return;

  if (loadedPatTokens.length === 0) {
    if (sortBar) sortBar.style.display = "none";
    container.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 0.4rem;">No active tokens. Generate one above to connect third-party apps.</div>';
    return;
  }

  const sortBy = getPatSortOrder();
  const currentOpt = PAT_SORT_OPTIONS.find((o) => o.id === sortBy) || PAT_SORT_OPTIONS[0];
  if (sortLabelEl) {
    sortLabelEl.textContent = currentOpt.label;
  }

  if (sortBar) sortBar.style.display = "flex";
  const unusedCount = loadedPatTokens.filter(t => !t.last_used_at && !t.revoked_at).length;
  if (countEl) {
    countEl.textContent = `${loadedPatTokens.length} token${loadedPatTokens.length === 1 ? "" : "s"}${unusedCount > 0 ? ` (${unusedCount} unused)` : ""}`;
  }

  const sorted = sortPatTokens(loadedPatTokens, sortBy);

  container.innerHTML = sorted.map((t: any) => {
    const isRevoked = Boolean(t.revoked_at);
    const createdFmt = formatCardDate(t.created_at);
    const safeLabel = escapeHtml(t.label || "Token");
    const safePrefix = escapeHtml(t.token_prefix || "");

    let lastUsedHtml = "";
    if (isRevoked) {
      lastUsedHtml = `<span style="color: #ef4444; font-weight: 600;">Revoked</span>`;
    } else if (t.last_used_at) {
      const usedFmt = formatCardDate(t.last_used_at);
      lastUsedHtml = `<span title="Last used: ${escapeHtml(usedFmt.tooltip)}">Last used ${escapeHtml(usedFmt.label)}</span>`;
    } else {
      lastUsedHtml = `<span style="color: #f59e0b; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.25); padding: 1px 6px; border-radius: 4px; font-weight: 600; font-size: 0.7rem;">Never used</span>`;
    }

    const createdHtml = createdFmt.label
      ? `<span title="Created: ${escapeHtml(createdFmt.tooltip)}">Added ${escapeHtml(createdFmt.label)}</span>`
      : "";

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.65rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.8rem; gap: 0.5rem;">
        <div style="min-width: 0; flex: 1;">
          <div style="font-weight: 600; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span>${safeLabel}</span>
            <code style="font-size: 0.72rem; color: var(--accent); background: var(--bg-primary); padding: 1px 5px; border-radius: 3px; font-family: monospace;">${safePrefix}</code>
          </div>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            ${createdHtml ? `${createdHtml} • ` : ""}${lastUsedHtml}
          </div>
        </div>
        ${!isRevoked ? `
          <div style="display: flex; gap: 0.35rem; align-items: center;">
            <button type="button" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.72rem; white-space: nowrap;" data-token-label="${safeLabel}" onclick="handleRenamePersonalToken(${t.id}, this.getAttribute('data-token-label'))">Rename</button>
            <button type="button" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.72rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.4); white-space: nowrap;" data-token-label="${safeLabel}" onclick="handleRevokePersonalToken(${t.id}, this.getAttribute('data-token-label'))">Revoke</button>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
}

export async function loadPersonalTokens(): Promise<void> {
  const container = document.getElementById("patTokensContainer");
  const sortBar = document.getElementById("patSortBar");
  if (!container) return;
  try {
    const res = await authFetch("/api/tokens");
    if (!res.ok) {
      if (sortBar) sortBar.style.display = "none";
      container.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 0.4rem;">Could not load tokens.</div>';
      return;
    }
    const data = await res.json();
    loadedPatTokens = data.tokens || [];
    renderPersonalTokens();
  } catch (e) {
    if (sortBar) sortBar.style.display = "none";
    container.innerHTML = '<div style="font-size: 0.78rem; color: var(--text-muted); text-align: center; padding: 0.4rem;">Error loading tokens.</div>';
  }
}

export async function handleCreatePersonalToken(): Promise<void> {
  const input = document.getElementById("newPatLabelInput") as HTMLInputElement | null;
  const btn = document.getElementById("generatePatBtn") as HTMLButtonElement | null;
  const label = input ? input.value.trim() : "";
  if (!label) {
    showToast("Please enter a token label");
    input?.focus();
    return;
  }
  if (btn) btn.disabled = true;
  try {
    const res = await authFetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label })
    });
    if (!res.ok) {
      showToast("Failed to create token");
      return;
    }
    const data = await res.json();
    if (data.token) {
      if (input) input.value = "";
      showCreatedTokenModal(data.token, data.label);
      loadPersonalTokens();
    }
  } catch (e) {
    showToast("Error generating token");
  } finally {
    if (btn) btn.disabled = false;
  }
}

export async function handleRevokePersonalToken(id: number, label: string): Promise<void> {
  const confirmed = await showConfirmDialog(
    "Revoke Token",
    `Are you sure you want to revoke "${label}"?\n\nAny app or script using this token will be disconnected immediately.`,
    "Revoke Token",
    true
  );
  if (!confirmed) return;
  try {
    const res = await authFetch("/api/tokens/" + id, { method: "DELETE" });
    if (res.ok) {
      showToast("Token revoked successfully");
      loadPersonalTokens();
    } else {
      showToast("Could not revoke token");
    }
  } catch (e) {
    showToast("Error revoking token");
  }
}

export async function handleRenamePersonalToken(id: number, currentLabel: string): Promise<void> {
  const newLabel = await showPromptDialog(
    "Rename API Token",
    "Enter a new label for this token:",
    currentLabel,
    "Rename",
    "e.g. KOReader (Bedside)"
  );
  if (newLabel === null) return;
  const trimmed = newLabel.trim();
  if (!trimmed) {
    showToast("Token label cannot be empty");
    return;
  }
  if (trimmed === currentLabel) return;

  try {
    const res = await authFetch(`/api/tokens/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: trimmed }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showToast(err.error || "Failed to rename token");
      return;
    }
    const data = await res.json();
    showToast(`✓ Token renamed to "${data.label}"`);
    loadPersonalTokens();
  } catch (e) {
    showToast("Error renaming token");
  }
}

export function openSettingsModal(initialTab: string | null = null): void {
  const modal = document.getElementById("settingsModal");
  if (!modal) return;

  const isMobile = window.innerWidth < 768;
  const targetTab = initialTab || (isMobile ? "root" : "appearance");

  const syncClientSecretEl = document.getElementById("syncClientSecretDisplay");
  if (syncClientSecretEl) {
    syncClientSecretEl.textContent = "wallaflare";
  }

  const serverRow = document.getElementById("serverConnectionSettingsRow");
  if (serverRow) {
    serverRow.style.display = isCapacitorApp() ? "flex" : "none";
  }

  populateServerConfigInputs();
  updateSettingsStats();
  updateParserEngineUI();
  const webTip = document.getElementById("siteCookieWebTip");
  if (webTip) webTip.style.display = isCapacitorApp() ? "none" : "block";

  if (isMobile) {
    if (targetTab && targetTab !== "root") {
      switchSettingsTab(targetTab, true);
      modal.classList.add("is-viewing-panel");
      const backBtn = document.getElementById("settingsMobileBackBtn");
      if (backBtn) backBtn.style.display = "inline-flex";
    } else {
      modal.classList.remove("is-viewing-panel");
      const backBtn = document.getElementById("settingsMobileBackBtn");
      if (backBtn) backBtn.style.display = "none";
      const title = document.getElementById("settingsModalTitle");
      if (title) title.textContent = "Settings";
    }
  } else {
    switchSettingsTab(targetTab === "root" ? "appearance" : targetTab, false);
    modal.classList.remove("is-viewing-panel");
  }

  openModal("settingsModal");
}

export function switchSettingsTab(tabName: string, activateMobile: boolean = true): void {
  closePatSortMenu();
  activeSettingsTab = tabName || "appearance";
  updateSettingsStats();

  const now = Date.now();
  populateServerConfigInputs();

  const w = typeof window !== "undefined" ? (window as any) : {};
  if (activeSettingsTab === "data") {
    if (now - lastDataTabSyncTime > 15000) {
      lastDataTabSyncTime = now;
      if (typeof w.loadArticles === "function") {
        w.loadArticles(true, false).then(() => {
          updateSettingsStats();
        }).catch(() => {});
      }
    }
  } else if (activeSettingsTab === "cookies") {
    if (now - lastCookiesTabFetchTime > 15000) {
      lastCookiesTabFetchTime = now;
      if (typeof w.loadSiteCookies === "function") w.loadSiteCookies();
    }
  } else if (activeSettingsTab === "tags") {
    if (now - lastTagsTabFetchTime > 15000) {
      lastTagsTabFetchTime = now;
      if (typeof w.loadGlobalTags === "function") {
        w.loadGlobalTags().then(() => {
          if (typeof w.renderGlobalTagManagerUI === "function") w.renderGlobalTagManagerUI();
        }).catch(() => {});
      }
    }
  } else if (activeSettingsTab === "integrations") {
    loadPersonalTokens();
  }

  // Update nav buttons
  document.querySelectorAll("#settingsNavPane .settings-nav-item").forEach(btn => {
    if (btn.getAttribute("data-tab") === activeSettingsTab) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update panels
  document.querySelectorAll("#settingsContentPane .settings-panel").forEach(panel => {
    panel.classList.remove("active");
    (panel as HTMLElement).style.display = "none";
  });

  const activePanel = document.getElementById("settingsPanel-" + activeSettingsTab);
  if (activePanel) {
    activePanel.classList.add("active");
    activePanel.style.display = "block";
  }

  const titles: Record<string, string> = {
    appearance: "Theme & Appearance",
    cookies: "Cookie Vault & Paywalls",
    integrations: "Apps & KOReader Sync",
    tags: "Tag Management",
    data: "Server & Data",
    about: "About & Updates"
  };

  const titleEl = document.getElementById("settingsModalTitle");
  const modal = document.getElementById("settingsModal");
  const backBtn = document.getElementById("settingsMobileBackBtn");

  if (window.innerWidth < 768 && activateMobile) {
    if (modal) {
      if (!modal.classList.contains("is-viewing-panel")) {
        pushOverlayHistory("settings-viewing-panel", () => handleSettingsMobileBack());
      }
      modal.classList.add("is-viewing-panel");
    }
    if (backBtn) backBtn.style.display = "inline-flex";
    if (titleEl) titleEl.textContent = titles[activeSettingsTab] || "Settings";
  } else {
    if (titleEl) titleEl.textContent = "Settings";
  }
}

export function handleSettingsMobileBack(): void {
  const modal = document.getElementById("settingsModal");
  const backBtn = document.getElementById("settingsMobileBackBtn");
  const titleEl = document.getElementById("settingsModalTitle");
  if (modal) modal.classList.remove("is-viewing-panel");
  if (backBtn) backBtn.style.display = "none";
  if (titleEl) titleEl.textContent = "Settings";
  popOverlayHistory("settings-viewing-panel");
}

export function openGlobalTagModal(): void {
  openSettingsModal("tags");
}

export function openSyncModal(): void {
  openSettingsModal("integrations");
}

export function openServerConnectModal(): void {
  openSettingsModal("data");
}

export function openWipeDbModal(): void {
  openSettingsModal("data");
}

export async function reconcileDatabase(): Promise<void> {
  const ok = await showConfirmDialog(
    "Reconcile Database",
    "This will clear local storage and re-sync all articles, tags, and counts fresh from Cloudflare D1.\n\nContinue?",
    "Reconcile & Sync",
    false
  );
  if (!ok) return;

  showToast("Reconciling database...");
  localStorage.removeItem("wf_sync_rev");
  localStorage.removeItem("wf_instance_id");
  localStorage.removeItem("wf_cached_articles");
  localStorage.removeItem("wf_cached_tags");
  localStorage.removeItem("wf_cached_counts");
  localStorage.removeItem("wf_pending_mutations");
  localStorage.removeItem("wf_instance_id");

  const w = typeof window !== "undefined" ? (window as any) : {};
  w.currentSyncRev = 0;
  w.allEntries = [];
  await clearIndexedDB();
  if (typeof w.filterArticles === "function") w.filterArticles();
  if (typeof w.loadArticles === "function") await w.loadArticles(false, true);
  showToast("✓ Database fully reconciled");
}

export function handleSaveServerConnection(e?: Event): void {
  if (e) e.preventDefault();
  const form = (e && e.target && (e.target as HTMLElement).tagName === "FORM") ? (e.target as HTMLElement) : document;
  const urlInput = (form.querySelector("#settingsServerUrlInput") || form.querySelector("#serverUrlInput") || document.getElementById("settingsServerUrlInput") || document.getElementById("serverUrlInput")) as HTMLInputElement;
  const tokenInput = (form.querySelector("#settingsServerTokenInput") || form.querySelector("#serverTokenInput") || document.getElementById("settingsServerTokenInput") || document.getElementById("serverTokenInput")) as HTMLInputElement;

  const w = typeof window !== "undefined" ? (window as any) : {};

  let url = (urlInput?.value || "").trim();
  const token = (tokenInput?.value || "").trim();

  if (url) {
    url = normalizeUrl(url).replace(/\/+$/, "");
    localStorage.setItem("wf_server_url", url);
  }
  if (token) {
    setAuthToken(token);
  }
  if (typeof w.syncNativeServerConfig === "function") w.syncNativeServerConfig();
  populateServerConfigInputs();
  closeModal("serverConnectModal");
  closeModal("settingsModal");
  showToast("✓ Server settings saved");
  if (typeof w.loadArticles === "function") w.loadArticles(false);
}

export async function handleCustomizeFeedToken(): Promise<void> {
  const currentToken = document.getElementById("activeFeedTokenDisplay")?.textContent?.trim() || "";
  const initialValue = (currentToken === "Loading..." || currentToken.startsWith("Error")) ? "" : currentToken;
  const custom = await showPromptDialog(
    "Customize Feed Token",
    "Enter a custom read token for OPDS & RSS (4-64 alphanumeric characters, underscores, or hyphens):",
    initialValue,
    "Update",
    "e.g. my_custom_feed_token"
  );
  if (!custom) return;
  const token = custom.trim();
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(token)) {
    showToast("Invalid token format. Must be 4-64 characters (letters, numbers, _ or -).");
    return;
  }
  try {
    const { ok, data: res } = await apiPost("/api/feed-token", { token });
    if (ok && res?.success) {
      showToast("✓ Feed token updated successfully!");
      await populateServerConfigInputs();
    } else {
      showToast(res?.message || "Failed to update feed token.");
    }
  } catch (err: any) {
    showToast("Error updating feed token: " + err.message);
  }
}

export async function handleRegenerateFeedToken(): Promise<void> {
  const confirmed = await showConfirmDialog(
    "Regenerate Feed Token",
    "Regenerate syndication feed token? External e-readers and RSS apps using the old token will need to be updated.",
    "Regenerate",
    true
  );
  if (!confirmed) return;
  try {
    const { ok, data: res } = await apiPost("/api/feed-token", { token: "regenerate" });
    if (ok && res?.success) {
      showToast("✓ Feed token regenerated!");
      await populateServerConfigInputs();
    } else {
      showToast(res?.message || "Failed to regenerate feed token.");
    }
  } catch (err: any) {
    showToast("Error regenerating feed token: " + err.message);
  }
}

export async function handleChangeMasterPassword(event: Event): Promise<void> {
  if (event) event.preventDefault();
  const currentInput = document.getElementById("changePasswordCurrentInput") as HTMLInputElement;
  const newInput = document.getElementById("changePasswordNewInput") as HTMLInputElement;
  const confirmInput = document.getElementById("changePasswordConfirmInput") as HTMLInputElement;
  const submitBtn = document.getElementById("changePasswordSubmitBtn") as HTMLButtonElement;

  const currentPassword = (currentInput?.value || "").trim();
  const newPassword = (newInput?.value || "").trim();
  const confirmPassword = (confirmInput?.value || "").trim();

  if (!newPassword || newPassword.length < 8) {
    showToast("New password must be at least 8 characters.");
    return;
  }
  if (newPassword !== confirmPassword) {
    showToast("New passwords do not match.");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";
  }

  try {
    const { ok, data: res } = await apiPost("/api/admin/change-password", {
      current_password: currentPassword,
      new_password: newPassword
    });
    if (ok && res?.success) {
      showToast("✓ Master password updated successfully!");
      if (currentInput) currentInput.value = "";
      if (newInput) newInput.value = "";
      if (confirmInput) confirmInput.value = "";
    } else {
      showToast("Failed to change password: " + (res?.message || res?.error || "Invalid credentials"));
    }
  } catch (err: any) {
    showToast("Error updating password: " + err.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Update Password";
    }
  }
}

// Attach to window for global access & HTML inline event handlers
if (typeof window !== "undefined") {
  const w = window as any;
  w.updateSettingsStats = updateSettingsStats;
  w.setParserEngine = setParserEngine;
  w.updateParserEngineUI = updateParserEngineUI;
  w.formatTokenTimestamp = formatTokenTimestamp;
  w.populateServerConfigInputs = populateServerConfigInputs;
  w.loadPersonalTokens = loadPersonalTokens;
  w.renderPersonalTokens = renderPersonalTokens;
  w.togglePatSortMenu = togglePatSortMenu;
  w.closePatSortMenu = closePatSortMenu;
  w.setPatSortOrder = setPatSortOrder;
  w.handleCreatePersonalToken = handleCreatePersonalToken;
  w.handleRevokePersonalToken = handleRevokePersonalToken;
  w.openSettingsModal = openSettingsModal;
  w.switchSettingsTab = switchSettingsTab;
  w.handleSettingsMobileBack = handleSettingsMobileBack;
  w.openGlobalTagModal = openGlobalTagModal;
  w.openSyncModal = openSyncModal;
  w.openServerConnectModal = openServerConnectModal;
  w.openWipeDbModal = openWipeDbModal;
  w.reconcileDatabase = reconcileDatabase;
  w.handleSaveServerConnection = handleSaveServerConnection;
  w.handleCustomizeFeedToken = handleCustomizeFeedToken;
  w.handleRegenerateFeedToken = handleRegenerateFeedToken;
  w.handleChangeMasterPassword = handleChangeMasterPassword;
}
