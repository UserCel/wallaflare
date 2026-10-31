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
        │ • /api/entries/digest.epub  │                               │ • Batch Anthology EPUB      │
        │ • /opds (OPDS 1.2 Catalog)  │                               │ • Mobile Slide Drawer (1:1) │
        │ • /feed (RSS 2.0 / Atom)    │                               │ • On-Device EPUB / PDF / MD │
        │ • /api/annotations (W3C+v2) │                               │ • Multi-color Annotations   │
        │ • /api/tokens (Zero-Trust)  │                               │ • Personal Access Tokens UI │
        │ • /api/tags & batch routes  │                               │ • 4 Themes (Dark,Light,OLED)│
        │ • Readability Extractor     │                               │ • RSVP Speed Reader (BiDi)  │
        │ • Rate limiting & Security  │                               └──────────────┬──────────────┘
        └──────────────┬──────────────┘                               └──────────────┬──────────────┘
                       │                                                             │
        ┌──────────────▼──────────────┐                               ┌──────────────▼──────────────┐
        │    Cloudflare D1 (SQLite)   │                               │  Native Capacitor Android   │
        ├─────────────────────────────┤                               ├─────────────────────────────┤
        │ • entries & annotations     │                               │ • WallaflareNativePlugin    │
        │ • tags & entry_tags         │                               │ • Android Share Intents     │
        │ • api_tokens & site_cookies │                               │ • Zero-Request OTA Updates  │
        │ • config & migrations       │                               └─────────────────────────────┘
        └─────────────────────────────┘
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
├── docs/                      # Technical documentation & architecture guides
│   └── ARCHITECTURE.md        # Comprehensive architecture of web client, sync & reader engines
├── scripts/                   # Build, bundling, and test utility scripts
│   ├── build-web.ts           # Bundles web client, inlines deps, computes OTA hash
│   ├── bundle-html.ts         # Assembles modular HTML source tree into dashboard-html.ts
│   ├── bundle-client.ts       # Bundles client JS & CSS into dashboard-bundle.ts
│   └── bundle-epub-client.ts  # Bundles browser EPUB engine & fflate zipper
├── src/
│   ├── client/                # Isomorphic Web UI Source Tree
│   │   ├── html/              # Modular HTML component templates (workspace, modals, overlays)
│   │   ├── styles/            # index.css — single source of truth for all client CSS (bundled by bundle-client.ts)
│   │   ├── reader/            # In-reader engines (RSVP Speed Reader, ORP, BiDi, gesture scrubbing)
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

### 4. Dual Wrangler Configuration & Local Secrets (.dev.vars)
- **`wrangler.toml` (Public Template)**: Tracked in git with sanitized placeholders (`database_id = "default"`). Used by Cloudflare's 1-Click Deploy button, CI, and new contributors.
- **`wrangler.personal.toml` (Local Instance)**: Ignored by git. Holds personal account IDs, production D1 database IDs, and custom domain routes (`routes = [...]`).
- **Auto-Detection**: `npm run dev`, `npm run deploy`, and `npm run db:migrate:remote` automatically check for `wrangler.personal.toml` and pass `--config wrangler.personal.toml` if present.
- **`.dev.vars` (Local Auth Secrets)**: In local development, if `AUTH_TOKEN` is not defined in `.dev.vars`, Wallaflare runs in **open development mode** (authentication middleware and session validation are bypassed, allowing friction-free local iteration). `.dev.vars` is only needed locally when actively testing password gating, token verification, or rate-limiting.

### 5. KOReader Local Integration Testing
Run an isolated, native KOReader desktop instance on Linux to test live sync, annotations, and UI interactions against your local dev server:
```bash
# 1. Start local worker (terminal 1)
npm run dev

# 2. Launch KOReader with wallaflare.koplugin pre-linked (terminal 2)
npm run koreader

# Or reset test profile & cached articles:
npm run koreader:reset

# Or run automated end-to-end sync audit against dev server:
npm run test:sync-audit
```
*Note: Point KOReader's Server URL to `http://127.0.0.1:8787`. Uses `scratch/koreader/` with an isolated `KO_HOME` so your personal system KOReader config is never modified.*

### 6. Automated GitHub Releases & Multi-Component Packaging
Wallaflare uses an automated GitHub Actions release workflow (`.github/workflows/release.yml`) triggered on any Git tag push (`v*.*.*`) or via manual dispatch:
- **Independent Component Versioning**: Release assets retain their specific versions while ensuring the Android APK always bakes in the latest web bundle:
  - 🌐 **Web Dashboard & Edge Worker**: Root release tag / `package.json` (`vX.Y.Z`).
  - 📱 **Android Native App**: `android/app/build.gradle` (`versionName`), packaged as `wallaflare-android-v<android>-web-v<web>-<sha>.apk` (~2.5 MB with R8 & `shrinkResources true`).
  - 📖 **KOReader Plugin**: `integrations/koreader/wallaflare.koplugin/_meta.lua` (`version`), packaged as `wallaflare-koplugin-v<plugin>.zip`.
  - Static aliases: `wallaflare.apk` and `wallaflare.koplugin.zip` for permanent latest-download URLs.
- **Local Packaging Verification**: Run `npm run package:release` to test-package all release assets locally into `release-assets/` (gitignored) before tagging.
- **Publishing a Release**: Create and push a SemVer tag (e.g. `git tag v1.1.0 && git push origin v1.1.0`). CI will build the web app, compile the release APK, package the KOReader zip, and publish the GitHub Release automatically.



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
   - Personal deployment configurations (custom domain routes, real database IDs, account IDs) must reside strictly in `wrangler.personal.toml` (gitignored), never in the public `wrangler.toml`. Local auth passwords belong in `.dev.vars` (gitignored), never committed.
8. **Rule 8: BiDi Script & Touch Gesture Robustness**:
   - In interactive reading components (e.g. RSVP speed reader, surrounding text strips, annotations):
     - For RTL/BiDi scripts (Hebrew, Arabic), always isolate segments with `unicode-bidi: isolate` and wrap trailing neutral punctuation in Unicode Right-to-Left Marks (`\u200F`) to prevent punctuation from jumping inside words.
     - For continuous drag/scrub gestures across dynamic DOM containers, always use W3C Pointer Events (`pointerdown`, `pointermove`, `pointerup`) with `setPointerCapture(e.pointerId)` so that rapid DOM element mutations or re-renders do not abort the touch gesture on mobile browsers.
9. **Rule 9: Zero-Trust Token Architecture & Endpoint Isolation**:
   - The master password (`AUTH_TOKEN`) must **only** be accepted at initial authentication and token issuance endpoints (`POST /api/auth/token`, `POST /oauth/v2/token`, `/login_check`, `/developer` unlock, and admin wipe).
   - All standard data endpoints (`/api/entries`, `/api/sync`, `/api/tokens`, `/api/annotations`, etc.) strictly require valid issued tokens from the `api_tokens` table (or session cookies that map to active tokens). Never accept master passwords directly on protected data routes.
10. **Rule 10: Wallabag Client Scraper Handshake & Developer Page Regex**:
   - Automated client scrapers (such as the official Wallabag Android app `fr.gaulupeau.apps.InThePoche` and Wallabagger) do not use JSON for client creation; they parse and regex-match `/developer` HTML directly.
   - For app User-Agents (`okhttp`, `InThePoche`, `wallabag`), always serve the minimal, pure Wallabag developer template without extra DOM wrappers, scripts, or duplicate `class="collapsible"` lists that break scraper regexes.
   - Ensure the collapsible client items retain the exact paragraph order (`client_id`, `client_secret`, `redirect_uri`, `grant_types`) and the trailing `<a href="/developer/client/delete/:id">Delete</a>` anchor required by `WallabagWebService.java`.
   - On `POST /oauth/v2/token` password grant, automatically prune short-lived ephemeral probe tokens from the same client label created during the connection test phase (< 2 minutes) to prevent duplicate orphaned tokens.

---

## 📚 Related Documentation

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Comprehensive technical architecture of the 3-pane dashboard, sync, and reader engines.
- [README.md](README.md) — Public documentation, features, and setup instructions.
