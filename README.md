# 📖 Wallaflare

> **Ultra-lightweight, zero-cost, serverless Read-it-Later & Wallabag v2 API replacement.**  
> Built for Cloudflare Workers, Cloudflare D1 (Serverless SQLite), and E-ink readers (KOReader, Kindle, Kobo, Android).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![D1 Database](https://img.shields.io/badge/Storage-Cloudflare_D1-blue)](https://developers.cloudflare.com/d1/)
[![Wallabag v2 API](https://img.shields.io/badge/API-Wallabag_v2_Compatible-green)](https://wallabag.org/)
[![KOReader](https://img.shields.io/badge/Reader-KOReader_Ready-darkgreen)](https://koreader.rocks/)

<p align="center">
  <img src="assets/screenshots/dashboard-desktop.png?raw=true&v=2" alt="Wallaflare Desktop Dashboard" width="850" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin-bottom: 20px;" />
</p>
<p align="center">
  <img src="assets/screenshots/dashboard-mobile-mockup.png?raw=true&v=2" alt="Wallaflare Mobile Smartphone App" width="380" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" />
</p>

---

## ⚠️ Compatibility & Disclaimer

> **Wallaflare is an independent, clean-room serverless reimplementation of the Wallabag v2 API.**  
> It is built from scratch specifically for Cloudflare Workers and E-ink devices (like KOReader). It is **not** affiliated with or endorsed by the official Wallabag project.
>
> While Wallaflare is engineered for high compatibility with KOReader, the official Wallabag Android app, and browser extensions, **it is its own independent system**. Future breaking changes or modifications made to the upstream Wallabag API schema or client apps may require updates or affect compatibility.

---

## ✨ Features

- **🚀 100% Serverless & Free-Tier Friendly**: Runs entirely on Cloudflare Workers and Cloudflare D1 (serverless SQLite) with sub-millisecond cold starts across 300+ global edge locations.
- **📱 Drop-in Wallabag v2 API Compatibility**:
  - Full compatibility with **KOReader's Wallabag plugin** for automated article sync and offline reading on Kindle, Kobo, Boox, and Android e-ink devices.
  - Compatible with the **Official Wallabag Android App** (connection test, OAuth token authentication, article fetching, incremental sync with `since`, and two-way deletion).
  - Works out of the box with Wallabag browser extensions and third-party clients.
- **🎛️ Unified Library Views & Sorting**:
  - **3 View Modes**: Instant 1-tap cycling between **List View** (1:1 thumbnails, author, reading time), **Magazine Grid** (hero top covers), and **Compact Headlines** (dense layout that gracefully adjusts on mobile portrait).
  - **Multiple Sort Options**: Sort your library by **Newest First**, **Oldest First**, **Shortest Read** (quick 1–3 min reads), **Longest Read** (deep dives), or **Title (A–Z)**.
  - **Zero Mobile Row Wrapping**: Integrated search controls keep filter tabs on a single line on mobile screens.
- **🏷️ Global Tag Management & Official Batch API Operations**:
  - **Standalone & Bulk Tag Operations**: Create tags directly (`POST /api/tags(.json)`), filter by tag with 1-click active filter banner, and bulk manage tags across selected articles.
  - **Standard Wallabag v2 Batch Endpoints**: Full server-side implementation of `DELETE /api/entries/list(.json)` (mass deletion), `PATCH /api/entries/list(.json)` (mass star/archive), `POST /api/entries/tags/lists(.json)` (mass tagging), and `DELETE /api/entries/tags/list(.json)` (mass tag removal).
  - **Atomic 1-Request Operations**: Multi-selection actions in the webapp execute in 1 single HTTP request with atomic D1 SQLite queries.
  - **Prominent Mobile Star Badges**: Gold star indicator pill on cards in all view modes (List, Magazine, Compact) makes favorite articles instantly recognizable on mobile.
- **📱 Native Android App with Over-The-Air (OTA) Updates**:
  - **🔄 Automated Zero-Request OTA Updates**: Powered by `@capgo/capacitor-updater`. Deploying with `npm run deploy` automatically builds versioned web bundles and delivers updates Over-The-Air without rebuilding the APK.
  - **⚡ Header-Driven Detection**: Detects updates via lightweight response headers (`X-Wallaflare-Web-Version`) during normal syncs — zero extra polling requests or battery drain.
  - **Floating Share Dialog**: Share links from Chrome, Twitter, Reddit, or any browser with duplicate detection (`Article Already in Library` + save date) and direct `[Read Article]` / `[Open App]` actions.
  - **Auto-Revalidation on Resume**: Newly saved articles appear automatically in the library when returning to the app without manual refresh.
  - **Native Multi-Format Export**: Export articles directly to Android's system share sheet in **EPUB**, **Markdown**, or **PDF** to open in KOReader, Moon+ Reader, ReadEra, Adobe Reader, Google Drive, Obsidian, or send to Kindle.
  - **Safe-Area Notch Protection**: Integrated `@capacitor/status-bar` sync with theme-matched shields to protect text from camera punch-holes.
- **🖥️ Ergonomic 3-Pane Desktop Workspace & Adaptive Mobile Drawer**:
  - **Side-by-Side 3-Pane Workstation**: Seamless desktop view with Navigation Sidebar (220px), Articles Feed (380px), and dynamic Reader (flex: 1).
  - **Contextual Right-Click Menus**: Right-click cards for single-item or batch operations (`(X selected)` header with batch tagging, export, star, archive, and delete).
  - **Minimalist Action-Oriented Empty States**: Context-aware zero states with 1-click action chips (`[+ Add URL]`, `[📝 Write Note]`, `[Clear Search]`, `[Clear Tag]`).
- **⚡ Unified Sync Endpoint, Database Sorting & Infinite Scroll**:
  - **Unified Single-Handshake Sync (`/api/sync.json`)**: Cuts network requests by 50% on tab refocus and pull-to-refresh, delivering articles, all tags, and live D1 database counts in 1 atomic sub-10ms request.
  - **Global Cloudflare D1 Sorting**: Supports database-level sorting (Newest, Oldest, Title A-Z, Reading Time) with 0ms optimistic local rendering.
  - **Seamless Infinite Scroll**: Automatically loads multi-page libraries on demand as you scroll down the feed.
  - **Instant 0ms Cache & IndexedDB**: Synchronous memory cache + IndexedDB offline fallback ensures articles, all tags, and counts remain fully accessible offline.
  - **Zero-Shift Add/Offline Indicator**: When offline, the `+ Add URL` button smoothly morphs into an amber `Offline` status button with 0 layout shift. Tapping it retries the server connection.
  - **Responsive Header Tiers**: Adaptive layout specifically optimized for phones (portrait & landscape), tablets, and desktop displays with independent side-panel scrolling.
- **📦 Multi-Format On-Device Export Engine (EPUB, Markdown, PDF)**:
  - **📚 EPUB (`.epub`)**: Isomorphic, client-side generator producing book-grade EPUBs with high-res cover art, metadata info page, semantic figures, and reading time estimation.
  - **📝 Markdown (`.md`)**: Exports clean GitHub-flavored markdown with YAML frontmatter (`title`, `author`, `source`, `date`, `tags`). Ideal for personal knowledge management in **Obsidian**, **Logseq**, **Notion**, or **Bear**.
- **🖍️ Multi-Color Highlights & Annotations (W3C + Wallabag v2 Hybrid)**:
  - **Universal Dual Compatibility**: Fully compliant with standard Wallabag v2 clients (`/api/annotations`) while leveraging modern **W3C Multi-Selectors** (`TextQuoteSelector`, `TextPositionSelector`, `XPathSelector`) for resilient, zero-orphan anchors across theme and typography adjustments.
  - **Zero-Latency In-Memory Batching**: Highlights & notes are bundled directly into `GET /api/entries.json` response payloads — 0 extra network calls or worker roundtrips required.
  - **Floating Touch/Desktop Selection Toolbars**: Instant 4-color palette selection (`🟡 Yellow`, `🟢 Green`, `🔵 Blue`, `🟣 Purple`), 1-tap quick copy, and personal note editing. Floats directly above text on desktop, and adapts into an ergonomic bottom floating pill on mobile/Android touch screens to avoid native OS action bar collisions.
  - **Interactive Popovers & Sidebar Drawer**: Tap any highlight to change colors, read attached notes, or delete. Live highlights counter and list in the reader sidebar drawer let you navigate directly to quotes with smooth scrolling.
  - **Hybrid Markdown Notes Export**: Exports articles with inline highlights (`==quote==`), note footnotes (`[^note-1]`), and a structured `## 🖍️ Highlights & Notes` summary digest for seamless personal knowledge management in Obsidian, Bear, Logseq, Notion, and Joplin.
  - **📄 PDF (`.pdf`)**: On-device 3-section PDF engine featuring full-size cover art, structured metadata summary cards, line-by-line pagination, and running headers & footers (`Page X of Y`) without print dialog popups.
  - **⚡ 100% Client-Side & Offline Ready**: Generates all formats on-device with 0ms network latency and zero third-party API dependencies.
- **📚 Distraction-Free Web Reader**:
  - Auto-hiding headers during reading, customizable serif/sans typography, adjustable font size, and Dark, Light, and Sepia themes.
  - Comprehensive **Right-to-Left (RTL)** Hebrew and Arabic language support.
- **🛡️ Two-Tier Security & Privacy Defense**:
  - Server-side Linkedom DOM parser strips executable scripts, inline event handlers, and dangerous URIs before storing content in D1.
  - Client-side DOMPurify pass and strict Content-Security-Policy (CSP) headers.
  - Built-in brute-force rate-limiting (5-attempt threshold with 15-minute IP lockout) and search engine crawler disallow (`X-Robots-Tag`, `/robots.txt`).

---

## 🛠️ Quick Start & Deployment

### Prerequisites
- Node.js 18+
- A free [Cloudflare Account](https://dash.cloudflare.com/sign-up)

### 1. Clone & Install
```bash
git clone https://github.com/UserCel/wallaflare.git
cd wallaflare
npm install
```

### 2. Create Cloudflare D1 Database
```bash
npx wrangler d1 create wallaflare-db
```
Wrangler will output your unique `database_id`. Copy it into your `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "wallaflare-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3. Initialize Database Schema
```bash
npm run db:migrate:remote
```

### 4. Set Access Token Secret (Recommended)
Set your secure master access token/password in Cloudflare's encrypted secrets:
```bash
npx wrangler secret put AUTH_TOKEN
```

### 5. Deploy
Deploy your serverless instance to Cloudflare:
```bash
npm run deploy
```
Your instance is now live worldwide! 🎉

---

## 📱 Client Setup Guide

### KOReader (Kindle / Kobo / Android / Linux)
1. Open **KOReader** ➔ **Search / Tools > Wallabag**.
2. Enter the 5 parameters:
   - **Server URL**: `https://wallaflare.yourdomain.com`
   - **Client ID**: `wallaflare`
   - **Client Secret**: `wallaflare`
   - **Username**: `wallaflare`
   - **Password**: Your `AUTH_TOKEN`
3. Tap **Sync now** — KOReader will automatically sync and download high-quality EPUBs with covers and metadata!

### Official Wallabag Android App
1. Open the **Wallabag App** ➔ Choose **Wallabag v2**.
2. Enter your Server URL (`https://wallaflare.yourdomain.com`).
3. Enter `wallaflare` as Username and your `AUTH_TOKEN` as Password.
4. Tap **Test connection** and connect!

### Wallabagger (Browser Extension for Chrome, Firefox & Edge)
1. Open **Wallabagger Settings**.
2. Enter your Wallaflare URL (`https://wallaflare.yourdomain.com`).
3. Click **Check URL / Connect** and sign in with your `AUTH_TOKEN` password.
4. Select any client profile (`Android app - #38185` or `koreader - #36204`) — Wallabagger will automatically fetch the client credentials and pair!

> 💡 **Why is `wallaflare` used for Client ID, Secret, and Username?**  
> Wallaflare is designed as a personal, single-tenant serverless instance. Using `wallaflare` across all client identifiers removes tedious typing on slow E-ink keyboards (Kindle/Kobo) while ensuring standard Wallabag OAuth2 clients pair effortlessly. All data access remains strictly protected by your private `AUTH_TOKEN` password and brute-force rate-limiting.

---

## 📦 Native Android App Build (Capacitor & OTA)

Wallaflare includes a lightweight native Android wrapper with background share integration, native multi-format export, and automatic Over-The-Air (OTA) live updates.

1. **Build Debug APK**:
   ```bash
   npm run build:apk
   ```
   Output: `android/app/build/outputs/apk/debug/app-debug.apk`

2. **Build Minimized Release APK**:
   ```bash
   npm run build:apk:release
   ```
   Output: `android/app/build/outputs/apk/release/app-release.apk`

3. **Deploy Web & OTA Update**:
   ```bash
   npm run deploy
   ```
   Automatically updates your Cloudflare Worker and generates the OTA update bundle for Android clients.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — matching the Wallabag project license.
