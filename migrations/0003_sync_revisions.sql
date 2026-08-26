-- Migration 0003: Add revision column to entries, sync_state and deleted_entries tables
ALTER TABLE entries ADD COLUMN revision INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS sync_state (
  id INTEGER PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deleted_entries (
  entry_id INTEGER PRIMARY KEY,
  revision INTEGER NOT NULL,
  deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO sync_state (id, revision) VALUES (1, 1);
