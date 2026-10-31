import { isCapacitorApp } from "../sync/api";

export let readerFont: string = "serif";
export let readerFontSize: number = 18;
export let readerLineHeight: string = "1.75";
export let readerContentWidth: string = "740px";
export let readerTextAlignment: string = "left";
export let activeTheme: string = "dark";

export function initTypographyControls(): void {
  readerFont = localStorage.getItem("wf_reader_font") || "serif";
  readerFontSize = parseInt(localStorage.getItem("wf_reader_font_size") || "18", 10);
  readerLineHeight = localStorage.getItem("wf_reader_line_height") || "1.75";
  readerContentWidth = localStorage.getItem("wf_reader_content_width") || "740px";
  readerTextAlignment = localStorage.getItem("wf_reader_alignment") || "left";
  activeTheme = localStorage.getItem("wf_theme") || "dark";

  setReaderFontFamily(readerFont, false);
  setReaderFontSize(readerFontSize, false);
  setReaderLineHeight(readerLineHeight, false);
  setReaderContentWidth(readerContentWidth, false);
  setReaderTextAlignment(readerTextAlignment, false);
  setTheme(activeTheme, false);
}

export function setReaderFontFamily(font: string, persist: boolean = true): void {
  readerFont = font;
  let family = "var(--font-reader-serif)";
  if (font === "sans") family = "var(--font-reader-sans)";
  else if (font === "mono") family = "var(--font-reader-mono)";
  else if (font === "dyslexic") family = "var(--font-reader-dyslexic)";

  document.documentElement.style.setProperty("--reader-font-family", family);
  if (persist) localStorage.setItem("wf_reader_font", font);

  document.querySelectorAll("#popoverFontFamilyBtns .opt-font-btn, #settingsFontBtns .opt-font-btn").forEach(btn => {
    if (btn.getAttribute("data-font") === font) {
      btn.classList.add("active", "btn-primary");
      btn.classList.remove("btn-outline");
    } else {
      btn.classList.remove("active", "btn-primary");
      btn.classList.add("btn-outline");
    }
  });
}

export const setReaderFont = setReaderFontFamily;

export function setReaderFontSize(px: number, persist: boolean = true): void {
  px = Math.max(12, Math.min(32, px));
  readerFontSize = px;
  document.documentElement.style.setProperty("--reader-font-size", px + "px");
  const display = document.getElementById("fontSizeDisplay");
  const range = document.getElementById("fontSizeRange") as HTMLInputElement | null;
  if (display) display.textContent = px + "px";
  if (range) range.value = String(px);
  if (persist) localStorage.setItem("wf_reader_font_size", String(px));
}

export function adjustReaderFontSize(delta: number): void {
  setReaderFontSize(readerFontSize + delta * 2, true);
}

export function setReaderLineHeight(lh: string | number, persist: boolean = true): void {
  readerLineHeight = String(lh);
  document.documentElement.style.setProperty("--reader-line-height", String(lh));
  if (persist) localStorage.setItem("wf_reader_line_height", String(lh));

  document.querySelectorAll("#popoverLineHeightBtns .opt-lh-btn").forEach(btn => {
    if (btn.getAttribute("data-lh") === String(lh)) {
      btn.classList.add("active", "btn-primary");
      btn.classList.remove("btn-outline");
    } else {
      btn.classList.remove("active", "btn-primary");
      btn.classList.add("btn-outline");
    }
  });
}

export function setReaderContentWidth(width: string, persist: boolean = true): void {
  if (width === "100%") width = "1060px";
  readerContentWidth = width;
  document.documentElement.style.setProperty("--reader-content-max-width", width);
  
  let padX = "0.85rem";
  let mobilePadX = "0.55rem";
  if (width === "620px") {
    padX = "2.5rem";
    mobilePadX = "2.25rem";
  } else if (width === "740px") {
    padX = "1.5rem";
    mobilePadX = "1.1rem";
  } else if (width === "880px") {
    padX = "0.85rem";
    mobilePadX = "0.55rem";
  } else if (width === "1060px") {
    padX = "0.2rem";
    mobilePadX = "0.2rem";
  }
  document.documentElement.style.setProperty("--reader-padding-x", padX);
  document.documentElement.style.setProperty("--reader-mobile-padding-x", mobilePadX);

  if (persist) localStorage.setItem("wf_reader_content_width", width);

  document.querySelectorAll("#popoverContentWidthBtns .opt-width-btn").forEach(btn => {
    if (btn.getAttribute("data-width") === width) {
      btn.classList.add("active", "btn-primary");
      btn.classList.remove("btn-outline");
    } else {
      btn.classList.remove("active", "btn-primary");
      btn.classList.add("btn-outline");
    }
  });
}

export function setReaderTextAlignment(align: string, persist: boolean = true): void {
  readerTextAlignment = align;
  const textAlign = align === "justify" ? "justify" : "start";
  const hyphens = align === "justify" ? "auto" : "manual";
  document.documentElement.style.setProperty("--reader-text-align", textAlign);
  document.documentElement.style.setProperty("--reader-hyphens", hyphens);
  if (persist) localStorage.setItem("wf_reader_alignment", align);

  document.querySelectorAll("#popoverAlignmentBtns .opt-align-btn").forEach(btn => {
    if (btn.getAttribute("data-align") === align) {
      btn.classList.add("active", "btn-primary");
      btn.classList.remove("btn-outline");
    } else {
      btn.classList.remove("active", "btn-primary");
      btn.classList.add("btn-outline");
    }
  });
}

export function setTheme(theme: string, persist: boolean = true): void {
  activeTheme = theme;
  const themes = ["dark", "light", "sepia", "oled"];
  themes.forEach(t => document.documentElement.classList.remove(t));
  document.documentElement.classList.add(theme);
  if (isCapacitorApp()) {
    document.documentElement.classList.add("is-capacitor-app");
  }
  if (persist) localStorage.setItem("wf_theme", theme);

  document.querySelectorAll("#popoverThemeBtns .opt-theme-btn, #settingsModal .opt-theme-btn").forEach(btn => {
    if (btn.getAttribute("data-theme") === theme) {
      btn.classList.add("active", "btn-primary");
      btn.classList.remove("btn-outline");
    } else {
      btn.classList.remove("active", "btn-primary");
      btn.classList.add("btn-outline");
    }
  });

  document.querySelectorAll(".sidebar-theme-picker .theme-swatch-btn").forEach(btn => {
    const isActive = btn.getAttribute("data-theme") === theme;
    btn.classList.toggle("active", isActive);
  });

  const w = typeof window !== "undefined" ? (window as any) : {};
  if (typeof w.setReaderStatusBar === "function") {
    w.setReaderStatusBar();
  }
}

export function toggleTheme(): void {
  const themes = ["dark", "light", "sepia", "oled"];
  const idx = themes.indexOf(activeTheme);
  const nextTheme = themes[(idx + 1) % themes.length];
  setTheme(nextTheme);
}

export function toggleReaderAppearancePopover(e?: Event): void {
  if (e) e.stopPropagation();
  const popover = document.getElementById("readerAppearancePopover");
  if (!popover) return;
  const isOpen = popover.style.display !== "none" && popover.style.display !== "";
  if (isOpen) {
    popover.style.display = "none";
  } else {
    const w = typeof window !== "undefined" ? (window as any) : {};
    if (typeof w.closeAllCardMenus === "function") w.closeAllCardMenus();
    if (typeof w.closeReaderMoreMenu === "function") w.closeReaderMoreMenu();
    popover.style.display = "flex";
  }
}

export function closeReaderAppearancePopover(): void {
  const popover = document.getElementById("readerAppearancePopover");
  if (popover) popover.style.display = "none";
}

// Attach to window for global access & HTML inline event handlers
if (typeof window !== "undefined") {
  const w = window as any;
  w.setReaderFont = setReaderFont;
  w.setReaderFontFamily = setReaderFontFamily;
  w.setReaderFontSize = setReaderFontSize;
  w.adjustReaderFontSize = adjustReaderFontSize;
  w.setReaderLineHeight = setReaderLineHeight;
  w.setReaderContentWidth = setReaderContentWidth;
  w.setReaderTextAlignment = setReaderTextAlignment;
  w.setTheme = setTheme;
  w.toggleTheme = toggleTheme;
  w.toggleReaderAppearancePopover = toggleReaderAppearancePopover;
  w.closeReaderAppearancePopover = closeReaderAppearancePopover;
  w.initTypographyControls = initTypographyControls;
}
