# 📖 Wallaflare

> **Ultra-lightweight, zero-cost, serverless Read-it-Later & Wallabag v2 API replacement.**  
> Built for Cloudflare Workers, Cloudflare D1 (Serverless SQLite), and E-ink readers (KOReader, Kindle, Kobo, Android).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![D1 Database](https://img.shields.io/badge/Storage-Cloudflare_D1-blue)](https://developers.cloudflare.com/d1/)
[![Wallabag v2 API](https://img.shields.io/badge/API-Wallabag_v2_Compatible-green)](https://wallabag.org/)
[![KOReader](https://img.shields.io/badge/Reader-KOReader_Ready-darkgreen)](https://koreader.rocks/)

<p align="center">
  <img src="assets/screenshots/dashboard-desktop.png" alt="Wallaflare Desktop Dashboard" width="850" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); margin-bottom: 20px;" />
</p>
<p align="center">
  <img src="assets/screenshots/dashboard-mobile-mockup.png" alt="Wallaflare Mobile Smartphone App" width="380" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" />
</p>

---

## ✨ Features

- **🚀 Zero-Cost Serverless Edge**: Runs 100% on Cloudflare Workers + D1 SQLite free tiers with sub-millisecond cold starts across 300+ global locations.
- **📱 Drop-in Wallabag v2 API**: Sync seamlessly with **KOReader** (Kindle, Kobo, Android e-ink), official **Wallabag Android app**, and browser extensions.
- **🎛️ Google Keep Style Control Bar**:
  - **3 View Modes**: Instant 1-tap cycling between List (1:1 thumbnails), Magazine Grid (hero covers), and Compact Headlines.
  - **Quick Sorting**: Sort by Newest, Oldest, Shortest Read, Longest Read, or Title (A–Z).
  - **Zero Mobile Wrapping**: Unified search controls keep filter tabs on a single line on mobile portrait.
- **🏷️ Tag Management & Batch Operations**: Instant 0ms cached tag filtering, batch tagging, and global unused tag cleanup.
- **📱 Native Android App (1.2 MB)**:
  - Floating background share sheet with duplicate alerts (`ℹ Already in Library`) and direct `[Read Article]` / `[Open App]` actions.
  - Instant offline caching with zero-flicker background revalidation on app resume.
  - Native EPUB sharing to KOReader, Moon+ Reader, ReadEra, or Send to Kindle.
- **📚 Beautiful EPUB & Reader Generator**:
  - Bundles high-res covers, semantic figures, and reading time calculation.
  - Full Right-to-Left (RTL) Hebrew and Arabic language support.
  - Auto-hiding mobile reader header with smooth scroll recovery and punch-hole camera shields.
- **🛡️ Private & Secure**:
  - Server-side DOM sanitization, client-side DOMPurify pass, and strict CSP headers.
  - Built-in brute-force rate-limiting and search engine crawler disallow (`X-Robots-Tag`).

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
Copy the output `database_id` into your `wrangler.toml`:
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
```bash
npx wrangler secret put AUTH_TOKEN
```

### 5. Deploy
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
2. Enter your Server URL, `wallaflare` as Username, and your `AUTH_TOKEN` as Password.
3. Tap **Test connection** and connect!

---

## 📦 Native Android App Build (Capacitor)

```bash
# Build minimized release APK (1.2 MB)
npm run build:apk:release
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
