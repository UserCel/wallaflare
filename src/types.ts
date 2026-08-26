export interface AnnotationItem {
  id: number;
  entry_id: number;
  annotator_schema_version?: string;
  quote: string;
  text?: string;
  color?: string;
  ranges?: any[];
  target?: any;
  created_at: string;
  updated_at: string;
  user?: string;
}

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
  author?: string | null;
  is_archived: number;
  is_starred: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  revision?: number;
}

export interface WallabagEntry {
  id: number;
  title: string;
  url: string;
  hashed_url: string | null;
  given_url: string | null;
  hashed_given_url: string | null;
  content: string;
  is_archived: number;
  archived_at: string | null;
  is_starred: number;
  starred_at: string | null;
  user_name: string;
  user_email: string;
  user_id: number;
  tags: Array<{ id: number; label: string; slug: string }>;
  is_public: boolean;
  uid: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  published_by: string[];
  reading_time: number;
  domain_name: string;
  preview_picture: string | null;
  language: string;
  mimetype?: string;
  text?: string;
  annotations?: any[];
  origin_url?: string | null;
}
