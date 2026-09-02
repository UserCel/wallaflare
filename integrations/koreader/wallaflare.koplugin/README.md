# 📖 Wallaflare KOReader Plugin

Official KOReader integration for **Wallaflare** — bringing ultra-fast revision-based delta sync, automatic file pruning, and offline reading to e-ink e-readers (Kindle, Kobo, Android, PocketBook, Linux).

---

## ✨ Features

- ⚡ **Revision-Based Delta Sync**: Queries `/api/sync.json` with `since_rev` for sub-second, battery-friendly sync checks.
- 🗑️ **Automatic Library Pruning**: Automatically deletes local `.epub` files and `.sdr` sidecars when articles are removed from Wallaflare.
- 🛡️ **Database Reset Watchdog**: Prompts the user before taking action if the remote database is wiped or recreated.
- 📖 **Book-Grade EPUBs**: Downloads clean, styled EPUB 3 articles with cover images from `/opds/download/:id.epub`.
- 🔄 **2-Way Progress & Offline Outbox**: Automatically queues archive actions when you finish reading an article.

---

## 🚀 Installation

1. Download the `wallaflare.koplugin.zip` package (or copy the `wallaflare.koplugin` folder).
2. Connect your e-reader to your computer via USB (or SFTP / file transfer).
3. Copy the `wallaflare.koplugin` folder into your KOReader plugins directory:
   - **Kindle / Kobo / Linux**: `/mnt/onboard/.koreader/plugins/wallaflare.koplugin` (or `koreader/plugins/wallaflare.koplugin`)
   - **Android**: `/sdcard/koreader/plugins/wallaflare.koplugin`
4. Restart KOReader.

---

## ⚙️ Configuration

1. In KOReader, tap the top menu and navigate to **Tools > Wallaflare > Settings**.
2. Set your **Server URL**:
   ```text
   https://<your-subdomain>.workers.dev
   ```
3. Set your **API Token**:
   - Enter your dedicated `READ_TOKEN` or master `AUTH_TOKEN`.
4. Tap **Sync now**!
