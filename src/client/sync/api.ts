import { state } from "../state";
import { PREF_KEYS } from "../storage/preferences";

export function isCapacitorApp(): boolean {
  if (typeof window === "undefined") return false;
  const isCapGlobal = !!(window as any).Capacitor?.isNativePlatform?.();
  const isAndroidScheme =
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "ionic:" ||
    window.location.hostname === "localhost";
  const hasAndroidBridge = typeof (window as any).AndroidBridge !== "undefined";
  return isCapGlobal || (isAndroidScheme && hasAndroidBridge);
}

export function getEffectiveServerUrl(): string {
  try {
    const saved = localStorage.getItem(PREF_KEYS.SERVER_URL);
    if (saved && saved.trim()) return saved.trim().replace(/\/+$/, "");
  } catch (e) {}

  if (typeof window !== "undefined" && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (origin !== "null" && !origin.startsWith("file:") && !origin.startsWith("capacitor:")) {
      return origin.replace(/\/+$/, "");
    }
  }
  return "";
}

export function getAuthToken(): string {
  try {
    return localStorage.getItem(PREF_KEYS.AUTH_TOKEN) || "";
  } catch (e) {
    return "";
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(PREF_KEYS.AUTH_TOKEN, token);
  } catch (e) {}
}

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const finalOptions: RequestInit = { ...options, headers };

  const baseUrl = getEffectiveServerUrl();
  const fullUrl = baseUrl ? `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}` : path;
  return fetch(fullUrl, finalOptions);
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  rawText?: string;
  error?: string;
}

export async function apiJson<T = any>(
  path: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: any
): Promise<ApiResponse<T>> {
  const options: RequestInit = { method };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  const res = await authFetch(path, options);
  const isJson = res.headers.get("content-type")?.includes("application/json");
  let data: T | undefined;
  let rawText: string | undefined;
  if (isJson) {
    data = (await res.json().catch(() => null)) as T | undefined;
  } else {
    rawText = await res.text().catch(() => undefined);
  }
  return { ok: res.ok, status: res.status, data, rawText };
}

export const apiPost = <T = any>(path: string, body?: any) => apiJson<T>(path, "POST", body);
export const apiPatch = <T = any>(path: string, body?: any) => apiJson<T>(path, "PATCH", body);
export const apiDelete = <T = any>(path: string, body?: any) => apiJson<T>(path, "DELETE", body);
