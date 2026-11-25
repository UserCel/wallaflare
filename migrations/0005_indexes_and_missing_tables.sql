-- Migration 0005: Reconcile missing tables and add critical D1 query indexes

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

CREATE TABLE IF NOT EXISTS api_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT DEFAULT NULL,
  expires_at TEXT DEFAULT NULL,
  revoked_at TEXT DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_entries_url ON entries(url);
CREATE INDEX IF NOT EXISTS idx_entries_revision ON entries(revision);
CREATE INDEX IF NOT EXISTS idx_entries_domain ON entries(domain_name);
CREATE INDEX IF NOT EXISTS idx_annotations_entry ON annotations(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_tags_entry ON entry_tags(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_deleted_entries_rev ON deleted_entries(revision);
CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);
