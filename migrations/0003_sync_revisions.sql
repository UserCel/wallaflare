-- Migration 0003: Monotonic Sync Revisions, Tombstones, and Instance Epoch ID
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

INSERT OR IGNORE INTO sync_state (id, revision, instance_id) VALUES (1, 1, 0);

ALTER TABLE entries ADD COLUMN revision INTEGER DEFAULT 1;
