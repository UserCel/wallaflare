-- Wallaflare D1 SQLite Schema (Production Architecture)
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  preview_picture TEXT,
  domain_name TEXT,
  reading_time INTEGER DEFAULT 1,
  language TEXT DEFAULT 'en',
  author TEXT,
  published_at TEXT,
  is_archived INTEGER DEFAULT 0,
  is_starred INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  content_revision INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_entries_archived ON entries(is_archived);
CREATE INDEX IF NOT EXISTS idx_entries_starred ON entries(is_starred);
CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at);
CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries(updated_at);
CREATE INDEX IF NOT EXISTS idx_entries_revision ON entries(revision);
CREATE INDEX IF NOT EXISTS idx_entries_content_revision ON entries(content_revision);

-- Tags System
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS entry_tags (
  entry_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (entry_id, tag_id),
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);

-- Auth Rate Limits Table
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  ip TEXT PRIMARY KEY,
  failed_attempts INTEGER DEFAULT 0,
  last_attempt_at INTEGER NOT NULL,
  locked_until INTEGER DEFAULT 0
);

-- Annotations & Highlights System (W3C + Wallabag v2 Hybrid)
CREATE TABLE IF NOT EXISTS annotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL,
  user_id TEXT DEFAULT 'wallaflare',
  text TEXT DEFAULT '',
  quote TEXT NOT NULL,
  ranges TEXT DEFAULT '[]',
  target TEXT DEFAULT NULL,
  color TEXT DEFAULT 'yellow',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_annotations_entry ON annotations(entry_id);

-- Monotonic Sync State & Deletion Tombstones
CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 1,
  instance_id INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deleted_entries (
  entry_id INTEGER PRIMARY KEY,
  revision INTEGER NOT NULL,
  deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Site Cookies Vault (Paywall & Logged-In Sites)
CREATE TABLE IF NOT EXISTS site_cookies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT UNIQUE NOT NULL,
  site_name TEXT,
  cookie_value TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1,
  user_id TEXT DEFAULT 'wallaflare',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_cookies_domain ON site_cookies(domain);

INSERT OR IGNORE INTO sync_state (id, revision, instance_id) VALUES (1, 1, 0);
