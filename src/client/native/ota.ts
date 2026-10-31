import { isCapacitorApp, getEffectiveServerUrl } from "../sync/api";
import { showToast } from "../components/toast";

export let currentMinNativeVersion: string = "1.0.0";
let isDownloadingOta: boolean = false;

export function getAppWebVersion(): string {
  const w = typeof window !== "undefined" ? (window as any) : {};
  return w.WF_BUILD_VERSION || "${OTA_VERSION}";
}

export function getRunningNativeVersion(): string {
  const w = typeof window !== "undefined" ? (window as any) : {};
  if (typeof w.AndroidNative?.getAppVersion === "function") {
    try {
      const v = w.AndroidNative.getAppVersion();
      if (v) return String(v);
    } catch (e) {}
  }
  return w.WF_NATIVE_VERSION || "1.0";
}

export function compareSemVer(a: string, b: string): number {
  const pa = String(a || "1.0.0").split(/[.-]/).map(n => parseInt(n, 10) || 0);
  const pb = String(b || "1.0.0").split(/[.-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export function checkNativeApkVersion(minNative: string): void {
  if (!isCapacitorApp() || !minNative) return;
  currentMinNativeVersion = minNative;
  const runningNativeVer = getRunningNativeVersion();
  if (compareSemVer(runningNativeVer, minNative) < 0) {
    console.warn("[OTA] Native app update available. Installed APK:", runningNativeVer, "Required:", minNative);
    setTimeout(() => {
      showToast("📲 New Android APK (v" + minNative + ") available! Install updated APK for latest native features.", 10000);
    }, 1200);
    updateVersionDisplay();
  }
}

export async function checkCapacitorOtaFromVersion(serverVer: string, minNative?: string): Promise<void> {
  if (!isCapacitorApp() || isDownloadingOta || !serverVer) return;
  const w = typeof window !== "undefined" ? (window as any) : {};
  const updater = w.Capacitor?.Plugins?.CapacitorUpdater;
  if (!updater) return;

  const currentLocal = w.WF_BUILD_VERSION || (await updater.getLatest().catch(() => null))?.version || "";
  if (serverVer === currentLocal) return;

  isDownloadingOta = true;
  try {
    const serverBase = getEffectiveServerUrl();
    const downloadUrl = (serverBase ? serverBase : "") + "/api/app/bundle.zip";
    console.log("[OTA] Downloading updated bundle reported in header:", serverVer);

    const downloaded = await updater.download({
      url: downloadUrl,
      version: serverVer
    });

    if (downloaded) {
      await updater.set(downloaded);
      console.log("[OTA] Bundle installed successfully for version:", serverVer);
      if (!w.activeArticleId && (!window.location.pathname || window.location.pathname === "/" || window.location.pathname === "/unread")) {
        showToast("✓ Updated to latest web assets");
        setTimeout(() => {
          updater.reload().catch(() => window.location.reload());
        }, 600);
      } else {
        showOtaRestartBanner();
      }
    }
  } catch (err) {
    console.warn("[OTA] Header updater error:", err);
  } finally {
    isDownloadingOta = false;
  }
}

export function showOtaRestartBanner(): void {
  showToast("🚀 New update ready! Tap here to reload", 12000);
  const toast = document.getElementById("toast");
  if (toast) {
    toast.style.cursor = "pointer";
    toast.onclick = () => {
      const w = typeof window !== "undefined" ? (window as any) : {};
      const updater = w.Capacitor?.Plugins?.CapacitorUpdater;
      if (updater) {
        updater.reload().catch(() => window.location.reload());
      } else {
        window.location.reload();
      }
    };
  }
}

export async function initCapacitorOtaUpdater(): Promise<void> {
  if (!isCapacitorApp()) return;
  const w = typeof window !== "undefined" ? (window as any) : {};
  const updater = w.Capacitor?.Plugins?.CapacitorUpdater;
  if (updater) {
    await updater.notifyAppReady().catch(() => {});
  }
  try {
    const serverBase = getEffectiveServerUrl();
    if (serverBase) {
      const res = await fetch(serverBase + "/api/app/version.json?_t=" + Date.now()).catch(() => null);
      if (res && res.ok) {
        const manifest = await res.json().catch(() => null);
        if (manifest) {
          if (typeof manifest.has_read_token === "boolean") {
            w.WF_HAS_READ_TOKEN = manifest.has_read_token;
            localStorage.setItem("wf_has_read_token", manifest.has_read_token ? "true" : "false");
            if (typeof w.updateOpdsTokenBadge === "function") w.updateOpdsTokenBadge(manifest.has_read_token);
          }
          if (manifest.has_read_token !== undefined) {
            w.WF_HAS_READ_TOKEN = Boolean(manifest.has_read_token);
          }
          if (manifest.min_native_version) {
            checkNativeApkVersion(manifest.min_native_version);
          }
          if (manifest.version) {
            checkCapacitorOtaFromVersion(manifest.version, manifest.min_native_version);
          }
        }
      }
    }
  } catch (e) {}
}

export function updateVersionDisplay(): void {
  const ver = getAppWebVersion();
  const label = document.getElementById("sidebarVersionLabel");
  const mobileLabel = document.getElementById("mobileVersionLabel");
  const settingsLabel = document.getElementById("settingsVersionLabel");
  
  let text = "Wallaflare v1.1.0 (Web: " + ver + ")";
  if (isCapacitorApp()) {
    const nativeVer = getRunningNativeVersion();
    const isOutdated = currentMinNativeVersion && compareSemVer(nativeVer, currentMinNativeVersion) < 0;
    text = isOutdated 
      ? "Wallaflare (APK: v" + nativeVer + " ⚠️ update to v" + currentMinNativeVersion + " • Web: " + ver + ")"
      : "Wallaflare (APK: v" + nativeVer + " • Web: " + ver + ")";
  }
  if (label) label.textContent = text;
  if (mobileLabel) mobileLabel.textContent = text;
  if (settingsLabel) settingsLabel.textContent = text;
}

export function syncNativeServerConfig(): void {
  try {
    const url = localStorage.getItem("wf_server_url") || "";
    const token = localStorage.getItem("wf_auth_token") || "";
    const w = typeof window !== "undefined" ? (window as any) : {};
    if (url || token) {
      if (w.AndroidNative && typeof w.AndroidNative.saveServerConfig === "function") {
        w.AndroidNative.saveServerConfig(url, token);
      }
      if (w.Capacitor?.Plugins?.WallaflareNative?.saveServerConfig) {
        w.Capacitor.Plugins.WallaflareNative.saveServerConfig({ url, token }).catch(() => {});
      }
    } else {
      if (w.AndroidNative && typeof w.AndroidNative.getServerConfig === "function") {
        try {
          const raw = w.AndroidNative.getServerConfig();
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.server_url && !localStorage.getItem("wf_server_url")) {
              localStorage.setItem("wf_server_url", parsed.server_url);
            }
            if (parsed.auth_token && !localStorage.getItem("wf_auth_token")) {
              localStorage.setItem("wf_auth_token", parsed.auth_token);
            }
          }
        } catch (e) {}
      }
      if (w.Capacitor?.Plugins?.WallaflareNative?.getServerConfig) {
        w.Capacitor.Plugins.WallaflareNative.getServerConfig().then((res: any) => {
          if (res) {
            if (res.server_url && !localStorage.getItem("wf_server_url")) {
              localStorage.setItem("wf_server_url", res.server_url);
            }
            if (res.auth_token && !localStorage.getItem("wf_auth_token")) {
              localStorage.setItem("wf_auth_token", res.auth_token);
            }
          }
        }).catch(() => {});
      }
    }
  } catch (e) {}
}

// Attach to window for global access & HTML inline event handlers
if (typeof window !== "undefined") {
  const w = window as any;
  w.getAppWebVersion = getAppWebVersion;
  w.getRunningNativeVersion = getRunningNativeVersion;
  w.compareSemVer = compareSemVer;
  w.checkNativeApkVersion = checkNativeApkVersion;
  w.checkCapacitorOtaFromVersion = checkCapacitorOtaFromVersion;
  w.showOtaRestartBanner = showOtaRestartBanner;
  w.initCapacitorOtaUpdater = initCapacitorOtaUpdater;
  w.updateVersionDisplay = updateVersionDisplay;
  w.syncNativeServerConfig = syncNativeServerConfig;
}
