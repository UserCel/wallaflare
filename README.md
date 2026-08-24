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
- **🏷️ Instant Tag Management & Official Batch API Operations**:
  - **Standard Wallabag v2 Batch Endpoints**: Full server-side implementation of `DELETE /api/entries/list(.json)` (mass deletion), `PATCH /api/entries/list(.json)` (mass star/archive), `POST /api/entries/tags/lists(.json)` (mass tagging), and `DELETE /api/entries/tags/list(.json)` (mass tag removal).
  - **Atomic 1-Request Operations**: Multi-selection actions in the webapp execute in 1 single HTTP request with atomic D1 SQLite queries.
  - **Prominent Mobile Star Badges**: Gold star indicator pill on cards in all view modes (List, Magazine, Compact) makes favorite articles instantly recognizable on mobile.
- **📱 Native Android App (1.2 MB)**:
  - **Floating Share Dialog**: Share links from Chrome, Twitter, Reddit, or any browser with duplicate detection (`Article Already in Library` + save date) and direct `[Read Article]` / `[Open App]` actions.
  - **Auto-Revalidation on Resume**: Newly saved articles appear automatically in the library when returning to the app without manual refresh.
  - **Native Multi-Format Export**: Export articles directly to Android's system share sheet in **EPUB**, **Markdown**, or **PDF** to open in KOReader, Moon+ Reader, ReadEra, Adobe Reader, Google Drive, Obsidian, or send to Kindle.
  - **Safe-Area Notch Protection**: Integrated `@capacitor/status-bar` sync with theme-matched shields to protect text from camera punch-holes.
- **📦 Multi-Format On-Device Export Engine (EPUB, Markdown, PDF)**:
  - **📚 EPUB (`.epub`)**: Isomorphic, client-side generator producing book-grade EPUBs with high-res cover art, metadata info page, semantic figures, and reading time estimation.
  - **📝 Markdown (`.md`)**: Exports clean GitHub-flavored markdown with YAML frontmatter (`title`, `author`, `source`, `date`, `tags`). Ideal for personal knowledge management in **Obsidian**, **Logseq**, **Notion**, or **Bear**.
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
2. Set **Server URL** to your Worker URL (`https://wallaflare.yourdomain.com`).
3. Set **Username** to `wallaflare` and **Password** to your `AUTH_TOKEN`.
4. Tap **Sync now** — KOReader will sync and download EPUBs with covers and metadata!

### Official Wallabag Android App
1. Open the **Wallabag App** ➔ Choose **Wallabag v2**.
2. Enter your Server URL (`https://wallaflare.yourdomain.com`).
3. Enter `wallaflare` as Username and your `AUTH_TOKEN` as Password.
4. Tap **Test connection** and connect!

---

## 📦 Native Android App Build (Capacitor)

Wallaflare includes a lightweight native Android wrapper with background share integration and native EPUB export.

1. **Build Debug APK**:
   ```bash
   npm run build:apk
   ```
   Output: `android/app/build/outputs/apk/debug/app-debug.apk`

2. **Build Minimized Release APK (1.2 MB)**:
   ```bash
   npm run build:apk:release
   ```
   Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — matching the Wallabag project license.
