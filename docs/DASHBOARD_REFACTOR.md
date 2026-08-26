# 🎨 Wallaflare Dashboard Refactor & Architecture Guide

> **Document Status**: Active Refactor Documentation & Handover  
> **Last Updated**: August 26, 2026  
> **Primary Component**: `src/views/dashboard.ts`

---

## 🎯 Background & Motivation

The original Wallaflare dashboard utilized a single-column layout that toggled between the article feed and the reader view. While functional, it lacked the ergonomic productivity of modern desktop reading applications (such as Readwise Reader, Instapaper, or Apple Books) and required separate navigation layers on mobile.

The **Dashboard Redesign & 3-Pane Workspace Refactor** transforms Wallaflare into a unified, responsive 3-pane workstation that fluidly adapts between:
1. **Desktop & Large Tablets (`>= 1024px`)**: Side-by-side 3-pane workflow (Navigation Sidebar | Articles Column | Active Reader).
2. **Mobile & Small Tablets (`< 1024px`)**: Adaptive single-pane view with gesture-tracked slide-out navigation drawer and swipe back.

---

## 📐 The 3-Pane Architecture

```
┌─────────────────┬──────────────────────────┬────────────────────────────────────────────┐
│  Pane 1:        │  Pane 2:                 │  Pane 3:                                   │
│  Sidebar        │  Articles Column         │  Reader Pane                               │
│  (220px fixed)  │  (380px fixed / flex)    │  (flex: 1 dynamic)                         │
├─────────────────┼──────────────────────────┼────────────────────────────────────────────┤
│ • App Brand     │ • Unified Header (54px)  │ • Overlay Header (54px matching)           │
│ • Nav Filter:   │   - Search Bar (realtime)│   - Close Button (Esc)                     │
│   - Unread (n)  │   - Sort Menu (5 modes)  │   - Star / Archive / Tag / Highlights / Web│
│   - Starred (n) │   - View Switcher (3x)   │   - Typography Popover (`Aa`)              │
│   - Archive (n) │   - Batch Actions Bar    │   - Focus Mode Toggle (`f`)                │
│ • Dynamic Tags  │ • View Modes:            │ • Top Safe Area Fill (`#readerSafeTopFill`)│
│   - Expandable  │   - List (1:1 cover)     │ • Interactive Reader Body:                 │
│   - Tag Manager │   - Magazine Grid (hero) │   - Resilient W3C Highlights Engine        │
│ • Theme Bar:    │   - Compact Headlines    │   - Floating Color Palette Bar             │
│   - 4 Swatches  │ • Multi-Selection Mode:  │ • Live Typography Controls:                │
│ • Settings (⚙️) │   - Long press / Ctrl-tap│   - Font (Sans, Serif, Mono)               │
│   - Modals Hub  │   - Bulk ZIP Export      │   - Size, Line-Height, Content-Width       │
│                 │   - Batch Tag Editor     │   - 4-Theme Selector (Dark, Light, etc.)   │
└─────────────────┴──────────────────────────┴────────────────────────────────────────────┘
```

---

## 🚀 Key Implemented Features & Technical Details

### 1. Unified 3-Pane Desktop Layout
- **Equalized Top Bar Alignment**: Both the `.pane-articles-toolbar` and `.reader-top-bar` share the exact same height (`54px + var(--app-safe-top)`), aligning perfectly across the screen.
- **Top Hover Trigger (`.reader-top-hover-trigger`)**: Moving the mouse to the top 65px of the reader pane on desktop instantly reveals the reader toolbar if hidden.
- **Focus / Zen Mode (`f`)**: Collapses Sidebar and Articles Column to provide a 100vw distraction-free reading canvas.

### 2. Mobile Navigation & Native App Integration
- **1:1 Physics Drawer (`setupMobileDrawerSwipeTracking`)**: Touch-drag gesture tracking allows the user to slide the sidebar open and closed with zero jank.
- **Notch & Status Bar Clearance**: `#readerSafeTopFill` is scoped to native Capacitor (`html.is-capacitor-app`) to prevent camera punch-hole overlaps without adding unwanted white space on mobile web browsers.
- **Native Android Share Sheet**: Integrated `WallaflareNativePlugin.java` via `@PluginMethod public void shareFile` to deliver seamless native share sheets for EPUB, Markdown, PDF, and ZIP archives.

### 3. Multi-Selection & Bulk Operations
- **Context-Aware Action Menu**:
  - **1 Article Selected**: Displays single-item operations (Highlights & Notes, Open Original Link, Edit Title, single PDF).
  - **2+ Articles Selected**: Automatically hides single-item options and exposes **Bulk ZIP Exports** (*Export All as ZIP (EPUBs)*, *Export All as ZIP (Markdown)*, and *Export All as JSON*).
- **Batch Tag Editor**: Tapping `Edit Tags` or the tag icon in multi-selection mode applies or removes tags across all selected articles simultaneously.
- **Click-Outside Deselection**: Clicking outside active cards automatically dismisses selection mode.

### 4. Visual 4-Theme Swatch System & Unified Settings Modal
- **Theme Palettes**:
  - `Dark`: Slate dark `#0f172a` with `#38bdf8` highlights
  - `Light`: Crisp white `#ffffff` with `#f97316` accents
  - `Sepia`: Warm bookish `#f4ecd8` with `#d97706` accents
  - `OLED`: Absolute true pitch black `#000000` for battery preservation on AMOLED screens
- **Quick Swatch Bar**: 4 circular theme swatch buttons at the bottom of the sidebar and mobile drawer.
- **Settings Modal (`#settingsModal`)**: Groups all configuration options:
  - 🎨 **Theme & Appearance**: Swatches and default font family.
  - ⚡ **Sync & Integrations**: KOReader setup and Server connection credentials.
  - 🛠️ **Tools & Content**: Tag Manager and Add Custom Text modal.
  - ℹ️ **Session & About**: Version info and Logout.

---

## 🧪 Testing & Verification

All dashboard functionality is covered by the automated Vitest suite:
- **`src/__tests__/dashboard.test.ts`**: Verifies HTML structure, inline script syntax compilation, typography popover controls, highlights navigator, and markdown export engine.
- **`src/__tests__/api.test.ts`**: Verifies REST endpoints, batch tagging, and mass delete/star/archive.
- **`src/__tests__/epub.test.ts`**: Verifies EPUB 3 strict XHTML validation and fflate zip archive packaging.
- **`src/__tests__/pdf.test.ts`**: Verifies PDF page rendering and metadata generation.
- **`src/__tests__/extractor.test.ts`**: Verifies readability and article scraping.

---

## 🔮 Roadmap & Future Considerations for Agents

1. **Batch Highlights Digest Export**: Enable exporting all quotes and notes across multiple selected articles into a unified Markdown digest.
2. **Keyboard Navigation Shortcuts**: Add shortcuts (`j`/`k` for next/prev article, `e` for archive, `s` for star) in the middle article column.
3. **Offline Sync Queue Status**: Visual sync badge indicator displaying queued local mutations waiting for network reconnection.
