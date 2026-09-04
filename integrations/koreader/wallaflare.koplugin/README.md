# 📖 Wallaflare KOReader Plugin

Official KOReader integration for **Wallaflare** — bringing ultra-fast revision-based delta sync, bi-directional highlight and note synchronization, automatic library pruning, remote archive automation, and in-app over-the-air updates to e-ink e-readers (Kindle, Kobo, Android, PocketBook, Linux).

---

## ✨ Features

- ⚡ **Revision-Based Delta Sync**: Queries `/api/sync.json` with `since_rev` for sub-second, battery-friendly sync checks.
- 🖍️ **Bi-Directional Highlight & Note Sync**: Highlights, notes, and colors created on either KOReader or the web dashboard sync with 100% fidelity, using native KOReader DOM anchor resolution and true **Last-Write-Wins** conflict handling.
- 📦 **Book-Grade EPUBs**: Downloads clean, styled EPUB 3 articles with cover images from `/api/entries/:id/export.epub`.
- 🏷️ **Remote Archive & Deletion Automation**:
  - Automatically archives articles on Wallaflare when marked finished in KOReader.
  - Optional auto-archive on reaching 100% reading progress or setting status to on hold.
  - **Local File Deletion Sync**: Deleting a book in KOReader automatically propagates to Wallaflare (configurable: *Archive on server*, *Delete from server*, or *Do nothing*).
  - Optional *Delete instead of archive* mode for disposable reading queues.
- 🗑️ **Smart Sync-Filter Auto-Deletion**:
  - **Unread only**: Automatically prunes local `.epub` files and `.sdr` sidecars when articles are archived on Wallaflare.
  - **Starred only**: Prunes unstarred articles while retaining all starred items.
  - **All articles**: Preserves all downloaded articles regardless of archive status.
  - **Filter-Switch Reconciliation**: Changing your sync filter triggers an automatic full reconciliation sync to re-align your local library with zero bandwidth waste.
- 🔄 **Over-The-Air (OTA) In-App Updates**: One-tap self-updating directly from KOReader settings with zero manual file copying.
- 🛡️ **Database Reset Watchdog**: Safely detects remote database wipes or recreation with interactive preservation prompts.

---

## 🚀 Installation

1. Download the `wallaflare.koplugin.zip` package from your Wallaflare dashboard (**Settings > Integrations**) or from `https://<your-subdomain>.workers.dev/download/wallaflare.koplugin.zip`.
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
   - Enter your master `AUTH_TOKEN` (required for REST API and 2-way sync).
4. Choose your **Download folder**:
   - Select where your downloaded EPUBs will be stored (e.g. `/Books/Wallaflare`).
5. Configure your **Sync Filter & Remote Archive** preferences:
   - **Sync Filter**: *Unread only*, *All articles*, or *Starred only*.
   - **Remote archive**: Toggle auto-archive for finished, 100% read, or abandoned books.
   - **Auto-delete removed articles**: Keep enabled to automatically prune archived or deleted books.
6. Tap **Sync now**!
