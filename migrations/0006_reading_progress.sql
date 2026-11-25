-- Migration 0006: Optional cross-device reading progress ratio (0..1)
ALTER TABLE entries ADD COLUMN reading_progress REAL DEFAULT 0;
