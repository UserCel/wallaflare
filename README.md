# 📖 Wallaflare

> **Ultra-lightweight, zero-cost, serverless Read-it-Later & Wallabag v2 API replacement.**  
> Built for Cloudflare Workers, Cloudflare D1 (Serverless SQLite), and E-ink readers (KOReader, Kindle, Kobo, Android).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![D1 Database](https://img.shields.io/badge/Storage-Cloudflare_D1-blue)](https://developers.cloudflare.com/d1/)
[![Wallabag v2 API](https://img.shields.io/badge/API-Wallabag_v2_Compatible-green)](https://wallabag.org/)
[![KOReader](https://img.shields.io/badge/Reader-KOReader_Ready-darkgreen)](https://koreader.rocks/)

---

## ✨ Features

- **🚀 100% Serverless & Free Tier Friendly**: Runs entirely on Cloudflare Workers with SQLite (D1). Sub-millisecond cold starts across 300+ global edge locations.
- **📱 Drop-in Wallabag v2 API Compatibility**:
  - Full compatibility with the **Official Wallabag Android App** (connection test, OAuth token authentication, article fetching, incremental sync with `since`, and two-way deletion).
  - Compatible with **KOReader's Wallabag plugin** for automated article sync and offline reading on Kindle, Kobo, Boox, and Android e-ink devices.
  - Wallabag browser extensions and third-party clients work out of the box.
- **📚 Rich Multi-Page EPUB Generator**:
  - Automatically generates clean EPUB 3 / EPUB 2 files formatted to match Wallabag.
  - Bundles high-resolution preview cover images (`cover.xhtml` + `cover.png/jpg`).
  - Generates Wallabag-style summary/metadata pages (Author, Published Date, Estimated Reading Time, Added Date, Source Link).
  - Clean e-reader typography with no artificial forced paragraph margins, allowing KOReader / Kindle to control layout natively.
- **🖥️ Responsive Web Dashboard & Distraction-Free Reader**:
  - **Sidebar Dock Navigation**: Maximizes vertical reading space on desktop and collapses into a sleek bottom action bar on mobile.
  - **Responsive Sub-URLs**: `/read/:id`, `/starred`, `/archive` with native browser Back/Forward navigation.
  - **Reading Progress Bar**: Live reading scroll progress indicator.
  - **Themes & Typography**: Dark, Light, and Sepia modes with Serif / Sans-serif toggles and font size controls.
  - **Image Previews**: Clean article cards with cover thumbnails and fallback handling.
- **🔍 Smart Article Ingestion**: Powered by `@mozilla/readability` and `linkedom` for fast serverless content extraction.

---

## 🛠️ Quick Start & Deployment

### Prerequisites
- Node.js 18+
- Cloudflare Account (Free Tier)

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
Copy the generated `database_id` into your `wrangler.toml`.

### 3. Initialize Database Schema
```bash
npx wrangler d1 execute wallaflare-db --file=schema.sql --remote
```

### 4. Configure Authentication Secret (Optional but Recommended)
Set your secure master access token/password:
```bash
npx wrangler secret put AUTH_TOKEN
```

### 5. Deploy to Cloudflare Workers
```bash
npm run deploy
```

---

## 📱 Client Setup Guide

### KOReader (Kindle / Kobo / Android / Linux)
1. Open **KOReader**.
2. Navigate to **Search / Tools > Wallabag**.
3. Configure the settings:
   - **Server URL**: `https://your-domain.workers.dev` (or your custom domain)
   - **Username / Client ID**: `wallaflare`
   - **Password / Client Secret**: Your `AUTH_TOKEN` (or any string if authentication is disabled)
4. Tap **Sync now** — KOReader will sync and download EPUBs with covers and metadata!

### Official Wallabag Android App
1. Open the **Wallabag Android App**.
2. Choose **Wallabag v2**.
3. Enter your Server URL (`https://your-domain.workers.dev`).
4. Enter `wallaflare` as Username and your `AUTH_TOKEN` as Password.
5. Tap **Test connection** and connect!

---

## 🔒 Security & Architecture

- **Stateless & Edge-Native**: No servers to manage, no Docker containers, no background database daemons.
- **Zero Hardcoded Secrets**: Secrets and tokens are managed via Cloudflare Secrets (`wrangler secret put`).
- **Authorization Header Support**: All web actions and EPUB downloads pass credentials securely in HTTP `Authorization: Bearer <token>` headers rather than exposing tokens in query URLs.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) — matching the Wallabag project license.
