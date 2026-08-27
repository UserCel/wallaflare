import { state } from "../state";
import { ThemeType, ReaderFontType } from "../types";
import {
  setStoredTheme,
  setStoredReaderFont,
  setStoredReaderFontSize,
  setStoredReaderLineHeight,
  setStoredReaderContentWidth
} from "../storage/preferences";

export function setReaderFontFamily(font: ReaderFontType, persist: boolean = true): void {
  state.readerFont = font;
  let family = "var(--font-reader-serif)";
  if (font === "sans") family = "var(--font-reader-sans)";
  else if (font === "mono") family = "var(--font-reader-mono)";
  else if (font === "dyslexic") family = "var(--font-reader-dyslexic)";

  document.documentElement.style.setProperty("--reader-font-family", family);
  if (persist) setStoredReaderFont(font);

  document.querySelectorAll("#popoverFontFamilyBtns .opt-font-btn, #settingsFontBtns .opt-font-btn").forEach((btn) => {
    if (btn.getAttribute("data-font") === font) {
      btn.classList.add("active", "btn-primary");
      btn.classList.remove("btn-outline");
    } else {
      btn.classList.remove("active", "btn-primary");
      btn.classList.add("btn-outline");
    }
  });
}

export function setReaderFontSize(size: number, persist: boolean = true): void {
  state.readerFontSize = size;
  document.documentElement.style.setProperty("--reader-font-size", `${size}px`);
  if (persist) setStoredReaderFontSize(size);

  const valEl = document.getElementById("popoverFontSizeVal");
  if (valEl) valEl.textContent = `${size}px`;
  const setValEl = document.getElementById("settingsFontSizeVal");
  if (setValEl) setValEl.textContent = `${size}px`;
}

export function adjustReaderFontSize(delta: number): void {
  const newSize = Math.max(12, Math.min(36, state.readerFontSize + delta));
  setReaderFontSize(newSize, true);
}

export function setReaderLineHeight(lh: string, persist: boolean = true): void {
  state.readerLineHeight = lh;
  document.documentElement.style.setProperty("--reader-line-height", lh);
  if (persist) setStoredReaderLineHeight(lh);

  document.querySelectorAll("#popoverLineHeightBtns .opt-btn, #settingsLineHeightBtns .opt-btn").forEach((btn) => {
    if (btn.getAttribute("data-lh") === lh) {
      btn.classList.add("active", "btn-primary");
      btn.classList.remove("btn-outline");
    } else {
      btn.classList.remove("active", "btn-primary");
      btn.classList.add("btn-outline");
    }
  });
}

export function setReaderContentWidth(width: string, persist: boolean = true): void {
  state.readerContentWidth = width;
  document.documentElement.style.setProperty("--reader-content-max-width", width);
  if (persist) setStoredReaderContentWidth(width);

  document.querySelectorAll("#popoverWidthBtns .opt-btn, #settingsWidthBtns .opt-btn").forEach((btn) => {
    if (btn.getAttribute("data-width") === width) {
      btn.classList.add("active", "btn-primary");
      btn.classList.remove("btn-outline");
    } else {
      btn.classList.remove("active", "btn-primary");
      btn.classList.add("btn-outline");
    }
  });
}

export function setTheme(theme: ThemeType, persist: boolean = true): void {
  state.activeTheme = theme;
  document.documentElement.classList.remove("dark", "light", "sepia", "oled");
  document.documentElement.classList.add(theme);
  if (persist) setStoredTheme(theme);

  document.querySelectorAll(".theme-picker-btn, .popover-theme-btn, .settings-theme-btn").forEach((btn) => {
    if (btn.getAttribute("data-theme") === theme) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Also handle status bar color if running in Capacitor
  // @ts-ignore
  if (window.setReaderStatusBar) {
    // @ts-ignore
    window.setReaderStatusBar();
  }
}

export function toggleTheme(): void {
  const current = state.activeTheme;
  const order: ThemeType[] = ["dark", "light", "sepia", "oled"];
  const nextIdx = (order.indexOf(current) + 1) % order.length;
  setTheme(order[nextIdx], true);
}

export function toggleReaderAppearancePopover(event?: Event): void {
  if (event) event.stopPropagation();
  const popover = document.getElementById("readerAppearancePopover");
  if (popover) {
    popover.classList.toggle("open");
  }
}

export function closeReaderAppearancePopover(): void {
  const popover = document.getElementById("readerAppearancePopover");
  if (popover) popover.classList.remove("open");
}

export function toggleReaderFocusMode(): void {
  state.isFocusMode = !state.isFocusMode;
  const appWorkspace = document.querySelector(".app-workspace");
  const readerPane = document.getElementById("paneReader");
  if (state.isFocusMode) {
    appWorkspace?.classList.add("focus-mode");
    readerPane?.classList.add("focus-mode");
  } else {
    appWorkspace?.classList.remove("focus-mode");
    readerPane?.classList.remove("focus-mode");
  }
}

export function initAppearanceSettings(): void {
  setReaderFontFamily(state.readerFont, false);
  setReaderFontSize(state.readerFontSize, false);
  setReaderLineHeight(state.readerLineHeight, false);
  setReaderContentWidth(state.readerContentWidth, false);
  setTheme(state.activeTheme, false);
}
