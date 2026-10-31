import { ThemeType, ReaderFontType } from "../types";

export const PREF_KEYS = {
  THEME: "wf_theme",
  FONT: "wf_reader_font",
  FONT_SIZE: "wf_reader_font_size",
  LINE_HEIGHT: "wf_reader_line_height",
  CONTENT_WIDTH: "wf_reader_content_width",
  SERVER_URL: "wf_server_url",
  AUTH_TOKEN: "wf_auth_token",
  VIEW_MODE: "wf_view_mode",
  SORT_ORDER: "wf_sort_order",
  SIDEBAR_TAGS_COLLAPSED: "wf_sidebar_tags_collapsed",
  INSTANCE_ID: "wf_instance_id",
  SYNC_REV: "wf_sync_rev",
  OUTBOX: "wf_pending_mutations"
};

function hasStorage(): boolean {
  return typeof localStorage !== "undefined";
}

export function getStoredTheme(): ThemeType {
  try {
    if (hasStorage()) {
      return (localStorage.getItem(PREF_KEYS.THEME) as ThemeType) || "dark";
    }
  } catch (e) {}
  return "dark";
}

export function setStoredTheme(theme: ThemeType): void {
  try {
    if (hasStorage()) {
      localStorage.setItem(PREF_KEYS.THEME, theme);
    }
  } catch (e) {}
}

export function getStoredReaderFont(): ReaderFontType {
  try {
    if (hasStorage()) {
      return (localStorage.getItem(PREF_KEYS.FONT) as ReaderFontType) || "serif";
    }
  } catch (e) {}
  return "serif";
}

export function setStoredReaderFont(font: ReaderFontType): void {
  try {
    if (hasStorage()) {
      localStorage.setItem(PREF_KEYS.FONT, font);
    }
  } catch (e) {}
}

export function getStoredReaderFontSize(): number {
  try {
    if (hasStorage()) {
      return parseInt(localStorage.getItem(PREF_KEYS.FONT_SIZE) || "18", 10);
    }
  } catch (e) {}
  return 18;
}

export function setStoredReaderFontSize(size: number): void {
  try {
    if (hasStorage()) {
      localStorage.setItem(PREF_KEYS.FONT_SIZE, String(size));
    }
  } catch (e) {}
}

export function getStoredReaderLineHeight(): string {
  try {
    if (hasStorage()) {
      return localStorage.getItem(PREF_KEYS.LINE_HEIGHT) || "1.68";
    }
  } catch (e) {}
  return "1.68";
}

export function setStoredReaderLineHeight(lh: string): void {
  try {
    if (hasStorage()) {
      localStorage.setItem(PREF_KEYS.LINE_HEIGHT, lh);
    }
  } catch (e) {}
}

export function getStoredReaderContentWidth(): string {
  try {
    if (hasStorage()) {
      return localStorage.getItem(PREF_KEYS.CONTENT_WIDTH) || "740px";
    }
  } catch (e) {}
  return "740px";
}

export function setStoredReaderContentWidth(width: string): void {
  try {
    if (hasStorage()) {
      localStorage.setItem(PREF_KEYS.CONTENT_WIDTH, width);
    }
  } catch (e) {}
}

export function getStoredViewMode(): "list" | "grid" | "compact" {
  try {
    if (hasStorage()) {
      return (localStorage.getItem(PREF_KEYS.VIEW_MODE) as any) || "list";
    }
  } catch (e) {}
  return "list";
}

export function setStoredViewMode(mode: string): void {
  try {
    if (hasStorage()) {
      localStorage.setItem(PREF_KEYS.VIEW_MODE, mode);
    }
  } catch (e) {}
}

export function getStoredSortOrder(): string {
  try {
    if (hasStorage()) {
      return localStorage.getItem(PREF_KEYS.SORT_ORDER) || "newest";
    }
  } catch (e) {}
  return "newest";
}

export function setStoredSortOrder(sort: string): void {
  try {
    if (hasStorage()) {
      localStorage.setItem(PREF_KEYS.SORT_ORDER, sort);
    }
  } catch (e) {}
}
