import { Article, FilterType, ViewMode, SortOrder, ThemeType, ReaderFontType, Annotation } from "./types";
import {
  getStoredTheme,
  getStoredReaderFont,
  getStoredReaderFontSize,
  getStoredReaderLineHeight,
  getStoredReaderContentWidth,
  getStoredViewMode,
  getStoredSortOrder
} from "./storage/preferences";

export interface AppState {
  allEntries: Article[];
  currentFilter: FilterType;
  activeFilterTag: string;
  activeArticleId: number | null;
  selectedArticleIds: Set<number>;
  currentViewMode: ViewMode;
  currentSortOrder: SortOrder;
  isFocusMode: boolean;
  searchQuery: string;
  currentArticlesPage: number;
  totalArticlesPages: number;
  currentRenderLimit: number;
  isLoadingMoreArticles: boolean;
  isFetchingArticles: boolean;
  isOnline: boolean;
  serverRevision: number;
  isEpochReset: boolean;
  activeTheme: ThemeType;
  readerFont: ReaderFontType;
  readerFontSize: number;
  readerLineHeight: string;
  readerContentWidth: string;
  activeSelectionRange: Range | null;
  activeSelectedQuote: string;
  currentHighlightAnnotation: Annotation | null;
  sidebarTagsCollapsed: boolean;
  confirmResolve: ((val: boolean) => void) | null;
}

export const state: AppState = {
  allEntries: [],
  currentFilter: "unread",
  activeFilterTag: "",
  activeArticleId: null,
  selectedArticleIds: new Set<number>(),
  currentViewMode: getStoredViewMode(),
  currentSortOrder: getStoredSortOrder() as SortOrder,
  isFocusMode: false,
  searchQuery: "",
  currentArticlesPage: 1,
  totalArticlesPages: 1,
  currentRenderLimit: 30,
  isLoadingMoreArticles: false,
  isFetchingArticles: false,
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  serverRevision: 0,
  isEpochReset: false,
  activeTheme: getStoredTheme(),
  readerFont: getStoredReaderFont(),
  readerFontSize: getStoredReaderFontSize(),
  readerLineHeight: getStoredReaderLineHeight(),
  readerContentWidth: getStoredReaderContentWidth(),
  activeSelectionRange: null,
  activeSelectedQuote: "",
  currentHighlightAnnotation: null,
  sidebarTagsCollapsed: false,
  confirmResolve: null
};

export function getActiveArticle(): Article | null {
  if (!state.activeArticleId) return null;
  return state.allEntries.find((e) => e.id === state.activeArticleId) || null;
}

export function findArticle(id: number): Article | null {
  return state.allEntries.find((e) => e.id === id) || null;
}

export function updateArticleInState(id: number, patch: Partial<Article>): void {
  const art = findArticle(id);
  if (art) {
    Object.assign(art, patch);
  }
}
