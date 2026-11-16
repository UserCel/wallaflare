export const DEFAULT_READING_WPM = 200;
export const MIN_READING_WPM = 100;
export const MAX_READING_WPM = 600;
const STORAGE_KEY = "wf_reading_wpm";

/** Clamps a WPM value to the supported [100, 600] range. */
export function clampReadingWpm(wpm: number): number {
  if (!Number.isFinite(wpm)) return DEFAULT_READING_WPM;
  return Math.min(MAX_READING_WPM, Math.max(MIN_READING_WPM, Math.round(wpm)));
}

/** Reads the user's preferred reading speed (WPM) from localStorage, defaulting to 200. */
export function getReadingWpm(): number {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) return clampReadingWpm(parsed);
      }
    }
  } catch {}
  return DEFAULT_READING_WPM;
}

/** Persists the reading speed (WPM) to localStorage and returns the clamped value. */
export function setLocalReadingWpm(wpm: number): number {
  const clamped = clampReadingWpm(wpm);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, String(clamped));
    }
  } catch {}
  return clamped;
}

/**
 * Scales a 200-WPM baseline reading_time (in minutes) to the user's configured WPM.
 */
export function scaleReadingMinutes(baseMinutes: number | null | undefined, wpm?: number): number {
  const base = Math.max(1, Number(baseMinutes) || 1);
  const speed = wpm !== undefined ? clampReadingWpm(wpm) : getReadingWpm();
  return Math.max(1, Math.round(base * (DEFAULT_READING_WPM / speed)));
}

/**
 * Updates local reading WPM from a `/api/sync` response if changed.
 * Returns true when the local value changed so callers can re-render UI.
 */
export function syncReadingWpmFromServer(serverWpm: unknown): boolean {
  if (typeof serverWpm !== "number" || !Number.isFinite(serverWpm)) return false;
  const clamped = clampReadingWpm(serverWpm);
  const current = getReadingWpm();
  if (clamped === current) return false;
  setLocalReadingWpm(clamped);
  return true;
}

/**
 * Saves the user's reading speed locally and persists it to D1 via `/api/settings`.
 */
export async function saveReadingWpmToServer(
  wpm: number,
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>
): Promise<number> {
  const clamped = setLocalReadingWpm(wpm);
  try {
    await fetchFn("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reading_wpm: clamped }),
    });
  } catch (e) {
    console.warn("[Settings] Failed to persist reading_wpm to server:", e);
  }
  return clamped;
}
