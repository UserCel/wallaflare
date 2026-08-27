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

export function getStoredTheme(): ThemeType {
  return (localStorage.getItem(PREF_KEYS.THEME) as ThemeType) || "dark";
}

export function setStoredTheme(theme: ThemeType): void {
  localStorage.setItem(PREF_KEYS.THEME, theme);
}

export function getStoredReaderFont(): ReaderFontType {
  return (localStorage.getItem(PREF_KEYS.FONT) as ReaderFontType) || "serif";
}

export function setStoredReaderFont(font: ReaderFontType): void {
  localStorage.setItem(PREF_KEYS.FONT, font);
}

export function getStoredReaderFontSize(): number {
  return parseInt(localStorage.getItem(PREF_KEYS.FONT_SIZE) || "18", 10);
}

export function setStoredReaderFontSize(size: number): void {
  localStorage.setItem(PREF_KEYS.FONT_SIZE, String(size));
}

export function getStoredReaderLineHeight(): string {
  return localStorage.getItem(PREF_KEYS.LINE_HEIGHT) || "1.68";
}

export function setStoredReaderLineHeight(lh: string): void {
  localStorage.setItem(PREF_KEYS.LINE_HEIGHT, lh);
}

export function getStoredReaderContentWidth(): string {
  return localStorage.getItem(PREF_KEYS.CONTENT_WIDTH) || "740px";
}

export function setStoredReaderContentWidth(width: string): void {
  localStorage.setItem(PREF_KEYS.CONTENT_WIDTH, width);
}

export function getStoredViewMode(): "list" | "grid" | "compact" {
  return (localStorage.getItem(PREF_KEYS.VIEW_MODE) as any) || "list";
}

export function setStoredViewMode(mode: string): void {
  localStorage.setItem(PREF_KEYS.VIEW_MODE, mode);
}

export function getStoredSortOrder(): string {
  return localStorage.getItem(PREF_KEYS.SORT_ORDER) || "newest";
}

export function setStoredSortOrder(sort: string): void {
  localStorage.setItem(PREF_KEYS.SORT_ORDER, sort);
}
