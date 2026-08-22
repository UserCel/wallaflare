-- Wallaflare D1 SQLite Schema
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  preview_picture TEXT,
  domain_name TEXT,
  reading_time INTEGER DEFAULT 1,
  language TEXT DEFAULT 'en',
  is_archived INTEGER DEFAULT 0,
  is_starred INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_archived ON entries(is_archived);
CREATE INDEX IF NOT EXISTS idx_entries_starred ON entries(is_starred);
CREATE INDEX IF NOT EXISTS idx_entries_created ON entries(created_at);
CREATE INDEX IF NOT EXISTS idx_entries_updated ON entries(updated_at);
