# 📖 Implementation Plan: Daily Digest & Anthology EPUB Generator

## 🎯 Background & Overview
Currently, Wallaflare generates and syncs individual single-article EPUB 3 files. When users save multiple articles (e.g., 20 short essays or news stories), syncing or downloading them produces 20 distinct files. On e-readers (KOReader on Kindle/Kobo) and desktop reading apps, having dozens of tiny files clutters the library and requires constantly exiting and opening books.

This feature introduces a **Multi-Article Anthology / Digest EPUB Engine** that:
1. Compiles multiple articles into a single, cohesive, book-grade EPUB 3 document with:
   - Cover/Title page and rich Table of Contents summary.
   - Individual chapters for each article (`chapter_1.xhtml`, `chapter_2.xhtml`, ...).
   - Per-chapter BiDi / RTL support (`dir="rtl"` vs `dir="ltr"` for mixed Hebrew/English digests).
   - Hierarchical EPUB 3 `<nav epub:type="toc">` and EPUB 2 `toc.ncx` navigation for KOReader, Kindle, Kobo, and Apple Books.
2. Integrates into the **Web UI Batch Context Menu & Batch Floating Bar**:
   - When 2 or more articles are selected, the user can right-click or use the batch bar under **Bulk Export** to choose **"Anthology EPUB (.epub)"**.
   - Generates the combined EPUB instantly on-device (0ms server load, fully offline capable).
3. Exposes a **Server-side Digest Endpoint (`GET /api/entries/digest.epub`)**:
   - Supports `?ids=1,2,3` or `?filter=unread|starred|all` with `?limit=25`.
   - Exposes an acquisition link in the OPDS 1.2 catalog (`/opds`) so e-readers can download a compiled Unread Digest in 1 click.
   - Adds a **"Download Unread Digest"** shortcut in the KOReader plugin menu.

---

## 📐 Architecture & Components

```
                                  ┌──────────────────────────────────────────────────────────┐
                                  │           Multi-Article EPUB Generator                   │
                                  │      src/services/epub.ts: generateDigestEpub()          │
                                  └────────────────────────────┬─────────────────────────────┘
                                                               │
                           ┌───────────────────────────────────┴───────────────────────────────────┐
                           │                                                                       │
            ┌──────────────▼──────────────┐                                         ┌──────────────▼──────────────┐
            │       Client-side Use       │                                         │       Server-side Use       │
            ├─────────────────────────────┤                                         ├─────────────────────────────┤
            │ • scripts/bundle-epub-client│                                         │ • GET /api/entries/digest   │
            │ • window.WallaflareEpub     │                                         │ • OPDS 1.2 acquisition feed │
            │ • Batch Context Menu item   │                                         │ • KOReader Plugin shortcut  │
            │ • Batch Action Bar dropdown │                                         │ • Serverless Edge Stream    │
            └─────────────────────────────┘                                         └─────────────────────────────┘
```

---

## 🛠️ Proposed Changes

### 1. EPUB Generation Engine
#### [MODIFY] `src/services/epub.ts`
- Export `generateDigestEpub(articles: EpubArticleInput[], options?: DigestOptions): Promise<Uint8Array>`:
  - `DigestOptions`: `title` (e.g. "Wallaflare Unread Digest — Sep 11, 2026"), `author`, `coverFilename`.
  - Builds:
    - Multi-chapter OPF manifest and spine with `chapter_1`, `chapter_2`, ..., `chapter_N`.
    - Multi-entry `nav.xhtml` and `toc.ncx` mapping each article title to its chapter.
    - `summary.xhtml` overview table of contents with reading times, domains, and publication dates.
    - Sanitized chapter bodies with per-chapter `dir="rtl"` or `dir="ltr"` attribute for mixed-script support.
    - Aggregated and de-duplicated inline images.
- Export both `generateEpub` and `generateDigestEpub` on `WallaflareEpub` client bundle.

### 2. Client Web UI & Batch Context Menu
#### [MODIFY] `src/client/index.ts`
- In `generateUnifiedArticleMenuHtml` (mode `'batch'`):
  - In the `Bulk Export` submenu, add **"Anthology EPUB (.epub)"** alongside "ZIP (EPUBs)", "ZIP (Markdown)", and "JSON (.json)".
- In the batch floating action bar:
  - Add an **"Anthology EPUB"** action or menu item when multiple articles are selected.
- Add `handleExportBatchAnthologyEpub()`:
  - Retrieves selected articles from `allEntries` (or fetches full content if needed).
  - Calls `WallaflareEpub.generateDigestEpub(items, { title: ... })`.
  - Downloads `wallaflare_anthology_YYYY-MM-DD.epub`.
  - Shows success toast `✓ Anthology EPUB exported (N articles)`.

### 3. Server Endpoints & OPDS Catalog
#### [MODIFY] `src/routes/api.ts`
- Add route `GET /api/entries/digest.epub`:
  - Query parameters:
    - `ids`: comma-separated list of article IDs (e.g., `?ids=12,15,20`), OR
    - `filter`: `unread` (default), `starred`, or `all`.
    - `limit`: default 25 (max 50).
  - Fetches articles from D1 database.
  - Calls `generateDigestEpub(entries, { title: ... })`.
  - Streams EPUB file with `Content-Type: application/epub+zip` and `Content-Disposition: attachment; filename="wallaflare_digest_YYYY-MM-DD.epub"`.
- Support `AUTH_TOKEN` and `READ_TOKEN` authentication.

#### [MODIFY] `src/routes/opds.ts` & `src/services/opds.ts`
- In `/opds`, add an acquisition entry for the **Unread Digest**:
  - Title: "📖 Unread Digest (EPUB Anthology)"
  - Link: `<link rel="http://opds-spec.org/acquisition" href="/opds/digest.epub?token=..." type="application/epub+zip"/>`
  - Allows KOReader users browsing the OPDS catalog to download the entire unread digest in a single tap.

### 4. KOReader Plugin Enhancement
#### [MODIFY] `integrations/koreader/wallaflare.koplugin/main.lua`
- Add a menu action in **Tools > Wallaflare > Download Unread Digest**:
  - Fetches `/api/entries/digest.epub` and saves to `Download_Folder/Wallaflare_Digest_YYYY-MM-DD.epub`.
  - Alerts when finished and prompts to open the digest directly.

### 5. Automated Tests
#### [MODIFY] `src/__tests__/epub.test.ts`
- Test `generateDigestEpub` with multiple articles (both LTR and RTL).
- Verify package manifest, spine order, `nav.xhtml` navigation, and `toc.ncx` play orders.

#### [MODIFY] `src/__tests__/api.test.ts`
- Test `GET /api/entries/digest.epub?filter=unread` returns a valid EPUB binary with 200 OK.
- Test `GET /api/entries/digest.epub?ids=1,2` returns the filtered digest.

---

## 🔍 Verification Plan

### Automated Tests
1. `npm run build:web`: Verify bundle generation (`epub-client-bundle.ts`, `dashboard-bundle.ts`).
2. `npm test`: Verify all existing 182 vitest tests + new digest tests pass.

### Manual Verification
1. **Multi-Select Context Menu**:
   - In browser, select 3 articles.
   - Right-click or open batch export menu -> click **Anthology EPUB (.epub)**.
   - Verify the downloaded EPUB contains all 3 articles as distinct chapters with a working Table of Contents.
2. **Digest API & OPDS**:
   - Request `GET /api/entries/digest.epub` in test/staging.
   - Open in an EPUB reader (KOReader or Foliate/Apple Books) to verify chapters, BiDi RTL chapters, and styling.
