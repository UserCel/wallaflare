# 🤖 AGENTS.md — Wallaflare Developer & Agent Guide

> **Welcome, AI Agent!** This document serves as the single source of truth for understanding the architecture, design principles, conventions, workflows, and strict guidelines when developing on the **Wallaflare** codebase.

---

## 🧭 Project Mission & Overview

**Wallaflare** is an ultra-lightweight, zero-cost, serverless Read-it-Later and Wallabag v2 API replacement. It is engineered specifically for:
- **Cloudflare Workers** (Edge runtime, sub-millisecond cold starts)
- **Cloudflare D1** (Serverless SQLite database)
- **E-ink Readers & Third-Party Clients** (KOReader, Wallabag Android App, browser extensions)
- **Native Android Smartphone App** (Capacitor + Over-The-Air web bundle updates)

---

## 🏛️ System Architecture

```
                               ┌───────────────────────────────────────────────┐
                               │             Wallaflare System                 │
                               └──────────────────────┬────────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │                                                             │
        ┌──────────────▼──────────────┐                               ┌──────────────▼──────────────┐
        │   Edge Worker & REST API    │                               │     Isomorphic Frontend     │
        │   (Hono + Cloudflare D1)    │                               │     (Vanilla JS + CSS)      │
        ├─────────────────────────────┤                               ├─────────────────────────────┤
        │ • /api/sync (Unified Sync)  │                               │ • 3-Pane Workspace Desktop  │
        │ • /api/entries (Wallabag v2)│                               │ • Infinite Scroll & Sorting │
        │ • /opds (OPDS 1.2 Catalog)  │
        │ • /feed (RSS 2.0 / Atom)    │\n        │ • /api/annotations (W3C+v2) │                               │ • Mobile Slide Drawer (1:1) │
        │ • /api/tags & batch routes  │                               │ • On-Device EPUB / PDF / MD │
        │ • Readability Extractor     │                               │ • Multi-color Annotations   │
        │ • Rate limiting & Security  │                               │ • 4 Themes (Dark,Light,OLED)│
        └──────────────┬──────────────┘                               └──────────────┬──────────────┘
                       │                                                             │
        ┌──────────────▼──────────────┐                               ┌──────────────▼──────────────┐
        │    Cloudflare D1 (SQLite)   │                               │  Native Capacitor Android   │
        ├─────────────────────────────┤                               ├─────────────────────────────┤
        │ • entries & annotations     │                               │ • WallaflareNativePlugin    │
        │ • tags & entry_tags         │                               │ • Android Share Intents     │
        │ • config & migrations       │                               │ • Zero-Request OTA Updates  │
        └─────────────────────────────┘                               └─────────────────────────────┘
```

---

## 📁 Codebase Directory Structure

```
.
├── integrations/             # Native e-reader & client integrations
│   └── koreader/              # Official KOReader Lua plugin (delta sync, auto-prune)
├── android/                   # Native Android Studio Capacitor project
│   └── app/src/main/java/com/idodos/wallaflare/
│       ├── MainActivity.java           # Android activity & native plugin registration
│       └── WallaflareNativePlugin.java # Native Android Share sheet & config bridge
├── docs/                      # Technical documentation & refactor roadmaps
│   └── DASHBOARD_REFACTOR.md  # Detailed architecture of the 3-pane dashboard refactor
├── scripts/                   # Build, bundling, and test utility scripts
│   ├── build-web.ts           # Bundles web client, inlines deps, computes OTA hash
│   ├── bundle-html.ts         # Assembles modular HTML source tree into dashboard-html.ts
│   ├── bundle-client.ts       # Bundles client JS & CSS into dashboard-bundle.ts
│   └── bundle-epub-client.ts  # Bundles browser EPUB engine & fflate zipper
├── src/
│   ├── client/                # Isomorphic Web UI Source Tree
│   │   ├── html/              # Modular HTML component templates (workspace, modals, overlays)
│   │   ├── styles/            # Modular CSS design system
│   │   └── index.ts           # Client JavaScript application entry point
│   ├── index.ts               # Cloudflare Worker entry point (Hono application)
│   ├── routes/
│   │   ├── api.ts
│   │   ├── feed.ts            # RSS 2.0 / Atom syndication feeds (Unread, Starred, Archive, Tags)             # Wallabag v2 REST API + Wallaflare extended batch endpoints
│   │   ├── opds.ts            # OPDS 1.2 catalog navigation, acquisition feeds & EPUB delivery
│   │   └── web.ts             # Web UI routes, PWA manifest, export downloads
│   ├── services/
│   │   ├── db.ts
│   │   ├── feed.ts            # RSS 2.0 XML and CDATA generator              # D1 Database schema, auto-migrations, and SQL queries
│   │   ├── opds.ts            # OPDS 1.2 Atom XML & OpenSearch description generator
│   │   ├── epub.ts            # Isomorphic, book-grade EPUB 3 generator (strict XHTML)
│   │   ├── extractor.ts       # Linkedom readability & DOM sanitizer scraper
│   │   └── pdf.ts             # 3-section formatted PDF generator (pdf-lib)
│   ├── views/
│   │   ├── dashboard.ts       # Single-page isomorphic dashboard renderer
│   │   ├── dashboard-html.ts  # Auto-generated HTML bundle (do not edit manually, edit in src/client/html/)
│   │   ├── dashboard-bundle.ts# Auto-generated JS/CSS bundle (do not edit manually, edit in src/client/)
│   │   ├── epub-client-bundle.ts # Auto-generated client bundle for EPUB + fflate
│   │   └── ota-bundle.ts      # Auto-generated OTA zip payload for native Android app
│   └── __tests__/             # Vitest test suite (API, Dashboard syntax, EPUB, PDF, Scraper)
├── wrangler.toml              # Cloudflare Workers configuration (D1 bindings, custom domain)
└── capacitor.config.json      # Capacitor Android configuration
```

---

## ⚡ Key Development Workflows & Commands

### 1. Build Web Assets
Always run before testing or deploying to generate `ota-bundle.ts` and `epub-client-bundle.ts`:
```bash
npm run build:web
```

### 2. Run Test Suite
Vitest runs unit and integration tests across all engines:
```bash
npm test
```

### 3. Deploy to Production
Builds web bundle and deploys the worker to Cloudflare:
```bash
npm run deploy
```
> **Production Target**: `https://<your-instance>.workers.dev` (or your configured custom domain)



---

## 🚨 Critical Agent Guidelines & Rules

1. **Rule 1: Git Commit & Push Authorization**:
   - **NEVER** run `git commit` or `git push` unless the user explicitly instructs you to do so in the prompt.
2. **Rule 2: Project-Scoped Files & Workspace Boundary**:
   - Always write migrations, scripts, artifacts, and scratch files strictly inside the project root directory. Never write outside the workspace repository boundary (e.g. system `/tmp`, `/var`, or external user dirs) to prevent sandbox permission errors and maintain isolation.
3. **Rule 3: Test Verification**:
   - Before completing any task involving code changes, verify with `npm run build:web && npm test` to ensure zero compilation or syntax errors.
4. **Rule 4: Client-Side Template Escaping**:
   - `src/views/dashboard.ts` embeds client-side scripts inside TypeScript template literals (`` `...` ``). Always double-escape backslashes when writing literal newlines (e.g. `'\\n'`) to prevent unexpected token syntax errors in the browser.
5. **Rule 5: Capacitor Native App Considerations**:
   - The app runs both in standard browsers and inside a native Android Capacitor container (`isCapacitorApp()`). Always preserve native features (e.g. `WallaflareNativePlugin` share intent, status bar notch clearance `#readerSafeTopFill`, and haptics).
6. **Rule 6: Native Android APK Version Bumping & In-App Notification**:
   - Whenever introducing changes to native Android code (e.g. in `android/`, `MainActivity.java`, `WallaflareNativePlugin.java`, `SaveArticleService.java`, native bridge interfaces, AndroidManifest, or background services):
     1. Bump `versionCode` and `versionName` in `android/app/build.gradle`.
     2. Bump `minNativeVersion` in `scripts/build-web.ts`.
     3. Ensure the web client detects older installed APK builds via `min_native_version` in `/api/app/version.json` and displays an in-app toast/banner notifying the user that a new APK build is available for the latest native features.
7. **Rule 7: Strict Privacy & Personal Instance Scrubbing**:
   - **NEVER** hardcode, embed, or commit personal domains, personal URLs, private server instances (e.g. private domains or custom personal URLs), API keys, or private user credentials anywhere in the codebase, tests, UI placeholders, scripts, documentation, or commit history. Always use generic placeholders like `wallaflare.example.com` or `https://<your-subdomain>.workers.dev`.

---

## 📚 Related Documentation

- [DASHBOARD_REFACTOR.md](docs/DASHBOARD_REFACTOR.md) — Comprehensive design guide for the 3-pane dashboard workspace.
- [README.md](README.md) — Public documentation, features, and setup instructions.
