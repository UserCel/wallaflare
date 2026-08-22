# Wallaflare 🔥📖

**Wallaflare** is a lightweight, serverless read-it-later backend designed to run on **Cloudflare Workers** with **Cloudflare D1 (SQLite)** storage.

It acts as a zero-maintenance, drop-in replacement for **Wallabag v2**, enabling seamless synchronization with:
- **KOReader** on e-ink devices (Kobo, Kindle, Onyx Boox, Android) with dynamic on-the-fly EPUB generation
- **Wallabag Android App**
- **Wallabag Browser Extensions** (Firefox, Chrome)
- **Built-in Web Reader Dashboard** with full direct text, Markdown, and URL ingestion

---

## ⚡ Features

- **Wallabag v2 API Compatibility**:
  - `POST /oauth/v2/token`: Mock / token-validated OAuth flow for client authentication.
  - `GET /api/entries.json`: Wallabag v2 compatible paginated JSON list with filtering (`archive`, `starred`, `since`, `sort`, `order`).
  - `POST /api/entries.json`: Clean article ingestion by URL or direct `title` + `content`.
  - `GET /api/entries/{id}.json`: Single entry retrieval.
  - `PATCH /api/entries/{id}.json`: Archive, star/favorite, and edit entries.
  - `DELETE /api/entries/{id}.json`: Remove entries.
  - `GET /api/entries/{id}/export.epub`: Dynamic, in-memory EPUB generation powered by `fflate` for instant KOReader reading.
- **Edge Article Extraction**:
  - Uses `@mozilla/readability` paired with `linkedom` inside Cloudflare Workers.
  - Extracts clean article body, metadata, author, lead image, estimated reading time, and domain name.
- **In-Memory Dynamic EPUB Generator**:
  - Generates valid EPUB2/EPUB3 containers without disk I/O.
  - Formatted and styled specifically for crisp readability on e-ink screens.
- **Modern Web Dashboard**:
  - Fast single-page application with Dark / Light / Warm Sepia themes.
  - Distraction-free reader view with typography and font size controls.
  - One-click URL article ingestion & direct Markdown/text chapter paste.
  - Setup guide modal with instant configuration presets.

---

## 🚀 Quickstart & Deployment

### 1. Prerequisites
- Node.js >= 20
- Cloudflare account with Workers & D1 enabled
- Cloudflare Wrangler CLI (`npm install -g wrangler` or via `npx wrangler`)

### 2. Installation
```bash
git clone <repository-url>
cd wallaflare
npm install
```

### 3. Create Cloudflare D1 Database
Create a D1 database on Cloudflare:
```bash
npx wrangler d1 create wallaflare-db
```
Copy the resulting `database_id` and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "wallaflare-db"
database_id = "<your-d1-database-id>"
```

### 4. Apply Database Migrations
**Local Development:**
```bash
npm run db:migrate:local
```

**Remote Cloudflare Production:**
```bash
npm run db:migrate:remote
```

### 5. Local Development
```bash
npm run dev
```
Open `http://localhost:8787` in your browser.

### 6. Production Deployment
```bash
npm run deploy
```

---

## 📱 Connecting KOReader & Wallabag Apps

### KOReader Setup (E-ink Devices)
1. In KOReader, go to **Search / Tools > Wallabag**.
2. Configure settings:
   - **Server URL**: `https://<your-worker-subdomain>.workers.dev`
   - **Client ID**: `wallaflare`
   - **Client Secret**: *(Leave blank or set your `AUTH_TOKEN`)*
   - **Username**: `wallaflare`
   - **Password**: *(Leave blank or set your `AUTH_TOKEN`)*
3. Tap **Sync**. KOReader will fetch your unread list and download formatted EPUB files ready to read on your e-ink device!

### Wallabag Android App Setup
1. Open the Wallabag app and select **Custom instance**.
2. Set the Server URL to your Cloudflare Worker URL.
3. Use the credentials above to log in and sync.

---

## 🧪 Testing

Run automated tests (API compatibility, Readability extractor, and EPUB generator):
```bash
npm test
```

Typecheck:
```bash
npm run typecheck
```

---

## 📄 License
MIT
