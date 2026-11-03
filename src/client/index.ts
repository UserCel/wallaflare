import { saveArticleWithFallback, setParserMode, getParserMode, clientExtractArticle, ParserMode } from './extractor';
import { showToast, hideToast } from './components/toast';
import { openModal, closeModal } from './modals/manager';
import {
  handleOverlayPopstate,
  pushOverlayHistory,
  popOverlayHistory,
  getOverlayStack,
  clearOverlayHistory
} from './utils/overlay-history';
import { initPwa, handlePwaShareTarget } from './utils/pwa';
import { showConfirmDialog, handleConfirmModalOk, handleConfirmModalCancel } from './modals/confirm';
import { showPromptDialog, handlePromptModalSubmit, handlePromptModalCancel } from './modals/prompt';
import { openEditTitleModal, handleSaveTitle, batchEditTitle } from './modals/edit-title';
import { showCreatedTokenModal, copyTokenDisplayValue, closeTokenDisplayModal } from './modals/token-display';
import { copyDirectText, fallbackCopyText } from './utils/clipboard';
import {
  currentMinNativeVersion,
  getAppWebVersion,
  getRunningNativeVersion,
  compareSemVer,
  checkNativeApkVersion,
  checkCapacitorOtaFromVersion,
  showOtaRestartBanner,
  initCapacitorOtaUpdater,
  updateVersionDisplay,
  syncNativeServerConfig
} from './native/ota';
import {
  OUTBOX_STORAGE_KEY,
  getPendingMutations,
  savePendingMutations,
  enqueueMutation,
  processOutboxMutations
} from './storage/outbox';
import {
  openIndexedDB,
  deduplicateEntries,
  clearIndexedDB,
  saveEntriesToIndexedDB,
  deleteEntryFromIndexedDB,
  loadEntriesFromIndexedDB
} from './storage/db';
import {
  toggleReaderSearchBar,
  openReaderSearchBar,
  closeReaderSearchBar,
  clearReaderSearchMatches,
  handleReaderSearchInput,
  handleReaderSearchKeydown,
  jumpReaderSearchMatch
} from './reader/search';
import {
  initTypographyControls,
  setReaderFontFamily,
  setReaderFont,
  setReaderFontSize,
  adjustReaderFontSize,
  setReaderLineHeight,
  setReaderContentWidth,
  setReaderTextAlignment,
  setTheme,
  toggleTheme,
  toggleReaderAppearancePopover,
  closeReaderAppearancePopover
} from './reader/typography';
import {
  setReaderStatusBar,
  updateReadingProgress
} from './reader/view';
import {
  updateSettingsStats,
  setParserEngine,
  updateParserEngineUI,
  formatTokenTimestamp,
  populateServerConfigInputs,
  loadPersonalTokens,
  handleCreatePersonalToken,
  handleRenamePersonalToken,
  handleRevokePersonalToken,
  openSettingsModal,
  switchSettingsTab,
  handleSettingsMobileBack,
  openGlobalTagModal,
  openSyncModal,
  openServerConnectModal,
  openWipeDbModal,
  reconcileDatabase,
  handleSaveServerConnection
} from './modals/settings';
import {
  escapeHtml,
  htmlToMarkdown,
  shareOrDownloadBlob,
  exportMarkdown,
  exportActiveMarkdown,
  exportPdf,
  exportActivePdf,
  downloadEpub,
  downloadActiveEpub,
  handleExportBatchAnthologyEpub,
  handleBatchExportEpub,
  handleBatchExportMarkdown,
  handleBatchExportPdf,
  handleBatchExportJson
} from './reader/export';
import {
  updateHighlightsBadge,
  getSortedAnnotations,
  toggleReaderHighlightsModal,
  openArticleHighlightsModal,
  filterHighlightsModalList,
  setHighlightsSort,
  renderModalHighlightsList,
  scrollToAnnotation,
  deleteModalAnnotation,
  editModalAnnotation,
  formatAnnotationReadable,
  formatAllAnnotationsReadable,
  copyModalAnnotation,
  copyAllModalHighlights,
  batchOpenHighlights
} from './modals/highlights';
import {
  isRtlText,
  getSelectionContext,
  highlightTextInNode,
  applyAnnotationsToReader,
  openHighlightPopover,
  closeHighlightPopover,
  adjustPopoverSelection,
  adjustModalSelection,
  adjustAnnotationSelection,
  copyPopoverQuote,
  changePopoverHighlightColor,
  deletePopoverHighlight,
  handleCreateHighlight,
  handleCreateHighlightWithNote,
  handleCopySelection,
  selectModalNoteColor,
  openAnnotationNoteModal,
  closeAnnotationNoteModal,
  handleSaveAnnotationNoteForm,
  clearActiveTextSelection,
  initReaderSelectionHandlers,
  copyCurrentAnnotationNoteModal
} from './reader/annotations';
import {
  handleAddArticleBtnClick,
  handleAddTextBtnClick,
  renderAddTextTagChips,
  removeAddTextTag,
  syncAddTextTagChips,
  handleIngestUrl,
  handleIngestText
} from './modals/add-article';
import { escapeHtml } from './utils/dom';
import { formatCardDate, normalizeUrl } from './utils/format';
import {
  openTagModal,
  closeTagModal,
  openTagModalForSelection,
  renderTagModalUI,
  addQuickTagToActiveArticles,
  removeTagFromActiveArticles,
  submitAddTag,
  openGlobalTagManager,
  closeGlobalTagModal,
  renderGlobalTagManagerUI,
  deleteGlobalTag,
  submitCreateGlobalTag,
  handleAddTagBtnClick,
  handleRemoveTagBtnClick,
  handleFilterByTagClick,
  handleDeleteGlobalTagClick,
  cleanupUnusedTags
} from './modals/tags';
import {
  getEffectiveGlobalTags,
  loadGlobalTags,
  renderSidebarTags,
  toggleSidebarTagsCollapse,
  filterByTag,
  setFilter,
  updateCounts,
  getSelectedTagFilter,
  setSelectedTagFilter,
  getCachedGlobalTags,
  setCachedGlobalTags,
  getIsSidebarTagsCollapsed,
  setIsSidebarTagsCollapsed
} from './components/sidebar';
import {
  openSpeedRead,
  closeSpeedRead,
  toggleSpeedReadPlay,
  playSpeedRead,
  pauseSpeedRead,
  stepSpeedRead,
  restartSpeedRead,
  adjustSpeedReadWpm,
  setSpeedReadWpm,
  adjustSpeedReadFontSize,
  setSpeedReadFontSize,
  toggleSpeedReadFontFamily,
  handleSpeedReadScrub,
  handleSpeedReadKeydown,
  isSpeedReadOpen
} from './reader/speed-read';
// Wallaflare Modular Client Entry Point - Full Parity Architecture

    let allEntries = [];
    let cachedGlobalTags = [];
    let currentFilter = 'unread';
    let activeArticleId = null;
    let activeKeyboardPane = "list"; // "list" | "reader"

    function setKeyboardPaneFocus(pane) {
      activeKeyboardPane = pane;
      const paneReader = document.getElementById("paneReader");
      if (pane === "reader" && !isFocusMode && window.innerWidth >= 1024 && activeArticleId) {
        paneReader?.classList.add("has-keyboard-focus");
        document.body.classList.add("reader-pane-focused");
      } else {
        paneReader?.classList.remove("has-keyboard-focus");
        document.body.classList.remove("reader-pane-focused");
      }
    }
    let selectedArticleIds = new Set();
    let currentViewMode = 'list';
    let currentSortOrder = 'newest';
    let isFocusMode = false;

    // Appearance state
    let readerFont = localStorage.getItem('wf_reader_font') || 'serif';
    let readerFontSize = parseInt(localStorage.getItem('wf_reader_font_size') || '18', 10);
    let readerLineHeight = localStorage.getItem('wf_reader_line_height') || '1.68';
    let readerContentWidth = localStorage.getItem('wf_reader_content_width') || '880px';
    let readerTextAlignment = localStorage.getItem('wf_reader_alignment') || 'start';
    if (readerContentWidth === '100%') readerContentWidth = '1060px';
    let activeTheme = localStorage.getItem('wf_theme') || 'dark';

    function initAppearanceSettings() {
      setReaderFontFamily(readerFont, false);
      setReaderFontSize(readerFontSize, false);
      setReaderLineHeight(readerLineHeight, false);
      setReaderContentWidth(readerContentWidth, false);
      setReaderTextAlignment(readerTextAlignment, false);
      setTheme(activeTheme, false);
    }

    function toggleReaderFocusMode(force) {
      if (typeof force === 'boolean') isFocusMode = force;
      else isFocusMode = !isFocusMode;

      if (isFocusMode) {
        document.body.classList.add('focus-mode');
        setKeyboardPaneFocus('reader');
        showToast('Focus Mode activated (press f or Esc to exit)', 2000);
      } else {
        document.body.classList.remove('focus-mode');
        setKeyboardPaneFocus('list');
      }
    }

    function generateUnifiedArticleMenuHtml(opts) {
      const { mode = 'card', item = null, items = [], closeFnName = 'closeAllCardMenus()' } = opts || {};
      const targetItem = item || (items && items.length === 1 ? items[0] : null);

      if (targetItem) {
        const id = targetItem.id;
        const isStarred = Boolean(targetItem.is_starred);
        const isArchived = Boolean(targetItem.is_archived);
        const starLabel = isStarred ? 'Unstar' : 'Star';
        const archiveLabel = isArchived ? 'Move to Unread' : 'Archive';

        const origLinkBtn = targetItem.url
          ? '<button type="button" class="menu-item" onclick="' + closeFnName + '; openArticleOriginalLink(' + id + ');">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>' +
              '<span>Open Original Link</span>' +
            '</button>'
          : '';

        const readBtn = (mode === 'card')
          ? '<button type="button" class="menu-item" onclick="' + closeFnName + '; openReader(' + id + ');">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>' +
              '<span>Read Article</span>' +
            '</button>'
          : '';

        const isSinglePane = typeof window !== 'undefined' && (
          window.innerWidth < 1024 ||
          document.body.classList.contains('mobile-view') ||
          document.body.classList.contains('is-reading-mobile')
        );

        const focusModeBtn = (mode === 'reader' && !isSinglePane)
          ? '<button type="button" class="menu-item" onclick="' + closeFnName + '; toggleFocusMode();">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>' +
              '<span>Toggle Focus Mode (f)</span>' +
            '</button>'
          : '';

        return '<div style="padding: 0.45rem 0.65rem 0.4rem 0.65rem; border-bottom: 1px solid var(--border-color); font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 230px;" title="' + escapeHtml(targetItem.title || 'Article') + '">' +
            escapeHtml(targetItem.title || 'Article') +
          '</div>' +
          readBtn +
          '<button type="button" class="menu-item" onclick="' + closeFnName + '; toggleStar(' + id + ', ' + isStarred + ');">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (isStarred ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' +
            '<span>' + starLabel + '</span>' +
          '</button>' +
          '<button type="button" class="menu-item" onclick="' + closeFnName + '; toggleArchive(' + id + ', ' + isArchived + ');">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>' +
            '<span>' + archiveLabel + '</span>' +
          '</button>' +
          '<button type="button" class="menu-item" onclick="' + closeFnName + '; openTagModal(' + id + ');">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>' +
            '<span>Edit Tags</span>' +
          '</button>' +
          '<button type="button" class="menu-item" onclick="' + closeFnName + '; openArticleHighlightsModal(' + id + ');">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
            '<span>Highlights & Notes</span>' +
          '</button>' +
          '<div class="menu-item-expandable">' +
            '<button type="button" class="menu-item menu-item-parent" onclick="event.stopPropagation(); this.parentElement.classList.toggle(\'expanded\');">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' +
              '<span>Export</span>' +
              '<svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
            '</button>' +
            '<div class="menu-sub-items">' +
              '<button type="button" class="menu-item menu-sub-item" onclick="' + closeFnName + '; downloadEpub(' + id + ');"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>EPUB (.epub)</span></button>' +
              '<button type="button" class="menu-item menu-sub-item" onclick="' + closeFnName + '; exportMarkdown(' + id + ');"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span>Markdown (.md)</span></button>' +
              '<button type="button" class="menu-item menu-sub-item" onclick="' + closeFnName + '; exportPdf(' + id + ');"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h3a1.5 1.5 0 0 0 0-3H8v6"></path><path d="M14 10v6"></path></svg><span>PDF (.pdf)</span></button>' +
            '</div>' +
          '</div>' +
          origLinkBtn +
          '<button type="button" class="menu-item" onclick="' + closeFnName + '; openEditTitleModal(' + id + ');">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
            '<span>Edit Title</span>' +
          '</button>' +
          '<button type="button" class="menu-item" onclick="' + closeFnName + '; refetchArticleContent(' + id + ');">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>' +
            '<span>Re-fetch Content</span>' +
          '</button>' +
          focusModeBtn +
          '<div class="menu-divider"></div>' +
          '<button type="button" class="menu-item menu-item-danger" onclick="' + closeFnName + '; deleteEntryAction(' + id + ');">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
            '<span>Delete Article</span>' +
          '</button>';
      }

      const count = items.length;
      const countLabel = count + ' article' + (count === 1 ? '' : 's') + ' selected';

      return '<div style="padding: 0.5rem 0.75rem 0.45rem; border-bottom: 1px solid var(--border-color); font-size: 0.78rem; font-weight: 700; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; justify-content: space-between;">' +
          '<span>' + countLabel + '</span>' +
          '<button type="button" class="btn-icon" onclick="clearArticleSelection(); ' + closeFnName + ';" title="Clear selection" style="padding: 2px; width: 20px; height: 20px; font-size: 0.85rem; line-height: 1;">&times;</button>' +
        '</div>' +
        '<button type="button" class="menu-item" onclick="' + closeFnName + '; batchArchiveArticles();">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>' +
          '<span>Archive / Unarchive</span>' +
        '</button>' +
        '<button type="button" class="menu-item" onclick="' + closeFnName + '; batchStarArticles();">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>' +
          '<span>Star / Unstar</span>' +
        '</button>' +
        '<button type="button" class="menu-item" onclick="' + closeFnName + '; openTagModalForSelection();">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>' +
          '<span>Edit Tags</span>' +
        '</button>' +
        '<div class="menu-item-expandable">' +
          '<button type="button" class="menu-item menu-item-parent" onclick="event.stopPropagation(); this.parentElement.classList.toggle(\'expanded\');">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>' +
            '<span>Bulk Export</span>' +
            '<svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
          '</button>' +
          '<div class="menu-sub-items">' +
            '<button type="button" class="menu-item menu-sub-item" onclick="' + closeFnName + '; handleExportBatchAnthologyEpub();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>Anthology EPUB (.epub)</span></button>' +
            '<button type="button" class="menu-item menu-sub-item" onclick="' + closeFnName + '; handleExportBatchEpub();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg><span>ZIP (Individual EPUBs)</span></button>' +
            '<button type="button" class="menu-item menu-sub-item" onclick="' + closeFnName + '; handleExportBatchMarkdown();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span>ZIP (Markdown)</span></button>' +
            '<button type="button" class="menu-item menu-sub-item" onclick="' + closeFnName + '; handleExportBatchJson();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span>JSON (.json)</span></button>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="menu-item" onclick="' + closeFnName + '; batchRefetchContent();">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>' +
          '<span>Re-fetch Content</span>' +
        '</button>' +
        '<div class="menu-divider"></div>' +
        '<button type="button" class="menu-item menu-item-danger" onclick="' + closeFnName + '; batchDeleteArticles();">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
          '<span>Delete (' + count + ') Articles</span>' +
        '</button>';
    }

    function toggleReaderMoreMenu(e) {
      if (e) e.stopPropagation();
      const menu = document.getElementById('readerMoreMenuDropdown');
      if (!menu) return;
      const isOpen = menu.classList.contains('open');
      closeAllCardMenus();
      closeReaderAppearancePopover();
      if (isOpen) {
        menu.classList.remove('open');
      } else {
        const item = allEntries.find(e => e.id === activeArticleId);
        if (item) {
          menu.innerHTML = generateUnifiedArticleMenuHtml({
            item,
            mode: 'reader',
            closeFnName: 'closeReaderMoreMenu()'
          });
        }
        menu.classList.add('open');
        const backdrop = document.getElementById('cardMenuBackdrop');
        if (backdrop) backdrop.style.display = 'block';
      }
    }

    function closeReaderMoreMenu() {
      const menu = document.getElementById('readerMoreMenuDropdown');
      if (menu) menu.classList.remove('open');
      const backdrop = document.getElementById('cardMenuBackdrop');
      if (backdrop) backdrop.style.display = 'none';
      const exportWrap = document.getElementById('readerExportWrap');
      if (exportWrap) exportWrap.classList.remove('expanded');
    }

    function toggleReaderExportSubmenu() {
      document.getElementById('readerExportWrap')?.classList.toggle('expanded');
    }

    function toggleBatchExportSubmenu() {
      document.getElementById('batchExportWrap')?.classList.toggle('expanded');
    }

    function openActiveOriginalLink() {
      if (!activeArticleId) return;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item && item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
    }

    function getEffectiveServerUrl() {
      const configured = localStorage.getItem('wf_server_url');
      if (configured && configured.trim().startsWith('http')) {
        return configured.trim().replace(new RegExp('/+$ '.trim()), '');
      }
      if (window.location.origin && !window.location.origin.includes('localhost') && !window.location.origin.startsWith('capacitor://') && !window.location.origin.startsWith('file://')) {
        return window.location.origin;
      }
      return '';
    }

    function getApiBaseUrl() {
      if (isCapacitorApp()) {
        const configured = localStorage.getItem('wf_server_url');
        if (configured && configured.trim().startsWith('http')) {
          return configured.trim().replace(new RegExp('/+$ '.trim()), '');
        }
      }
      return '';
    }

    function isCapacitorApp() {
      return Boolean(window.IS_CAPACITOR_APP || window.Capacitor?.isNativePlatform?.() || window.AndroidNative);
    }

    function getAuthToken() {
      return localStorage.getItem('wf_auth_token') || '';
    }

    function setAuthToken(token) {
      if (token) {
        localStorage.setItem('wf_auth_token', token);
        try {
          const isHttps = location.protocol === 'https:';
          document.cookie = 'wf_auth_token=' + encodeURIComponent(token) + '; Path=/; SameSite=Lax; Max-Age=31536000' + (isHttps ? '; Secure' : '');
        } catch (e) {}
      } else {
        localStorage.removeItem('wf_auth_token');
        try {
          document.cookie = 'wf_auth_token=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'PHPSESSID=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
        } catch (e) {}
      }
      syncNativeServerConfig();
    }

    async function authFetch(url, options = {}) {
      const fullUrl = url.startsWith('http') ? url : (getApiBaseUrl() + url);
      const headers = new Headers(options.headers || {});
      const token = getAuthToken();
      if (token) {
        headers.set('Authorization', 'Bearer ' + token);
      }
      const response = await fetch(fullUrl, { ...options, headers });
      if (response.status === 401) {
        // Token was rejected, revoked, or invalid: purge cached bad credentials immediately so we never burn rate-limit attempts
        setAuthToken('');
        allEntries = [];
        cachedGlobalTags = [];
        currentSyncRev = 0;
        try {
          localStorage.removeItem('wf_cached_articles');
          localStorage.removeItem('wf_cached_tags');
          localStorage.removeItem('wf_cached_counts');
        } catch (e) {}
        showAuthOverlay();
      }
      // Inspect header-reported web asset version and trigger background OTA if newer
      const webVer = response.headers.get('X-Wallaflare-Web-Version');
      const minNative = response.headers.get('X-Wallaflare-Min-Native-Version');
      if (webVer) {
        checkCapacitorOtaFromVersion(webVer, minNative);
      }
      return response;
    }

    function showAuthOverlay() {
      document.documentElement.classList.add('wf-needs-auth');
      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'flex';
      const grid = document.getElementById('articlesGrid');
      if (grid && !getAuthToken()) {
        grid.innerHTML = '';
      }
    }

    function hideAuthOverlay() {
      document.documentElement.classList.remove('wf-needs-auth');
      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'none';
    }


    function getClientDeviceLabel(): string {
      if (isCapacitorApp()) return 'Wallaflare Android App';
      const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '') : '';
      let os = '';
      if (/android/i.test(ua)) os = 'Android';
      else if (/iPad|iPhone|iPod/.test(ua)) os = 'iOS';
      else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
      else if (/windows/i.test(ua)) os = 'Windows';
      else if (/cros/i.test(ua)) os = 'ChromeOS';
      else if (/linux/i.test(ua)) os = 'Linux';

      let browser = '';
      if (/edg/i.test(ua)) browser = 'Edge';
      else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
      else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
      else if (/safari/i.test(ua)) browser = 'Safari';

      if (browser && os) {
        return `Web Dashboard (${browser} on ${os})`;
      } else if (os) {
        return `Web Dashboard (${os})`;
      }
      return 'Web Dashboard';
    }

    async function handleLogin(e) {
      e.preventDefault();
      const input = document.getElementById('authKeyInput');
      const submitBtn = document.getElementById('authSubmitBtn');
      const errorBanner = document.getElementById('authErrorMsg');
      const token = input ? input.value.trim() : '';
      if (!token) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
      }
      if (errorBanner) errorBanner.style.display = 'none';

      try {
        // Exchange master password for an issued device token
        const exchangeUrl = (getApiBaseUrl() || '') + '/api/auth/token';
        const exchangeRes = await fetch(exchangeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: token,
            label: getClientDeviceLabel()
          })
        });

        const data = await exchangeRes.json().catch(() => ({}));
        if (exchangeRes.ok && data.token) {
          setAuthToken(data.token);
          hideAuthOverlay();
          input.value = '';
          showToast('✓ Library Unlocked');
          loadArticles(false);
        } else {
          setAuthToken('');
          if (errorBanner) {
            errorBanner.textContent = data.message || 'Invalid authentication token / password.';
            errorBanner.style.display = 'block';
          }
        }
      } catch (err) {
        if (errorBanner) {
          errorBanner.textContent = 'Connection error. Please check server URL.';
          errorBanner.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Unlock';
        }
      }
    }

    async function handleLogout() {
      const confirmed = await showConfirmDialog(
        'Log Out',
        'Are you sure you want to log out of Wallaflare?\n\nAll locally cached articles, offline data, and sync states will be cleared.',
        'Log Out',
        true
      );
      if (confirmed) {
        setAuthToken('');
        localStorage.removeItem('wf_sync_rev');
      localStorage.removeItem('wf_instance_id');
        localStorage.removeItem('wf_cached_articles');
        localStorage.removeItem('wf_cached_tags');
        localStorage.removeItem('wf_cached_counts');
      localStorage.removeItem('wf_pending_mutations');
      localStorage.removeItem('wf_instance_id');
        localStorage.removeItem('wf_server_url');
        localStorage.removeItem('wf_pending_mutations');
      localStorage.removeItem('wf_instance_id');
        currentSyncRev = 0;
        allEntries = [];
        await clearIndexedDB();
        filterArticles();
        showAuthOverlay();
        showToast('Logged out securely');
      }
    }

    async function handleManualRefresh(btn) {
      const svg = btn?.querySelector('svg') || btn;
      if (svg) svg.classList.add('is-refreshing-spin');
      try {
        await loadArticles(false);
      } finally {
        if (svg) svg.classList.remove('is-refreshing-spin');
      }
    }

    // Keyboard Shortcuts & Modal Dismissal Hierarchy
    window.addEventListener('keydown', (e) => {
      // Speed Read Modal Interception (highest priority when active)
      if (isSpeedReadOpen()) {
        if (handleSpeedReadKeydown(e)) return;
      }

      // Ctrl+K / Cmd+K: Open Add URL dialog
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK') &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          !document.activeElement?.isContentEditable) {
        e.preventDefault();
        openModal('addUrlModal');
        return;
      }

      // Ctrl+Shift+N / Cmd+Shift+N: Open Add Custom Text dialog
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN') &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          !document.activeElement?.isContentEditable) {
        e.preventDefault();
        handleAddTextBtnClick();
        return;
      }

      // Ctrl+A / Cmd+A: Select all visible articles in the list
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A' || e.code === 'KeyA') &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          !document.activeElement?.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen) {
          e.preventDefault();
          const visibleEntries = getFilteredEntries();
          if (visibleEntries && visibleEntries.length > 0) {
            visibleEntries.forEach(item => selectedArticleIds.add(item.id));
            updateBatchUI();
          }
          return;
        }
      }

      // ? key: Toggle Keyboard Shortcuts Modal
      if ((e.key === '?' || (e.shiftKey && e.key === '/')) &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          !document.activeElement?.isContentEditable) {
        e.preventDefault();
        const shortcutsModal = document.getElementById('shortcutsModal');
        if (shortcutsModal?.classList.contains('open')) {
          closeModal('shortcutsModal');
        } else {
          openModal('shortcutsModal');
        }
        return;
      }

      // Ctrl+F / Cmd+F: Fast in-reader search when reader is open, or library search when closed
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F' || e.code === 'KeyF')) {
        if (activeArticleId) {
          e.preventDefault();
          openReaderSearchBar();
          return;
        } else {
          e.preventDefault();
          document.getElementById('searchInput')?.focus();
          return;
        }
      }

      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
        return;
      }

      if (e.key === 'Escape') {
        // -0.1. Exit Speed Read Focus Mode
        if (isSpeedReadOpen()) {
          e.preventDefault();
          closeSpeedRead();
          return;
        }

        // 0. Blur and clear library search input if focused (preserves active article)
        const searchInput = document.getElementById('searchInput');
        if (document.activeElement === searchInput) {
          e.preventDefault();
          e.stopPropagation();
          if (searchInput && searchInput.value) {
            clearSearchInput();
          }
          searchInput?.blur();
          setKeyboardPaneFocus('list');
          return;
        }

        // 0.1. Close In-Reader Find Bar
        const readerSearchBar = document.getElementById('readerSearchBar');
        if (readerSearchBar && readerSearchBar.style.display !== 'none') {
          e.preventDefault();
          closeReaderSearchBar();
          return;
        }

        // 1. Dismiss active text selection or highlight toolbar/popover
        const sel = window.getSelection();
        const highlightToolbar = document.getElementById('readerHighlightToolbar');
        const highlightPopover = document.getElementById('highlightPopover');
        const annHeader = document.getElementById('readerTopBarAnnotation');
        let dismissed = false;
        if (highlightToolbar && highlightToolbar.style.display !== 'none') {
          highlightToolbar.style.display = 'none';
          activeSelectionRange = null;
          activeSelectedQuote = '';
          dismissed = true;
        }
        if (annHeader && annHeader.style.display !== 'none') {
          clearActiveTextSelection();
          dismissed = true;
        }
        if (highlightPopover && highlightPopover.style.display !== 'none') {
          closeHighlightPopover();
          dismissed = true;
        }
        if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
          clearActiveTextSelection();
          dismissed = true;
        }
        if (dismissed) { e.preventDefault(); return; }

        // 2. Close Popovers and Dropdowns
        const appearancePopover = document.getElementById('readerAppearancePopover');
        if (appearancePopover && appearancePopover.style.display !== 'none') {
          e.preventDefault();
          closeReaderAppearancePopover();
          return;
        }
        const openCardMenu = document.querySelector('.card-dropdown-menu.open');
        if (openCardMenu) {
          e.preventDefault();
          closeAllCardMenus();
          closeReaderMoreMenu();
          return;
        }
        const mobileNav = document.getElementById('mobileNavDropdown');
        if (mobileNav && mobileNav.classList.contains('open')) {
          e.preventDefault();
          closeMobileNavMenu();
          return;
        }

        // 3. Close Dialogs & Modals
        const confirmModal = document.getElementById('confirmModal');
        if (confirmModal && confirmModal.classList.contains('open')) {
          e.preventDefault();
          handleConfirmModalCancel();
          return;
        }
        const annotationNoteModal = document.getElementById('annotationNoteModal');
        if (annotationNoteModal && annotationNoteModal.classList.contains('open')) {
          e.preventDefault();
          closeAnnotationNoteModal();
          return;
        }
        const readerHighlightsModal = document.getElementById('readerHighlightsModal');
        if (readerHighlightsModal && readerHighlightsModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('readerHighlightsModal');
          return;
        }
        const tagModal = document.getElementById('tagModal');
        if (tagModal && tagModal.classList.contains('open')) {
          e.preventDefault();
          closeTagModal();
          return;
        }
        const globalTagModal = document.getElementById('globalTagModal');
        if (globalTagModal && globalTagModal.classList.contains('open')) {
          e.preventDefault();
          closeGlobalTagModal();
          return;
        }
        const editTitleModal = document.getElementById('editTitleModal');
        if (editTitleModal && editTitleModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('editTitleModal');
          return;
        }
        const addUrlModal = document.getElementById('addUrlModal');
        if (addUrlModal && addUrlModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('addUrlModal');
          return;
        }
        const addTextModal = document.getElementById('addTextModal');
        if (addTextModal && addTextModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('addTextModal');
          return;
        }
        const syncModal = document.getElementById('syncModal');
        if (syncModal && syncModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('syncModal');
          return;
        }
        const siteCookieModal = document.getElementById('siteCookieModal');
        if (siteCookieModal && siteCookieModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('siteCookieModal');
          return;
        }
        const serverConnectModal = document.getElementById('serverConnectModal');
        if (serverConnectModal && serverConnectModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('serverConnectModal');
          return;
        }
        const wipeDbModal = document.getElementById('wipeDbModal');
        if (wipeDbModal && wipeDbModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('wipeDbModal');
          return;
        }
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal && settingsModal.classList.contains('open')) {
          e.preventDefault();
          if (settingsModal.classList.contains('is-viewing-panel')) {
            handleSettingsMobileBack();
            return;
          }
          closeModal('settingsModal');
          return;
        }
        const devModal = document.getElementById('devModal');
        if (devModal && devModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('devModal');
          return;
        }
        const shortcutsModal = document.getElementById('shortcutsModal');
        if (shortcutsModal && shortcutsModal.classList.contains('open')) {
          e.preventDefault();
          closeModal('shortcutsModal');
          return;
        }
        const anyOpenModal = document.querySelector('.modal-backdrop.open, .modal-overlay.open, .tag-modal-overlay.open, .modal.open');
        if (anyOpenModal) {
          e.preventDefault();
          anyOpenModal.classList.remove('open');
          return;
        }

        // 4. Selection Mode (Clear multi-selection first, preserving open reader)
        if (isSelectionMode()) {
          e.preventDefault();
          clearArticleSelection();
          return;
        }

        // 5. Focus Mode
        if (isFocusMode) {
          e.preventDefault();
          toggleReaderFocusMode(false);
          return;
        }

        // 6. Article Deselect / Reader Back
        if (document.body.classList.contains('is-reading-mobile')) {
          e.preventDefault();
          handleReaderBack();
          return;
        }
        if (activeArticleId) {
          e.preventDefault();
          closeReader(true);
          return;
        }
      }

      // Pane Switching: ArrowRight (focus reader) / ArrowLeft (focus article list)
      if (e.key === 'ArrowRight' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          !document.activeElement?.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen && activeArticleId) {
          e.preventDefault();
          setKeyboardPaneFocus('reader');
          return;
        }
      }

      if (e.key === 'ArrowLeft' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          !document.activeElement?.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen) {
          if (activeKeyboardPane === 'reader') {
            e.preventDefault();
            if (window.innerWidth < 1024 || document.body.classList.contains('is-reading-mobile')) {
              handleReaderBack();
            } else if (isFocusMode) {
              toggleReaderFocusMode(false);
            } else {
              setKeyboardPaneFocus('list');
            }
            return;
          }
        }
      }

      // Smooth Reader Scrolling: Space / Shift+Space / PageDown / PageUp
      if ((e.key === ' ' || e.key === 'Space' || e.code === 'Space' || e.key === 'PageDown' || e.key === 'PageUp') &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          !document.activeElement?.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen && activeKeyboardPane === 'reader' && activeArticleId) {
          e.preventDefault();
          const scrollEl = document.getElementById('readerScrollContainer');
          if (scrollEl) {
            const pageH = Math.max(300, Math.round(scrollEl.clientHeight * 0.8));
            const isUp = e.shiftKey || e.key === 'PageUp';
            scrollEl.scrollBy({ top: isUp ? -pageH : pageH, behavior: 'smooth' });
          }
          return;
        }
      }

      // Shift+Up / Shift+Down: Extend selection
      if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp') &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          !document.activeElement?.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen) {
          const visibleEntries = getFilteredEntries();
          if (visibleEntries && visibleEntries.length > 0) {
            e.preventDefault();
            const isDown = e.key === 'ArrowDown';
            let currentIdx = -1;
            if (activeArticleId) {
              currentIdx = visibleEntries.findIndex(item => item.id === activeArticleId);
            }
            if (currentIdx === -1) currentIdx = isDown ? 0 : visibleEntries.length - 1;

            if (activeArticleId) selectedArticleIds.add(activeArticleId);

            const nextIdx = isDown ? Math.min(visibleEntries.length - 1, currentIdx + 1) : Math.max(0, currentIdx - 1);
            const targetEntry = visibleEntries[nextIdx];
            if (targetEntry) {
              selectedArticleIds.add(targetEntry.id);
              activeArticleId = targetEntry.id;
              updateBatchUI();
              const card = document.getElementById('entry-card-' + targetEntry.id);
              card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            return;
          }
        }
      }

      // Keyboard Navigation / Scrolling: j / k / ArrowDown / ArrowUp
      if ((e.key === 'j' || e.key === 'ArrowDown' || e.key === 'k' || e.key === 'ArrowUp') &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA' &&
          !document.activeElement?.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (modalOpen) return;

        // If reader pane has keyboard focus and up/down arrow is pressed: scroll the reader!
        if (activeKeyboardPane === 'reader' && activeArticleId && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
          e.preventDefault();
          const scrollEl = document.getElementById('readerScrollContainer');
          if (scrollEl) {
            scrollEl.scrollBy({ top: e.key === 'ArrowDown' ? 80 : -80, behavior: 'smooth' });
          }
          return;
        }

        // Otherwise (or if j/k is pressed): navigate articles in the list!
        const visibleEntries = getFilteredEntries();
        if (!visibleEntries || visibleEntries.length === 0) return;

        e.preventDefault();
        const isNext = (e.key === 'j' || e.key === 'ArrowDown');
        let targetIndex = 0;

        if (activeArticleId) {
          const currentIdx = visibleEntries.findIndex(item => item.id === activeArticleId);
          if (currentIdx >= 0) {
            targetIndex = isNext ? Math.min(visibleEntries.length - 1, currentIdx + 1) : Math.max(0, currentIdx - 1);
          } else {
            targetIndex = 0;
          }
        } else {
          targetIndex = isNext ? 0 : (visibleEntries.length - 1);
        }

        const targetEntry = visibleEntries[targetIndex];
        if (targetEntry) {
          openReader(targetEntry.id, true);
          const card = document.getElementById('entry-card-' + targetEntry.id);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      }

      // 'r' key for Speed Read (RSVP)
      if ((e.key === 'r' || e.key === 'R') && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open, .speed-read-overlay.open');
        if (!modalOpen && activeArticleId) {
          e.preventDefault();
          openSpeedRead();
        }
      }

      // 'f' key for Focus Mode
      if (e.key === 'f' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen && window.innerWidth >= 1024 && activeArticleId) {
          e.preventDefault();
          toggleReaderFocusMode();
        }
      }

      // 'e' or 'a' key for Archive
      if ((e.key === 'e' || e.key === 'a') &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA' &&
          !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen) {
          if (isSelectionMode() && selectedArticleIds.size > 0) {
            e.preventDefault();
            batchToggleArchive();
          } else if (activeArticleId) {
            e.preventDefault();
            toggleActiveArchive();
          }
        }
      }

      // 's' or 'l' key for Star / Like
      if ((e.key === 's' || e.key === 'l') &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA' &&
          !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen) {
          if (isSelectionMode() && selectedArticleIds.size > 0) {
            e.preventDefault();
            batchToggleStar();
          } else if (activeArticleId) {
            e.preventDefault();
            toggleActiveStar();
          }
        }
      }

      // 't' key for Tags Manager
      if (e.key === 't' &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA' &&
          !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen) {
          if (isSelectionMode() && selectedArticleIds.size > 0) {
            e.preventDefault();
            openBatchTagModal();
          } else if (activeArticleId) {
            e.preventDefault();
            openTagModal(activeArticleId);
          }
        }
      }

      // 'd' / Delete / Backspace key for Delete
      if ((e.key === 'd' || e.key === 'Delete' || e.key === 'Backspace') &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA' &&
          !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (modalOpen) return;

        if (isSelectionMode() && selectedArticleIds.size > 0) {
          e.preventDefault();
          batchDeleteArticles();
        } else if (activeArticleId) {
          e.preventDefault();
          deleteEntryAction(activeArticleId);
        }
      }
    });

    // Android Back Button Navigation
    window.handleAndroidBackButton = function() {
      // -0.1. Exit Speed Read Focus Mode
      if (isSpeedReadOpen()) {
        closeSpeedRead();
        return true;
      }

      // 0. In-Reader Search Bar
      const readerSearchBar = document.getElementById('readerSearchBar');
      if (readerSearchBar && readerSearchBar.style.display !== 'none') {
        closeReaderSearchBar();
        return true;
      }

      // 1. Text Selection & Highlight Tools
      const highlightToolbar = document.getElementById('readerHighlightToolbar');
      const highlightPopover = document.getElementById('highlightPopover');
      const annHeader = document.getElementById('readerTopBarAnnotation');
      const sel = window.getSelection();
      let dismissed = false;
      if (highlightToolbar && highlightToolbar.style.display !== 'none') {
        highlightToolbar.style.display = 'none';
        activeSelectionRange = null;
        activeSelectedQuote = '';
        dismissed = true;
      }
      if (annHeader && annHeader.style.display !== 'none') {
        clearActiveTextSelection();
        dismissed = true;
      }
      if (highlightPopover && highlightPopover.style.display !== 'none') {
        closeHighlightPopover();
        dismissed = true;
      }
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        clearActiveTextSelection();
        dismissed = true;
      }
      if (dismissed) return true;

      // 2. Popovers and Dropdown menus
      const appearancePopover = document.getElementById('readerAppearancePopover');
      if (appearancePopover && appearancePopover.style.display !== 'none') {
        closeReaderAppearancePopover();
        return true;
      }
      const openCardMenu = document.querySelector('.card-dropdown-menu.open');
      if (openCardMenu) {
        closeAllCardMenus();
        closeReaderMoreMenu();
        return true;
      }
      const mobileNav = document.getElementById('mobileNavDropdown');
      if (mobileNav && mobileNav.classList.contains('open')) {
        closeMobileNavMenu();
        return true;
      }

      // 3. Modals & Dialogs
      const confirmModal = document.getElementById('confirmModal');
      if (confirmModal && confirmModal.classList.contains('open')) {
        handleConfirmModalCancel();
        return true;
      }
      const siteCookieModal = document.getElementById('siteCookieModal');
      if (siteCookieModal && siteCookieModal.classList.contains('open')) {
        closeModal('siteCookieModal');
        return true;
      }
      const wipeDbModal = document.getElementById('wipeDbModal');
      if (wipeDbModal && wipeDbModal.classList.contains('open')) {
        closeModal('wipeDbModal');
        return true;
      }
      const serverConnectModal = document.getElementById('serverConnectModal');
      if (serverConnectModal && serverConnectModal.classList.contains('open')) {
        closeModal('serverConnectModal');
        return true;
      }
      const globalTagModal = document.getElementById('globalTagModal');
      if (globalTagModal && globalTagModal.classList.contains('open')) {
        closeGlobalTagModal();
        return true;
      }
      const syncModal = document.getElementById('syncModal');
      if (syncModal && syncModal.classList.contains('open')) {
        closeModal('syncModal');
        return true;
      }
      const devModal = document.getElementById('devModal');
      if (devModal && devModal.classList.contains('open')) {
        closeModal('devModal');
        return true;
      }
      const annotationNoteModal = document.getElementById('annotationNoteModal');
      if (annotationNoteModal && annotationNoteModal.classList.contains('open')) {
        closeAnnotationNoteModal();
        return true;
      }
      const readerHighlightsModal = document.getElementById('readerHighlightsModal');
      if (readerHighlightsModal && readerHighlightsModal.classList.contains('open')) {
        closeModal('readerHighlightsModal');
        return true;
      }
      const tagModal = document.getElementById('tagModal');
      if (tagModal && tagModal.classList.contains('open')) {
        closeTagModal();
        return true;
      }
      const editTitleModal = document.getElementById('editTitleModal');
      if (editTitleModal && editTitleModal.classList.contains('open')) {
        closeModal('editTitleModal');
        return true;
      }
      const addUrlModal = document.getElementById('addUrlModal');
      if (addUrlModal && addUrlModal.classList.contains('open')) {
        closeModal('addUrlModal');
        return true;
      }
      const addTextModal = document.getElementById('addTextModal');
      if (addTextModal && addTextModal.classList.contains('open')) {
        closeModal('addTextModal');
        return true;
      }
      const settingsModal = document.getElementById('settingsModal');
      if (settingsModal && settingsModal.classList.contains('open')) {
        if (settingsModal.classList.contains('is-viewing-panel')) {
          handleSettingsMobileBack();
          return true;
        }
        closeModal('settingsModal');
        return true;
      }
      const openModalEl = document.querySelector('.modal-backdrop.open, .modal-overlay.open, .tag-modal-overlay.open, .modal.open');
      if (openModalEl) {
        openModalEl.classList.remove('open');
        return true;
      }

      // 4. Focus Mode
      if (isFocusMode) {
        toggleReaderFocusMode(false);
        return true;
      }

      // 5. Mobile reading view
      if (document.body.classList.contains('is-reading-mobile') || (window.innerWidth < 1024 && activeArticleId)) {
        closeReader(true);
        return true;
      }

      // 6. Selection mode
      if (isSelectionMode()) {
        clearArticleSelection();
        return true;
      }

      return false;
    };

    // Navigation & Routing
    window.addEventListener('popstate', (e) => {
      if (handleOverlayPopstate()) {
        return;
      }
      handleRouteState();
    });

    function handleRouteState() {
      const path = window.location.pathname;
      let readId = null;
      if (path.startsWith('/read/')) {
        readId = parseInt(path.slice(6), 10);
      } else if (path.startsWith('/view/')) {
        readId = parseInt(path.slice(6), 10);
      }
      if (readId && !isNaN(readId)) {
        openReader(readId, false);
        return;
      }

      if (path === '/starred') {
        setFilter('starred', false);
      } else if (path === '/archive') {
        setFilter('archive', false);
      } else if (path === '/all') {
        setFilter('all', false);
      } else {
        setFilter('unread', false);
      }

      closeReader(false);

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const settingsParam = urlParams.get('settings');
        const hash = window.location.hash || '';
        if (settingsParam || hash === '#settings' || hash.startsWith('#settings=')) {
          const targetTab = settingsParam || (hash.includes('=') ? hash.split('=')[1] : 'integrations');
          setTimeout(() => {
            if (typeof openSettingsModal === 'function') {
              openSettingsModal(targetTab || 'integrations');
            }
          }, 100);
        }
      } catch (e) {}
    }

    function navigateTo(path) {
      history.pushState({}, '', path);
      handleRouteState();
    }

    // Article Loading, Pagination & Caching
    let isLoadingArticles = false;
        hasCompletedInitialLoad = true;
    let currentArticlesPage = 1;
    let totalArticlesPages = 1;
    let totalArticlesCount = 0;
    let isLoadingMoreArticles = false;
    let serverLibraryCounts = null;
    let currentSyncRev = parseInt(localStorage.getItem('wf_sync_rev') || '0', 10);

    // -------------------------------------------------------------
    // Connection State & Offline Management
    // -------------------------------------------------------------
    let isOfflineMode = false;
    let hasCompletedInitialLoad = false;
    let lastOfflineToastTime = 0;

    function updateOfflineUI(offline) {
      const stateChanged = (isOfflineMode !== offline);
      if (!stateChanged && hasCompletedInitialLoad) {
        return;
      }
      isOfflineMode = offline;
      const btn = document.getElementById('addArticleBtn');
      const textBtn = document.getElementById('addTextBtn');
      const icon = document.getElementById('addArticleBtnIcon');
      const label = document.getElementById('addArticleBtnLabel');
      const sidebarBtn = document.getElementById('sidebarAddArticleBtn');
      const sidebarTextBtn = document.getElementById('sidebarAddTextBtn');
      const mobileDrawerBtn = document.getElementById('mobileDrawerAddArticleBtn');
      const mobileDrawerTextBtn = document.getElementById('mobileDrawerAddTextBtn');

      const offlineSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>';
      const onlineSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

      if (offline) {
        if (btn) {
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-offline-mode');
          btn.title = 'Offline Mode — Reading from local cache (Tap to retry)';
        }
        if (textBtn) {
          textBtn.title = 'Add Custom Text (Offline)';
        }
        if (sidebarBtn) {
          sidebarBtn.classList.remove('btn-primary');
          sidebarBtn.classList.add('btn-offline-mode');
          sidebarBtn.title = 'Offline Mode — Reading from local cache (Tap to retry)';
          sidebarBtn.innerHTML = offlineSvg + '<span>Offline</span>';
        }
        if (mobileDrawerBtn) {
          mobileDrawerBtn.classList.remove('btn-primary');
          mobileDrawerBtn.classList.add('btn-offline-mode');
          mobileDrawerBtn.title = 'Offline Mode — Reading from local cache (Tap to retry)';
          mobileDrawerBtn.innerHTML = offlineSvg + '<span>Offline</span>';
        }
        if (icon) {
          icon.innerHTML = '<line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line>';
        }
        if (label) label.textContent = 'Offline';
      } else {
        if (btn) {
          btn.classList.remove('btn-offline-mode');
          btn.classList.add('btn-primary');
          btn.title = 'Add URL';
        }
        if (textBtn) {
          textBtn.title = 'Add Custom Text / Markdown';
        }
        if (sidebarBtn && (sidebarBtn.classList.contains('btn-offline-mode') || !hasCompletedInitialLoad)) {
          sidebarBtn.classList.remove('btn-offline-mode');
          sidebarBtn.classList.add('btn-primary');
          sidebarBtn.title = 'Add URL';
          if (sidebarBtn.classList.contains('btn-offline-mode')) {
            sidebarBtn.innerHTML = onlineSvg + '<span>Add URL</span>';
          }
        }
        if (mobileDrawerBtn && (mobileDrawerBtn.classList.contains('btn-offline-mode') || !hasCompletedInitialLoad)) {
          mobileDrawerBtn.classList.remove('btn-offline-mode');
          mobileDrawerBtn.classList.add('btn-primary');
          mobileDrawerBtn.title = 'Add URL';
          if (mobileDrawerBtn.classList.contains('btn-offline-mode')) {
            mobileDrawerBtn.innerHTML = onlineSvg + '<span>Add URL</span>';
          }
        }
        if (icon) {
          icon.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>';
        }
        if (label) label.textContent = 'Add URL';
      }
    }

    function handleConnectionFailure(isSilent = false) {
      updateOfflineUI(true);
      const now = Date.now();
      if (!isSilent || (now - lastOfflineToastTime > 30000)) {
        lastOfflineToastTime = now;
        if (allEntries.length > 0) {
          showToast('Offline — viewing saved articles from cache', 3000);
        } else {
          showToast('Could not connect to server', 3500);
        }
      }
    }

    async function loadArticles(silent = false, reset = true) {
      if (isLoadingArticles) return;
      if (document.documentElement.classList.contains('wf-needs-auth') || !getAuthToken()) {
        showAuthOverlay();
        return;
      }
      isLoadingArticles = true;

      // Always drain pending offline mutations to Cloudflare before requesting delta sync
      await processOutboxMutations().catch(() => {});

      if (reset) {
        currentArticlesPage = 1;
      }

      if (isCapacitorApp()) {
        const settingsBtn = document.getElementById('serverSettingsBtn');
        if (settingsBtn) settingsBtn.style.display = 'flex';
        if (!localStorage.getItem('wf_server_url')) {
          openServerConnectModal();
          isLoadingArticles = false;
          return;
        }
      }

      if (reset && allEntries.length === 0) {
        renderFromInstantLocalCache();
      }

      try {
        const sortParam = currentSortOrder || 'newest';
        const sinceParam = (allEntries.length > 0 && currentSyncRev > 0) ? ('&since_rev=' + currentSyncRev) : '';
        const res = await authFetch('/api/sync.json?page=1&perPage=50&sort=' + encodeURIComponent(sortParam) + sinceParam + '&_t=' + Date.now());
        if (res.ok) {
          updateOfflineUI(false);
          const data = await res.json();

          // Database Epoch / Reset Watchdog across all connected devices
          const localInstanceId = localStorage.getItem('wf_instance_id');
          const serverInstanceId = (data.instance_id !== undefined && data.instance_id !== null) ? String(data.instance_id) : null;

          let isEpochReset = false;
          if (serverInstanceId !== null) {
            if (localInstanceId !== null && serverInstanceId !== localInstanceId) {
              isEpochReset = true;
            }
            localStorage.setItem('wf_instance_id', serverInstanceId);
          }
          if (currentSyncRev > 1 && data.sync_rev && data.sync_rev < currentSyncRev) {
            isEpochReset = true;
          }

          if (isEpochReset) {
            console.log('[Sync] Remote database epoch reset detected. Wiping local cache and reconciling...');
            allEntries = [];
            cachedGlobalTags = [];
            serverLibraryCounts = { unread: 0, archive: 0, starred: 0, total: 0 };
            await clearIndexedDB();
            localStorage.removeItem('wf_cached_articles');
            localStorage.removeItem('wf_cached_tags');
            localStorage.removeItem('wf_cached_counts');
            localStorage.removeItem('wf_pending_mutations');
            currentSyncRev = data.sync_rev || 1;
            localStorage.setItem('wf_sync_rev', String(currentSyncRev));
            showToast('Database reset detected — library reconciled', 3000);
            if (activeArticleId) {
              closeReader(true);
            }
            updateCounts();
            renderSidebarTags();
            filterArticles();

            // If the response was a 304/empty status, trigger clean full page 1 fetch
            if (data.up_to_date === true || !Array.isArray(data.entries)) {
              isLoadingArticles = false;
              loadArticles(true, true);
              return;
            }
          }

          if (data.up_to_date === true) {
            if (data.counts) {
              serverLibraryCounts = data.counts;
              updateCounts();
              // If server reports total === 0, clear any stale local articles
              if (data.counts.total === 0 && allEntries.length > 0) {
                allEntries = [];
                clearIndexedDB();
                localStorage.removeItem('wf_cached_articles');
                filterArticles();
                if (activeArticleId) {
                  closeReader(true);
                  showToast('Article not found (deleted on server)', 4000);
                }
              }
            }
            return;
          }

          if (data.sync_rev) {
            currentSyncRev = data.sync_rev;
            localStorage.setItem('wf_sync_rev', String(data.sync_rev));
          }

          if (Array.isArray(data.tags)) {
            cachedGlobalTags = data.tags;
            setCachedGlobalTags(data.tags);
          }
          if (Array.isArray(data.site_cookies)) {
            const cookiesJson = JSON.stringify(data.site_cookies);
            const cookiesChanged = cookiesJson !== localStorage.getItem('wf_last_synced_cookies');
            cachedSiteCookies = data.site_cookies;
            renderSiteCookiesList();

            if (cookiesChanged) {
              localStorage.setItem('wf_last_synced_cookies', cookiesJson);
              if (typeof (window as any).AndroidNative !== 'undefined' && typeof (window as any).AndroidNative.syncAllDomainCookies === 'function') {
                (window as any).AndroidNative.syncAllDomainCookies(cookiesJson);
              } else if (isCapacitorApp() && typeof window.Capacitor !== 'undefined') {
                const nativePlugin = window.Capacitor.Plugins?.WallaflareNative;
                if (nativePlugin && typeof nativePlugin.syncAllDomainCookies === 'function') {
                  nativePlugin.syncAllDomainCookies({ sites: cachedSiteCookies }).catch(() => {});
                }
              }
            }
          }
          if (data.counts) {
            serverLibraryCounts = data.counts;
          }

          // 1. Prune deleted items from local storage & IndexedDB
          if (Array.isArray(data.deleted_ids) && data.deleted_ids.length > 0) {
            const delSet = new Set(data.deleted_ids);
            allEntries = allEntries.filter(e => !delSet.has(e.id));
            for (const delId of data.deleted_ids) {
              deleteEntryFromIndexedDB(delId);
            }
            if (activeArticleId && delSet.has(activeArticleId)) {
              closeReader(true);
              showToast('Open article was deleted on another device', 4000);
            }
          }

          // 2. Smart merge fresh entries (wipe if server total count is 0)
          const isDeltaSync = Boolean(sinceParam);
          const serverHasZeroTotal = data.counts?.total === 0 || (!isDeltaSync && data.total === 0);

          if (serverHasZeroTotal) {
            allEntries = [];
            clearIndexedDB();
            localStorage.removeItem('wf_cached_articles');
            if (activeArticleId) {
              closeReader(true);
              showToast('Article not found (deleted on server)', 4000);
            }
          } else {
            const freshEntries = Array.isArray(data.entries) ? data.entries : (Array.isArray(data) ? data : (data._embedded?.items || []));
            if (freshEntries.length > 0) {
              const freshMap = new Map(freshEntries.map(e => [e.id, e]));
              const merged = [...freshEntries];
              for (const existing of allEntries) {
                if (!freshMap.has(existing.id)) {
                  merged.push(existing);
                }
              }
              allEntries = deduplicateEntries(sortEntriesLocally(merged, currentSortOrder || 'newest'));
            }
          }

          currentArticlesPage = Math.max(1, Math.ceil(allEntries.length / 50));
          totalArticlesPages = data.pages || Math.max(1, Math.ceil((data.total || allEntries.length) / 50));
          totalArticlesCount = data.total !== undefined ? data.total : allEntries.length;

          updateOfflineUI(false);
          syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
          updateCounts();
          renderSidebarTags();
          filterArticles();

          if (activeArticleId) {
            const activeItem = allEntries.find(e => e.id === activeArticleId);
            if (activeItem) {
              applyAnnotationsToReader(activeItem);
              updateHighlightsBadge(activeItem);
            }
          }

          // Background auto-download remaining pages if whole library is not yet cached locally
          if (totalArticlesPages > 1 && allEntries.length < totalArticlesCount) {
            downloadRemainingLibraryInBackground(totalArticlesPages, totalArticlesCount);
          }
        } else if (res.status !== 401) {
          const sortParam = currentSortOrder || 'newest';
          const fallbackRes = await authFetch('/api/entries.json?page=1&perPage=50&sort=' + encodeURIComponent(sortParam) + '&_t=' + Date.now()).catch(() => null);
          if (fallbackRes && fallbackRes.ok) {
            updateOfflineUI(false);
            const data = await fallbackRes.json();
            allEntries = Array.isArray(data) ? data : (data._embedded?.items || []);
            currentArticlesPage = data.page || 1;
            totalArticlesPages = data.pages || 1;
            totalArticlesCount = data.total !== undefined ? data.total : allEntries.length;
            syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
            updateCounts();
            renderSidebarTags();
            filterArticles();
          } else {
            handleConnectionFailure(silent);
          }
        }
      } catch (err) {
        handleConnectionFailure(silent);
      } finally {
        isLoadingArticles = false;
        updateArticlesFooterStatus();
      }
    }

    let isDownloadingLibrary = false;

    async function downloadRemainingLibraryInBackground(totalPages, totalCount) {
      if (isDownloadingLibrary || totalPages <= 1) return;
      isDownloadingLibrary = true;

      try {
        for (let p = 2; p <= totalPages; p++) {
          // If all items already present in memory, skip
          if (allEntries.length >= totalCount) break;

          const res = await authFetch('/api/entries.json?page=' + p + '&perPage=50&sort=newest&_t=' + Date.now());
          if (!res.ok) break;

          const pageData = await res.json();
          const items = Array.isArray(pageData) ? pageData : (pageData._embedded?.items || []);
          if (!Array.isArray(items) || items.length === 0) break;

          const existingMap = new Map(allEntries.map(e => [e.id, e]));
          for (const item of items) {
            if (!existingMap.has(item.id)) {
              allEntries.push(item);
            }
          }

          allEntries = sortEntriesLocally(allEntries, currentSortOrder || 'newest');
          syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
          filterArticles();
        }
      } catch (err) {
        console.warn('Background library sync paused:', err);
      } finally {
        isDownloadingLibrary = false;
        updateArticlesFooterStatus();
      }
    }

    function loadMoreRenderedCards() {
      const filtered = getFilteredEntries();
      if (currentRenderLimit >= filtered.length) return false;
      currentRenderLimit += RENDER_CHUNK_SIZE;
      renderArticlesChunked(filtered);
      return true;
    }

    async function loadMoreArticles() {
      // 1. First expand rendered DOM cards from memory if available
      if (loadMoreRenderedCards()) {
        return;
      }

      if (isLoadingMoreArticles || currentArticlesPage >= totalArticlesPages) return;
      isLoadingMoreArticles = true;
      const footerStatus = document.getElementById('articlesListFooterStatus');
      if (footerStatus) {
        footerStatus.innerHTML = '<span style="display:inline-block; margin-right: 6px;">⏳</span> Loading more articles...';
        footerStatus.style.display = 'block';
      }

      try {
        const nextPage = currentArticlesPage + 1;
        const sortParam = currentSortOrder || 'newest';
        const res = await authFetch('/api/entries.json?page=' + nextPage + '&perPage=50&sort=' + encodeURIComponent(sortParam) + '&_t=' + Date.now());
        if (res.ok) {
          const data = await res.json();
          const newItems = Array.isArray(data) ? data : (data._embedded?.items || []);
          if (newItems.length > 0) {
            const existingIds = new Set(allEntries.map(e => e.id));
            for (const item of newItems) {
              if (!existingIds.has(item.id)) {
                allEntries.push(item);
                existingIds.add(item.id);
              }
            }
            currentArticlesPage = nextPage;
            totalArticlesPages = data.pages || totalArticlesPages;
            totalArticlesCount = data.total !== undefined ? data.total : totalArticlesCount;
            syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
            renderSidebarTags();
            filterArticles();
          } else {
            totalArticlesPages = currentArticlesPage;
          }
        }
      } catch (e) {
      } finally {
        isLoadingMoreArticles = false;
        updateArticlesFooterStatus();
      }
    }

    function updateArticlesFooterStatus() {
      const footer = document.getElementById('articlesListFooterStatus');
      if (!footer) return;
      const filtered = getFilteredEntries();
      const renderedCount = Math.min(filtered.length, currentRenderLimit);

      if (filtered.length === 0) {
        footer.style.display = 'none';
        return;
      }

      if (renderedCount < filtered.length) {
        footer.textContent = 'Showing ' + renderedCount + ' of ' + filtered.length + ' articles • Scroll for more';
        footer.style.display = 'block';
      } else if (currentArticlesPage < totalArticlesPages) {
        footer.textContent = 'Showing ' + renderedCount + ' of ' + totalArticlesCount + ' articles • Scroll for more';
        footer.style.display = 'block';
      } else if (filtered.length > 20) {
        footer.textContent = 'All ' + filtered.length + ' articles loaded';
        footer.style.display = 'block';
      } else {
        footer.style.display = 'none';
      }
    }

    function renderFromInstantLocalCache() {
      if (document.documentElement.classList.contains('wf-needs-auth')) {
        return;
      }
      try {
        const fastArticles = localStorage.getItem('wf_cached_articles');
        if (fastArticles) {
          const parsed = JSON.parse(fastArticles);
          if (Array.isArray(parsed) && parsed.length > 0 && allEntries.length === 0) {
            allEntries = sortEntriesLocally(parsed, currentSortOrder || 'newest');
          }
        }
        const fastTags = localStorage.getItem('wf_cached_tags');
        if (fastTags) {
          const parsedTags = JSON.parse(fastTags);
          if (Array.isArray(parsedTags) && parsedTags.length > 0) {
            cachedGlobalTags = parsedTags;
            setCachedGlobalTags(parsedTags);
          }
        }
        const fastCounts = localStorage.getItem('wf_cached_counts');
        if (fastCounts) {
          const parsedCounts = JSON.parse(fastCounts);
          if (parsedCounts && typeof parsedCounts.total === 'number') {
            serverLibraryCounts = parsedCounts;
          }
        }
        checkNativePendingSavedArticles();
        updateCounts();
        renderSidebarTags();
        filterArticles();
      } catch (err) {}
    }

    // -------------------------------------------------------------
    // Native Android Share Intent & Background Buffer Bridge
    // -------------------------------------------------------------
    window.prependSavedArticles = function(articles) {
      if (!articles) return;
      const list = Array.isArray(articles) ? articles : [articles];
      let changed = false;
      for (const article of list) {
        if (!article || !article.id) continue;
        const idx = allEntries.findIndex(e => e.id === article.id);
        if (idx >= 0) {
          allEntries[idx] = article;
        } else {
          allEntries.unshift(article);
        }
        changed = true;
      }
      if (changed) {
        allEntries = sortEntriesLocally(allEntries, currentSortOrder || 'newest');
        syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
        checkNativePendingSavedArticles();
        updateCounts();
        renderSidebarTags();
        filterArticles();
      }
    };
    window.prependSavedArticle = window.prependSavedArticles;

    function checkNativePendingSavedArticles() {
      if (window.AndroidNative && (window.AndroidNative.pollPendingSavedArticles || window.AndroidNative.pollPendingSavedArticle)) {
        try {
          const raw = window.AndroidNative.pollPendingSavedArticles ? window.AndroidNative.pollPendingSavedArticles() : window.AndroidNative.pollPendingSavedArticle();
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed) {
              window.prependSavedArticles(parsed);
            }
          }
        } catch (e) {
          console.warn('Error polling native pending saved articles:', e);
        }
      }
    }
    window.checkNativePendingSavedArticles = checkNativePendingSavedArticles;

    window.refreshArticlesSilently = function() {
      checkNativePendingSavedArticles();
      loadArticles(true);
    };

    function syncLocalEntriesCache(entries, tags, counts) {
      try {
        if (entries !== undefined) localStorage.setItem('wf_cached_articles', JSON.stringify(entries || []));
        if (tags !== undefined) {
          localStorage.setItem('wf_cached_tags', JSON.stringify(tags || []));
          setCachedGlobalTags(tags || []);
        }
        if (counts !== undefined) localStorage.setItem('wf_cached_counts', JSON.stringify(counts || null));
      } catch (err) {}
      saveArticlesToOfflineDb(entries || []);
    }

    function getFilteredEntries() {
      const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
      let filtered = allEntries;

      if (currentFilter === 'unread') {
        filtered = filtered.filter(e => !e.is_archived);
      } else if (currentFilter === 'starred') {
        filtered = filtered.filter(e => e.is_starred);
      } else if (currentFilter === 'archive') {
        filtered = filtered.filter(e => e.is_archived);
      }

      const activeTag = getSelectedTagFilter();
      if (activeTag) {
        const filterLower = activeTag.toLowerCase().trim();
        filtered = filtered.filter(e => {
          const tags = Array.isArray(e.tags) ? e.tags : [];
          return tags.some(t => {
            const label = typeof t === 'string' ? t : (t.label || t.name || t.slug || '');
            const slug = typeof t === 'string' ? t : (t.slug || t.label || t.name || '');
            return (slug && slug.toLowerCase() === filterLower) || (label && label.toLowerCase() === filterLower);
          });
        });
      }

      if (search) {
        filtered = filtered.filter(e =>
          (e.title && e.title.toLowerCase().includes(search)) ||
          (e.domain_name && e.domain_name.toLowerCase().includes(search)) ||
          (e.text && e.text.toLowerCase().includes(search))
        );
      }

      return sortEntries(filtered);
    }

    function sortEntries(entries) {
      const list = [...entries];
      if (currentSortOrder === 'oldest') {
        return list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      } else if (currentSortOrder === 'shortest') {
        return list.sort((a, b) => (a.reading_time || 1) - (b.reading_time || 1));
      } else if (currentSortOrder === 'longest') {
        return list.sort((a, b) => (b.reading_time || 1) - (a.reading_time || 1));
      } else if (currentSortOrder === 'title') {
        return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      }
      // newest
      return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    function filterArticles() {
      const banner = document.getElementById('activeTagFilterBanner');
      const activeTagName = document.getElementById('activeTagName');
      const activeTag = getSelectedTagFilter();
      if (banner && activeTagName) {
        if (activeTag) {
          banner.style.display = 'flex';
          activeTagName.textContent = '#' + activeTag;
        } else {
          banner.style.display = 'none';
        }
      }

      const filtered = getFilteredEntries();
      renderArticles(filtered);
    }

    function clearSearch() {
      const input = document.getElementById('searchInput');
      if (input) input.value = '';
      filterArticles();
    }

    let currentRenderLimit = 40;
    const RENDER_CHUNK_SIZE = 30;

    function renderArticles(entries) {
      currentRenderLimit = 40;
      renderArticlesChunked(entries);
    }

    function renderArticlesChunked(entries) {
      const grid = document.getElementById('articlesGrid');
      const empty = document.getElementById('emptyState');
      if (!grid) return;

      if (!entries || entries.length === 0) {
        grid.innerHTML = '';
        if (empty) {
          empty.style.display = 'flex';
          const search = (document.getElementById('searchInput')?.value || '').trim();

          let iconSvg = '';
          let title = '';
          let desc = '';
          let actionsHtml = '';

          if (search) {
            iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
            title = 'No matches found';
            desc = 'No articles matching "' + escapeHtml(search) + '"';
            actionsHtml = '<button type="button" class="empty-state-btn" onclick="clearSearch()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg><span>Clear Search</span></button>';
          } else if (getSelectedTagFilter()) {
            const activeTag = getSelectedTagFilter();
            iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>';
            title = 'No tagged articles';
            desc = 'No articles tagged with #' + escapeHtml(activeTag);
            actionsHtml = '<button type="button" class="empty-state-btn" onclick="filterByTag(null)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg><span>Clear Tag Filter</span></button>';
          } else if (currentFilter === 'starred') {
            iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
            title = 'No starred articles';
            desc = 'Star articles to keep your favorite reads accessible.';
            actionsHtml = '';
          } else if (currentFilter === 'archive') {
            iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>';
            title = 'Archive is empty';
            desc = 'Articles you archive after reading will appear here.';
            actionsHtml = '';
          } else {
            iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            title = 'All caught up!';
            desc = 'Your reading queue is clear. Save a new link or write a note.';
            actionsHtml = 
              '<button type="button" class="empty-state-btn" onclick="handleAddArticleBtnClick()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Add URL</span></button>' +
              '<button type="button" class="empty-state-btn" onclick="handleAddTextBtnClick()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg><span>Write Note</span></button>';
          }

          empty.innerHTML =
            '<div class="empty-state-icon-wrap">' + iconSvg + '</div>' +
            '<div class="empty-state-title">' + title + '</div>' +
            '<div class="empty-state-desc">' + desc + '</div>' +
            (actionsHtml ? ('<div class="empty-state-actions">' + actionsHtml + '</div>') : '');
        }
        return;
      }

      if (empty) empty.style.display = 'none';

      const visibleSlice = entries.slice(0, currentRenderLimit);
      grid.innerHTML = visibleSlice.map(item => {
        const domain = item.domain_name || 'direct-input';
        const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
        const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : '';
        const dateInfo = formatCardDate(item.created_at);
        const rawContentText = (item.excerpt && !item.excerpt.includes("{\"parts\":")) ? item.excerpt : (item.text || (item.content ? item.content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/\{"parts":[\s\S]*?\}\}\]\}/g, " ").replace(/\s+/g, " ").trim() : ""));
        const excerpt = rawContentText ? (rawContentText.length > 160 ? rawContentText.slice(0, 160) + "..." : rawContentText) : "No preview available";
        const isChecked = selectedArticleIds.has(item.id);
        const isReading = activeArticleId === item.id;

        const starSvg = item.is_starred
          ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
          : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

        const annCount = Array.isArray(item.annotations) ? item.annotations.length : 0;
        const notesBadgeHtml = annCount > 0
          ? '<span class="tag-badge notes-badge" onclick="event.stopPropagation(); openArticleHighlightsModal(' + item.id + ')" title="View ' + annCount + ' Highlights & Notes"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right: 0.2rem;"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' + annCount + (annCount === 1 ? ' Note' : ' Notes') + '</span>'
          : '';

        const tags = Array.isArray(item.tags) ? item.tags : [];
        const tagsListHtml = tags.map(t => {
          const label = typeof t === 'string' ? t : (t.label || t.name || t.slug);
          const slug = typeof t === 'string' ? t : (t.slug || t.label || t.name);
          const safeSlug = escapeHtml(slug).replace(/'/g, "\\'");
          return '<span class="tag-badge" onclick="event.stopPropagation(); filterByTag(\'' + safeSlug + '\')">#' + escapeHtml(label) + '</span>';
        }).join('');

        const tagsHtml = (notesBadgeHtml || tagsListHtml)
          ? '<div class="card-tags">' + notesBadgeHtml + tagsListHtml + '</div>'
          : '';

        const totalMin = item.reading_time || 1;
        const savedRatio = parseFloat(localStorage.getItem('wf_scroll_' + item.id) || '0');
        const progressPct = Math.round(savedRatio * 100);
        let readingProgressText = totalMin + ' min read';
        if (progressPct >= 95) readingProgressText = 'Finished (' + totalMin + 'm)';
        else if (progressPct > 0) readingProgressText = Math.max(1, Math.round(totalMin * (1 - savedRatio))) + ' of ' + totalMin + ' min left';

        const imgHtml = item.preview_picture
          ? '<div class="card-image-wrap"><img src="' + escapeHtml(item.preview_picture) + '" alt="' + escapeHtml(item.title) + '" loading="lazy" class="card-image" onerror="this.parentElement.remove()" /></div>'
          : '';

        return '<div class="article-card ' + (isChecked ? 'is-selected ' : '') + (isReading ? 'is-reading' : '') + '" id="entry-card-' + item.id + '" data-id="' + item.id + '" ontouchstart="handleCardTouchStart(event, ' + item.id + ')" ontouchmove="handleCardTouchMove(event)" ontouchend="handleCardTouchEnd(event)" ontouchcancel="handleCardTouchEnd(event)" oncontextmenu="handleCardContextMenu(event, ' + item.id + ')" onclick="handleCardClick(event, ' + item.id + ')">' +
          '<div class="card-select-wrap" onclick="event.stopPropagation(); toggleArticleSelection(' + item.id + ');">' +
            '<div class="card-checkbox ' + (isChecked ? 'checked' : '') + '">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
            '</div>' +
          '</div>' +
          '<div class="card-main-content">' +
            '<div class="card-text-column">' +
              '<div class="card-meta">' +
                '<span class="card-domain">' + escapeHtml(domain) + '</span>' +
                (author ? '<span>by ' + escapeHtml(author) + '</span>' : '') +
              '</div>' +
              '<h2 class="card-title">' + escapeHtml(item.title) + '</h2>' +
              '<p class="card-excerpt">' + escapeHtml(excerpt) + '</p>' +
              tagsHtml +
            '</div>' +
            imgHtml +
          '</div>' +
          '<div class="card-footer">' +
            '<span class="card-date" data-created-at="' + escapeHtml(item.created_at || '') + '" title="' + escapeHtml(dateInfo.tooltip) + '">' + escapeHtml(dateInfo.label) + '</span>' +
            '<span style="font-size: 0.75rem; color: var(--text-muted);" id="card-progress-' + item.id + '">' + readingProgressText + '</span>' +
            '<div style="display: flex; gap: 0.35rem;">' +
              '<button class="action-btn ' + (item.is_starred ? 'active-star' : '') + '" title="Star" onclick="event.stopPropagation(); toggleStar(' + item.id + ', ' + item.is_starred + ')">' + starSvg + '</button>' +
              '<button class="action-btn ' + (item.is_archived ? 'active-archive' : '') + '" title="Archive" onclick="event.stopPropagation(); toggleArchive(' + item.id + ', ' + item.is_archived + ')"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg></button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
      updateArticlesFooterStatus();
    }

    let cardLongPressTimer = null;
    let cardTouchStartX = 0;
    let cardTouchStartY = 0;
    let cardLongPressTriggered = false;

    function handleCardTouchStart(e, id) {
      if (e.target.closest('button, a, .card-dropdown-menu, .card-select-wrap, .tag-badge')) return;
      cardLongPressTriggered = false;
      cardTouchStartX = e.touches[0].clientX;
      cardTouchStartY = e.touches[0].clientY;
      clearTimeout(cardLongPressTimer);
      cardLongPressTimer = setTimeout(() => {
        cardLongPressTriggered = true;
        triggerHaptic('medium');
        toggleArticleSelection(id);
      }, 420);
    }

    function handleCardTouchMove(e) {
      if (!cardLongPressTimer) return;
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      if (Math.hypot(currentX - cardTouchStartX, currentY - cardTouchStartY) > 10) {
        clearTimeout(cardLongPressTimer);
        cardLongPressTimer = null;
      }
    }

    function handleCardTouchEnd(e) {
      if (cardLongPressTimer) {
        clearTimeout(cardLongPressTimer);
        cardLongPressTimer = null;
      }
      if (cardLongPressTriggered) {
        setTimeout(() => { cardLongPressTriggered = false; }, 250);
      }
    }

    function handleCardClick(e, id) {
      setKeyboardPaneFocus("list");
      if (e.target.closest('button, a, .card-dropdown-menu, .card-select-wrap, .tag-badge')) return;

      if (cardLongPressTriggered) {
        cardLongPressTriggered = false;
        return;
      }

      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault();
        if (selectedArticleIds.size === 0 && activeArticleId && activeArticleId !== id) {
          selectedArticleIds.add(activeArticleId);
        }
        toggleArticleSelection(id);
        return;
      }

      if (isSelectionMode()) {
        toggleArticleSelection(id);
      } else {
        openReader(id);
      }
    }

    // 3-Pane Reader open & close
    // Capacitor Status Bar Handler for Mobile App
    let readerTopBarAutoHideTimer = null;
    let lastReaderScrollTop = 0;
    let readerScrollAnchorY = 0;
    let readerScrollDirection = 'none';
    let isReaderTopBarHidden = false;

    function shouldReaderAutoHide() {
      if (isCapacitorApp()) return true;
      if (window.innerWidth < 1024) return true;
      return Boolean(isFocusMode || document.body.classList.contains('focus-mode'));
    }

    function showReaderTopBar(restoreStatusBar = true) {
      const topBar = document.getElementById('readerTopBar');
      const readerView = document.getElementById('readerView');
      if (topBar) {
        topBar.classList.remove('is-hidden');
        isReaderTopBarHidden = false;
      }
      if (readerView) {
        readerView.classList.remove('top-bar-hidden');
      }
      if (restoreStatusBar) {
        setReaderStatusBar(false);
      }
    }

    function hideReaderTopBar(hideStatusBar = true) {
      const topBar = document.getElementById('readerTopBar');
      const popover = document.getElementById('readerAppearancePopover');
      const moreMenu = document.getElementById('readerMoreMenuDropdown');
      const searchBar = document.getElementById('readerSearchBar');
      if (popover && popover.style.display !== 'none') return;
      if (moreMenu && moreMenu.classList.contains('open')) return;
      if (searchBar && searchBar.style.display !== 'none') return;

      if (topBar) {
        topBar.classList.add('is-hidden');
        isReaderTopBarHidden = true;
        closeReaderAppearancePopover();
        closeReaderMoreMenu();
      }
      if (hideStatusBar && activeArticleId) {
        setReaderStatusBar(true);
      }
    }

    function scheduleReaderTopBarAutoHide(delay = 700) {
      clearTimeout(readerTopBarAutoHideTimer);
      if (!shouldReaderAutoHide()) return;
      readerTopBarAutoHideTimer = setTimeout(() => {
        hideReaderTopBar(true);
      }, delay);
    }

    function handleReaderBodyClick(e) {
      setKeyboardPaneFocus("reader");
      if (e.target.closest('a, button, mark, input, .annotation-note-card, .reader-top-bar, .reader-appearance-popover')) return;
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) return;

      if (!shouldReaderAutoHide()) return;

      if (isReaderTopBarHidden) {
        showReaderTopBar(true);
      } else {
        hideReaderTopBar(true);
      }
    }

    async function openReader(id, pushHistory = true) {
      let item = allEntries.find(e => e.id === id);

      if (!item || !item.content) {
        try {
          const res = await authFetch('/api/entries/' + id + '.json');
          if (res.ok) {
            const fetched = await res.json();
            const idx = allEntries.findIndex(e => e.id === id);
            if (idx >= 0) allEntries[idx] = fetched;
            else allEntries.unshift(fetched);
            item = fetched;
          } else if (res.status === 404) {
            // Article was deleted on server: prune from local cache and close reader
            allEntries = allEntries.filter(e => e.id !== id);
            deleteEntryFromIndexedDB(id);
            syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
            filterArticles();
            closeReader(true);
            showToast('Article not found (deleted on server)', 4000);
            return;
          }
        } catch (e) {}
      }

      if (!item) return;

      activeArticleId = id;
      if (window.innerWidth < 1024) {
        setKeyboardPaneFocus("reader");
      } else {
        setKeyboardPaneFocus("list");
      }

      // 1. Update title and meta
      document.getElementById('readerTitle').textContent = item.title;

      const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
      const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : '';

      const metaParts: string[] = [];
      if (item.domain_name) metaParts.push('<span>' + escapeHtml(item.domain_name) + '</span>');
      if (author) metaParts.push('<span style="font-weight: 500;">by ' + escapeHtml(author) + '</span>');
      metaParts.push('<span>' + (item.reading_time || 1) + ' min read</span>');

      const rawPubDate = item.published_at ? new Date(item.published_at) : null;
      const rawSavedDate = item.created_at ? new Date(item.created_at) : null;
      const isPubValid = rawPubDate && !isNaN(rawPubDate.getTime());
      const isSavedValid = rawSavedDate && !isNaN(rawSavedDate.getTime());

      if (isSavedValid) {
        const savedFormatted = rawSavedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        metaParts.push('<span>Saved ' + escapeHtml(savedFormatted) + '</span>');
      }

      if (isPubValid) {
        const pubFormatted = rawPubDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        metaParts.push('<span>Published ' + escapeHtml(pubFormatted) + '</span>');
      }

      if (item.url) {
        metaParts.push('<a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener" class="reader-original-link"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>Original Link</span></a>');
      }

      document.getElementById('readerMeta').innerHTML = metaParts.join('<span class="meta-divider">&bull;</span>');

      const coverWrap = document.getElementById('readerCoverWrap');
      if (item.preview_picture) {
        coverWrap.innerHTML = '<div class="reader-cover"><img src="' + escapeHtml(item.preview_picture) + '" alt="Cover" class="reader-cover-img" onerror="this.parentElement.remove()" /></div>';
      } else {
        coverWrap.innerHTML = '';
      }

      const readerBodyEl = document.getElementById('readerBody');
      const scrollEl = document.getElementById('readerScrollContainer');
      const contentWrapEl = scrollEl?.querySelector('.reader-content-wrap') as HTMLElement;

      // 2. Hard-reset any overscroll / transform state BEFORE DOM mutation
      if (contentWrapEl) {
        contentWrapEl.style.transition = 'none';
        contentWrapEl.style.transform = '';
        contentWrapEl.style.willChange = '';
      }
      if (scrollEl) {
        scrollEl.style.scrollBehavior = 'auto';
        (scrollEl as any)._resetOverscroll?.();
      }

      // 3. Swap content
      const rawContent = item.content || '<p>No content available.</p>';
      readerBodyEl.innerHTML = rawContent;
      (readerBodyEl as any)._rawCleanContent = rawContent;
      try {
        readerBodyEl.querySelectorAll('*[style]').forEach(el => {
          const style = (el.getAttribute('style') || '').toLowerCase();
          if (/font-weight\s*:\s*(bold|[6-9]00)/.test(style) && el.tagName !== 'STRONG' && el.tagName !== 'B') {
            el.style.fontWeight = '700';
          }
          if (/font-style\s*:\s*italic/.test(style) && el.tagName !== 'EM' && el.tagName !== 'I') {
            el.style.fontStyle = 'italic';
          }
        });
      } catch (e) {}
      applyAnnotationsToReader(item);

      // Star & Archive active state
      const starBtn = document.getElementById('readerStarBtn');
      const starIcon = document.getElementById('readerStarIcon');
      if (item.is_starred) {
        starBtn?.classList.add('active-star');
        starIcon?.setAttribute('fill', 'currentColor');
      } else {
        starBtn?.classList.remove('active-star');
        starIcon?.setAttribute('fill', 'none');
      }

      const archiveBtn = document.getElementById('readerArchiveBtn');
      if (item.is_archived) archiveBtn?.classList.add('active-archive');
      else archiveBtn?.classList.remove('active-archive');

      // RTL handling
      const isRtl = (item.language && ['he', 'iw', 'ar', 'fa', 'ur', 'yi'].includes(item.language.toLowerCase().split('-')[0])) || isRtlText(item.title + ' ' + (item.text || item.content || ''));
      const readerTitleEl = document.getElementById('readerTitle');
      const readerMetaEl = document.getElementById('readerMeta');
      if (isRtl) {
        contentWrapEl?.classList.add('is-rtl');
        contentWrapEl?.setAttribute('dir', 'rtl');
        readerBodyEl.setAttribute('dir', 'rtl');
        readerTitleEl?.setAttribute('dir', 'rtl');
        readerMetaEl?.removeAttribute('dir');
      } else {
        contentWrapEl?.classList.remove('is-rtl');
        contentWrapEl?.removeAttribute('dir');
        readerBodyEl.setAttribute('dir', 'ltr');
        readerTitleEl?.removeAttribute('dir');
        readerMetaEl?.removeAttribute('dir');
      }

      // Show Reader in Pane 3
      const emptyPane = document.getElementById('readerEmptyPane');
      const readerView = document.getElementById('readerView');
      if (emptyPane) emptyPane.style.display = 'none';
      if (readerView) {
        readerView.style.display = 'flex';
        readerView.classList.add('open');
      }

      // Mark active card with .is-reading
      document.querySelectorAll('.article-card').forEach(c => {
        const cId = parseInt(c.dataset.id, 10);
        if (cId === id) c.classList.add('is-reading');
        else c.classList.remove('is-reading');
      });

      // Mobile reading mode & status bar
      if (window.innerWidth < 1024) {
        document.body.classList.add('is-reading-mobile');
      }
      showReaderTopBar(true);

      // Synchronous layout evaluation & instant scroll restoration (zero jump / zero flicker)
      if (contentWrapEl) {
        contentWrapEl.style.transition = 'none';
        contentWrapEl.style.transform = '';
        contentWrapEl.style.willChange = '';
      }

      lastReaderScrollTop = 0;
      readerScrollAnchorY = 0;
      readerScrollDirection = 'none';

      if (scrollEl) {
        scrollEl.style.scrollBehavior = 'auto';
        scrollEl.style.pointerEvents = 'auto';
        scrollEl.style.touchAction = 'pan-y';
        (scrollEl as any)._resetOverscroll?.();

        const savedRatio = parseFloat(localStorage.getItem('wf_scroll_' + id) || '0');
        if (savedRatio > 0.005) {
          void scrollEl.offsetHeight; // force synchronous layout computation before first paint
          const total = scrollEl.scrollHeight - scrollEl.clientHeight;
          if (total > 0) {
            scrollEl.scrollTop = Math.round(savedRatio * total);
          }
        } else {
          scrollEl.scrollTop = 0;
        }
      }
      updateReadingProgress();

      if (pushHistory) {
        history.pushState({ readerId: id }, '', '/read/' + id);
      }
    }

    function closeReader(updateHistory = true) {
      activeArticleId = null;
      setKeyboardPaneFocus("list");
      clearTimeout(readerTopBarAutoHideTimer);
      showReaderTopBar(true);
      setReaderStatusBar(false);
      document.body.classList.remove('is-reading-mobile');
      toggleReaderFocusMode(false);

      const emptyPane = document.getElementById('readerEmptyPane');
      const readerView = document.getElementById('readerView');
      if (emptyPane) emptyPane.style.display = 'flex';
      if (readerView) {
        readerView.style.display = 'none';
        readerView.classList.remove('open');
      }

      document.querySelectorAll('.article-card.is-reading').forEach(c => c.classList.remove('is-reading'));
      const readingProgressEl = document.getElementById('readingProgress');
      if (readingProgressEl) {
        readingProgressEl.style.width = '0%';
      }
      clearActiveTextSelection();
      closeReaderAppearancePopover();
      closeReaderMoreMenu();

      if (updateHistory) {
        const newPath = currentFilter === 'unread' ? '/' : ('/' + currentFilter);
        if (window.location.pathname !== newPath) {
          history.pushState({}, '', newPath);
        }
      }
    }

    function handleReaderBack() {
      if (isFocusMode) {
        toggleReaderFocusMode(false);
        return;
      }
      if (window.innerWidth < 1024) {
        closeReader(true);
      } else {
        closeReader(true);
      }
    }

    let scrollSaveTimer = null;
    function handleReaderScroll() {
      updateReadingProgress();
      const container = document.getElementById('readerScrollContainer');
      if (!container) return;
      const st = container.scrollTop;

      if (!shouldReaderAutoHide()) {
        showReaderTopBar(true);
        lastReaderScrollTop = Math.max(0, st);
        return;
      }

      if (st <= 10) {
        showReaderTopBar(true);
        readerScrollAnchorY = 0;
        lastReaderScrollTop = 0;
        return;
      }

      if (st > lastReaderScrollTop) {
        // Scrolling Down
        if (readerScrollDirection !== 'down') {
          readerScrollDirection = 'down';
          readerScrollAnchorY = st;
        }
        const distanceDown = st - readerScrollAnchorY;
        if (distanceDown >= 55) { // ~3 lines of text
          hideReaderTopBar(true);
          readerScrollAnchorY = st;
        }
      } else if (st < lastReaderScrollTop) {
        // Scrolling Up
        if (readerScrollDirection !== 'up') {
          readerScrollDirection = 'up';
          readerScrollAnchorY = st;
        }
        const distanceUp = readerScrollAnchorY - st;
        if (distanceUp >= 50) { // ~3 lines of text
          showReaderTopBar(true);
          readerScrollAnchorY = st;
        }
      }
      lastReaderScrollTop = Math.max(0, st);
    }

    
    function getReadingProgressText(item, savedRatio) {
      const totalMin = item.reading_time || 1;
      const progressPct = Math.round(savedRatio * 100);
      if (progressPct >= 95) return 'Finished (' + totalMin + 'm)';
      if (progressPct > 0) return Math.max(1, Math.round(totalMin * (1 - savedRatio))) + ' of ' + totalMin + ' min left';
      return totalMin + ' min read';
    }

    function updateCardReadingProgress(id, ratio) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      const progressEl = document.getElementById('card-progress-' + id);
      if (progressEl) {
        progressEl.textContent = getReadingProgressText(item, ratio);
      }
    }

    // Article actions
    async function toggleStar(id, current) {
      const next = current ? 0 : 1;
      const item = allEntries.find(e => e.id === id);
      if (item) item.is_starred = next;
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      updateCounts();
      filterArticles();
      if (activeArticleId === id) {
        const starBtn = document.getElementById('readerStarBtn');
        const starIcon = document.getElementById('readerStarIcon');
        if (next) {
          starBtn?.classList.add('active-star');
          starIcon?.setAttribute('fill', 'currentColor');
        } else {
          starBtn?.classList.remove('active-star');
          starIcon?.setAttribute('fill', 'none');
        }
      }
      showToast(next ? 'Starred article' : 'Unstarred article');
      enqueueMutation('toggle_star', { id: id, is_starred: next });
    }

    async function toggleArchive(id, current) {
      const next = current ? 0 : 1;
      const item = allEntries.find(e => e.id === id);
      if (item) item.is_archived = next;
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      updateCounts();
      filterArticles();
      if (activeArticleId === id) {
        const archiveBtn = document.getElementById('readerArchiveBtn');
        if (next) archiveBtn?.classList.add('active-archive');
        else archiveBtn?.classList.remove('active-archive');
      }
      showToast(next ? 'Archived article' : 'Moved to unread');
      enqueueMutation('toggle_archive', { id: id, is_archived: next });
    }

    async function toggleActiveStar() {
      if (!activeArticleId) return;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item) await toggleStar(activeArticleId, item.is_starred);
    }

    async function toggleActiveArchive() {
      if (!activeArticleId) return;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item) await toggleArchive(activeArticleId, item.is_archived);
    }

    async function deleteEntryAction(id) {
      const ok = await showConfirmDialog('Delete Article', 'Are you sure you want to delete this article?\n\nThis action cannot be undone.', 'Delete Article', true);
      if (!ok) return;

      const item = allEntries.find(e => e.id === id);
      allEntries = allEntries.filter(e => e.id !== id);
      deleteEntryFromIndexedDB(id);
      if (serverLibraryCounts) {
        serverLibraryCounts.total = allEntries.length;
        serverLibraryCounts.unread = allEntries.filter(e => !e.is_archived).length;
        serverLibraryCounts.starred = allEntries.filter(e => e.is_starred).length;
        serverLibraryCounts.archive = allEntries.filter(e => e.is_archived).length;
      }
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      updateCounts();
      renderSidebarTags();
      updateSettingsStats();
      filterArticles();
      if (activeArticleId === id) {
        closeReader(true);
      }
      showToast('Article deleted');
      enqueueMutation('delete', { id: id, snapshot: item });
    }

    function deleteActiveArticle() {
      if (activeArticleId) deleteEntryAction(activeArticleId);
    }

    function refetchActiveArticleContent() {
      if (activeArticleId) refetchArticleContent(activeArticleId);
    }

    async function refetchArticleContent(id) {
      closeReaderMoreMenu();
      const item = allEntries.find(e => e.id === id);
      if (!item || !item.url) return;

      const ok = await showConfirmDialog(
        'Re-fetch Article',
        'Re-fetch article from original source URL (' + (item.domain_name || item.url) + ')?',
        'Re-fetch',
        false
      );
      if (!ok) return;

      showToast('Re-fetching article from source...');
      try {
        const res = await authFetch('/api/entries/' + id + '/reload.json', { method: 'PATCH' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || ('HTTP ' + res.status));
        }
        const updated = await res.json();
        const idx = allEntries.findIndex(e => e.id === id);
        if (idx >= 0) allEntries[idx] = updated;
        else allEntries.unshift(updated);
        syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);

        if (activeArticleId === id) {
          await openReader(id, false);
        }

        requestAnimationFrame(() => {
          filterArticles();
        });

        showToast('✓ Article content re-fetched successfully!');
      } catch (err) {
        showToast(err.message || 'Failed to re-fetch article', true);
      }
    }

    function copySyncValue(elementId, btn) {
      const el = document.getElementById(elementId);
      const fullUrl = el?.getAttribute('data-full-url') || el?.textContent?.trim() || '';
      if (fullUrl) copyDirectText(fullUrl, btn);
    }

    function copySyncOpdsAuthUrl(btn) {
      const el = document.getElementById('syncOpdsAuthUrl');
      const fullUrl = el?.getAttribute('data-full-url') || el?.textContent?.trim() || '';
      if (fullUrl) copyDirectText(fullUrl, btn);
    }

    function updateOpdsTokenBadge(hasDedicatedReadToken) {
      const opdsBadgeEl = document.getElementById('syncOpdsTokenStatusBadge');
      const helpEl = document.getElementById('syncOpdsCredentialsHelp');

      if (opdsBadgeEl) {
        opdsBadgeEl.style.display = 'flex';
        opdsBadgeEl.style.alignItems = 'center';
        opdsBadgeEl.style.flexWrap = 'wrap';
        opdsBadgeEl.style.gap = '0.35rem';
        if (hasDedicatedReadToken) {
          opdsBadgeEl.style.background = 'rgba(34, 197, 94, 0.1)';
          opdsBadgeEl.style.border = '1px solid rgba(34, 197, 94, 0.25)';
          opdsBadgeEl.style.color = 'var(--success, #22c55e)';
          opdsBadgeEl.innerHTML = '<span style="font-weight: 600;">🟢 Dedicated READ_TOKEN Active</span><span style="color: var(--text-secondary); font-size: 0.72rem;">(Isolated read-only access)</span>';
        } else {
          opdsBadgeEl.style.background = 'rgba(234, 179, 8, 0.08)';
          opdsBadgeEl.style.border = '1px solid rgba(234, 179, 8, 0.2)';
          opdsBadgeEl.style.color = 'var(--warning, #eab308)';
          opdsBadgeEl.innerHTML = '<span style="font-weight: 600;">🔑 Using Master AUTH_TOKEN</span><span style="color: var(--text-secondary); font-size: 0.72rem;">(Set READ_TOKEN in Cloudflare Secrets to isolate readers & feeds)</span>';
        }
      }

      if (helpEl) {
        if (hasDedicatedReadToken) {
          helpEl.innerHTML = '<div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.15rem;">HTTP Basic Auth Credentials (OPDS & Feeds):</div>' +
            '<div>• Username: <code>wallaflare</code> &nbsp;•&nbsp; Password: <code>READ_TOKEN</code></div>' +
            '<div style="color: var(--text-muted); font-size: 0.7rem; margin-top: 0.15rem;">(Master AUTH_TOKEN is rejected on /opds and /feed for security isolation)</div>';
        } else {
          helpEl.innerHTML = '<div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.15rem;">HTTP Basic Auth Credentials (OPDS & Feeds):</div>' +
            '<div>• Username: <code>wallaflare</code> &nbsp;•&nbsp; Password: <code>AUTH_TOKEN</code></div>';
        }
      }
    }

    // View Modes (List / Grid / Compact) & Sorting
    function setViewMode(mode) {
      currentViewMode = mode;
      localStorage.setItem('wf_view_mode', mode);
      const grid = document.getElementById('articlesGrid');
      if (grid) {
        grid.className = 'articles-grid view-' + mode;
      }
    }

    function cycleViewMode() {
      const modes = ['list', 'grid', 'compact'];
      const idx = modes.indexOf(currentViewMode);
      setViewMode(modes[(idx + 1) % modes.length]);
      showToast('Layout: ' + currentViewMode.toUpperCase());
    }

    const SORT_MENU_OPTIONS = [
      { id: 'newest', label: 'Newest First', iconSvg: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' },
      { id: 'oldest', label: 'Oldest First', iconSvg: '<polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>' },
      { id: 'shortest', label: 'Shortest Read', iconSvg: '<line x1="4" y1="12" x2="12" y2="12"></line><line x1="4" y1="6" x2="8" y2="6"></line><line x1="4" y1="18" x2="16" y2="18"></line>' },
      { id: 'longest', label: 'Longest Read', iconSvg: '<line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="12" x2="16" y2="12"></line><line x1="4" y1="18" x2="8" y2="18"></line>' },
      { id: 'title', label: 'Title (A-Z)', iconSvg: '<path d="M4 19V5h3v14H4zM10 19l4.5-14h2L21 19h-2.4l-.8-2.6h-3.6l-.8 2.6H10zm4.2-4.7h2.6L15.5 9.2h-.1l-1.2 5.1z"></path>' },
      { id: 'domain', label: 'Website / Domain', iconSvg: '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>' }
    ];

    function generateSortMenuHtml(currentOrder = 'newest', closeFnName = 'closeAllCardMenus()') {
      return SORT_MENU_OPTIONS.map(opt => {
        const isActive = opt.id === currentOrder;
        const checkmark = isActive
          ? '<span style="margin-left: auto; font-weight: 700; color: var(--accent); font-size: 0.9rem;">✓</span>'
          : '';
        return '<button type="button" class="menu-item ' + (isActive ? 'active' : '') + '" onclick="setSortOrder(\'' + opt.id + '\'); ' + closeFnName + ';"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + opt.iconSvg + '</svg><span>' + opt.label + '</span>' + checkmark + '</button>';
      }).join('');
    }

    function toggleSortMenu() {
      const menu = document.getElementById('sortDropdownMenu');
      if (menu) {
        const isOpen = menu.classList.contains('open');
        closeAllCardMenus();
        if (!isOpen) {
          menu.innerHTML = generateSortMenuHtml(currentSortOrder || 'newest', 'closeAllCardMenus()');
          menu.classList.add('open');
          const backdrop = document.getElementById('cardMenuBackdrop');
          if (backdrop) backdrop.style.display = 'block';
        }
      }
    }

    function sortEntriesLocally(entries, order) {
      if (!Array.isArray(entries) || entries.length <= 1) return entries;
      const sorted = [...entries];
      if (order === 'oldest') {
        sorted.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      } else if (order === 'title') {
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      } else if (order === 'shortest') {
        sorted.sort((a, b) => (a.reading_time || 1) - (b.reading_time || 1));
      } else if (order === 'longest') {
        sorted.sort((a, b) => (b.reading_time || 1) - (a.reading_time || 1));
      } else {
        sorted.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      }
      return sorted;
    }

    function setSortOrder(order) {
      currentSortOrder = order;
      localStorage.setItem('wf_sort_order', order);
      closeAllCardMenus();
      allEntries = sortEntriesLocally(allEntries, order);
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      filterArticles();
      showToast('Sorted by: ' + order);
    }

    function handleSearchInput() {
      const input = document.getElementById(searchInput);
      const clearBtn = document.getElementById(searchClearBtn);
      if (clearBtn) clearBtn.style.display = input && input.value ? inline-flex : none;
      filterArticles();
    }

    function clearSearchInput() {
      const input = document.getElementById('searchInput');
      const clearBtn = document.getElementById('searchClearBtn');
      if (input) input.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      filterArticles();
    }

    function handleSearchInputKeydown(e) {
      const input = document.getElementById('searchInput');
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (input && input.value) {
          clearSearchInput();
        }
        input?.blur();
        setKeyboardPaneFocus('list');
      } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
        const visibleEntries = getFilteredEntries();
        if (visibleEntries && visibleEntries.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          openReader(visibleEntries[0].id, true);
          const card = document.getElementById('entry-card-' + visibleEntries[0].id);
          card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          input?.blur();
          setKeyboardPaneFocus('list');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        input?.blur();
        setKeyboardPaneFocus('list');
      }
    }

    // Batch Selection Mode
    function isSelectionMode() {
      return selectedArticleIds.size > 0;
    }

    function toggleArticleSelection(id, force) {
      const numId = typeof id === 'string' ? parseInt(id, 10) : Number(id);
      if (typeof force === 'boolean') {
        if (force) selectedArticleIds.add(numId);
        else selectedArticleIds.delete(numId);
      } else {
        if (selectedArticleIds.has(numId)) selectedArticleIds.delete(numId);
        else selectedArticleIds.add(numId);
      }

      updateBatchUI();
    }

    function clearArticleSelection() {
      selectedArticleIds.clear();
      updateBatchUI();
    }

    function toggleSelectAllArticles() {
      const visible = getFilteredEntries();
      if (selectedArticleIds.size === visible.length) {
        selectedArticleIds.clear();
      } else {
        selectedArticleIds = new Set(visible.map(e => e.id));
      }
      updateBatchUI();
    }

    function updateBatchUI() {
      const header = document.getElementById('batchActionHeader');
      const standard = document.getElementById('standardNavHeader');
      const countLabel = document.getElementById('batchSelectedCount');
      const count = selectedArticleIds.size;

      if (count > 0) {
        document.body.classList.add('selection-mode-active');
        if (header) header.style.display = 'flex';
        if (standard) standard.style.display = 'none';
        if (countLabel) countLabel.textContent = count + ' selected';

        // Visibility based on selection count
        const highlightsBtn = document.getElementById('batchHighlightsBtn');
        const openOriginalBtn = document.getElementById('batchOpenOriginalBtn');
        const editTitleBtn = document.getElementById('batchEditTitleBtn');
        const exportPdfBtn = document.getElementById('batchExportPdfBtn');
        const exportAnthologyBtn = document.getElementById('batchExportAnthologyBtn');
        const exportEpubLabel = document.getElementById('batchExportEpubLabel');
        const exportMdLabel = document.getElementById('batchExportMdLabel');
        const exportJsonLabel = document.getElementById('batchExportJsonLabel');

        if (count === 1) {
          if (highlightsBtn) { highlightsBtn.classList.remove('is-hidden'); highlightsBtn.style.setProperty('display', 'flex', 'important'); }
          if (openOriginalBtn) { openOriginalBtn.classList.remove('is-hidden'); openOriginalBtn.style.setProperty('display', 'flex', 'important'); }
          if (editTitleBtn) { editTitleBtn.classList.remove('is-hidden'); editTitleBtn.style.setProperty('display', 'flex', 'important'); }
          if (exportPdfBtn) { exportPdfBtn.classList.remove('is-hidden'); exportPdfBtn.style.setProperty('display', 'flex', 'important'); }
          if (exportAnthologyBtn) { exportAnthologyBtn.classList.add('is-hidden'); exportAnthologyBtn.style.setProperty('display', 'none', 'important'); }
          if (exportEpubLabel) exportEpubLabel.textContent = 'EPUB (.epub)';
          if (exportMdLabel) exportMdLabel.textContent = 'Markdown (.md)';
          if (exportJsonLabel) exportJsonLabel.textContent = 'JSON (.json)';
        } else {
          if (highlightsBtn) { highlightsBtn.classList.add('is-hidden'); highlightsBtn.style.setProperty('display', 'none', 'important'); }
          if (openOriginalBtn) { openOriginalBtn.classList.add('is-hidden'); openOriginalBtn.style.setProperty('display', 'none', 'important'); }
          if (editTitleBtn) { editTitleBtn.classList.add('is-hidden'); editTitleBtn.style.setProperty('display', 'none', 'important'); }
          if (exportPdfBtn) { exportPdfBtn.classList.add('is-hidden'); exportPdfBtn.style.setProperty('display', 'none', 'important'); }
          if (exportAnthologyBtn) { exportAnthologyBtn.classList.remove('is-hidden'); exportAnthologyBtn.style.setProperty('display', 'flex', 'important'); }
          if (exportEpubLabel) exportEpubLabel.textContent = 'Export All as ZIP (EPUBs)';
          if (exportMdLabel) exportMdLabel.textContent = 'Export All as ZIP (Markdown)';
          if (exportJsonLabel) exportJsonLabel.textContent = 'Export All as JSON';
        }
      } else {
        document.body.classList.remove('selection-mode-active');
        if (header) header.style.display = 'none';
        if (standard) standard.style.display = 'flex';
      }

      document.querySelectorAll('.article-card').forEach(card => {
        const id = parseInt(card.dataset.id, 10);
        const isSelected = selectedArticleIds.has(id);
        card.classList.toggle('is-selected', isSelected);
        const checkbox = card.querySelector('.card-checkbox');
        if (checkbox) checkbox.classList.toggle('checked', isSelected);
      });
    }

    function toggleBatchMenu() {
      const menu = document.getElementById('batchDropdownMenu');
      if (!menu) return;
      const isOpen = menu.classList.contains('open');
      closeAllCardMenus();
      if (!isOpen) {
        const items = allEntries.filter(e => selectedArticleIds.has(e.id));
        if (items.length === 1) {
          menu.innerHTML = generateUnifiedArticleMenuHtml({
            item: items[0],
            mode: 'card',
            closeFnName: 'closeBatchMenu()'
          });
        } else if (items.length > 1) {
          menu.innerHTML = generateUnifiedArticleMenuHtml({
            items,
            mode: 'batch',
            closeFnName: 'closeBatchMenu()'
          });
        }
        menu.classList.add('open');
        const backdrop = document.getElementById('cardMenuBackdrop');
        if (backdrop) backdrop.style.display = 'block';
      }
    }

    function closeBatchMenu() {
      document.getElementById('batchDropdownMenu')?.classList.remove('open');
      const exportWrap = document.getElementById('batchExportWrap');
      if (exportWrap) exportWrap.classList.remove('expanded');
      const backdrop = document.getElementById('cardMenuBackdrop');
      if (backdrop) backdrop.style.display = 'none';
    }



    function batchOpenOriginal() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 1) {
        closeAllCardMenus();
        const item = allEntries.find(e => e.id === ids[0]);
        if (item && item.url) {
          window.open(item.url, '_blank', 'noopener,noreferrer');
        }
      }
    }

    async function batchRefetchContent() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      showToast('Re-fetching ' + ids.length + ' articles...');
      for (const id of ids) {
        try {
          await authFetch('/api/entries/' + id + '/reload.json', { method: 'PATCH' });
        } catch (e) {}
      }
      clearArticleSelection();
      await loadArticles(true);
      showToast('Content re-fetched');
    }

    async function batchToggleStar() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      const targetIds = [...ids];
      const allStarred = targetIds.every(id => allEntries.find(e => e.id === id)?.is_starred);
      const newStarVal = allStarred ? 0 : 1;

      for (const id of targetIds) {
        const item = allEntries.find(e => e.id === id);
        if (item) item.is_starred = newStarVal;
      }
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      filterArticles();
      clearArticleSelection();
      showToast(newStarVal ? 'Starred ' + targetIds.length + ' articles' : 'Unstarred ' + targetIds.length + ' articles');
      enqueueMutation('batch_star', { ids: targetIds, starred: newStarVal });
    }

    async function batchToggleArchive() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      const targetIds = [...ids];
      const allArchived = targetIds.every(id => allEntries.find(e => e.id === id)?.is_archived);
      const newArchiveVal = allArchived ? 0 : 1;

      for (const id of targetIds) {
        const item = allEntries.find(e => e.id === id);
        if (item) item.is_archived = newArchiveVal;
      }
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      filterArticles();
      clearArticleSelection();
      showToast(newArchiveVal ? 'Archived ' + targetIds.length + ' articles' : 'Moved ' + targetIds.length + ' articles to unread');
      enqueueMutation('batch_archive', { ids: targetIds, archive: newArchiveVal });
    }

    
    function batchArchiveArticles() {
      batchToggleArchive();
    }

    function batchStarArticles() {
      batchToggleStar();
    }

    function toggleFocusMode() {
      toggleReaderFocusMode();
    }

    function batchManageTags() {
      if (selectedArticleIds.size === 0) return;
      openTagModal(Array.from(selectedArticleIds));
    }

    async function batchDeleteArticles() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      const ok = await showConfirmDialog(
        'Delete Articles',
        'Are you sure you want to delete ' + ids.length + ' article' + (ids.length === 1 ? '' : 's') + '?\n\nThis action cannot be undone.',
        'Delete',
        true
      );
      if (!ok) return;

      const deleteIds = [...ids];
      const items = deleteIds.map(id => allEntries.find(e => e.id === id)).filter(Boolean);
      allEntries = allEntries.filter(e => !selectedArticleIds.has(e.id));
      for (const id of deleteIds) {
        deleteEntryFromIndexedDB(id);
      }
      if (serverLibraryCounts) {
        serverLibraryCounts.total = allEntries.length;
        serverLibraryCounts.unread = allEntries.filter(e => !e.is_archived).length;
        serverLibraryCounts.starred = allEntries.filter(e => e.is_starred).length;
        serverLibraryCounts.archive = allEntries.filter(e => e.is_archived).length;
      }
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      clearArticleSelection();
      updateCounts();
      renderSidebarTags();
      updateSettingsStats();
      filterArticles();
      showToast('✓ ' + deleteIds.length + ' articles deleted');
      enqueueMutation('batch_delete', { ids: deleteIds, snapshots: items });
    }

    function toggleMobileNavMenu(e) {
      if (e) e.stopPropagation();
      const drawer = document.getElementById('mobileNavDropdown');
      const backdrop = document.getElementById('mobileNavBackdrop');
      if (drawer) {
        drawer.style.transform = '';
        drawer.style.transition = '';
      }
      if (backdrop) {
        backdrop.style.opacity = '';
        backdrop.style.transition = '';
      }
      drawer?.classList.toggle('open');
      backdrop?.classList.toggle('open');
    }


    // Elastic Rubber-Band Overscroll for Mobile Lists & Reader
    
    // Unified Haptic Feedback across Native Bridge, Capacitor & Web Vibrator
    function triggerHaptic(type = 'light') {
      try {
        if ((window as any).AndroidNative?.triggerHaptic) {
          (window as any).AndroidNative.triggerHaptic(type);
          return;
        }
        if ((window as any).Capacitor?.Plugins?.Haptics) {
          (window as any).Capacitor.Plugins.Haptics.impact({ style: type === 'heavy' ? 'heavy' : (type === 'medium' ? 'medium' : 'light') });
          return;
        }
        if (navigator.vibrate) {
          navigator.vibrate(type === 'heavy' ? 35 : (type === 'medium' ? 20 : 12));
        }
      } catch (e) {}
    }

    function setupElasticOverscroll(scrollContainer, targetElement, options = { allowPullDown: true, allowPullUp: true }) {
      if (!scrollContainer) return;
      const target = targetElement || scrollContainer.firstElementChild || scrollContainer;
      let startY = 0;
      let startX = 0;
      let isTracking = false;
      let currentPull = 0;

      scrollContainer.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        isTracking = false;
        currentPull = 0;
        target.style.transition = 'none';
      }, { passive: true });

      scrollContainer.addEventListener('touchmove', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const deltaY = currentY - startY;
        const deltaX = currentX - startX;

        // Ignore horizontal swipes (e.g. drawer gestures)
        if (Math.abs(deltaX) > Math.abs(deltaY) && !isTracking) return;

        const isAtTop = scrollContainer.scrollTop <= 0;
        const isAtBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 1;

        const allowDown = options && options.allowPullDown !== false;
        const allowUp = options && options.allowPullUp !== false;
        const canPullDown = allowDown && isAtTop && deltaY > 0;
        const canPullUp = allowUp && isAtBottom && deltaY < 0;

        if (canPullDown || canPullUp) {
          isTracking = true;
          // Fluid logarithmic damping curve
          const resistance = 0.38;
          currentPull = Math.sign(deltaY) * Math.pow(Math.abs(deltaY), 0.82) * resistance;
          if (Math.abs(currentPull) > 100) currentPull = Math.sign(currentPull) * 100;
          target.style.transform = 'translate3d(0, ' + currentPull + 'px, 0)';
          target.style.willChange = 'transform';
        } else if (isTracking) {
          currentPull = 0;
          target.style.transform = '';
          isTracking = false;
        }
      }, { passive: true });

      const resetOverscroll = () => {
        if (!isTracking && currentPull === 0) return;
        isTracking = false;
        currentPull = 0;
        target.style.transition = 'transform 0.38s cubic-bezier(0.2, 0.9, 0.3, 1)';
        target.style.transform = 'translate3d(0, 0px, 0)';
        setTimeout(() => {
          target.style.transition = '';
          target.style.transform = '';
          target.style.willChange = '';
        }, 380);
      };

      scrollContainer.addEventListener('touchend', resetOverscroll, { passive: true });
      scrollContainer.addEventListener('touchcancel', resetOverscroll, { passive: true });

      scrollContainer._resetOverscroll = () => {
        isTracking = false;
        currentPull = 0;
        target.style.transition = 'none';
        target.style.transform = '';
        target.style.willChange = '';
      };
    }

    function closeMobileNavMenu() {
      const drawer = document.getElementById('mobileNavDropdown');
      const backdrop = document.getElementById('mobileNavBackdrop');
      drawer?.classList.remove('open');
      backdrop?.classList.remove('open');
      if (drawer) {
        drawer.style.transform = '';
        drawer.style.transition = '';
      }
      if (backdrop) {
        backdrop.style.opacity = '';
        backdrop.style.transition = '';
      }
    }

    function setupMobileDrawerSwipeTracking() {
      const drawer = document.getElementById('mobileNavDropdown');
      const backdrop = document.getElementById('mobileNavBackdrop');
      if (!drawer || !backdrop) return;

      let startX = 0;
      let startY = 0;
      let currentX = 0;
      let isTracking = false;
      let isHorizontal = false;

      const handleTouchStart = (e) => {
        if (!drawer.classList.contains('open')) return;
        if (!e.touches || e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentX = startX;
        isTracking = true;
        isHorizontal = false;
        drawer.style.transition = 'none';
        backdrop.style.transition = 'none';
      };

      const handleTouchMove = (e) => {
        if (!isTracking || !e.touches || e.touches.length !== 1) return;
        currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = currentX - startX;
        const diffY = currentY - startY;

        if (!isHorizontal) {
          if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 8) {
            isHorizontal = true;
          } else if (Math.abs(diffY) > 8) {
            isTracking = false;
            return;
          }
        }

        if (isHorizontal && diffX < 0) {
          const drawerWidth = drawer.offsetWidth || 285;
          const translateX = Math.max(-drawerWidth, diffX);
          drawer.style.transform = 'translateX(' + translateX + 'px)';
          const progress = Math.max(0, Math.min(1, 1 + (diffX / drawerWidth)));
          backdrop.style.opacity = String(progress);
        }
      };

      const handleSwipeEnd = () => {
        if (!isTracking) return;
        isTracking = false;
        drawer.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
        backdrop.style.transition = 'opacity 0.25s ease';

        const diffX = currentX - startX;
        if (isHorizontal && diffX < -50) {
          closeMobileNavMenu();
          setTimeout(() => {
            drawer.style.transform = '';
            backdrop.style.opacity = '';
            drawer.style.transition = '';
            backdrop.style.transition = '';
          }, 260);
        } else {
          drawer.style.transform = '';
          backdrop.style.opacity = '';
          setTimeout(() => {
            drawer.style.transition = '';
            backdrop.style.transition = '';
          }, 260);
        }
      };

      drawer.addEventListener('touchstart', handleTouchStart, { passive: true });
      drawer.addEventListener('touchmove', handleTouchMove, { passive: true });
      drawer.addEventListener('touchend', handleSwipeEnd, { passive: true });
      drawer.addEventListener('touchcancel', handleSwipeEnd, { passive: true });

      backdrop.addEventListener('touchstart', handleTouchStart, { passive: true });
      backdrop.addEventListener('touchmove', handleTouchMove, { passive: true });
      backdrop.addEventListener('touchend', handleSwipeEnd, { passive: true });
      backdrop.addEventListener('touchcancel', handleSwipeEnd, { passive: true });
    }

    function closeAllCardMenus() {
      document.getElementById('cardMenuBackdrop')?.style.setProperty('display', 'none');
      document.querySelectorAll('.card-dropdown-menu.open').forEach(m => m.classList.remove('open'));
      closeCardContextMenu();
      closeBatchMenu();
      closeReaderMoreMenu();
    }

    let contextMenuArticleId = null;

    function handleCardContextMenu(e, id) {
      e.preventDefault();
      e.stopPropagation();

      // Right-click context menu is strictly for desktop mouse interaction.
      // On mobile viewport, Android Capacitor app, or touch/long-press interactions, suppress the floating context menu.
      if (window.innerWidth < 1024 || isCapacitorApp() || cardLongPressTriggered || (e.pointerType === 'touch')) {
        return;
      }

      if (selectedArticleIds && selectedArticleIds.size > 0) {
        if (selectedArticleIds.has(id)) {
          openBatchContextMenu(e.clientX, e.clientY);
          return;
        } else {
          clearArticleSelection();
        }
      }

      openCardContextMenu(e.clientX, e.clientY, id);
    }

    function handleExportBatchEpub() {
      closeCardContextMenu();
      closeBatchMenu();
      exportBatchZip('epub');
    }

    function handleExportBatchMarkdown() {
      closeCardContextMenu();
      closeBatchMenu();
      exportBatchZip('markdown');
    }

    function handleExportBatchJson() {
      closeCardContextMenu();
      closeBatchMenu();
      exportBatchZip('json');
    }

    function openBatchContextMenu(clientX, clientY) {
      closeAllCardMenus();
      closeHighlightPopover();
      closeReaderAppearancePopover();

      const menu = document.getElementById('cardContextMenu');
      if (!menu) return;

      const items = allEntries.filter(e => selectedArticleIds.has(e.id));
      if (items.length === 0) return;

      if (items.length === 1) {
        menu.innerHTML = generateUnifiedArticleMenuHtml({
          item: items[0],
          mode: 'card',
          closeFnName: 'closeCardContextMenu()'
        });
      } else {
        menu.innerHTML = generateUnifiedArticleMenuHtml({
          items,
          mode: 'batch',
          closeFnName: 'closeCardContextMenu()'
        });
      }

      menu.style.display = 'flex';
      menu.classList.add('open');

      const menuWidth = 225;
      const menuHeight = items.length === 1 ? 380 : 280;
      const x = Math.min(clientX, window.innerWidth - menuWidth - 12);
      const y = Math.min(clientY, window.innerHeight - menuHeight - 12);
      menu.style.left = Math.max(8, x) + 'px';
      menu.style.top = Math.max(8, y) + 'px';

      const backdrop = document.getElementById('cardMenuBackdrop');
      if (backdrop) backdrop.style.display = 'block';
    }

    function openCardContextMenu(clientX, clientY, id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      contextMenuArticleId = id;

      closeAllCardMenus();
      closeHighlightPopover();
      closeReaderAppearancePopover();

      const menu = document.getElementById('cardContextMenu');
      if (!menu) return;

      menu.innerHTML = generateUnifiedArticleMenuHtml({
        item,
        mode: 'card',
        closeFnName: 'closeCardContextMenu()'
      });

      menu.style.display = 'flex';
      menu.classList.add('open');

      const menuWidth = 225;
      const menuHeight = 380;
      const x = Math.min(clientX, window.innerWidth - menuWidth - 12);
      const y = Math.min(clientY, window.innerHeight - menuHeight - 12);
      menu.style.left = Math.max(8, x) + 'px';
      menu.style.top = Math.max(8, y) + 'px';

      const backdrop = document.getElementById('cardMenuBackdrop');
      if (backdrop) backdrop.style.display = 'block';
    }

    function closeCardContextMenu() {
      const menu = document.getElementById('cardContextMenu');
      if (menu) {
        menu.style.display = 'none';
        menu.classList.remove('open');
      }
      contextMenuArticleId = null;
      const backdrop = document.getElementById('cardMenuBackdrop');
      if (backdrop) backdrop.style.display = 'none';
    }

    function toggleContextExportSubmenu() {
      document.getElementById('contextExportWrap')?.classList.toggle('expanded');
    }

    function openArticleOriginalLink(id) {
      const item = allEntries.find(e => e.id === id);
      if (item && item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      }
    }



        
    async function handleConfirmWipeDatabase(e) {
      e.preventDefault();
      const passInput = document.getElementById('wipeDbPasswordInput');
      const errEl = document.getElementById('wipeDbErrorMsg');
      const submitBtn = document.getElementById('wipeDbSubmitBtn');
      const password = passInput ? passInput.value.trim() : '';

      if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Wiping...'; }

      try {
        const res = await authFetch('/api/admin/reset-database.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: password, password: password })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'HTTP ' + res.status);
        }

        const resData = await res.json().catch(() => ({}));
        closeModal('wipeDbModal');
        localStorage.removeItem('wf_sync_rev');
      localStorage.removeItem('wf_instance_id');
        localStorage.removeItem('wf_cached_articles');
        localStorage.removeItem('wf_cached_tags');
        localStorage.removeItem('wf_cached_counts');
        localStorage.removeItem('wf_pending_mutations');
      localStorage.removeItem('wf_instance_id');
        if (resData.instance_id) {
          localStorage.setItem('wf_instance_id', String(resData.instance_id));
        } else {
          localStorage.removeItem('wf_instance_id');
        }
        currentSyncRev = 1;
        allEntries = [];
        cachedGlobalTags = [];
        serverLibraryCounts = { unread: 0, archive: 0, starred: 0, total: 0 };
        await clearIndexedDB();
        updateCounts();
        renderSidebarTags();
        filterArticles();
        showToast('✓ Cloudflare D1 database wiped successfully');
      } catch (err) {
        if (errEl) {
          errEl.textContent = 'Failed to wipe database: ' + err.message;
          errEl.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Permanently Wipe Database';
        }
      }
    }

    let cachedSiteCookies = [];

    async function loadSiteCookies() {
      try {
        const res = await authFetch('/api/site-cookies');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.sites)) {
            cachedSiteCookies = data.sites;
            renderSiteCookiesList();
          }
        }
      } catch (e) {
        console.warn('Failed to load site cookies:', e);
      }
    }

    function renderSiteCookiesList() {
      const container = document.getElementById('settingsSiteCookieList') || document.getElementById('activeSiteCookiesList');
      if (!container) return;

      if (!cachedSiteCookies || cachedSiteCookies.length === 0) {
        container.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; padding: 0.4rem 0;">No logged-in sites configured yet. Tap a preset above or + Add Site.</div>';
        return;
      }

      container.innerHTML = cachedSiteCookies.map((site) => {
        const name = site.site_name || site.domain;
        const domain = site.domain;
        const isEnabled = site.is_enabled !== 0;
        const statusBadge = isEnabled
          ? '<span style="color: #22c55e; font-weight: 500;">🟢 Enabled</span>'
          : '<span style="color: var(--text-muted); font-weight: 500;">⚪ Disabled</span>';

        return '<div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.45rem 0.65rem; font-size: 0.8rem; opacity: ' + (isEnabled ? '1' : '0.65') + '; transition: opacity 0.2s;">' +
          '<div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">' +
            '<span style="font-size: 0.9rem;">🔑</span>' +
            '<div style="overflow: hidden;">' +
              '<div style="font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + escapeHtml(name) + '</div>' +
              '<div style="font-size: 0.7rem; color: var(--text-muted);">' + escapeHtml(domain) + ' &bull; ' + statusBadge + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="display: flex; gap: 0.65rem; align-items: center;">' +
            '<label class="site-cookie-switch" title="' + (isEnabled ? 'Disable authenticated scraping' : 'Enable authenticated scraping') + '">' +
              '<input type="checkbox" ' + (isEnabled ? 'checked' : '') + ' onchange="handleToggleSiteCookie(\'' + escapeHtml(domain) + '\', this.checked)" />' +
              '<span class="site-cookie-slider"></span>' +
            '</label>' +
            '<button class="btn btn-outline" style="padding: 2px 6px; font-size: 0.72rem; color: var(--danger, #ef4444);" onclick="handleDeleteSiteCookie(\'' + escapeHtml(domain) + '\')" title="Remove logged-in session">' +
              'Remove' +
            '</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function openAddSiteCookieDialog(defaultDomain, defaultName) {
      const domainInput = document.getElementById('siteCookieDomainInput');
      const valInput = document.getElementById('siteCookieValueInput');
      if (domainInput) domainInput.value = defaultDomain || '';
      if (valInput) valInput.value = '';
      const titleEl = document.getElementById('siteCookieModalTitle');
      if (titleEl) titleEl.textContent = defaultName ? ('Log In to ' + defaultName) : 'Log In to Site';

      const isNative = isCapacitorApp();
      const mobileWrap = document.getElementById('siteCookieLoginActionWrap');
      const webBanner = document.getElementById('siteCookieWebBanner');
      const manualInput = document.getElementById('siteCookieValueInput');

      if (mobileWrap) mobileWrap.style.display = isNative ? 'block' : 'none';
      if (webBanner) webBanner.style.display = isNative ? 'none' : 'block';
      if (manualInput) manualInput.required = !isNative;

      openModal('siteCookieModal');
      if (!isNative && defaultDomain && valInput) {
        setTimeout(() => valInput.focus(), 150);
      }
    }

    async function handlePresetSiteLogin(domain, name, loginUrl) {
      if (isCapacitorApp() && typeof window.Capacitor !== 'undefined') {
        const plugins = window.Capacitor.Plugins;
        const nativePlugin = plugins?.WallaflareNative || plugins?.WallaflareNativePlugin;
        if (nativePlugin && typeof nativePlugin.openSiteLogin === 'function') {
          try {
            const res = await nativePlugin.openSiteLogin({ domain: domain, name: name, url: loginUrl });
            if (res && res.cookies) {
              showToast('✓ Captured login session for ' + name);
              await saveSiteCookieToServer(res.domain || domain, res.name || name, res.cookies);
              await loadSiteCookies();
              return;
            }
          } catch (err) {
            console.warn('Native site login cancelled or failed:', err);
          }
        }
      }
      openAddSiteCookieDialog(domain, name);
    }

    async function launchInAppSiteLogin() {
      const domainInput = document.getElementById('siteCookieDomainInput');
      const domain = (domainInput ? domainInput.value : '').trim();
      if (!domain) {
        showToast('Please enter a domain first', true);
        return;
      }
      const loginUrl = domain.startsWith('http://') || domain.startsWith('https://') ? domain : ('https://' + domain);
      closeModal('siteCookieModal');
      await handlePresetSiteLogin(domain, domain, loginUrl);
    }

    async function saveSiteCookieToServer(domain, siteName, cookieValue) {
      try {
        const res = await authFetch('/api/site-cookies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: domain, site_name: siteName, cookie_value: cookieValue })
        });
        if (res.ok) {
          showToast('Saved session for ' + domain + '!');
          return true;
        }
      } catch (e) {}
      showToast('Failed to save session to server', true);
      return false;
    }

    async function handleSaveSiteCookieSubmit(e) {
      if (e) e.preventDefault();
      const domainInput = document.getElementById('siteCookieDomainInput');
      const valInput = document.getElementById('siteCookieValueInput');
      const domain = (domainInput ? domainInput.value : '').trim();
      const cookieValue = (valInput ? valInput.value : '').trim();

      if (!domain || !cookieValue) {
        showToast('Please provide both domain and cookie string', true);
        return;
      }

      const ok = await saveSiteCookieToServer(domain, domain, cookieValue);
      if (ok) {
        closeModal('siteCookieModal');
        await loadSiteCookies();
      }
    }

        async function handleToggleSiteCookie(domain, isEnabled) {
      const site = cachedSiteCookies.find(s => s.domain === domain);
      if (site) site.is_enabled = isEnabled ? 1 : 0;
      renderSiteCookiesList();

      if (isCapacitorApp() && typeof window.Capacitor !== 'undefined') {
        const nativePlugin = window.Capacitor.Plugins?.WallaflareNative;
        if (nativePlugin && typeof nativePlugin.setDomainEnabled === 'function') {
          nativePlugin.setDomainEnabled({ domain: domain, enabled: isEnabled }).catch(() => {});
        }
      }

      try {
        const res = await authFetch('/api/site-cookies/' + encodeURIComponent(domain), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_enabled: isEnabled })
        });
        if (res.ok) {
          showToast(domain + (isEnabled ? ' enabled' : ' disabled'));
          return;
        }
      } catch (e) {}
      showToast('Failed to update site toggle', true);
    }

    async function handleClearAllSiteCookies() {
      const ok = await showConfirmDialog(
        'Clear All Site Logins',
        'Are you sure you want to remove all saved site login cookies from both your Cloudflare server and this device?',
        'Clear All',
        true
      );
      if (!ok) return;

      try {
        const res = await authFetch('/api/site-cookies', { method: 'DELETE' });
        if (!res.ok) throw new Error('HTTP ' + res.status);

        cachedSiteCookies = [];
        renderSiteCookiesList();

        if (typeof (window as any).AndroidNative !== 'undefined' && typeof (window as any).AndroidNative.clearAllSiteCookies === 'function') {
          (window as any).AndroidNative.clearAllSiteCookies();
        } else if (isCapacitorApp() && typeof window.Capacitor !== 'undefined') {
          const nativePlugin = window.Capacitor.Plugins?.WallaflareNative;
          if (nativePlugin && typeof nativePlugin.clearAllSiteCookies === 'function') {
            nativePlugin.clearAllSiteCookies().catch(() => {});
          }
        }

        showToast('✓ All site logins and cookies cleared');
      } catch (err) {
        showToast('Failed to clear cookies: ' + (err.message || 'Error'), true);
      }
    }

    async function handleDeleteSiteCookie(domain) {
      const confirmed = await showConfirmDialog(
        'Remove Login Session',
        'Are you sure you want to remove the saved login session for ' + domain + '?\n\nThis will delete the stored cookies and revert to anonymous scraping for this domain.',
        'Remove Session',
        true
      );
      if (!confirmed) return;

      try {
        const res = await authFetch('/api/site-cookies/' + encodeURIComponent(domain), {
          method: 'DELETE'
        });
        if (res.ok) {
          if (isCapacitorApp() && typeof window.Capacitor !== 'undefined') {
            const nativePlugin = window.Capacitor.Plugins?.WallaflareNative;
            if (nativePlugin && typeof nativePlugin.clearDomainCookies === 'function') {
              nativePlugin.clearDomainCookies({ domain: domain }).catch(() => {});
            }
          }
          showToast('Removed login session for ' + domain);
          cachedSiteCookies = cachedSiteCookies.filter(s => s.domain !== domain);
          renderSiteCookiesList();
          if (isCapacitorApp() && typeof window.Capacitor !== 'undefined') {
            const nativePlugin = window.Capacitor.Plugins?.WallaflareNative;
            if (nativePlugin && typeof nativePlugin.syncAllDomainCookies === 'function') {
              nativePlugin.syncAllDomainCookies({ sites: cachedSiteCookies }).catch(() => {});
            }
          }
        }
      } catch (e) {
        showToast('Failed to delete site session', true);
      }
    }

    
    // Offline DB placeholder
    function saveArticlesToOfflineDb() {}
    function getArticlesFromOfflineDb() { return []; }
    // Pull to Refresh Implementation
    let touchStartY = 0;
    let isPulling = false;
    const ptrWrap = document.getElementById('pullToRefreshWrap');
    const ptrSvg = document.getElementById('pullToRefreshSvg');

            function initPullToRefresh() {
      const scrollContainer = document.getElementById('articlesScrollContainer');
      const wrap = document.getElementById('pullToRefreshWrap');
      const card = document.getElementById('pullToRefreshCard');
      const svg = document.getElementById('pullToRefreshSvg');
      const arcCircle = document.getElementById('pullToRefreshArc');
      const arrowHead = document.getElementById('pullToRefreshArrow');

      if (!scrollContainer || !wrap || !card || !svg || !arcCircle || !arrowHead) return;

      const threshold = 68;
      const CX = 20;
      const CY = 20;
      const R = 8.5;
      const CIRCUMFERENCE = 53.407;
      const ARROW_W = 6.0;
      const ARROW_H = 4.2;
      const MAX_SWEEP_DEG = 280;

      let startY = 0;
      let startX = 0;
      let isPulling = false;
      let isRefreshing = false;
      let hapticTriggered = false;

      scrollContainer.addEventListener('touchstart', (e) => {
        if (isRefreshing || activeArticleId) return;
        if (scrollContainer.scrollTop <= 2 && e.touches.length === 1) {
          startY = e.touches[0].pageY;
          startX = e.touches[0].pageX;
          isPulling = true;
          hapticTriggered = false;
          wrap.style.transition = 'none';
          card.style.transition = 'none';
          arcCircle.style.transition = 'none';
          arrowHead.style.transition = 'none';
          svg.style.transform = '';
        }
      }, { passive: true });

      scrollContainer.addEventListener('touchmove', (e) => {
        if (!isPulling || isRefreshing || activeArticleId || e.touches.length !== 1) return;
        const currentY = e.touches[0].pageY;
        const currentX = e.touches[0].pageX;
        const deltaY = currentY - startY;
        const deltaX = currentX - startX;

        if (Math.abs(deltaX) > Math.abs(deltaY) && deltaY < 15) return;

        if (deltaY > 5 && scrollContainer.scrollTop <= 2) {
          if (e.cancelable) e.preventDefault();
          const tension = 0.42;
          const pullDist = Math.min(110, deltaY * tension);
          const progress = Math.min(1, pullDist / threshold);

          wrap.style.visibility = 'visible';
          wrap.style.opacity = String(Math.min(1, progress * 2.5));
          wrap.style.transform = 'translate(-50%, ' + (-20 + pullDist) + 'px)';

          const cardScale = 0.55 + (progress * 0.45);
          card.style.transform = 'scale(' + cardScale + ')';

          const adjusted = Math.max(0.01, Math.min(1.0, progress));
          const sweepDeg = adjusted * MAX_SWEEP_DEG;
          const endDeg = -90 + sweepDeg;
          const endRad = endDeg * (Math.PI / 180);

          const endX = CX + R * Math.cos(endRad);
          const endY = CY + R * Math.sin(endRad);

          const tx = -Math.sin(endRad);
          const ty = Math.cos(endRad);
          const nx = Math.cos(endRad);
          const ny = Math.sin(endRad);

          const arrowScale = Math.min(1.0, Math.max(0.0, (progress - 0.08) / 0.32));
          const curW = ARROW_W * arrowScale;
          const curH = ARROW_H * arrowScale;

          const tipX = endX + curH * tx;
          const tipY = endY + curH * ty;
          const b1x = endX + (curW / 2) * nx;
          const b1y = endY + (curW / 2) * ny;
          const b2x = endX - (curW / 2) * nx;
          const b2y = endY - (curW / 2) * ny;

          const strokeOffset = CIRCUMFERENCE * (1 - (sweepDeg / 360));
          arcCircle.style.strokeDasharray = String(CIRCUMFERENCE);
          arcCircle.style.strokeDashoffset = String(strokeOffset);

          arrowHead.setAttribute('points', `${b1x.toFixed(2)},${b1y.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)} ${b2x.toFixed(2)},${b2y.toFixed(2)}`);
          arrowHead.style.opacity = arrowScale > 0.05 ? '1' : '0';

          if (pullDist >= threshold && !hapticTriggered) {
            hapticTriggered = true;
            triggerHaptic('light');
          } else if (pullDist < threshold) {
            hapticTriggered = false;
          }
        } else if (deltaY < 0) {
          isPulling = false;
        }
      }, { passive: false });

      const finishRefreshing = () => {
        setTimeout(() => {
          card.style.transition = 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease';
          card.style.transform = 'scale(0)';
          wrap.style.transition = 'opacity 0.25s ease, transform 0.28s ease';
          wrap.style.opacity = '0';
          wrap.style.transform = 'translate(-50%, 40px)';

          setTimeout(() => {
            wrap.style.visibility = 'hidden';
            wrap.style.transform = 'translate(-50%, -20px)';
            card.style.transform = 'scale(1)';
            svg.classList.remove('ptr-material-spinner');
            arcCircle.style.strokeDashoffset = String(CIRCUMFERENCE);
            isRefreshing = false;
          }, 280);
        }, 350);
      };

      const cancelPull = () => {
        wrap.style.transition = 'transform 0.25s ease, opacity 0.2s ease';
        wrap.style.transform = 'translate(-50%, -20px)';
        wrap.style.opacity = '0';
        setTimeout(() => {
          wrap.style.visibility = 'hidden';
          arcCircle.style.strokeDashoffset = String(CIRCUMFERENCE);
          arrowHead.style.opacity = '0';
          svg.style.transform = '';
        }, 250);
      };

      scrollContainer.addEventListener('touchend', async (e) => {
        if (!isPulling || isRefreshing) return;
        isPulling = false;
        const currentY = e.changedTouches[0]?.pageY || 0;
        const deltaY = currentY - startY;
        const pullDist = deltaY * 0.42;

        if (pullDist >= threshold && scrollContainer.scrollTop <= 2 && !activeArticleId) {
          isRefreshing = true;
          arrowHead.style.opacity = '0';
          svg.classList.add('ptr-material-spinner');

          wrap.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
          wrap.style.transform = 'translate(-50%, 54px)';
          card.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
          card.style.transform = 'scale(1)';

          try {
            await loadArticles(false);
          } finally {
            finishRefreshing();
          }
        } else {
          cancelPull();
        }
      }, { passive: true });

      scrollContainer.addEventListener('touchcancel', () => {
        if (!isRefreshing) cancelPull();
      }, { passive: true });
    }

    // Refocus / Bring to Foreground Refresh
    function initRefocusRefresh() {
      let lastRefreshTime = Date.now();
      const triggerRefresh = () => {
        if (document.documentElement.classList.contains('wf-needs-auth') || !getAuthToken()) {
          return;
        }
        checkNativePendingSavedArticles();
        processOutboxMutations();
        const now = Date.now();
        if (now - lastRefreshTime > 2500) {
          lastRefreshTime = now;
          loadArticles(true);
        }
      };

      window.addEventListener('offline', () => {
        handleConnectionFailure(false);
      });
      window.addEventListener('online', () => {
        showToast('Back online — syncing library...', 2500);
        updateOfflineUI(false);
        processOutboxMutations();
        loadArticles(true);
      });
      window.addEventListener('focus', triggerRefresh);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          triggerRefresh();
        }
      });
      document.addEventListener('resume', triggerRefresh);
      if (window.Capacitor?.App?.addListener) {
        window.Capacitor.App.addListener('appStateChange', (state) => {
          if (state && state.isActive) {
            triggerRefresh();
          }
        });
      }
    }

    // -------------------------------------------------------------
    // Capacitor OTA Updater Engine
    // -------------------------------------------------------------


    function updateLiveRelativeTimestamps() {
      const dateEls = document.querySelectorAll('.card-date[data-created-at]');
      if (!dateEls.length) return;
      for (let i = 0; i < dateEls.length; i++) {
        const el = dateEls[i];
        const rawDate = el.getAttribute('data-created-at');
        if (!rawDate) continue;
        const info = formatCardDate(rawDate);
        if (el.textContent !== info.label) {
          el.textContent = info.label;
        }
        if (info.tooltip && el.getAttribute('title') !== info.tooltip) {
          el.setAttribute('title', info.tooltip);
        }
      }
    }

    function initLiveTimestamps() {
      setInterval(updateLiveRelativeTimestamps, 30000);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) updateLiveRelativeTimestamps();
      });
      window.addEventListener('focus', updateLiveRelativeTimestamps);
      document.addEventListener('resume', updateLiveRelativeTimestamps);
    }

function initPaneFocusListeners() {
      // Switch focus between Articles List and Reader on mouse / pointer click
      document.addEventListener('pointerdown', (e) => {
        if (window.innerWidth < 1024) return;
        const target = e.target;
        if (!target) return;

        // 1. Click inside articles column (empty spaces, cards, search bar, header, scroll container) or sidebar
        if (target.closest('.pane-articles, #paneArticles, .pane-sidebar, #paneSidebar')) {
          if (activeKeyboardPane !== 'list') {
            setKeyboardPaneFocus('list');
          }
        }
        // 2. Click inside reader pane (reading content, empty space, top bar, scroll container)
        else if (target.closest('.pane-reader, #paneReader')) {
          if (activeArticleId && activeKeyboardPane !== 'reader') {
            setKeyboardPaneFocus('reader');
          }
        }
      }, { passive: true });
    }

function initReaderHoverTopBar() {
      const readerPane = document.getElementById('paneReader');
      if (!readerPane) return;
      readerPane.addEventListener('mousemove', (e) => {
        if (window.innerWidth >= 1024 && activeArticleId) {
          if (e.clientY <= 65) {
            showReaderTopBar(true);
          }
        }
      });
    }

    function initSelectionDeselectListener() {
      // 1. Deselect cards when clicking blank canvas
      document.addEventListener('click', (e) => {
        if (selectedArticleIds.size > 0) {
          if (!e.target.closest('.article-card, #batchActionHeader, #batchDropdownMenu, .tag-modal, .tag-modal-overlay, .confirm-modal-overlay, .modal-overlay, .sidebar-nav-item, #mobileNavDropdown, #cardMenuBackdrop')) {
            clearArticleSelection();
          }
        }

        // 2. Close modal when clicking dark backdrop directly
        if (e.target.classList && (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('tag-modal-overlay'))) {
          const id = e.target.id;
          if (id === 'annotationNoteModal') {
            closeAnnotationNoteModal();
          } else if (id) {
            closeModal(id);
          }
        }
      });

      // 3. Dismiss floating popovers, menus, and typography widget when tapping outside
      const dismissPopovers = (e) => {
        const highlightPopover = document.getElementById('highlightPopover');
        if (highlightPopover && highlightPopover.style.display !== 'none') {
          if (!e.target.closest('#highlightPopover, mark.reader-hl')) {
            closeHighlightPopover();
          }
        }

        const appearancePopover = document.getElementById('readerAppearancePopover');
        if (appearancePopover && appearancePopover.style.display !== 'none') {
          if (!e.target.closest('#readerAppearancePopover, #readerAppearanceBtn')) {
            closeReaderAppearancePopover();
          }
        }

        const readerMoreMenu = document.getElementById('readerMoreMenuDropdown');
        if (readerMoreMenu && readerMoreMenu.classList.contains('open')) {
          if (!e.target.closest('#readerMoreMenuDropdown, #readerMoreMenuBtn')) {
            closeReaderMoreMenu();
          }
        }

        const batchDropdown = document.getElementById('batchDropdownMenu');
        if (batchDropdown && batchDropdown.classList.contains('open')) {
          if (!e.target.closest('#batchDropdownMenu, [onclick*="toggleBatchMenu"]')) {
            closeBatchMenu();
          }
        }

        const patSortDropdown = document.getElementById('patSortDropdownMenu');
        if (patSortDropdown && patSortDropdown.classList.contains('open')) {
          if (!e.target.closest('#patSortDropdownMenu, #patSortBtn')) {
            if (typeof (window as any).closePatSortMenu === 'function') {
              (window as any).closePatSortMenu();
            } else {
              patSortDropdown.classList.remove('open');
            }
          }
        }
      };
      document.addEventListener('pointerdown', dismissPopovers);

      // 4. Right-click outside context menu closes it without opening native browser context menu
      document.addEventListener('contextmenu', (e) => {
        const card = e.target.closest('.article-card');
        if (card) {
          // Handled per-card by oncontextmenu
          return;
        }
        const openMenu = document.querySelector('.card-dropdown-menu.open, #cardContextMenu.open');
        if (openMenu) {
          e.preventDefault();
          closeAllCardMenus();
        }
      });
    }

    // Initialize UI
    if (isCapacitorApp()) {
      document.documentElement.classList.add('is-capacitor-app');
      syncNativeServerConfig();
    }
    try {
      const storedToken = localStorage.getItem('wf_auth_token');
      if (storedToken && document.cookie.indexOf('wf_auth_token') === -1) {
        const isHttps = location.protocol === 'https:';
        document.cookie = 'wf_auth_token=' + encodeURIComponent(storedToken) + '; Path=/; SameSite=Lax; Max-Age=31536000' + (isHttps ? '; Secure' : '');
      }
    } catch (e) {}
    initAppearanceSettings();
    setViewMode(localStorage.getItem('wf_view_mode') || 'list');
    updateVersionDisplay();
    renderFromInstantLocalCache();
    handleRouteState();
    loadArticles(true);
    function initInfiniteScroll() {
      const scrollContainer = document.getElementById('articlesScrollContainer');
      if (!scrollContainer) return;
      scrollContainer.addEventListener('scroll', () => {
        const filtered = getFilteredEntries();
        const canExpandLocally = currentRenderLimit < filtered.length;
        const canFetchMoreServer = currentArticlesPage < totalArticlesPages;
        if (!canExpandLocally && !canFetchMoreServer) return;
        if (isLoadingMoreArticles) return;

        const remaining = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight;
        if (remaining < 400) {
          loadMoreArticles();
        }
      });
    }

    initPullToRefresh();
    initRefocusRefresh();
    initInfiniteScroll();
    setupMobileDrawerSwipeTracking();
    setupElasticOverscroll(document.getElementById('articlesScrollContainer'), document.getElementById('articlesGrid'), { allowPullDown: false, allowPullUp: true });
    setupElasticOverscroll(document.getElementById('readerScrollContainer'), document.querySelector('.reader-content-wrap'), { allowPullDown: true, allowPullUp: true });
    initReaderHoverTopBar();
    initPaneFocusListeners();
    initLiveTimestamps();
    initSelectionDeselectListener();
    initReaderSelectionHandlers();
    initCapacitorOtaUpdater();
    initPwa();


    // Attach all functions to window for HTML inline handlers & test compatibility
if (typeof window !== "undefined") {
  try { (window as any).isRtlText = isRtlText; } catch (e) {}
  try { (window as any).initAppearanceSettings = initAppearanceSettings; } catch (e) {}
  try { (window as any).setReaderFontFamily = setReaderFontFamily; } catch (e) {}
  try { (window as any).setReaderFontSize = setReaderFontSize; } catch (e) {}
  try { (window as any).adjustReaderFontSize = adjustReaderFontSize; } catch (e) {}
  try { (window as any).setReaderLineHeight = setReaderLineHeight; } catch (e) {}
  try { (window as any).setReaderContentWidth = setReaderContentWidth; } catch (e) {}
  try { (window as any).setReaderTextAlignment = setReaderTextAlignment; (window as any).setReaderAlignment = setReaderTextAlignment; } catch (e) {}
  try { (window as any).setTheme = setTheme; } catch (e) {}
  try { (window as any).toggleTheme = toggleTheme; } catch (e) {}
  try { (window as any).toggleReaderAppearancePopover = toggleReaderAppearancePopover; } catch (e) {}
  try { (window as any).closeReaderAppearancePopover = closeReaderAppearancePopover; } catch (e) {}
  try { (window as any).toggleReaderFocusMode = toggleReaderFocusMode; } catch (e) {}
  try { (window as any).openSpeedRead = openSpeedRead; } catch (e) {}
  try { (window as any).closeSpeedRead = closeSpeedRead; } catch (e) {}
  try { (window as any).toggleSpeedReadPlay = toggleSpeedReadPlay; } catch (e) {}
  try { (window as any).playSpeedRead = playSpeedRead; } catch (e) {}
  try { (window as any).pauseSpeedRead = pauseSpeedRead; } catch (e) {}
  try { (window as any).stepSpeedRead = stepSpeedRead; } catch (e) {}
  try { (window as any).restartSpeedRead = restartSpeedRead; } catch (e) {}
  try { (window as any).adjustSpeedReadWpm = adjustSpeedReadWpm; } catch (e) {}
  try { (window as any).setSpeedReadWpm = setSpeedReadWpm; } catch (e) {}
  try { (window as any).adjustSpeedReadFontSize = adjustSpeedReadFontSize; } catch (e) {}
  try { (window as any).setSpeedReadFontSize = setSpeedReadFontSize; } catch (e) {}
  try { (window as any).toggleSpeedReadFontFamily = toggleSpeedReadFontFamily; } catch (e) {}
  try { (window as any).handleSpeedReadScrub = handleSpeedReadScrub; } catch (e) {}
  try { (window as any).isSpeedReadOpen = isSpeedReadOpen; } catch (e) {}
  try { (window as any).pushOverlayHistory = pushOverlayHistory; } catch (e) {}
  try { (window as any).popOverlayHistory = popOverlayHistory; } catch (e) {}
  try { (window as any).handleOverlayPopstate = handleOverlayPopstate; } catch (e) {}
  try { (window as any).getOverlayStack = getOverlayStack; } catch (e) {}
  try { (window as any).clearOverlayHistory = clearOverlayHistory; } catch (e) {}
  try { (window as any).toggleReaderMoreMenu = toggleReaderMoreMenu; } catch (e) {}
  try { (window as any).closeReaderMoreMenu = closeReaderMoreMenu; } catch (e) {}
  try { (window as any).toggleReaderExportSubmenu = toggleReaderExportSubmenu; } catch (e) {}
  try { (window as any).toggleBatchExportSubmenu = toggleBatchExportSubmenu; } catch (e) {}
  try { (window as any).openActiveOriginalLink = openActiveOriginalLink; } catch (e) {}
  try { (window as any).getEffectiveServerUrl = getEffectiveServerUrl; } catch (e) {}
  try { (window as any).getApiBaseUrl = getApiBaseUrl; } catch (e) {}
  try { (window as any).isCapacitorApp = isCapacitorApp; } catch (e) {}
  try { (window as any).getAuthToken = getAuthToken; } catch (e) {}
  try { (window as any).setAuthToken = setAuthToken; } catch (e) {}
  try { (window as any).authFetch = authFetch; } catch (e) {}
  try { (window as any).showAuthOverlay = showAuthOverlay; } catch (e) {}
  try { (window as any).hideAuthOverlay = hideAuthOverlay; } catch (e) {}
  try { (window as any).handleLogin = handleLogin; } catch (e) {}
  try { (window as any).handleLogout = handleLogout; } catch (e) {}
  try { (window as any).openModal = openModal; } catch (e) {}
  try { (window as any).handleManualRefresh = handleManualRefresh; } catch (e) {}
  try { (window as any).closeModal = closeModal; } catch (e) {}
  try { (window as any).showConfirmDialog = showConfirmDialog; } catch (e) {}
  try { (window as any).handleConfirmModalOk = handleConfirmModalOk; } catch (e) {}
  try { (window as any).handleConfirmModalCancel = handleConfirmModalCancel; } catch (e) {}
  try { (window as any).showPromptDialog = showPromptDialog; } catch (e) {}
  try { (window as any).handlePromptModalSubmit = handlePromptModalSubmit; } catch (e) {}
  try { (window as any).handlePromptModalCancel = handlePromptModalCancel; } catch (e) {}
  try { (window as any).showToast = showToast; } catch (e) {}
  try { (window as any).hideToast = hideToast; } catch (e) {}
  try { (window as any).escapeHtml = escapeHtml; } catch (e) {}
  try { (window as any).handleRouteState = handleRouteState; } catch (e) {}
  try { (window as any).navigateTo = navigateTo; } catch (e) {}
  try { (window as any).updateOfflineUI = updateOfflineUI; } catch (e) {}
  try { (window as any).handleConnectionFailure = handleConnectionFailure; } catch (e) {}
  try { (window as any).loadArticles = loadArticles; } catch (e) {}
  try { (window as any).downloadRemainingLibraryInBackground = downloadRemainingLibraryInBackground; } catch (e) {}
  try { (window as any).loadMoreRenderedCards = loadMoreRenderedCards; } catch (e) {}
  try { (window as any).loadMoreArticles = loadMoreArticles; } catch (e) {}
  try { (window as any).updateArticlesFooterStatus = updateArticlesFooterStatus; } catch (e) {}
  try { (window as any).renderFromInstantLocalCache = renderFromInstantLocalCache; } catch (e) {}
  try { (window as any).checkNativePendingSavedArticles = checkNativePendingSavedArticles; } catch (e) {}
  try { (window as any).getPendingMutations = getPendingMutations; } catch (e) {}
  try { (window as any).savePendingMutations = savePendingMutations; } catch (e) {}
  try { (window as any).enqueueMutation = enqueueMutation; } catch (e) {}
  try { (window as any).processOutboxMutations = processOutboxMutations; } catch (e) {}
  try { (window as any).openIndexedDB = openIndexedDB; } catch (e) {}
  try { (window as any).deduplicateEntries = deduplicateEntries; } catch (e) {}
  try { (window as any).clearIndexedDB = clearIndexedDB; } catch (e) {}
  try { (window as any).saveEntriesToIndexedDB = saveEntriesToIndexedDB; } catch (e) {}
  try { (window as any).deleteEntryFromIndexedDB = deleteEntryFromIndexedDB; } catch (e) {}
  try { (window as any).loadEntriesFromIndexedDB = loadEntriesFromIndexedDB; } catch (e) {}
  try { (window as any).syncLocalEntriesCache = syncLocalEntriesCache; } catch (e) {}
  try { (window as any).getEffectiveGlobalTags = getEffectiveGlobalTags; } catch (e) {}
  try { (window as any).loadGlobalTags = loadGlobalTags; } catch (e) {}
  try { (window as any).renderSidebarTags = renderSidebarTags; } catch (e) {}
  try { (window as any).toggleSidebarTagsCollapse = toggleSidebarTagsCollapse; } catch (e) {}
  try { (window as any).filterByTag = filterByTag; } catch (e) {}
  try { (window as any).setFilter = setFilter; } catch (e) {}
  try { (window as any).updateCounts = updateCounts; } catch (e) {}
  try { (window as any).getFilteredEntries = getFilteredEntries; } catch (e) {}
  try { (window as any).sortEntries = sortEntries; } catch (e) {}
  try { (window as any).filterArticles = filterArticles; } catch (e) {}
  try { (window as any).clearSearch = clearSearch; } catch (e) {}
  try { (window as any).renderArticles = renderArticles; } catch (e) {}
  try { (window as any).renderArticlesChunked = renderArticlesChunked; } catch (e) {}
  try { (window as any).handleCardTouchStart = handleCardTouchStart; } catch (e) {}
  try { (window as any).handleCardTouchMove = handleCardTouchMove; } catch (e) {}
  try { (window as any).handleCardTouchEnd = handleCardTouchEnd; } catch (e) {}
  try { (window as any).handleCardClick = handleCardClick; } catch (e) {}
  try { (window as any).setReaderStatusBar = setReaderStatusBar; } catch (e) {}
  try { (window as any).shouldReaderAutoHide = shouldReaderAutoHide; } catch (e) {}
  try { (window as any).showReaderTopBar = showReaderTopBar; } catch (e) {}
  try { (window as any).hideReaderTopBar = hideReaderTopBar; } catch (e) {}
  try { (window as any).scheduleReaderTopBarAutoHide = scheduleReaderTopBarAutoHide; } catch (e) {}
  try { (window as any).handleReaderBodyClick = handleReaderBodyClick; } catch (e) {}
  try { (window as any).openReader = openReader; } catch (e) {}
  try { (window as any).closeReader = closeReader; } catch (e) {}
  try { (window as any).handleReaderBack = handleReaderBack; } catch (e) {}
  try { (window as any).handleReaderScroll = handleReaderScroll; } catch (e) {}
  try { (window as any).updateReadingProgress = updateReadingProgress; } catch (e) {}
  try { (window as any).toggleStar = toggleStar; } catch (e) {}
  try { (window as any).toggleArchive = toggleArchive; } catch (e) {}
  try { (window as any).toggleActiveStar = toggleActiveStar; } catch (e) {}
  try { (window as any).toggleActiveArchive = toggleActiveArchive; } catch (e) {}
  try { (window as any).deleteEntryAction = deleteEntryAction; } catch (e) {}
  try { (window as any).deleteActiveArticle = deleteActiveArticle; } catch (e) {}
  try { (window as any).refetchActiveArticleContent = refetchActiveArticleContent; } catch (e) {}
  try { (window as any).refetchArticleContent = refetchArticleContent; } catch (e) {}
  try { (window as any).htmlToMarkdown = htmlToMarkdown; } catch (e) {}
  try { (window as any).highlightTextInNode = highlightTextInNode; } catch (e) {}
  try { (window as any).getSortedAnnotations = getSortedAnnotations; } catch (e) {}
  try { (window as any).exportMarkdown = exportMarkdown; } catch (e) {}
  try { (window as any).shareOrDownloadBlob = shareOrDownloadBlob; } catch (e) {}
  try { (window as any).exportActiveMarkdown = exportActiveMarkdown; } catch (e) {}
  try { (window as any).exportPdf = exportPdf; } catch (e) {}
  try { (window as any).exportActivePdf = exportActivePdf; } catch (e) {}
  try { (window as any).downloadEpub = downloadEpub; } catch (e) {}
  try { (window as any).downloadActiveEpub = downloadActiveEpub; } catch (e) {}
  try { (window as any).applyAnnotationsToReader = applyAnnotationsToReader; } catch (e) {}
  try { (window as any).updateHighlightsBadge = updateHighlightsBadge; } catch (e) {}
  try { (window as any).toggleReaderHighlightsModal = toggleReaderHighlightsModal; } catch (e) {}
  try { (window as any).openArticleHighlightsModal = openArticleHighlightsModal; } catch (e) {}
  try { (window as any).filterHighlightsModalList = filterHighlightsModalList; } catch (e) {}
  try { (window as any).setHighlightsSort = setHighlightsSort; } catch (e) {}
  try { (window as any).renderModalHighlightsList = renderModalHighlightsList; } catch (e) {}
  try { (window as any).scrollToAnnotation = scrollToAnnotation; } catch (e) {}
  try { (window as any).openHighlightPopover = openHighlightPopover; } catch (e) {}
  try { (window as any).closeHighlightPopover = closeHighlightPopover; } catch (e) {}
  try { (window as any).adjustPopoverSelection = adjustPopoverSelection; } catch (e) {}
  try { (window as any).adjustModalSelection = adjustModalSelection; } catch (e) {}
  try { (window as any).adjustAnnotationSelection = adjustAnnotationSelection; } catch (e) {}
  try { (window as any).copyPopoverQuote = copyPopoverQuote; } catch (e) {}
  try { (window as any).changePopoverHighlightColor = changePopoverHighlightColor; } catch (e) {}
  try { (window as any).deletePopoverHighlight = deletePopoverHighlight; } catch (e) {}
  try { (window as any).handleCreateHighlight = handleCreateHighlight; } catch (e) {}
  try { (window as any).handleCreateHighlightWithNote = handleCreateHighlightWithNote; } catch (e) {}
  try { (window as any).handleCopySelection = handleCopySelection; } catch (e) {}
  try { (window as any).selectModalNoteColor = selectModalNoteColor; } catch (e) {}
  try { (window as any).openAnnotationNoteModal = openAnnotationNoteModal; } catch (e) {}
  try { (window as any).closeAnnotationNoteModal = closeAnnotationNoteModal; } catch (e) {}
  try { (window as any).handleSaveAnnotationNoteForm = handleSaveAnnotationNoteForm; } catch (e) {}
  try { (window as any).clearActiveTextSelection = clearActiveTextSelection; } catch (e) {}
  try { (window as any).deleteModalAnnotation = deleteModalAnnotation; } catch (e) {}
  try { (window as any).editModalAnnotation = editModalAnnotation; } catch (e) {}
  try { (window as any).copyModalAnnotation = copyModalAnnotation; } catch (e) {}
  try { (window as any).copyAllModalHighlights = copyAllModalHighlights; } catch (e) {}
  try { (window as any).copyCurrentAnnotationNoteModal = copyCurrentAnnotationNoteModal; } catch (e) {}
  try { (window as any).formatAnnotationReadable = formatAnnotationReadable; } catch (e) {}
  try { (window as any).formatAllAnnotationsReadable = formatAllAnnotationsReadable; } catch (e) {}
  try { (window as any).toggleReaderSearchBar = toggleReaderSearchBar; } catch (e) {}
  try { (window as any).openReaderSearchBar = openReaderSearchBar; } catch (e) {}
  try { (window as any).handleSearchInputKeydown = handleSearchInputKeydown; } catch (e) {}
  try { (window as any).closeReaderSearchBar = closeReaderSearchBar; } catch (e) {}
  try { (window as any).handleReaderSearchInput = handleReaderSearchInput; } catch (e) {}
  try { (window as any).handleReaderSearchKeydown = handleReaderSearchKeydown; } catch (e) {}
  try { (window as any).jumpReaderSearchMatch = jumpReaderSearchMatch; } catch (e) {}

  try { (window as any).initReaderSelectionHandlers = initReaderSelectionHandlers; } catch (e) {}
  try { (window as any).copyDirectText = copyDirectText; } catch (e) {}
  try { (window as any).copySyncValue = copySyncValue; } catch (e) {}
  try { (window as any).copySyncOpdsAuthUrl = copySyncOpdsAuthUrl; } catch (e) {}
  try { (window as any).setViewMode = setViewMode; } catch (e) {}
  try { (window as any).cycleViewMode = cycleViewMode; } catch (e) {}
  try { (window as any).toggleSortMenu = toggleSortMenu; } catch (e) {}
  try { (window as any).sortEntriesLocally = sortEntriesLocally; } catch (e) {}
  try { (window as any).setSortOrder = setSortOrder; } catch (e) {}
  try { (window as any).handleSearchInput = handleSearchInput; } catch (e) {}
  try { (window as any).clearSearchInput = clearSearchInput; } catch (e) {}
  try { (window as any).isSelectionMode = isSelectionMode; } catch (e) {}
  try { (window as any).toggleArticleSelection = toggleArticleSelection; } catch (e) {}
  try { (window as any).clearArticleSelection = clearArticleSelection; } catch (e) {}
  try { (window as any).toggleSelectAllArticles = toggleSelectAllArticles; } catch (e) {}
  try { (window as any).updateBatchUI = updateBatchUI; } catch (e) {}
  try { (window as any).toggleBatchMenu = toggleBatchMenu; } catch (e) {}
  try { (window as any).closeBatchMenu = closeBatchMenu; } catch (e) {}
  try { (window as any).batchOpenHighlights = batchOpenHighlights; } catch (e) {}
  try { (window as any).batchOpenOriginal = batchOpenOriginal; } catch (e) {}
  try { (window as any).batchEditTitle = batchEditTitle; } catch (e) {}
  try { (window as any).handleExportBatchAnthologyEpub = handleExportBatchAnthologyEpub; } catch (e) {}
  try { (window as any).handleBatchExportAnthologyEpub = handleExportBatchAnthologyEpub; } catch (e) {}
  try { (window as any).handleBatchExportEpub = handleBatchExportEpub; } catch (e) {}
  try { (window as any).handleBatchExportMarkdown = handleBatchExportMarkdown; } catch (e) {}
  try { (window as any).handleBatchExportPdf = handleBatchExportPdf; } catch (e) {}
  try { (window as any).handleBatchExportJson = handleBatchExportJson; } catch (e) {}
  try { (window as any).batchRefetchContent = batchRefetchContent; } catch (e) {}
  try { (window as any).batchToggleStar = batchToggleStar; } catch (e) {}
  try { (window as any).batchToggleArchive = batchToggleArchive; } catch (e) {}
  try { (window as any).batchManageTags = batchManageTags; } catch (e) {}
  try { (window as any).openTagModalForSelection = openTagModalForSelection; } catch (e) {}
  try { (window as any).batchArchiveArticles = batchArchiveArticles; } catch (e) {}
  try { (window as any).batchStarArticles = batchStarArticles; } catch (e) {}
  try { (window as any).toggleFocusMode = toggleFocusMode; } catch (e) {}

  try { (window as any).batchDeleteArticles = batchDeleteArticles; } catch (e) {}
  try { (window as any).toggleMobileNavMenu = toggleMobileNavMenu; } catch (e) {}
  try { (window as any).closeMobileNavMenu = closeMobileNavMenu; } catch (e) {}
  try { (window as any).setupMobileDrawerSwipeTracking = setupMobileDrawerSwipeTracking; } catch (e) {}
  try { (window as any).setupElasticOverscroll = setupElasticOverscroll; } catch (e) {}
  try { (window as any).triggerHaptic = triggerHaptic; } catch (e) {}
  try { (window as any).closeAllCardMenus = closeAllCardMenus; } catch (e) {}
  try { (window as any).handleCardContextMenu = handleCardContextMenu; } catch (e) {}
  try { (window as any).handleExportBatchEpub = handleExportBatchEpub; } catch (e) {}
  try { (window as any).handleExportBatchMarkdown = handleExportBatchMarkdown; } catch (e) {}
  try { (window as any).handleExportBatchJson = handleExportBatchJson; } catch (e) {}
  try { (window as any).openBatchContextMenu = openBatchContextMenu; } catch (e) {}
  try { (window as any).generateUnifiedArticleMenuHtml = generateUnifiedArticleMenuHtml; } catch (e) {}
  try { (window as any).generateSortMenuHtml = generateSortMenuHtml; } catch (e) {}
  try { (window as any).openCardContextMenu = openCardContextMenu; } catch (e) {}
  try { (window as any).closeCardContextMenu = closeCardContextMenu; } catch (e) {}
  try { (window as any).toggleContextExportSubmenu = toggleContextExportSubmenu; } catch (e) {}
  try { (window as any).openArticleOriginalLink = openArticleOriginalLink; } catch (e) {}
  try { (window as any).handleAddArticleBtnClick = handleAddArticleBtnClick; } catch (e) {}
  try { (window as any).handleAddTextBtnClick = handleAddTextBtnClick; } catch (e) {}
  try { (window as any).handleIngestUrl = handleIngestUrl; } catch (e) {}
  try { (window as any).handleIngestText = handleIngestText; } catch (e) {}
  try { (window as any).renderAddTextTagChips = renderAddTextTagChips; } catch (e) {}
  try { (window as any).removeAddTextTag = removeAddTextTag; } catch (e) {}
  try { (window as any).syncAddTextTagChips = syncAddTextTagChips; } catch (e) {}
  try { (window as any).openTagModal = openTagModal; } catch (e) {}
  try { (window as any).closeTagModal = closeTagModal; } catch (e) {}
  try { (window as any).renderTagModalUI = renderTagModalUI; } catch (e) {}
  try { (window as any).addQuickTagToActiveArticles = addQuickTagToActiveArticles; } catch (e) {}
  try { (window as any).removeTagFromActiveArticles = removeTagFromActiveArticles; } catch (e) {}
  try { (window as any).submitAddTag = submitAddTag; } catch (e) {}
  try { (window as any).openGlobalTagManager = openGlobalTagManager; } catch (e) {}
  try { (window as any).closeGlobalTagModal = closeGlobalTagModal; } catch (e) {}
  try { (window as any).renderGlobalTagManagerUI = renderGlobalTagManagerUI; } catch (e) {}
  try { (window as any).deleteGlobalTag = deleteGlobalTag; } catch (e) {}
  try { (window as any).submitCreateGlobalTag = submitCreateGlobalTag; } catch (e) {}
  try { (window as any).handleAddTagBtnClick = handleAddTagBtnClick; } catch (e) {}
  try { (window as any).handleRemoveTagBtnClick = handleRemoveTagBtnClick; } catch (e) {}
  try { (window as any).handleFilterByTagClick = handleFilterByTagClick; } catch (e) {}
  try { (window as any).handleDeleteGlobalTagClick = handleDeleteGlobalTagClick; } catch (e) {}

  try { (window as any).cleanupUnusedTags = cleanupUnusedTags; } catch (e) {}
  try { (window as any).openEditTitleModal = openEditTitleModal; } catch (e) {}
  try { (window as any).handleSaveTitle = handleSaveTitle; } catch (e) {}
  try { (window as any).openWipeDbModal = openWipeDbModal; } catch (e) {}
  try { (window as any).handleConfirmWipeDatabase = handleConfirmWipeDatabase; } catch (e) {}
  try { (window as any).updateSettingsStats = updateSettingsStats; } catch (e) {}
  try { (window as any).setParserEngine = setParserEngine; } catch (e) {}
  try { (window as any).updateParserEngineUI = updateParserEngineUI; } catch (e) {}
  try { (window as any).openSettingsModal = openSettingsModal; } catch (e) {}
  try { (window as any).switchSettingsTab = switchSettingsTab; } catch (e) {}
  try { (window as any).handleSettingsMobileBack = handleSettingsMobileBack; } catch (e) {}
  try { (window as any).openSyncModal = openSyncModal; } catch (e) {}
  try { (window as any).loadPersonalTokens = loadPersonalTokens; } catch (e) {}
  try { (window as any).handleCreatePersonalToken = handleCreatePersonalToken; } catch (e) {}
  try { (window as any).copyTokenDisplayValue = copyTokenDisplayValue; } catch (e) {}
  try { (window as any).handleRenamePersonalToken = handleRenamePersonalToken; } catch (e) {}
  try { (window as any).handleRevokePersonalToken = handleRevokePersonalToken; } catch (e) {}

  try { (window as any).loadSiteCookies = loadSiteCookies; } catch (e) {}
  try { (window as any).renderSiteCookiesList = renderSiteCookiesList; } catch (e) {}
  try { (window as any).openAddSiteCookieDialog = openAddSiteCookieDialog; } catch (e) {}
  try { (window as any).handlePresetSiteLogin = handlePresetSiteLogin; } catch (e) {}
  try { (window as any).launchInAppSiteLogin = launchInAppSiteLogin; } catch (e) {}
  try { (window as any).handleSaveSiteCookieSubmit = handleSaveSiteCookieSubmit; } catch (e) {}
  try { (window as any).handleToggleSiteCookie = handleToggleSiteCookie; } catch (e) {}
  try { (window as any).handleDeleteSiteCookie = handleDeleteSiteCookie; } catch (e) {}
  try { (window as any).handleClearAllSiteCookies = handleClearAllSiteCookies; } catch (e) {}
  try { (window as any).reconcileDatabase = reconcileDatabase; } catch (e) {}
  try { (window as any).openServerConnectModal = openServerConnectModal; } catch (e) {}
  try { (window as any).handleSaveServerConnection = handleSaveServerConnection; } catch (e) {}
  try { (window as any).saveArticlesToOfflineDb = saveArticlesToOfflineDb; } catch (e) {}
  try { (window as any).getArticlesFromOfflineDb = getArticlesFromOfflineDb; } catch (e) {}
  try { (window as any).initPullToRefresh = initPullToRefresh; } catch (e) {}
  try { (window as any).initRefocusRefresh = initRefocusRefresh; } catch (e) {}
  try { (window as any).getAppWebVersion = getAppWebVersion; } catch (e) {}
  try { (window as any).compareSemVer = compareSemVer; } catch (e) {}
  try { (window as any).checkCapacitorOtaFromVersion = checkCapacitorOtaFromVersion; } catch (e) {}
  try { (window as any).showOtaRestartBanner = showOtaRestartBanner; } catch (e) {}
  try { (window as any).initCapacitorOtaUpdater = initCapacitorOtaUpdater; } catch (e) {}
  try { (window as any).initPwa = initPwa; } catch (e) {}
  try { (window as any).handlePwaShareTarget = handlePwaShareTarget; } catch (e) {}
  try { (window as any).updateVersionDisplay = updateVersionDisplay; } catch (e) {}
  try { (window as any).initReaderHoverTopBar = initReaderHoverTopBar; } catch (e) {}
  try { (window as any).initSelectionDeselectListener = initSelectionDeselectListener; } catch (e) {}
  try { (window as any).initInfiniteScroll = initInfiniteScroll; } catch (e) {}
}

if (typeof window !== "undefined") {
  const w = window as any;
  w.setKeyboardPaneFocus = setKeyboardPaneFocus;
  w.initPaneFocusListeners = initPaneFocusListeners;
  w.updateLiveRelativeTimestamps = updateLiveRelativeTimestamps;
  w.initLiveTimestamps = initLiveTimestamps;
  w.setReaderFont = setReaderFont;
  w.setReaderFontFamily = setReaderFontFamily;
  w.setAllEntries = (entries: any[]) => {
    allEntries = entries;
  };
  w.getAllEntries = () => allEntries;
  w.setFilterDirect = (filter: string) => {
    currentFilter = filter;
  };

  try {
    Object.defineProperty(w, 'allEntries', {
      get() { return allEntries; },
      set(val) { allEntries = val; },
      configurable: true
    });
    Object.defineProperty(w, 'activeArticleId', {
      get() { return activeArticleId; },
      set(val) { activeArticleId = val; },
      configurable: true
    });
    Object.defineProperty(w, 'currentFilter', {
      get() { return currentFilter; },
      set(val) { currentFilter = val; },
      configurable: true
    });
    Object.defineProperty(w, 'selectedArticleIds', {
      get() { return selectedArticleIds; },
      set(val) { selectedArticleIds = val; },
      configurable: true
    });
    Object.defineProperty(w, 'cachedGlobalTags', {
      get() { return cachedGlobalTags; },
      set(val) { cachedGlobalTags = val; },
      configurable: true
    });
    Object.defineProperty(w, 'serverLibraryCounts', {
      get() { return serverLibraryCounts; },
      set(val) { serverLibraryCounts = val; },
      configurable: true
    });
  } catch (e) {}
}
