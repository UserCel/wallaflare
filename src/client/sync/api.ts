import { PREF_KEYS } from "../storage/preferences";

export function isCapacitorApp(): boolean {
  return typeof (window as any).Capacitor !== "undefined" || !!(window as any).IS_CAPACITOR_APP || (typeof document !== "undefined" && document.documentElement.classList.contains("is-capacitor-app"));
}

export function getEffectiveServerUrl(): string {
  const custom = localStorage.getItem(PREF_KEYS.SERVER_URL);
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location && window.location.origin && window.location.origin !== "null") {
    return window.location.origin;
  }
  return "";
}

export function getApiBaseUrl(): string {
  const server = getEffectiveServerUrl();
  return server ? server : "";
}

export function getAuthToken(): string {
  return localStorage.getItem(PREF_KEYS.AUTH_TOKEN) || "";
}

export function setAuthToken(token: string): void {
  if (token) localStorage.setItem(PREF_KEYS.AUTH_TOKEN, token);
  else localStorage.removeItem(PREF_KEYS.AUTH_TOKEN);
}

export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = path.startsWith("http://") || path.startsWith("https://") ? path : `${baseUrl}${path}`;

  const headers = new Headers(options.headers || {});
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (isCapacitorApp()) {
    headers.set("X-Wallaflare-Client", "Capacitor-Android");
  }

  const finalOptions: RequestInit = {
    ...options,
    headers
  };

  return fetch(fullUrl, finalOptions);
}

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
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
  const data = isJson ? ((await res.json().catch(() => null)) as T | undefined) : undefined;
  return { ok: res.ok, status: res.status, data };
}

export const apiPost = <T = any>(path: string, body?: any) => apiJson<T>(path, "POST", body);
export const apiPatch = <T = any>(path: string, body?: any) => apiJson<T>(path, "PATCH", body);
export const apiDelete = <T = any>(path: string, body?: any) => apiJson<T>(path, "DELETE", body);
