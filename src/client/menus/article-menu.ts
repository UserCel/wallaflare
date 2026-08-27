import { escapeHtml } from "../utils/dom";

export interface UnifiedMenuOptions {
  mode?: 'card' | 'batch' | 'reader';
  item?: any;
  items?: any[];
  closeFnName?: string;
}

export function generateUnifiedArticleMenuHtml(opts: UnifiedMenuOptions): string {
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

    const focusModeBtn = (mode === 'reader')
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
        '<button type="button" class="menu-item menu-sub-item" onclick="' + closeFnName + '; handleExportBatchEpub();"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg><span>ZIP (EPUBs)</span></button>' +
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
