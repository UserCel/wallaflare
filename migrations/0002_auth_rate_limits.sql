-- Migration 0002: Add auth_rate_limits table for brute-force prevention
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  ip TEXT PRIMARY KEY,
  failed_attempts INTEGER DEFAULT 0,
  last_attempt_at INTEGER NOT NULL,
  locked_until INTEGER DEFAULT 0
);
