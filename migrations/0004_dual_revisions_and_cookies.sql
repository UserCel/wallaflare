-- Dual Revisions & Site Cookies Vault Migration
ALTER TABLE entries ADD COLUMN content_revision INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_entries_content_revision ON entries(content_revision);

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
