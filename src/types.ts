export interface Env {
  DB: D1Database;
  APP_NAME?: string;
  AUTH_TOKEN?: string;
  CLIENT_ID?: string;
  CLIENT_SECRET?: string;
}

export interface EntryRow {
  id: number;
  url: string | null;
  title: string;
  content: string;
  preview_picture: string | null;
  domain_name: string | null;
  reading_time: number;
  language: string;
  is_archived: number; // 0 or 1
  is_starred: number; // 0 or 1
  created_at: string; // ISO8601 string
  updated_at: string; // ISO8601 string
}

export interface WallabagTag {
  id: number;
  label: string;
  slug: string;
}

export interface WallabagEntry {
  id: number;
  title: string;
  url: string;
  is_archived: number;
  is_starred: number;
  content: string;
  created_at: string;
  updated_at: string;
  reading_time: number;
  domain_name: string;
  preview_picture: string | null;
  user_id: number;
  user_name: string;
  user_email: string;
  language: string;
  tags: WallabagTag[];
  mimetype: string;
  text: string;
}

export interface WallabagEntriesResponse {
  page: number;
  limit: number;
  pages: number;
  total: number;
  _links: {
    self: { href: string };
    first: { href: string };
    last: { href: string };
    next?: { href: string };
    prev?: { href: string };
  };
  _embedded: {
    items: WallabagEntry[];
  };
}

export interface OAuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string | null;
  refresh_token: string;
}

export interface ExtractedArticle {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  byline?: string | null;
  domainName: string;
  previewPicture?: string | null;
  readingTime: number;
  language: string;
}
