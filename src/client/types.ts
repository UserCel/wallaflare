export interface AnnotationRange {
  start: string;
  startOffset: number;
  end: string;
  endOffset: number;
}

export interface Annotation {
  id: number | string;
  entry_id?: number;
  quote: string;
  text?: string;
  color?: "yellow" | "green" | "blue" | "pink" | "purple" | string;
  position?: number;
  ranges?: AnnotationRange[];
  created_at?: string;
  updated_at?: string;
}

export interface Tag {
  id?: number | string;
  label: string;
  slug?: string;
  count?: number;
}

export interface Article {
  id: number;
  title: string;
  url: string;
  domain_name?: string;
  content?: string;
  created_at: string;
  updated_at?: string;
  published_at?: string;
  reading_time?: number;
  preview_picture?: string;
  is_archived: number | boolean;
  is_starred: number | boolean;
  tags?: Array<Tag | string>;
  user_name?: string;
  user_email?: string;
  user_id?: number;
  mimetype?: string;
  language?: string;
  reading_progress?: number;
  annotations?: Annotation[];
}

export type FilterType = "unread" | "starred" | "archive" | "all" | "tag";
export type ViewMode = "list" | "grid" | "compact";
export type SortOrder = "newest" | "oldest" | "az" | "za" | "reading_time_asc" | "reading_time_desc";
export type ThemeType = "dark" | "light" | "sepia" | "oled";
export type ReaderFontType = "serif" | "sans" | "mono" | "dyslexic";

export interface OutboxMutation {
  id: string;
  action: string;
  payload: any;
  createdAt: number;
  retryCount: number;
}

export interface SyncCounts {
  total: number;
  unread: number;
  archive: number;
  starred: number;
}
