export interface Env {
  DB: D1Database;
  AUTH_TOKEN?: string;
  CLIENT_SECRET?: string;
  APP_NAME?: string;
  JWT_SECRET?: string;
}

export interface EntryRow {
  id: number;
  url: string | null;
  title: string | null;
  content: string | null;
  preview_picture: string | null;
  domain_name: string | null;
  reading_time: number | null;
  language: string | null;
  is_archived: number;
  is_starred: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface WallabagEntry {
  id: number;
  title: string;
  url: string;
  content: string;
  is_archived: number;
  is_starred: number;
  user_name: string;
  user_email: string;
  user_id: number;
  tags: Array<{ id: number; label: string; slug: string }>;
  is_public: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  published_by: string[];
  reading_time: number;
  domain_name: string;
  preview_picture: string | null;
  language: string;
  starred_at: string | null;
  archived_at: string | null;
  mimetype?: string;
  text?: string;
  annotations?: any[];
  origin_url?: string | null;
  given_url?: string | null;
}
