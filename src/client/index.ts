import { saveArticleWithFallback, setParserMode, getParserMode, clientExtractArticle, ParserMode } from './extractor';
// Wallaflare Modular Client Entry Point - Full Parity Architecture


    function isRtlText(text) {
      return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text || '');
    }

    let allEntries = [];
    let currentFilter = 'unread';
    let activeArticleId = null;
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

    function setReaderFontFamily(font, persist = true) {
      readerFont = font;
      let family = "var(--font-reader-serif)";
      if (font === 'sans') family = "var(--font-reader-sans)";
      else if (font === 'mono') family = "var(--font-reader-mono)";
      else if (font === 'dyslexic') family = "var(--font-reader-dyslexic)";

      document.documentElement.style.setProperty('--reader-font-family', family);
      if (persist) localStorage.setItem('wf_reader_font', font);

      document.querySelectorAll('#popoverFontFamilyBtns .opt-font-btn, #settingsFontBtns .opt-font-btn').forEach(btn => {
        if (btn.getAttribute('data-font') === font) {
          btn.classList.add('active', 'btn-primary');
          btn.classList.remove('btn-outline');
        } else {
          btn.classList.remove('active', 'btn-primary');
          btn.classList.add('btn-outline');
        }
      });
    }
    const setReaderFont = setReaderFontFamily;

    function setReaderFontSize(px, persist = true) {
      px = Math.max(12, Math.min(32, px));
      readerFontSize = px;
      document.documentElement.style.setProperty('--reader-font-size', px + 'px');
      const display = document.getElementById('fontSizeDisplay');
      const range = document.getElementById('fontSizeRange');
      if (display) display.textContent = px + 'px';
      if (range) range.value = String(px);
      if (persist) localStorage.setItem('wf_reader_font_size', String(px));
    }

    function adjustReaderFontSize(delta) {
      setReaderFontSize(readerFontSize + delta * 2, true);
    }

    function setReaderLineHeight(lh, persist = true) {
      readerLineHeight = String(lh);
      document.documentElement.style.setProperty('--reader-line-height', String(lh));
      if (persist) localStorage.setItem('wf_reader_line_height', String(lh));

      document.querySelectorAll('#popoverLineHeightBtns .opt-lh-btn').forEach(btn => {
        if (btn.getAttribute('data-lh') === String(lh)) {
          btn.classList.add('active', 'btn-primary');
          btn.classList.remove('btn-outline');
        } else {
          btn.classList.remove('active', 'btn-primary');
          btn.classList.add('btn-outline');
        }
      });
    }

    function setReaderContentWidth(width, persist = true) {
      if (width === '100%') width = '1060px';
      readerContentWidth = width;
      document.documentElement.style.setProperty('--reader-content-max-width', width);
      
      let padX = '0.85rem';
      let mobilePadX = '0.55rem';
      if (width === '620px') {
        padX = '2.5rem';
        mobilePadX = '2.25rem';
      } else if (width === '740px') {
        padX = '1.5rem';
        mobilePadX = '1.1rem';
      } else if (width === '880px') {
        padX = '0.85rem';
        mobilePadX = '0.55rem';
      } else if (width === '1060px') {
        padX = '0.2rem';
        mobilePadX = '0.2rem';
      }
      document.documentElement.style.setProperty('--reader-padding-x', padX);
      document.documentElement.style.setProperty('--reader-mobile-padding-x', mobilePadX);

      if (persist) localStorage.setItem('wf_reader_content_width', width);

      document.querySelectorAll('#popoverContentWidthBtns .opt-width-btn').forEach(btn => {
        if (btn.getAttribute('data-width') === width) {
          btn.classList.add('active', 'btn-primary');
          btn.classList.remove('btn-outline');
        } else {
          btn.classList.remove('active', 'btn-primary');
          btn.classList.add('btn-outline');
        }
      });
    }

    
    function setReaderTextAlignment(align, persist = true) {
      readerTextAlignment = align;
      const textAlign = align === 'justify' ? 'justify' : 'start';
      const hyphens = align === 'justify' ? 'auto' : 'manual';
      document.documentElement.style.setProperty('--reader-text-align', textAlign);
      document.documentElement.style.setProperty('--reader-hyphens', hyphens);
      if (persist) localStorage.setItem('wf_reader_alignment', align);

      document.querySelectorAll('#popoverAlignmentBtns .opt-align-btn').forEach(btn => {
        if (btn.getAttribute('data-align') === align) {
          btn.classList.add('active', 'btn-primary');
          btn.classList.remove('btn-outline');
        } else {
          btn.classList.remove('active', 'btn-primary');
          btn.classList.add('btn-outline');
        }
      });
    }

    function setTheme(theme, persist = true) {
      activeTheme = theme;
      const themes = ['dark', 'light', 'sepia', 'oled'];
      themes.forEach(t => document.documentElement.classList.remove(t));
      document.documentElement.classList.add(theme);
      if (isCapacitorApp()) {
        document.documentElement.classList.add('is-capacitor-app');
      }
      if (persist) localStorage.setItem('wf_theme', theme);

      document.querySelectorAll('#popoverThemeBtns .opt-theme-btn, #settingsModal .opt-theme-btn').forEach(btn => {
        if (btn.getAttribute('data-theme') === theme) {
          btn.classList.add('active', 'btn-primary');
          btn.classList.remove('btn-outline');
        } else {
          btn.classList.remove('active', 'btn-primary');
          btn.classList.add('btn-outline');
        }
      });

      document.querySelectorAll('.sidebar-theme-picker .theme-swatch-btn').forEach(btn => {
        const isActive = btn.getAttribute('data-theme') === theme;
        btn.classList.toggle('active', isActive);
      });
    }

    function toggleTheme() {
      const themes = ['dark', 'light', 'sepia', 'oled'];
      const idx = themes.indexOf(activeTheme);
      const nextTheme = themes[(idx + 1) % themes.length];
      setTheme(nextTheme);
    }

    function toggleReaderAppearancePopover(e) {
      if (e) e.stopPropagation();
      const popover = document.getElementById('readerAppearancePopover');
      if (!popover) return;
      const isOpen = popover.style.display !== 'none' && popover.style.display !== '';
      if (isOpen) {
        popover.style.display = 'none';
      } else {
        closeAllCardMenus();
        closeReaderMoreMenu();
        popover.style.display = 'flex';
      }
    }

    function closeReaderAppearancePopover() {
      const popover = document.getElementById('readerAppearancePopover');
      if (popover) popover.style.display = 'none';
    }

    function toggleReaderFocusMode(force) {
      if (typeof force === 'boolean') isFocusMode = force;
      else isFocusMode = !isFocusMode;

      if (isFocusMode) {
        document.body.classList.add('focus-mode');
        showToast('Focus Mode activated (press f or Esc to exit)', 2000);
      } else {
        document.body.classList.remove('focus-mode');
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

    function syncNativeServerConfig() {
      try {
        const url = localStorage.getItem('wf_server_url') || '';
        const token = localStorage.getItem('wf_auth_token') || '';
        if (url || token) {
          if (window.AndroidNative && typeof window.AndroidNative.saveServerConfig === 'function') {
            window.AndroidNative.saveServerConfig(url, token);
          }
          if (window.Capacitor?.Plugins?.WallaflareNative?.saveServerConfig) {
            window.Capacitor.Plugins.WallaflareNative.saveServerConfig({ url, token }).catch(() => {});
          }
        } else {
          if (window.AndroidNative && typeof window.AndroidNative.getServerConfig === 'function') {
            try {
              const raw = window.AndroidNative.getServerConfig();
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.server_url && !localStorage.getItem('wf_server_url')) {
                  localStorage.setItem('wf_server_url', parsed.server_url);
                }
                if (parsed.auth_token && !localStorage.getItem('wf_auth_token')) {
                  localStorage.setItem('wf_auth_token', parsed.auth_token);
                }
              }
            } catch (e) {}
          }
          if (window.Capacitor?.Plugins?.WallaflareNative?.getServerConfig) {
            window.Capacitor.Plugins.WallaflareNative.getServerConfig().then(res => {
              if (res) {
                if (res.server_url && !localStorage.getItem('wf_server_url')) {
                  localStorage.setItem('wf_server_url', res.server_url);
                }
                if (res.auth_token && !localStorage.getItem('wf_auth_token')) {
                  localStorage.setItem('wf_auth_token', res.auth_token);
                }
                populateServerConfigInputs();
              }
            }).catch(() => {});
          }
        }
      } catch (e) {}
    }

    function setAuthToken(token) {
      if (token) localStorage.setItem('wf_auth_token', token);
      else localStorage.removeItem('wf_auth_token');
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
        checkSetupStatus().then((isSetup) => {
          if (!isSetup) {
            showAuthOverlay();
          }
        });
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
      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'flex';
    }

    function hideAuthOverlay() {
      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'none';
    }

    async function checkSetupStatus() {
      try {
        const res = await fetch(getApiBaseUrl() + "/api/setup/status");
        if (res.ok) {
          const data = await res.json();

          if (data && typeof data.has_opds_token === 'boolean') {
            (window as any).WF_HAS_OPDS_TOKEN = data.has_opds_token;
            localStorage.setItem('wf_has_opds_token', data.has_opds_token ? 'true' : 'false');
            updateOpdsTokenBadge(data.has_opds_token);
          }
          if (data.setup_required) {
            openSetupModal();
            return true;
          }
        }
      } catch (e) {}
      return false;
    }

    function openSetupModal() {
      const modal = document.getElementById("setupModal");
      if (modal) modal.style.display = "flex";
    }

    function closeSetupModal() {
      const modal = document.getElementById("setupModal");
      if (modal) modal.style.display = "none";
    }

    function togglePasswordVisibility(inputId, btn) {
      const el = document.getElementById(inputId) as HTMLInputElement;
      if (!el) return;
      if (el.type === "password") {
        el.type = "text";
        if (btn) btn.textContent = "Hide";
      } else {
        el.type = "password";
        if (btn) btn.textContent = "Show";
      }
    }

    async function handleInitialSetup(e) {
      if (e) e.preventDefault();
      const authInput = document.getElementById("setupAuthTokenInput") as HTMLInputElement;
      const opdsInput = document.getElementById("setupOpdsTokenInput") as HTMLInputElement;
      const submitBtn = document.getElementById("btnInitSetup") as HTMLButtonElement;

      const authToken = (authInput?.value || "").trim();
      const opdsToken = (opdsInput?.value || "").trim();

      if (!authToken || authToken.length < 4) {
        showToast("Master password must be at least 4 characters");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Saving Master Password...";
      }

      try {
        const res = await fetch(getApiBaseUrl() + "/api/setup/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auth_token: authToken, opds_token: opdsToken || undefined })
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || "Setup failed");
          return;
        }

        setAuthToken(authToken);
        closeSetupModal();
        hideAuthOverlay();
        showToast("✓ Master password configured! Welcome to Wallaflare.");
        loadArticles(false);
      } catch (err) {
        showToast("Failed to connect to server");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Complete Setup & Enter Library";
        }
      }
    }

    async function handleUpdateSecurityTokens(btn) {
      const currentInput = document.getElementById("settingsCurrentAuthToken") as HTMLInputElement;
      const newInput = document.getElementById("settingsNewAuthToken") as HTMLInputElement;
      const opdsInput = document.getElementById("settingsNewOpdsToken") as HTMLInputElement;

      const currentAuthToken = (currentInput?.value || "").trim();
      const newAuthToken = (newInput?.value || "").trim();
      const newOpdsToken = (opdsInput?.value || "").trim();

      if (!currentAuthToken) {
        showToast("Please enter your current master password");
        currentInput?.focus();
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Updating...";
      }

      try {
        const res = await authFetch("/api/admin/tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_auth_token: currentAuthToken,
            new_auth_token: newAuthToken || undefined,
            new_opds_token: newOpdsToken === "" ? null : (newOpdsToken || undefined)
          })
        });

        const data = await res.json();
        if (!res.ok) {
          showToast("Error: " + (data.error || "Failed to update credentials"));
          return;
        }

        if (newAuthToken) {
          setAuthToken(newAuthToken);
        }

        if (currentInput) currentInput.value = "";
        if (newInput) newInput.value = "";
        if (opdsInput) opdsInput.value = "";

        populateServerConfigInputs();
        showToast("✓ Security credentials updated in D1 database");
      } catch (err) {
        showToast("Network error updating credentials");
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Update Credentials";
        }
      }
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
        setAuthToken(token);
        const res = await authFetch('/api/entries.json?perPage=1');
        if (res.ok || res.status === 200) {
          hideAuthOverlay();
          input.value = '';
          showToast('✓ Library Unlocked');
          loadArticles(false);
        } else {
          setAuthToken('');
          if (errorBanner) {
            errorBanner.textContent = 'Invalid authentication token / password.';
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
        'Are you sure you want to log out of Wallaflare?\\n\\nAll locally cached articles, offline data, and sync states will be cleared.',
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

    // Modal management
    function openModal(id) {
      clearActiveTextSelection();
      const modalEl = document.getElementById(id);
      if (modalEl) {
        modalEl.classList.add('open');
        if (id === 'addUrlModal') {
          setTimeout(() => document.getElementById('urlInput')?.focus(), 60);
        } else if (id === 'addTextModal') {
          renderAddTextTagChips();
          setTimeout(() => document.getElementById('textTitle')?.focus(), 60);
        } else if (id === 'syncModal') {
          const syncUrlEl = document.getElementById('syncServerUrl');
          if (syncUrlEl) {
            syncUrlEl.textContent = getEffectiveServerUrl() || window.location.origin;
          }
        }
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

    function closeModal(id) {
      const modalEl = document.getElementById(id);
      if (modalEl) modalEl.classList.remove('open');
      try {
        if (document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
          (document.activeElement as HTMLElement).blur();
        }
      } catch (e) {}
    }

    // Confirmation dialog
    let confirmResolve = null;
    function showConfirmDialog(title, message, confirmBtnText = 'Confirm', isDanger = false) {
      return new Promise((resolve) => {
        confirmResolve = resolve;
        document.getElementById('confirmModalTitle').textContent = title;
        document.getElementById('confirmModalMsg').textContent = message;
        const btn = document.getElementById('confirmModalBtn');
        btn.textContent = confirmBtnText;
        btn.className = isDanger ? 'btn btn-primary' : 'btn btn-primary';
        openModal('confirmModal');
      });
    }

    

    function handleConfirmModalOk() {
      const modalEl = document.getElementById('confirmModal');
      if (modalEl) {
        modalEl.style.pointerEvents = '';
        modalEl.removeAttribute('aria-hidden');
      }
      try { (document.activeElement as HTMLElement)?.blur(); } catch (e) {}
      closeModal('confirmModal');

      if (confirmResolve) {
        const resolve = confirmResolve;
        confirmResolve = null;
        resolve(true);
      }
    }

    function handleConfirmModalCancel() {
      const modalEl = document.getElementById('confirmModal');
      if (modalEl) {
        modalEl.style.pointerEvents = 'none';
        modalEl.setAttribute('aria-hidden', 'true');
      }
      try { (document.activeElement as HTMLElement)?.blur(); } catch (e) {}

      closeModal('confirmModal');
      if (modalEl) modalEl.style.pointerEvents = '';

      if (confirmResolve) {
        const resolve = confirmResolve;
        confirmResolve = null;
        resolve(false);
      }
    }

    let toastTimeout = null;
    function showToast(msg, duration = 3000) {
      const toast = document.getElementById('toast');
      const msgEl = document.getElementById('toastMsg');
      if (!toast || !msgEl) return;
      msgEl.textContent = msg;
      toast.classList.add('show');
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toastTimeout = null;
      }, duration);
    }

    function hideToast() {
      const toast = document.getElementById('toast');
      if (toast) toast.classList.remove('show');
      if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = null; }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Keyboard Shortcuts & Modal Dismissal Hierarchy
    window.addEventListener('keydown', (e) => {
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
        // 0. Close In-Reader Find Bar
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
        const anyOpenModal = document.querySelector('.modal-backdrop.open, .modal-overlay.open, .tag-modal-overlay.open, .modal.open');
        if (anyOpenModal) {
          e.preventDefault();
          anyOpenModal.classList.remove('open');
          return;
        }

        // 4. Focus Mode
        if (isFocusMode) {
          e.preventDefault();
          toggleReaderFocusMode(false);
          return;
        }

        // 5. Article Deselect / Reader Back
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

        // 6. Selection Mode
        if (isSelectionMode()) {
          e.preventDefault();
          clearArticleSelection();
          return;
        }
      }

      // Keyboard Navigation: j / k / ArrowDown / ArrowUp
      if ((e.key === 'j' || e.key === 'ArrowDown' || e.key === 'k' || e.key === 'ArrowUp') &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA' &&
          !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (modalOpen) return;

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

      // 'f' key for Focus Mode
      if (e.key === 'f' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
        const modalOpen = document.querySelector('.modal-backdrop.open, .tag-modal-overlay.open');
        if (!modalOpen && window.innerWidth >= 1024 && activeArticleId) {
          e.preventDefault();
          toggleReaderFocusMode();
        }
      }

      // 'e' key for Archive
      if (e.key === 'e' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
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

      // 's' key for Star
      if (e.key === 's' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && !document.activeElement.isContentEditable) {
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

      // Delete / Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
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
      isOfflineMode = offline;
      const btn = document.getElementById('addArticleBtn');
      const icon = document.getElementById('addArticleBtnIcon');
      const label = document.getElementById('addArticleBtnLabel');
      const sidebarBtn = document.getElementById('sidebarAddArticleBtn');
      const mobileDrawerBtn = document.getElementById('mobileDrawerAddArticleBtn');

      const offlineSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>';
      const onlineSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';

      if (offline) {
        if (btn) {
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-offline-mode');
          btn.title = 'Offline Mode — Reading from local cache (Tap to retry)';
        }
        if (sidebarBtn) {
          sidebarBtn.classList.remove('btn-primary');
          sidebarBtn.classList.add('btn-offline-mode');
          sidebarBtn.title = 'Offline Mode — Reading from local cache (Tap to retry)';
          sidebarBtn.innerHTML = offlineSvg + '<span>Offline Mode</span>';
        }
        if (mobileDrawerBtn) {
          mobileDrawerBtn.classList.remove('btn-primary');
          mobileDrawerBtn.classList.add('btn-offline-mode');
          mobileDrawerBtn.title = 'Offline Mode — Reading from local cache (Tap to retry)';
          mobileDrawerBtn.innerHTML = offlineSvg + '<span>Offline Mode</span>';
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
        if (sidebarBtn) {
          sidebarBtn.classList.remove('btn-offline-mode');
          sidebarBtn.classList.add('btn-primary');
          sidebarBtn.title = 'Add URL';
          sidebarBtn.innerHTML = onlineSvg + '<span>Add URL</span>';
        }
        if (mobileDrawerBtn) {
          mobileDrawerBtn.classList.remove('btn-offline-mode');
          mobileDrawerBtn.classList.add('btn-primary');
          mobileDrawerBtn.title = 'Add URL';
          mobileDrawerBtn.innerHTML = onlineSvg + '<span>Add URL</span>';
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

    // -------------------------------------------------------------
    // Persistent Outbox Mutation Queue (Offline & Interruption Safe)
    // -------------------------------------------------------------
    const OUTBOX_STORAGE_KEY = 'wf_pending_mutations';
    let isProcessingOutbox = false;

    function getPendingMutations() {
      try {
        const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    function savePendingMutations(mutations) {
      try {
        if (!mutations || mutations.length === 0) {
          localStorage.removeItem(OUTBOX_STORAGE_KEY);
        } else {
          localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(mutations));
        }
      } catch (e) {
        console.warn('Failed to save pending mutations to storage:', e);
      }
    }

    function enqueueMutation(action, payload) {
      const mutations = getPendingMutations();
      const mutation = {
        id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        action: action,
        payload: payload,
        createdAt: Date.now(),
        retryCount: 0
      };
      mutations.push(mutation);
      savePendingMutations(mutations);
      processOutboxMutations();
      return mutation;
    }

    async function processOutboxMutations() {
      if (isProcessingOutbox) return;
      const mutations = getPendingMutations();
      if (mutations.length === 0) return;

      isProcessingOutbox = true;
      try {
        while (true) {
          const currentQueue = getPendingMutations();
          if (currentQueue.length === 0) break;
          const mut = currentQueue[0];

          let success = false;
          let removeOnError = false;

          try {
            if (mut.action === 'delete') {
              const res = await authFetch('/api/entries/' + mut.payload.id + '.json', { method: 'DELETE' });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else if (mut.action === 'batch_delete') {
              const res = await authFetch('/api/entries/list.json', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: mut.payload.ids })
              });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else if (mut.action === 'toggle_star') {
              const res = await authFetch('/api/entries/' + mut.payload.id + '.json', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ starred: mut.payload.is_starred })
              });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else if (mut.action === 'batch_star') {
              const res = await authFetch('/api/entries/list.json', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: mut.payload.ids, starred: mut.payload.starred })
              });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else if (mut.action === 'toggle_archive') {
              const res = await authFetch('/api/entries/' + mut.payload.id + '.json', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archive: mut.payload.is_archived })
              });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else if (mut.action === 'batch_archive') {
              const res = await authFetch('/api/entries/list.json', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: mut.payload.ids, archive: mut.payload.archive })
              });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else if (mut.action === 'edit_title') {
              const res = await authFetch('/api/entries/' + mut.payload.id + '.json', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: mut.payload.title })
              });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else if (mut.action === 'add_tag') {
              const res = await authFetch('/api/entries/' + mut.payload.id + '/tags.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: mut.payload.tag })
              });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else if (mut.action === 'remove_tag') {
              const res = await authFetch('/api/entries/' + mut.payload.id + '/tags/' + encodeURIComponent(mut.payload.tag) + '.json', {
                method: 'DELETE'
              });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else if (mut.action === 'batch_add_tag') {
              const res = await authFetch('/api/entries/tags/lists.json', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: mut.payload.ids, tags: mut.payload.tag })
              });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else if (mut.action === 'batch_remove_tag') {
              const res = await authFetch('/api/entries/tags/lists.json', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: mut.payload.ids, tag: mut.payload.tag })
              });
              if (res.ok || res.status === 404) success = true;
              else if (res.status >= 400 && res.status < 500) removeOnError = true;
            } else {
              success = true;
            }
          } catch (networkErr) {
            break;
          }

          if (success || removeOnError) {
            const updated = getPendingMutations().filter(m => m.id !== mut.id);
            savePendingMutations(updated);
          } else {
            mut.retryCount = (mut.retryCount || 0) + 1;
            if (mut.retryCount > 10) {
              const updated = getPendingMutations().filter(m => m.id !== mut.id);
              savePendingMutations(updated);
            }
            break;
          }
        }
      } finally {
        isProcessingOutbox = false;
      }
    }

    // -------------------------------------------------------------
    // IndexedDB Full-Library Offline Storage Engine
    // -------------------------------------------------------------
    const DB_NAME = 'wallaflare_offline_db';
    const DB_VERSION = 1;
    const STORE_ENTRIES = 'entries';

    function openIndexedDB() {
      return new Promise((resolve) => {
        if (!window.indexedDB) return resolve(null);
        try {
          const req = indexedDB.open(DB_NAME, DB_VERSION);
          req.onupgradeneeded = (e) => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
              db.createObjectStore(STORE_ENTRIES, { keyPath: 'id' });
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }

    function deduplicateEntries(entries) {
      if (!Array.isArray(entries)) return [];
      const seen = new Set();
      const result = [];
      for (const item of entries) {
        if (item && item.id && !seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      }
      return result;
    }

    async function clearIndexedDB() {
      try {
        const db = await openIndexedDB();
        if (!db) return;
        const tx = db.transaction(STORE_ENTRIES, 'readwrite');
        tx.objectStore(STORE_ENTRIES).clear();
      } catch {}
    }

    async function saveEntriesToIndexedDB(entries) {
      try {
        const db = await openIndexedDB();
        if (!db) return;
        const tx = db.transaction(STORE_ENTRIES, 'readwrite');
        const store = tx.objectStore(STORE_ENTRIES);
        await store.clear();
        if (Array.isArray(entries)) {
          for (const item of entries) {
            if (item && item.id) {
              store.put(item);
            }
          }
        }
      } catch (err) {
        console.warn('Failed saving to IndexedDB:', err);
      }
    }

    async function deleteEntryFromIndexedDB(id) {
      try {
        const db = await openIndexedDB();
        if (!db) return;
        const tx = db.transaction(STORE_ENTRIES, 'readwrite');
        tx.objectStore(STORE_ENTRIES).delete(id);
      } catch {}
    }

    async function loadEntriesFromIndexedDB() {
      try {
        const db = await openIndexedDB();
        if (!db) return [];
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_ENTRIES, 'readonly');
          const store = tx.objectStore(STORE_ENTRIES);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      } catch {
        return [];
      }
    }

    function syncLocalEntriesCache(entries, tags, counts) {
      try {
        if (entries !== undefined) localStorage.setItem('wf_cached_articles', JSON.stringify(entries || []));
        if (tags !== undefined) localStorage.setItem('wf_cached_tags', JSON.stringify(tags || []));
        if (counts !== undefined) localStorage.setItem('wf_cached_counts', JSON.stringify(counts || null));
      } catch (err) {}
      saveArticlesToOfflineDb(entries || []);
    }

    // Tag list and filtering
    let selectedTagFilter = null;
    let cachedGlobalTags = [];
    let isSidebarTagsCollapsed = false;

    function getEffectiveGlobalTags() {
      const map = new Map();
      (cachedGlobalTags || []).forEach(t => {
        const label = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim();
        const slug = (typeof t === 'string' ? t : (t.slug || t.label || t.name || '')).trim();
        const key = (slug || label).toLowerCase();
        if (key) map.set(key, { id: t.id || Date.now(), label: label || slug, slug: slug || label, count: 0 });
      });

      (allEntries || []).forEach(entry => {
        (entry.tags || []).forEach(t => {
          const label = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim();
          const slug = (typeof t === 'string' ? t : (t.slug || t.label || t.name || '')).trim();
          const key = (slug || label).toLowerCase();
          if (key) {
            if (!map.has(key)) {
              map.set(key, { id: (typeof t === 'object' && t.id) ? t.id : Date.now(), label: label || slug, slug: slug || label, count: 1 });
            } else {
              const existing = map.get(key);
              existing.count = (existing.count || 0) + 1;
            }
          }
        });
      });
      return Array.from(map.values());
    }

    async function loadGlobalTags() {
      try {
        const res = await authFetch('/api/tags.json?_t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          cachedGlobalTags = await res.json();
          renderSidebarTags();
        }
      } catch (e) {}
    }

    function renderSidebarTags() {
      const listEl = document.getElementById('sidebarTagList');
      const countEl = document.getElementById('sidebarTagCount');
      const listMobileEl = document.getElementById('sidebarTagListMobile');
      const countMobileEl = document.getElementById('sidebarTagCountMobile');

      const tags = getEffectiveGlobalTags();
      if (countEl) countEl.textContent = String(tags.length);
      if (countMobileEl) countMobileEl.textContent = String(tags.length);

      const htmlContent = tags.length === 0
        ? '<div style="font-size: 0.75rem; color: var(--text-muted); padding: 0.35rem 0.5rem; font-style: italic;">No tags yet</div>'
        : tags.map(t => {
            const isActive = selectedTagFilter && selectedTagFilter.toLowerCase() === (t.slug || t.label).toLowerCase();
            return '<button class="sidebar-tag-item ' + (isActive ? 'active' : '') + '" onclick="filterByTag(\'' + escapeHtml(t.slug || t.label).replace(/'/g, "\\'") + '\')">' +
              '<span>#' + escapeHtml(t.label) + '</span>' +
              (t.count > 0 ? '<span class="badge-count">' + t.count + '</span>' : '') +
            '</button>';
          }).join('');

      if (listEl) listEl.innerHTML = htmlContent;
      if (listMobileEl) listMobileEl.innerHTML = htmlContent;
    }

    function toggleSidebarTagsCollapse() {
      isSidebarTagsCollapsed = !isSidebarTagsCollapsed;
      const listEl = document.getElementById('sidebarTagList');
      const chevron = document.getElementById('sidebarTagChevron');
      const listMobileEl = document.getElementById('sidebarTagListMobile');
      const chevronMobile = document.getElementById('sidebarTagChevronMobile');

      if (listEl) listEl.classList.toggle('collapsed', isSidebarTagsCollapsed);
      if (chevron) chevron.style.transform = isSidebarTagsCollapsed ? 'rotate(-90deg)' : 'none';
      if (listMobileEl) listMobileEl.classList.toggle('collapsed', isSidebarTagsCollapsed);
      if (chevronMobile) chevronMobile.style.transform = isSidebarTagsCollapsed ? 'rotate(-90deg)' : 'none';
    }

    function filterByTag(slug) {
      if (selectedTagFilter === slug) {
        selectedTagFilter = null;
      } else {
        selectedTagFilter = slug;
      }
      renderSidebarTags();
      filterArticles();
    }

    function setFilter(filter, updateHistory = true) {
      currentFilter = filter;
      document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById('tab' + filter.charAt(0).toUpperCase() + filter.slice(1));
      const activeMobileBtn = document.getElementById('tab' + filter.charAt(0).toUpperCase() + filter.slice(1) + 'Mobile');
      if (activeBtn) activeBtn.classList.add('active');
      if (activeMobileBtn) activeMobileBtn.classList.add('active');
      filterArticles();

      if (updateHistory) {
        const newPath = filter === 'unread' ? '/' : ('/' + filter);
        if (window.location.pathname !== newPath) {
          history.pushState({ filter }, '', newPath);
        }
      }
    }

    function updateCounts() {
      let unread = 0;
      let starred = 0;
      let archive = 0;
      let total = 0;

      for (const e of (allEntries || [])) {
        if (!e.is_archived) unread++;
        if (e.is_starred) starred++;
        if (e.is_archived) archive++;
        total++;
      }

      const unreadEl = document.getElementById('countUnread');
      const starredEl = document.getElementById('countStarred');
      const archiveEl = document.getElementById('countArchive');
      const totalEl = document.getElementById('countAll');

      const unreadMobileEl = document.getElementById('countUnreadMobile');
      const starredMobileEl = document.getElementById('countStarredMobile');
      const archiveMobileEl = document.getElementById('countArchiveMobile');
      const totalMobileEl = document.getElementById('countAllMobile');

      if (unreadEl) unreadEl.textContent = String(unread);
      if (starredEl) starredEl.textContent = String(starred);
      if (archiveEl) archiveEl.textContent = String(archive);
      if (totalEl) totalEl.textContent = String(total);

      if (unreadMobileEl) unreadMobileEl.textContent = String(unread);
      if (starredMobileEl) starredMobileEl.textContent = String(starred);
      if (archiveMobileEl) archiveMobileEl.textContent = String(archive);
      if (totalMobileEl) totalMobileEl.textContent = String(total);
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

      if (selectedTagFilter) {
        const filterLower = selectedTagFilter.toLowerCase().trim();
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
      if (banner && activeTagName) {
        if (selectedTagFilter) {
          banner.style.display = 'flex';
          activeTagName.textContent = '#' + selectedTagFilter;
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
          } else if (selectedTagFilter) {
            iconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>';
            title = 'No tagged articles';
            desc = 'No articles tagged with #' + escapeHtml(selectedTagFilter);
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
        const date = item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
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
            '<span class="card-date">' + date + '</span>' +
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
      if (e.target.closest('button, a, .card-dropdown-menu, .card-select-wrap, .tag-badge')) return;

      if (cardLongPressTriggered) {
        cardLongPressTriggered = false;
        return;
      }

      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        e.preventDefault();
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
    function setReaderStatusBar(hidden) {
      try {
        if (window.Capacitor?.Plugins?.StatusBar) {
          if (hidden) {
            window.Capacitor.Plugins.StatusBar.hide();
          } else {
            window.Capacitor.Plugins.StatusBar.show();
          }
        }
      } catch (e) {}
    }

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
      if (popover && popover.style.display !== 'none') return;
      if (moreMenu && moreMenu.classList.contains('open')) return;

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

      // 1. Update title and meta
      document.getElementById('readerTitle').textContent = item.title;

      const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
      const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : '';
      let metaHtml = '<span>' + escapeHtml(item.domain_name || '') + '</span>';
      if (author) metaHtml += ' &bull; <span style="font-weight: 500;">by ' + escapeHtml(author) + '</span>';
      metaHtml += ' &bull; <span>' + (item.reading_time || 1) + ' min read</span>' +
        ' &bull; <span>' + (item.created_at ? new Date(item.created_at).toLocaleDateString() : '') + '</span>';
      if (item.url) {
        metaHtml += ' &bull; <a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener" class="reader-original-link"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg><span>Original Link</span></a>';
      }
      document.getElementById('readerMeta').innerHTML = metaHtml;

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
      scheduleReaderTopBarAutoHide(700);

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
      document.getElementById('readingProgress').style.width = '0%';
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

    function updateReadingProgress() {
      const container = document.getElementById('readerScrollContainer');
      if (!container) return;
      const total = container.scrollHeight - container.clientHeight;
      const progress = total > 0 ? Math.min(100, Math.max(0, (container.scrollTop / total) * 100)) : 0;
      document.getElementById('readingProgress').style.width = progress + '%';

      if (activeArticleId && total > 0) {
        const ratio = Math.min(1, Math.max(0, container.scrollTop / total));
        updateCardReadingProgress(activeArticleId, ratio);
        clearTimeout(scrollSaveTimer);
        scrollSaveTimer = setTimeout(() => {
          localStorage.setItem('wf_scroll_' + activeArticleId, ratio.toFixed(4));
        }, 120);
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
      const ok = await showConfirmDialog('Delete Article', 'Are you sure you want to delete this article?\\n\\nThis action cannot be undone.', 'Delete Article', true);
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

    // Markdown conversion & Export Engine
    function htmlToMarkdown(html) {
      if (!html) return '';
      const doc = new DOMParser().parseFromString('<!DOCTYPE html><html><body>' + html + '</body></html>', 'text/html');
      const root = doc.body || doc;
      const nl = String.fromCharCode(10);
      const nl2 = nl + nl;
      const tick = String.fromCharCode(96);
      const fence = tick + tick + tick;
      const wsRegex = new RegExp('[' + String.fromCharCode(32, 9, 10, 13) + ']+', 'g');

      function nodeToMd(node) {
        if (!node) return '';
        if (node.nodeType === 3) {
          return node.nodeValue.replace(wsRegex, ' ');
        }
        if (node.nodeType !== 1) return '';

        const tag = node.tagName.toLowerCase();
        let inner = Array.from(node.childNodes).map(nodeToMd).join('');

        switch (tag) {
          case 'body': return inner.trim();
          case 'h1': return nl2 + '# ' + inner.trim() + nl2;
          case 'h2': return nl2 + '## ' + inner.trim() + nl2;
          case 'h3': return nl2 + '### ' + inner.trim() + nl2;
          case 'h4': return nl2 + '#### ' + inner.trim() + nl2;
          case 'h5': return nl2 + '##### ' + inner.trim() + nl2;
          case 'h6': return nl2 + '###### ' + inner.trim() + nl2;
          case 'p': return nl2 + inner.trim() + nl2;
          case 'strong':
          case 'b': return '**' + inner.trim() + '**';
          case 'em':
          case 'i': return '*' + inner.trim() + '*';
          case 'code':
            if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') return inner;
            return tick + inner + tick;
          case 'pre':
            return nl2 + fence + nl + inner.trim() + nl + fence + nl2;
          case 'blockquote':
            return nl2 + '> ' + inner.trim().split(nl).join(nl + '> ') + nl2;
          case 'ul':
            return nl2 + Array.from(node.children).map(li => '- ' + nodeToMd(li).trim()).join(nl) + nl2;
          case 'ol':
            return nl2 + Array.from(node.children).map((li, idx) => (idx + 1) + '. ' + nodeToMd(li).trim()).join(nl) + nl2;
          case 'li':
            return inner.trim();
          case 'a':
            const href = node.getAttribute('href');
            return href ? '[' + (inner.trim() || href) + '](' + href + ')' : inner;
          case 'img':
            const src = node.getAttribute('src');
            const alt = node.getAttribute('alt') || 'image';
            return src ? '![' + alt + '](' + src + ')' : '';
          case 'hr': return nl2 + '---' + nl2;
          case 'br': return nl;
          default: return inner;
        }
      }

      const md = nodeToMd(root);
      return md.replace(new RegExp(nl + '{3,}', 'g'), nl2).trim();
    }

    function highlightTextInNode(container, ann) {
      const quote = (ann.quote || '').trim();
      if (!quote) return;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      let node;
      let candidates = [];

      while ((node = walker.nextNode())) {
        if (node.parentElement && node.parentElement.closest('mark.reader-hl')) continue;
        const text = node.nodeValue || '';
        let idx = text.indexOf(quote);
        while (idx !== -1) {
          candidates.push({ node, idx, text });
          idx = text.indexOf(quote, idx + Math.max(1, quote.length));
        }
      }

      if (candidates.length === 0) return;

      let best = candidates[0];
      const targetNode = best.node;
      const idx = best.idx;
      const text = targetNode.nodeValue || '';
      const beforeText = text.slice(0, idx);
      const matchText = text.slice(idx, idx + quote.length);
      const afterText = text.slice(idx + quote.length);

      const mark = document.createElement('mark');
      mark.className = 'reader-hl reader-hl-' + (ann.color || 'yellow') + (ann.text ? ' has-note' : '');
      mark.dataset.annotationId = String(ann.id);
      mark.title = ann.text ? (ann.color + ' highlight: ' + ann.text) : (ann.color + ' highlight');
      mark.textContent = matchText;
      mark.onclick = (e) => {
        e.stopPropagation();
        openHighlightPopover(ann, mark);
      };

      const parent = targetNode.parentNode;
      if (!parent) return;

      if (beforeText) parent.insertBefore(document.createTextNode(beforeText), targetNode);
      parent.insertBefore(mark, targetNode);
      if (afterText) parent.insertBefore(document.createTextNode(afterText), targetNode);
      parent.removeChild(targetNode);
    }

    function getSortedAnnotations(item, sortMode = "position") {
      if (!item || !item.annotations || !Array.isArray(item.annotations)) return [];
      const list = [...item.annotations];

      if (sortMode === "time") {
        return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }

      const markElements = Array.from(document.querySelectorAll("#readerBody mark.reader-hl"));
      if (markElements.length > 0 && activeArticleId === item.id) {
        const domIndexMap = new Map();
        markElements.forEach((m, idx) => {
          const id = parseInt(m.dataset.annotationId, 10);
          if (id && !domIndexMap.has(id)) domIndexMap.set(id, idx);
        });
        return list.sort((a, b) => {
          const posA = domIndexMap.has(a.id) ? domIndexMap.get(a.id) : 99999;
          const posB = domIndexMap.has(b.id) ? domIndexMap.get(b.id) : 99999;
          if (posA !== posB) return posA - posB;
          return (a.id || 0) - (b.id || 0);
        });
      }

      const fullText = (item.content || item.text || "").toLowerCase();
      return list.sort((a, b) => {
        const getOffset = (ann) => {
          if (ann.target && Array.isArray(ann.target.selector)) {
            const posSel = ann.target.selector.find(s => s.type === "TextPositionSelector");
            if (posSel && typeof posSel.start === "number") return posSel.start;
          }
          if (ann.quote) {
            const idx = fullText.indexOf(ann.quote.toLowerCase().slice(0, 30));
            if (idx >= 0) return idx;
          }
          return 99999;
        };
        const offA = getOffset(a);
        const offB = getOffset(b);
        if (offA !== offB) return offA - offB;
        return (a.id || 0) - (b.id || 0);
      });
    }

    async function exportMarkdown(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      showToast('Exporting Markdown...');
      try {
        const title = item.title || 'Untitled Article';
        const rawAuthor = item.author || (Array.isArray(item.published_by) && item.published_by.length > 0 ? item.published_by[0] : '');
        const author = (rawAuthor && rawAuthor !== 'wallaflare' && rawAuthor !== 'Unknown') ? rawAuthor : (item.domain_name || '');
        const date = item.published_at || item.created_at || new Date().toISOString().split('T')[0];
        const tags = Array.isArray(item.tags) ? item.tags.map(t => typeof t === 'string' ? t : (t.label || t.slug)).filter(Boolean) : [];
        const nl = String.fromCharCode(10);
        const nl2 = nl + nl;

        let frontmatter = '---' + nl;
        frontmatter += 'title: ' + JSON.stringify(title) + nl;
        if (author) frontmatter += 'author: ' + JSON.stringify(author) + nl;
        if (item.url) frontmatter += 'source: ' + JSON.stringify(item.url) + nl;
        if (date) frontmatter += 'date: ' + JSON.stringify(date) + nl;
        if (tags.length > 0) frontmatter += 'tags: [' + tags.map(t => JSON.stringify(t)).join(', ') + ']' + nl;
        frontmatter += '---' + nl2;

        let annotations = getSortedAnnotations(item, 'position');
        let bodyMd = htmlToMarkdown(item.content || item.text || '');

        const footnotes = [];
        let noteCounter = 1;
        if (annotations.length > 0) {
          for (const ann of annotations) {
            const quote = (ann.quote || '').trim();
            if (!quote) continue;
            const fnRef = (ann.text && ann.text.trim()) ? ('[^note-' + noteCounter + ']') : '';
            if (fnRef) {
              footnotes.push('[^note-' + noteCounter + ']: 💬 **Note**: ' + ann.text.trim());
              noteCounter++;
            }
            const replacement = '==' + quote + '==' + fnRef;
            if (bodyMd.includes(quote)) bodyMd = bodyMd.replace(quote, replacement);
          }
        }

        let summaryMd = '';
        if (annotations.length > 0) {
          summaryMd = nl2 + '---' + nl2 + '## 🖍️ Highlights & Notes' + nl2;
          for (const ann of annotations) {
            const colorEmoji = ann.color === 'green' ? '🟢' : (ann.color === 'blue' ? '🔵' : (ann.color === 'purple' ? '🟣' : '🟡'));
            summaryMd += '- ' + colorEmoji + ' **\"' + (ann.quote || '').trim() + '\"**' + nl;
            if (ann.text && ann.text.trim()) summaryMd += '  > 💬 **Note**: ' + ann.text.trim() + nl;
          }
        }

        let footnotesMd = footnotes.length > 0 ? (nl2 + footnotes.join(nl) + nl) : '';
        const fullMd = frontmatter + '# ' + title + nl2 + bodyMd + summaryMd + footnotesMd + nl;
        const filename = title.replace(/[/\:*?"<>|]/g, '').trim() + '.md';

        const blob = new Blob([fullMd], { type: 'text/markdown;charset=utf-8' });
        await shareOrDownloadBlob(blob, filename, 'text/markdown');
        showToast('✓ Markdown exported');
      } catch (err) {
        showToast('Failed to export Markdown');
      }
    }

    async function shareOrDownloadBlob(blob, filename, mimeType) {
      const type = mimeType || blob.type || 'application/octet-stream';

      // 1. In Capacitor Native App: prioritize WallaflareNativePlugin or Capacitor Share
      if (isCapacitorApp()) {
        try {
          const nativePlugin = window.Capacitor?.Plugins?.WallaflareNative || window.WallaflareNative;
          const sharePlugin = window.Capacitor?.Plugins?.Share;
          const filesystemPlugin = window.Capacitor?.Plugins?.Filesystem;

          const reader = new FileReader();
          const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => {
              const res = reader.result;
              const base64data = typeof res === 'string' ? res.split(',')[1] : '';
              resolve(base64data);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(blob);
          const base64Data = await base64Promise;

          if (base64Data) {
            if (nativePlugin) {
              if (typeof nativePlugin.shareFile === 'function') {
                await nativePlugin.shareFile({ filename, mimeType: type, base64Data });
                return;
              } else if (typeof nativePlugin.shareEpub === 'function') {
                await nativePlugin.shareEpub({ filename, base64Data });
                return;
              }
            }

            if (filesystemPlugin && sharePlugin) {
              const writeResult = await filesystemPlugin.writeFile({
                path: filename,
                data: base64Data,
                directory: 'CACHE'
              });

              if (writeResult && writeResult.uri) {
                await sharePlugin.share({
                  title: filename,
                  url: writeResult.uri,
                  dialogTitle: 'Share ' + filename
                });
                return;
              }
            }
          }
        } catch (e) {
          console.warn('Native Capacitor share failed, falling back to Web Share / Download', e);
        }
      }

      // 2. Web Share API (native share sheet on mobile browsers & Android WebView)
      try {
        if (typeof File !== 'undefined' && typeof navigator.canShare === 'function') {
          const file = new File([blob], filename, { type: type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: filename
            });
            return;
          }
        }
      } catch (shareErr) {
        if (shareErr && shareErr.name === 'AbortError') return;
      }

      // 3. Fallback to standard browser blob URL download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(blobUrl); a.remove(); }, 3500);
    }

    function exportActiveMarkdown() {
      if (activeArticleId) exportMarkdown(activeArticleId);
    }

    async function exportPdf(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      showToast('Generating PDF...');
      try {
        if (typeof window.WallaflarePdf !== 'undefined' && typeof window.WallaflarePdf.generatePdf === 'function') {
          const pdfBytes = await window.WallaflarePdf.generatePdf(item);
          const filename = (item.title || 'article').replace(/[/\\:*?"<>|]/g, '').trim() + '.pdf';
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          await shareOrDownloadBlob(blob, filename, 'application/pdf');
          showToast('✓ PDF exported');
        } else {
          window.print();
        }
      } catch (e) {
        showToast('Failed to generate PDF');
      }
    }

    function exportActivePdf() {
      if (activeArticleId) exportPdf(activeArticleId);
    }

    async function downloadEpub(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      showToast('Exporting EPUB...');
      try {
        if (typeof window.WallaflareEpub !== 'undefined' && typeof window.WallaflareEpub.generateEpub === 'function') {
          const u8 = await window.WallaflareEpub.generateEpub(item, window.location.origin);
          const blob = new Blob([u8], { type: 'application/epub+zip' });
          const filename = (item.title || 'article').replace(/[/\\:*?"<>|]/g, '').trim() + '.epub';
          await shareOrDownloadBlob(blob, filename, 'application/epub+zip');
          showToast('✓ EPUB exported');
        } else {
          const res = await authFetch('/api/entries/' + id + '/export.epub');
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const blob = await res.blob();
          const filename = (item.title || 'article').replace(/[/\\:*?"<>|]/g, '').trim() + '.epub';
          await shareOrDownloadBlob(blob, filename, 'application/epub+zip');
          showToast('✓ EPUB exported');
        }
      } catch (e) {
        showToast('Failed to export EPUB');
      }
    }

    function downloadActiveEpub() {
      if (activeArticleId) downloadEpub(activeArticleId);
    }

    // Highlights DOM & Annotations Engine
    let activeSelectionRange = null;
    let activeSelectedQuote = '';
    let activePopoverAnnotation = null;

    function applyAnnotationsToReader(item) {
      if (!item) return;
      const annotations = item.annotations || [];
      const container = document.getElementById("readerBody");
      if (!container) return;

      const existingMarks = container.querySelectorAll("mark.reader-hl");
      existingMarks.forEach(m => {
        const parent = m.parentNode;
        if (parent) {
          while (m.firstChild) parent.insertBefore(m.firstChild, m);
          parent.removeChild(m);
          parent.normalize();
        }
      });

      for (const ann of annotations) {
        if (!ann || !ann.quote) continue;
        highlightTextInNode(container, ann);
      }

      updateHighlightsBadge(annotations.length);
    }

    function updateHighlightsBadge(count) {
      const badge = document.getElementById('readerHighlightsBadgeMobile');
      if (badge) {
        badge.textContent = String(count);
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
    }

    function toggleReaderHighlightsModal() {
      if (!activeArticleId) return;
      openArticleHighlightsModal(activeArticleId);
    }

    let activeModalHighlightsArticleId = null;
    let activeModalHighlightsFilter = "all";
    let activeModalHighlightsSort = "position";

    function openArticleHighlightsModal(articleId) {
      activeModalHighlightsArticleId = articleId;
      activeModalHighlightsFilter = "all";
      renderModalHighlightsList();
      openModal("readerHighlightsModal");
    }

    function filterHighlightsModalList(filterType, btn) {
      activeModalHighlightsFilter = filterType;
      document.querySelectorAll("#highlightsFilterPills .hl-filter-pill").forEach(p => p.classList.remove("active"));
      if (btn) btn.classList.add("active");
      renderModalHighlightsList();
    }

    function setHighlightsSort(sortMode, btn) {
      activeModalHighlightsSort = sortMode;
      document.querySelectorAll("#highlightsSortWrap .hl-sort-btn").forEach(b => b.classList.remove("active"));
      if (btn) btn.classList.add("active");
      renderModalHighlightsList();
    }

    function renderModalHighlightsList() {
      const container = document.getElementById("modalHighlightsList");
      const countBadge = document.getElementById("modalHighlightsCountBadge");
      if (!container) return;

      const item = allEntries.find(e => e.id === activeModalHighlightsArticleId);
      const annotations = getSortedAnnotations(item, activeModalHighlightsSort);
      if (countBadge) countBadge.textContent = String(annotations.length);

      if (annotations.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No highlights or notes in this article yet.</div>';
        return;
      }

      let filtered = annotations;
      if (activeModalHighlightsFilter === "notes") {
        filtered = annotations.filter(a => a.text && a.text.trim().length > 0);
      } else if (activeModalHighlightsFilter !== "all") {
        filtered = annotations.filter(a => (a.color || "yellow") === activeModalHighlightsFilter);
      }

      container.innerHTML = filtered.map(ann => {
        const colorBorder = ann.color === "green" ? "#22c55e" : (ann.color === "blue" ? "#3b82f6" : (ann.color === "purple" ? "#a855f7" : "#eab308"));
        const rawQuote = (ann.quote || '').trim();
        const quoteDisplay = rawQuote ? ('\"' + escapeHtml(rawQuote) + '\"') : (ann.text ? '📌 <em>(Article Note)</em>' : '📌 <em>(Range Highlight)</em>');
        return '<div class="modal-hl-item" style="border-left: 4px solid ' + colorBorder + '; display: flex; flex-direction: column; gap: 0.35rem; position: relative;">' +
          '<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">' +
            '<div style="font-weight: 500; font-size: 0.88rem; flex: 1; cursor: pointer;" onclick="scrollToAnnotation(' + ann.id + ', ' + activeModalHighlightsArticleId + ')">' + quoteDisplay + '</div>' +
            '<div style="display: flex; align-items: center; gap: 0.25rem; flex-shrink: 0;">' +
              '<button type="button" class="btn-icon" style="padding: 2px 5px; font-size: 0.75rem;" onclick="event.stopPropagation(); editModalAnnotation(' + ann.id + ', ' + activeModalHighlightsArticleId + ')" title="Edit Note">✏️</button>' +
              '<button type="button" class="btn-icon" style="padding: 2px 5px; font-size: 0.75rem; color: var(--danger);" onclick="event.stopPropagation(); deleteModalAnnotation(' + ann.id + ', ' + activeModalHighlightsArticleId + ')" title="Delete Highlight">🗑️</button>' +
            '</div>' +
          '</div>' +
          (ann.text ? '<div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.2rem; cursor: pointer;" onclick="scrollToAnnotation(' + ann.id + ', ' + activeModalHighlightsArticleId + ')">💬 ' + escapeHtml(ann.text) + '</div>' : '') +
        '</div>';
      }).join('');
    }

    async function scrollToAnnotation(annId, articleId = null) {
      closeModal("readerHighlightsModal");
      const targetArticleId = articleId || activeModalHighlightsArticleId;
      if (targetArticleId && activeArticleId !== targetArticleId) {
        await openReader(targetArticleId);
        setTimeout(() => {
          const mark = document.querySelector('mark[data-annotation-id="' + annId + '"]');
          if (mark) {
            mark.scrollIntoView({ behavior: "smooth", block: "center" });
            mark.style.outline = "3px solid var(--accent)";
            setTimeout(() => { mark.style.outline = ""; }, 2200);
          } else {
            showToast('📌 Note is unanchored (no text position in reader)');
          }
        }, 250);
        return;
      }
      const mark = document.querySelector('mark[data-annotation-id="' + annId + '"]');
      if (mark) {
        mark.scrollIntoView({ behavior: "smooth", block: "center" });
        mark.style.outline = "3px solid var(--accent)";
        setTimeout(() => { mark.style.outline = ""; }, 2200);
      } else {
        showToast('📌 Note is unanchored (no text position in reader)');
      }
    }

    async function deleteModalAnnotation(annId, articleId) {
      const targetArticleId = articleId || activeModalHighlightsArticleId;
      const item = allEntries.find(e => e.id === targetArticleId);
      if (!item || !item.annotations) return;

      const idx = item.annotations.findIndex(a => a.id === annId);
      if (idx === -1) return;

      item.annotations.splice(idx, 1);
      if (activeArticleId === targetArticleId) {
        applyAnnotationsToReader(item);
      }
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      renderModalHighlightsList();
      showToast('Highlight deleted');

      try {
        await authFetch('/api/annotations/' + annId + '.json', { method: 'DELETE' });
      } catch (e) {}
    }

    function editModalAnnotation(annId, articleId) {
      const targetArticleId = articleId || activeModalHighlightsArticleId;
      const item = allEntries.find(e => e.id === targetArticleId);
      if (!item || !item.annotations) return;

      const ann = item.annotations.find(a => a.id === annId);
      if (!ann) return;

      closeModal('readerHighlightsModal');
      openAnnotationNoteModal(ann);
    }

    function openHighlightPopover(ann, targetEl) {
      activePopoverAnnotation = ann;
      const popover = document.getElementById("highlightPopover");
      if (!popover) return;
      const noteEl = document.getElementById("popoverNoteText");
      if (noteEl) noteEl.textContent = ann.text || 'No note attached.';
      popover.style.display = "block";
      const rect = targetEl.getBoundingClientRect();
      popover.style.top = Math.max(10, rect.bottom + 6) + "px";
      popover.style.left = Math.max(10, Math.min(window.innerWidth - 290, rect.left)) + "px";
    }

    function closeHighlightPopover() {
      const popover = document.getElementById("highlightPopover");
      if (popover) popover.style.display = "none";
      activePopoverAnnotation = null;
    }

    function copyPopoverQuote() {
      if (activePopoverAnnotation && activePopoverAnnotation.quote) {
        copyDirectText(activePopoverAnnotation.quote);
      }
      closeHighlightPopover();
    }


    async function changePopoverHighlightColor(color) {
      if (!activePopoverAnnotation || !activeArticleId) return;
      activePopoverAnnotation.color = color;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item) {
        applyAnnotationsToReader(item);
        syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      }
      closeHighlightPopover();
      try {
        await authFetch('/api/annotations/' + activePopoverAnnotation.id + '.json', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ color })
        });
      } catch (e) {}
    }

    async function deletePopoverHighlight() {
      if (!activePopoverAnnotation || !activeArticleId) return;
      const annId = activePopoverAnnotation.id;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (item && item.annotations) {
        item.annotations = item.annotations.filter(a => a.id !== annId);
        applyAnnotationsToReader(item);
        syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      }
      closeHighlightPopover();
      try {
        await authFetch('/api/annotations/' + annId + '.json', { method: 'DELETE' });
        showToast('Highlight deleted');
      } catch (e) {}
    }

    function handleCreateHighlight(color = 'yellow') {
      const sel = window.getSelection();
      const selQuote = sel ? sel.toString().trim() : '';
      const quote = (selQuote || activeSelectedQuote || (activeSelectionRange ? activeSelectionRange.toString().trim() : '')).trim();
      if (!quote || !activeArticleId) return;

      const item = allEntries.find(e => e.id === activeArticleId);
      if (!item) return;

      const newAnn = {
        id: Date.now(),
        entry_id: item.id,
        quote: quote,
        color: color,
        text: '',
        created_at: new Date().toISOString()
      };
      if (!item.annotations) item.annotations = [];
      item.annotations.push(newAnn);

      clearActiveTextSelection();
      applyAnnotationsToReader(item);
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);

      authFetch('/api/annotations/' + item.id + '.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote, color, text: '' })
      }).then(res => res.json()).then(saved => {
        const idx = item.annotations.findIndex(a => a.id === newAnn.id);
        if (idx >= 0) item.annotations[idx] = saved;
        syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      }).catch(() => {});
    }

    function handleCreateHighlightWithNote() {
      const sel = window.getSelection();
      const selQuote = sel ? sel.toString().trim() : '';
      const quote = (selQuote || activeSelectedQuote || (activeSelectionRange ? activeSelectionRange.toString().trim() : '')).trim();
      if (!quote || !activeArticleId) return;
      clearActiveTextSelection();
      openAnnotationNoteModal(null, { quote, color: 'yellow' });
    }

    function handleCopySelection() {
      const sel = window.getSelection();
      const selQuote = sel ? sel.toString().trim() : '';
      const quote = (selQuote || activeSelectedQuote || (activeSelectionRange ? activeSelectionRange.toString().trim() : '')).trim();
      if (quote) copyDirectText(quote);
      clearActiveTextSelection();
    }


    let activeModalAnnotation = null;
    let pendingHighlightData = null;
    let modalSelectedColor = 'yellow';

    function selectModalNoteColor(color, btn) {
      modalSelectedColor = color;
      document.querySelectorAll('#modalNoteColors .hl-color-btn').forEach(b => b.classList.remove('active-color'));
      if (btn) btn.classList.add('active-color');
    }

    function openAnnotationNoteModal(ann, pendingData = null) {
      activeModalAnnotation = ann || null;
      pendingHighlightData = pendingData || null;
      modalSelectedColor = (ann ? ann.color : (pendingData ? pendingData.color : 'yellow')) || 'yellow';
      closeHighlightPopover();

      const preview = document.getElementById('annotationNoteQuotePreview');
      const input = document.getElementById('annotationNoteInput');
      const quote = ann ? ann.quote : (pendingData ? pendingData.quote : '');
      if (preview) preview.textContent = quote;
      if (input) input.value = ann ? (ann.text || '') : '';

      openModal('annotationNoteModal');
      setTimeout(() => input?.focus(), 60);
    }

    function closeAnnotationNoteModal() {
      activeModalAnnotation = null;
      pendingHighlightData = null;
      closeModal('annotationNoteModal');
    }

    async function handleSaveAnnotationNoteForm(e) {
      e.preventDefault();
      if (!activeArticleId) return;
      const item = allEntries.find(e => e.id === activeArticleId);
      if (!item) return;

      const input = document.getElementById('annotationNoteInput');
      const text = input ? input.value.trim() : '';
      const color = modalSelectedColor || 'yellow';

      if (pendingHighlightData) {
        const quote = pendingHighlightData.quote;
        closeAnnotationNoteModal();
        const newAnn = { id: Date.now(), entry_id: item.id, quote, color, text, created_at: new Date().toISOString() };
        if (!item.annotations) item.annotations = [];
        item.annotations.push(newAnn);
        applyAnnotationsToReader(item);
        syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
        authFetch('/api/annotations/' + item.id + '.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quote, color, text })
        }).then(res => res.json()).then(saved => {
          const idx = item.annotations.findIndex(a => a.id === newAnn.id);
          if (idx >= 0) item.annotations[idx] = saved;
          syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
        }).catch(() => {});
        return;
      }

      if (activeModalAnnotation) {
        activeModalAnnotation.text = text;
        activeModalAnnotation.color = color;
        applyAnnotationsToReader(item);
        syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
        closeAnnotationNoteModal();
        try {
          await authFetch('/api/annotations/' + activeModalAnnotation.id + '.json', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, color })
          });
        } catch (e) {}
      }
    }

    function clearActiveTextSelection() {
      const sel = window.getSelection();
      if (sel) {
        try { sel.removeAllRanges(); } catch (e) {}
      }
      const toolbar = document.getElementById('readerHighlightToolbar');
      if (toolbar) toolbar.style.display = 'none';

      const defaultHeader = document.getElementById('readerTopBarDefault');
      const annHeader = document.getElementById('readerTopBarAnnotation');
      if (defaultHeader) defaultHeader.style.display = 'flex';
      if (annHeader) annHeader.style.display = 'none';

      activeSelectionRange = null;
      activeSelectedQuote = '';
    }

    function initReaderSelectionHandlers() {
      const handleSelection = () => {
        const readerView = document.getElementById('readerView');
        const readerBody = document.getElementById('readerBody');
        const desktopToolbar = document.getElementById('readerHighlightToolbar');
        const defaultHeader = document.getElementById('readerTopBarDefault');
        const annHeader = document.getElementById('readerTopBarAnnotation');

        if (!activeArticleId || !readerView || readerView.style.display === 'none' || !readerBody) {
          if (desktopToolbar) desktopToolbar.style.display = 'none';
          if (defaultHeader) defaultHeader.style.display = 'flex';
          if (annHeader) annHeader.style.display = 'none';
          activeSelectionRange = null;
          activeSelectedQuote = '';
          return;
        }

        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          const noteModal = document.getElementById('annotationNoteModal');
          if (noteModal && noteModal.classList.contains('open')) return;

          if (desktopToolbar && desktopToolbar.style.display !== 'none') {
            desktopToolbar.style.display = 'none';
          }
          if (annHeader && annHeader.style.display !== 'none') {
            if (defaultHeader) defaultHeader.style.display = 'flex';
            annHeader.style.display = 'none';
          }
          activeSelectionRange = null;
          activeSelectedQuote = '';
          return;
        }

        const range = sel.getRangeAt(0);
        if (!readerBody.contains(range.commonAncestorContainer) && readerBody !== range.commonAncestorContainer) {
          if (desktopToolbar) desktopToolbar.style.display = 'none';
          if (defaultHeader) defaultHeader.style.display = 'flex';
          if (annHeader) annHeader.style.display = 'none';
          activeSelectionRange = null;
          activeSelectedQuote = '';
          return;
        }

        const text = sel.toString().trim();
        if (!text) {
          if (desktopToolbar) desktopToolbar.style.display = 'none';
          if (defaultHeader) defaultHeader.style.display = 'flex';
          if (annHeader) annHeader.style.display = 'none';
          activeSelectionRange = null;
          activeSelectedQuote = '';
          return;
        }

        activeSelectionRange = range.cloneRange();
        activeSelectedQuote = text;
        closeHighlightPopover();

        const isDesktop = window.innerWidth >= 1024;
        if (isDesktop) {
          if (defaultHeader) defaultHeader.style.display = 'flex';
          if (annHeader) annHeader.style.display = 'none';
          if (desktopToolbar) {
            desktopToolbar.style.display = 'flex';
            const rect = range.getBoundingClientRect();
            const top = Math.max(10, rect.top - 48);
            const left = Math.max(10, Math.min(window.innerWidth - 250, rect.left + (rect.width / 2) - 110));
            desktopToolbar.style.top = top + 'px';
            desktopToolbar.style.left = left + 'px';
          }
        } else {
          if (desktopToolbar) desktopToolbar.style.display = 'none';
          if (defaultHeader) defaultHeader.style.display = 'none';
          if (annHeader) {
            annHeader.style.display = 'flex';
            const countEl = document.getElementById('readerTopBarSelCount');
            if (countEl) {
              countEl.textContent = text.length > 14 ? (text.slice(0, 13) + '…') : text;
            }
          }
          showReaderTopBar(false);
        }
      };

      document.addEventListener('selectionchange', handleSelection);
      document.addEventListener('mouseup', () => {
        setTimeout(handleSelection, 20);
      });
      document.addEventListener('touchend', () => {
        setTimeout(handleSelection, 40);
      });

      document.addEventListener('mousedown', (e) => {
        const insideToolbar = e.target.closest('#readerHighlightToolbar');
        const insideTopBar = e.target.closest('#readerTopBar');
        const insidePopover = e.target.closest('#highlightPopover');
        const insideMark = e.target.closest('mark.reader-hl');
        const insideModal = e.target.closest('.modal-backdrop');

        const toolbar = document.getElementById('readerHighlightToolbar');
        if (toolbar && toolbar.style.display !== 'none' && !insideToolbar && !insideTopBar) {
          toolbar.style.display = 'none';
          activeSelectionRange = null;
          activeSelectedQuote = '';
        }

        const popover = document.getElementById('highlightPopover');
        if (popover && popover.style.display !== 'none' && !insidePopover && !insideMark && !insideModal) {
          closeHighlightPopover();
        }
      });
    }

    function copyDirectText(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('✓ Copied to clipboard');
      });
    }

    function copySyncValue(elementId, btn) {
      const el = document.getElementById(elementId);
      if (el) copyDirectText(el.textContent.trim(), btn);
    }

    function copySyncOpdsAuthUrl(btn) {
      const el = document.getElementById('syncOpdsAuthUrl');
      const fullUrl = el?.getAttribute('data-full-url') || el?.textContent?.trim() || '';
      if (fullUrl) copyDirectText(fullUrl, btn);
    }

    function updateOpdsTokenBadge(hasDedicatedOpdsToken) {
      const opdsBadgeEl = document.getElementById('syncOpdsTokenStatusBadge');
      if (!opdsBadgeEl) return;
      opdsBadgeEl.style.display = 'flex';
      opdsBadgeEl.style.alignItems = 'center';
      opdsBadgeEl.style.flexWrap = 'wrap';
      opdsBadgeEl.style.gap = '0.35rem';
      if (hasDedicatedOpdsToken) {
        opdsBadgeEl.style.background = 'rgba(34, 197, 94, 0.1)';
        opdsBadgeEl.style.border = '1px solid rgba(34, 197, 94, 0.25)';
        opdsBadgeEl.style.color = 'var(--success, #22c55e)';
        opdsBadgeEl.innerHTML = '<span style="font-weight: 600;">🟢 Dedicated OPDS_TOKEN is active</span><span style="color: var(--text-secondary); font-size: 0.72rem;">(Read-only catalog key)</span>';
      } else {
        opdsBadgeEl.style.background = 'rgba(234, 179, 8, 0.08)';
        opdsBadgeEl.style.border = '1px solid rgba(234, 179, 8, 0.2)';
        opdsBadgeEl.style.color = 'var(--warning, #eab308)';
        opdsBadgeEl.innerHTML = '<span style="font-weight: 600;">🔑 Using master AUTH_TOKEN</span><span style="color: var(--text-secondary); font-size: 0.72rem;">(Set OPDS_TOKEN in Cloudflare Secrets for a dedicated read-only key)</span>';
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

    // Batch Selection Mode
    function isSelectionMode() {
      return selectedArticleIds.size > 0;
    }

    function toggleArticleSelection(id, force) {
      if (selectedArticleIds.has(id)) selectedArticleIds.delete(id);
      else selectedArticleIds.add(id);

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
        const exportEpubLabel = document.getElementById('batchExportEpubLabel');
        const exportMdLabel = document.getElementById('batchExportMdLabel');
        const exportJsonLabel = document.getElementById('batchExportJsonLabel');

        if (count === 1) {
          if (highlightsBtn) { highlightsBtn.classList.remove('is-hidden'); highlightsBtn.style.setProperty('display', 'flex', 'important'); }
          if (openOriginalBtn) { openOriginalBtn.classList.remove('is-hidden'); openOriginalBtn.style.setProperty('display', 'flex', 'important'); }
          if (editTitleBtn) { editTitleBtn.classList.remove('is-hidden'); editTitleBtn.style.setProperty('display', 'flex', 'important'); }
          if (exportPdfBtn) { exportPdfBtn.classList.remove('is-hidden'); exportPdfBtn.style.setProperty('display', 'flex', 'important'); }
          if (exportEpubLabel) exportEpubLabel.textContent = 'EPUB (.epub)';
          if (exportMdLabel) exportMdLabel.textContent = 'Markdown (.md)';
          if (exportJsonLabel) exportJsonLabel.textContent = 'JSON (.json)';
        } else {
          if (highlightsBtn) { highlightsBtn.classList.add('is-hidden'); highlightsBtn.style.setProperty('display', 'none', 'important'); }
          if (openOriginalBtn) { openOriginalBtn.classList.add('is-hidden'); openOriginalBtn.style.setProperty('display', 'none', 'important'); }
          if (editTitleBtn) { editTitleBtn.classList.add('is-hidden'); editTitleBtn.style.setProperty('display', 'none', 'important'); }
          if (exportPdfBtn) { exportPdfBtn.classList.add('is-hidden'); exportPdfBtn.style.setProperty('display', 'none', 'important'); }
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



    function batchOpenHighlights() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 1) {
        closeAllCardMenus();
        openArticleHighlightsModal(ids[0]);
      }
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

    function batchEditTitle() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 1) {
        closeAllCardMenus();
        openEditTitleModal(ids[0]);
      }
    }

    async function handleBatchExportEpub() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      closeAllCardMenus();
      if (ids.length === 1) {
        downloadEpub(ids[0]);
        clearArticleSelection();
        return;
      }

      showToast('Generating ' + ids.length + ' EPUB files...');
      try {
        const zipFiles = {};
        for (const id of ids) {
          const item = allEntries.find(e => e.id === id);
          if (!item) continue;
          if (typeof window.WallaflareEpub !== 'undefined' && typeof window.WallaflareEpub.generateEpub === 'function') {
            const u8 = await window.WallaflareEpub.generateEpub(item, window.location.origin);
            const safeName = (item.title || ('article-' + id)).replace(/[/\\:*?"<>|]/g, '').trim() + '.epub';
            zipFiles[safeName] = u8;
          }
        }
        const zipper = window.WallaflareEpub?.zipSync || window.fflate?.zipSync;
        if (zipper && Object.keys(zipFiles).length > 0) {
          const zippedData = zipper(zipFiles);
          const blob = new Blob([zippedData], { type: 'application/zip' });
          const filename = 'wallaflare-epubs-' + Date.now() + '.zip';
          await shareOrDownloadBlob(blob, filename, 'application/zip');
          showToast('✓ ' + Object.keys(zipFiles).length + ' EPUBs exported to ZIP');
          clearArticleSelection();
        } else {
          showToast('EPUB generator ready');
        }
      } catch (e) {
        showToast('Failed to batch export EPUBs');
      }
    }

    async function handleBatchExportMarkdown() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      closeAllCardMenus();
      if (ids.length === 1) {
        exportMarkdown(ids[0]);
        clearArticleSelection();
        return;
      }

      showToast('Creating Markdown ZIP archive...');
      try {
        const zipFiles = {};
        const strToU8 = window.WallaflareEpub?.strToU8 || window.fflate?.strToU8 || ((s) => new TextEncoder().encode(s));
        const zipper = window.WallaflareEpub?.zipSync || window.fflate?.zipSync;

        for (const id of ids) {
          const item = allEntries.find(e => e.id === id);
          if (!item) continue;
          const bodyMd = htmlToMarkdown(item.content || item.text || '');
          const mdContent = '# ' + (item.title || 'Untitled') + '\\n\\n' +
            '- **Source:** ' + (item.url || 'N/A') + '\\n' +
            '- **Author:** ' + (item.author || 'N/A') + '\\n' +
            '- **Date:** ' + (item.created_at || new Date().toISOString()) + '\\n\\n' +
            '---\\n\\n' +
            bodyMd;
          const safeName = (item.title || ('article-' + id)).replace(/[/\\:*?"<>|]/g, '').trim() + '.md';
          zipFiles[safeName] = strToU8(mdContent);
        }

        if (zipper && Object.keys(zipFiles).length > 0) {
          const zippedData = zipper(zipFiles);
          const blob = new Blob([zippedData], { type: 'application/zip' });
          const filename = 'wallaflare-markdown-' + Date.now() + '.zip';
          await shareOrDownloadBlob(blob, filename, 'application/zip');
          showToast('✓ ' + Object.keys(zipFiles).length + ' Markdown files exported to ZIP');
          clearArticleSelection();
        }
      } catch (e) {
        showToast('Failed to export Markdown ZIP');
      }
    }

    function handleBatchExportPdf() {
      const ids = Array.from(selectedArticleIds);
      closeAllCardMenus();
      if (ids.length === 1) {
        exportPdf(ids[0]);
        clearArticleSelection();
      }
    }

    async function handleBatchExportJson() {
      const ids = Array.from(selectedArticleIds);
      if (ids.length === 0) return;
      closeAllCardMenus();
      const items = ids.map(id => allEntries.find(e => e.id === id)).filter(Boolean);
      const jsonStr = JSON.stringify(items, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const filename = (items.length === 1 ? ((items[0].title || 'article').replace(/[/\\:*?"<>|]/g, '').trim() + '.json') : ('wallaflare-export-' + Date.now() + '.json'));
      await shareOrDownloadBlob(blob, filename, 'application/json');
      showToast('✓ Exported ' + items.length + ' article(s) as JSON');
      clearArticleSelection();
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

    
    function openTagModalForSelection() {
      if (selectedArticleIds.length === 0) {
        showToast('No articles selected');
        return;
      }
      openTagModal([...selectedArticleIds]);
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
      const ok = await showConfirmDialog('Delete Articles', 'Are you sure you want to delete ' + ids.length + ' articles?\\n\\nThis action cannot be undone.', 'Delete', true);
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

    // Ingest URL & Text Handlers
    function handleAddArticleBtnClick() {
      if (isOfflineMode) {
        showToast('Connecting to server...');
        loadArticles(false);
        return;
      }
      openModal('addUrlModal');
    }

    function handleAddTextBtnClick() {
      openModal('addTextModal');
    }

    async function handleIngestUrl(e) {
      e.preventDefault();
      const input = document.getElementById('urlInput') as HTMLInputElement;
      const btn = document.getElementById('ingestUrlBtn') as HTMLButtonElement;
      const errEl = document.getElementById('addUrlErrorMsg');
      if (errEl) {
        errEl.style.display = 'none';
        errEl.textContent = '';
      }
      let url = (input?.value || '').trim();
      if (!url) return;
      url = normalizeUrl(url);

      btn.disabled = true;
      btn.textContent = 'Extracting...';

      try {
        const result = await saveArticleWithFallback(url);
        if (!result.ok) throw new Error(result.error || 'Failed to save article');
        const item = result.data;
        closeModal('addUrlModal');
        if (input) input.value = '';
        if (item && item.id) {
          allEntries.unshift(item);
          syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
          checkNativePendingSavedArticles();
          updateCounts();
          renderSidebarTags();
          filterArticles();
          if (result.alreadyExists) {
            showToast('Article is already in your library!');
          } else if (result.emptyContent) {
            showToast('⚠️ Saved link only (article text was blocked or empty)', true, 5000);
          } else {
            showToast(result.parserUsed === 'device' ? '✓ Article extracted on device & saved!' : '✓ Article saved successfully!');
          }
          openReader(item.id);
        } else {
          showToast(result.alreadyExists ? 'Article is already in your library!' : '✓ Article saved successfully!');
          loadArticles(false);
        }
      } catch (err: any) {
        let friendlyError = err?.message || 'Failed to save article';
        if (/exceeded CPU time limit|CPU limit/i.test(friendlyError)) {
          friendlyError = "⚡ Cloudflare Worker exceeded CPU time limit parsing this large webpage. Tip: Extract via the Wallaflare Android App (device parser) or save as Custom Text.";
        } else if (/NetworkError|CORS|Failed to fetch/i.test(friendlyError)) {
          friendlyError = "⚠️ Device extraction failed due to browser CORS security restrictions. Standard desktop browsers cannot scrape external websites directly. Switch to 'Auto' in Settings for server fallback, or use the Wallaflare Android App.";
        }
        if (errEl) {
          errEl.textContent = friendlyError;
          errEl.style.display = 'block';
        }
        showToast(friendlyError, true, 7000);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Fetch & Save';
      }
    }

    async function handleIngestText(e) {
      e.preventDefault();
      const title = document.getElementById('textTitle')?.value.trim();
      const content = document.getElementById('textContent')?.value.trim();
      const author = document.getElementById('textAuthor')?.value.trim();
      const tags = document.getElementById('textTags')?.value.trim();
      const url = document.getElementById('textUrl')?.value.trim();
      const previewPicture = document.getElementById('textPreviewPicture')?.value.trim();
      const btn = document.getElementById('ingestTextBtn');

      if (!title || !content) return;
      btn.disabled = true;

      try {
        const res = await authFetch('/api/entries.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, content, author, tags, url, preview_picture: previewPicture })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const item = await res.json();
        closeModal('addTextModal');
        allEntries.unshift(item);
        syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
        checkNativePendingSavedArticles();
        updateCounts();
        renderSidebarTags();
        filterArticles();
        showToast('✓ Custom entry saved');
        openReader(item.id);
      } catch (err) {
        showToast('Failed to save entry');
      } finally {
        btn.disabled = false;
      }
    }

    // Tag management modal logic
    let activeTagModalIds = [];
    function openTagModal(target) {
      if (typeof target === 'number') activeTagModalIds = [target];
      else if (Array.isArray(target)) activeTagModalIds = target;
      else if (activeArticleId) activeTagModalIds = [activeArticleId];
      if (activeTagModalIds.length === 0) return;

      const titleEl = document.getElementById('tagModalHeaderTitle');
      const articleTitleEl = document.getElementById('tagModalArticleTitle');
      if (activeTagModalIds.length === 1) {
        const item = allEntries.find(e => e.id === activeTagModalIds[0]);
        if (titleEl) titleEl.textContent = 'Manage Tags';
        if (articleTitleEl) articleTitleEl.textContent = item ? item.title : '';
      } else {
        if (titleEl) titleEl.textContent = 'Batch Tag Editor (' + activeTagModalIds.length + ' articles)';
        if (articleTitleEl) articleTitleEl.textContent = 'Editing tags across ' + activeTagModalIds.length + ' selected articles';
      }

      renderTagModalUI();
      document.getElementById('tagModal')?.classList.add('open');
    }

    function closeTagModal() {
      activeTagModalIds = [];
      document.getElementById('tagModal')?.classList.remove('open');
    }

        
        function handleAddTagBtnClick(btn) {
      const parent = btn.closest('.tag-badge');
      const enc = (parent && parent.getAttribute('data-tag')) || btn.getAttribute('data-tag');
      if (enc) addQuickTagToActiveArticles(decodeURIComponent(enc));
    }

    function handleRemoveTagBtnClick(btn) {
      const parent = btn.closest('.tag-badge');
      const enc = (parent && parent.getAttribute('data-tag')) || btn.getAttribute('data-tag');
      if (enc) removeTagFromActiveArticles(decodeURIComponent(enc));
    }

    function handleFilterByTagClick(el) {
      const enc = el.getAttribute('data-tag');
      if (!enc) return;
      closeModal('settingsModal');
      closeGlobalTagModal();
      filterByTag(decodeURIComponent(enc));
    }

    function handleDeleteGlobalTagClick(btn) {
      const enc = btn.getAttribute('data-tag');
      if (!enc) return;
      deleteGlobalTag(decodeURIComponent(enc));
    }

    function renderTagModalUI() {
      const container = document.getElementById('tagModalCurrentTags');
      const availContainer = document.getElementById('tagModalAvailableTags');
      const quickSection = document.getElementById('quickTagsSection');
      if (!container) return;

      const totalSelected = activeTagModalIds.length;

      // Count occurrences of each tag across selected articles
      const tagCounts = new Map(); // key -> { label, count }
      activeTagModalIds.forEach(id => {
        const item = allEntries.find(e => e.id === id);
        if (item && item.tags) {
          const seenInArticle = new Set();
          item.tags.forEach(t => {
            const label = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim();
            const slug = (typeof t === 'string' ? t : (t.slug || t.label || t.name || '')).trim();
            const key = (label || slug).toLowerCase();
            const slugKey = (slug || label).toLowerCase();
            if (key && !seenInArticle.has(key)) {
              seenInArticle.add(key);
              seenInArticle.add(slugKey);
              const existing = tagCounts.get(key) || tagCounts.get(slugKey) || { label, slug, count: 0 };
              existing.count++;
              tagCounts.set(key, existing);
              tagCounts.set(slugKey, existing);
            }
          });
        }
      });

      const seenBadgeKeys = new Set();
      const allApplied = [];
      tagCounts.forEach((val, k) => {
        const normalized = val.label.toLowerCase();
        if (!seenBadgeKeys.has(normalized)) {
          seenBadgeKeys.add(normalized);
          allApplied.push(val);
        }
      });
      if (allApplied.length === 0) {
        container.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No tags applied</span>';
      } else {
        container.innerHTML = allApplied.map(({ label, count }) => {
          const enc = encodeURIComponent(label);
          const isPartial = totalSelected > 1 && count < totalSelected;

          if (isPartial) {
            return '<span class="tag-badge tag-badge-partial" style="cursor: default; display: inline-flex; align-items: center; gap: 0.4rem; background: var(--bg-tertiary); border: 1px dashed var(--accent); color: var(--text-primary); padding: 3px 7px; border-radius: var(--radius-sm);" data-tag="' + enc + '" title="Applied to ' + count + ' of ' + totalSelected + ' selected articles">' +
              '<span>#' + escapeHtml(label) + '</span>' +
              '<span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500;">(' + count + '/' + totalSelected + ')</span>' +
              '<div style="display: inline-flex; align-items: center; gap: 0.25rem; border-left: 1px solid var(--border-color); padding-left: 0.35rem; margin-left: 0.1rem;">' +
                '<button type="button" style="background: none; border: none; color: var(--accent); cursor: pointer; padding: 0 2px; font-size: 0.85rem; line-height: 1; font-weight: 700;" onclick="handleAddTagBtnClick(this)" title="Apply to all ' + totalSelected + ' articles">+</button>' +
                '<button type="button" style="background: none; border: none; color: var(--danger, #ef4444); cursor: pointer; padding: 0 2px; font-size: 0.85rem; line-height: 1;" onclick="handleRemoveTagBtnClick(this)" title="Remove from all selected articles">&times;</button>' +
              '</div>' +
            '</span>';
          }

          return '<span class="tag-badge" style="cursor: default; display: inline-flex; align-items: center; gap: 0.35rem;" data-tag="' + enc + '">' +
            '#' + escapeHtml(label) +
            '<button type="button" style="background: none; border: none; color: currentColor; cursor: pointer; padding: 0; font-size: 0.85rem; line-height: 1;" onclick="handleRemoveTagBtnClick(this)" title="Remove tag">&times;</button>' +
          '</span>';
        }).join(' ');
      }

      // Available quick library tags to choose from (tags not present on ANY selected article)
      const allLibTags = getEffectiveGlobalTags();
      const availableQuickTags = allLibTags.filter(t => {
        const key = (t.label || t.slug || '').toLowerCase();
        const slugKey = (t.slug || t.label || '').toLowerCase();
        return !tagCounts.has(key) && !tagCounts.has(slugKey);
      });

      if (availContainer && quickSection) {
        if (availableQuickTags.length > 0) {
          quickSection.style.display = 'block';
          availContainer.innerHTML = availableQuickTags.map(t => {
            const enc = encodeURIComponent(t.label);
            return '<button type="button" class="tag-badge" style="cursor: pointer; background: var(--bg-tertiary); border: 1px dashed var(--border-color);" data-tag="' + enc + '" onclick="handleAddTagBtnClick(this)" title="Add tag to all selected">' +
              '+ #' + escapeHtml(t.label) +
            '</button>';
          }).join(' ');
        } else {
          quickSection.style.display = 'none';
          availContainer.innerHTML = '';
        }
      }
    }

    function addQuickTagToActiveArticles(tagName) {
      if (!tagName || activeTagModalIds.length === 0) return;
      const ids = [...activeTagModalIds];
      for (const id of ids) {
        const item = allEntries.find(e => e.id === id);
        if (item) {
          if (!item.tags) item.tags = [];
          const exists = item.tags.some(t => {
            const l = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
            return l === tagName.toLowerCase();
          });
          if (!exists) {
            item.tags.push({ label: tagName, slug: tagName.toLowerCase() });
          }
        }
      }
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      renderTagModalUI();
      renderSidebarTags();
      filterArticles();
      showToast('Tag #' + tagName + ' added');

      if (ids.length === 1) {
        enqueueMutation('add_tag', { id: ids[0], tag: tagName });
      } else {
        enqueueMutation('batch_add_tag', { ids: ids, tag: tagName });
      }
    }

    function removeTagFromActiveArticles(tagName) {
      if (!tagName || activeTagModalIds.length === 0) return;
      const ids = [...activeTagModalIds];
      const tagLower = tagName.toLowerCase();
      for (const id of ids) {
        const item = allEntries.find(e => e.id === id);
        if (item && item.tags) {
          item.tags = item.tags.filter(t => {
            const l = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
            return l !== tagLower;
          });
        }
      }
      syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      renderTagModalUI();
      renderSidebarTags();
      filterArticles();
      showToast('Tag #' + tagName + ' removed');

      if (ids.length === 1) {
        enqueueMutation('remove_tag', { id: ids[0], tag: tagName });
      } else {
        enqueueMutation('batch_remove_tag', { ids: ids, tag: tagName });
      }
    }

    function submitAddTag() {
      const input = document.getElementById('newTagInput');
      const rawVal = input ? input.value.trim() : '';
      if (!rawVal || activeTagModalIds.length === 0) return;

      const tagsToAdd = rawVal.split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean);
      if (tagsToAdd.length === 0) return;

      for (const tag of tagsToAdd) {
        addQuickTagToActiveArticles(tag);
      }
      input.value = '';
      renderTagModalUI();
    }

    function openGlobalTagManager() {
      renderGlobalTagManagerUI();
      openModal('globalTagModal');
      loadGlobalTags().then(() => renderGlobalTagManagerUI());
    }

    function closeGlobalTagModal() {
      closeModal('globalTagModal');
    }

        function renderGlobalTagManagerUI() {
      const containers = [
        document.getElementById('globalTagListContainer'),
        document.getElementById('settingsGlobalTagListContainer')
      ].filter(Boolean);

      const countLabels = [
        document.getElementById('globalTagCountLabel'),
        document.getElementById('settingsGlobalTagCountLabel')
      ].filter(Boolean);

      const tags = getEffectiveGlobalTags();
      countLabels.forEach(lbl => {
        lbl.textContent = tags.length + ' tag' + (tags.length === 1 ? '' : 's') + ' total';
      });

      if (tags.length === 0) {
        containers.forEach(c => {
          c.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.88rem;">No tags in library yet</div>';
        });
        return;
      }

      const html = tags.map(t => {
        const enc = encodeURIComponent(t.slug || t.label);
        return '<div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.65rem; background: var(--bg-tertiary); border-radius: var(--radius-sm);">' +
          '<div style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; flex: 1;" data-tag="' + enc + '" onclick="handleFilterByTagClick(this)">' +
            '<span style="font-weight: 600; font-size: 0.88rem; color: var(--accent);">#' + escapeHtml(t.label) + '</span>' +
            '<span class="badge-count" style="font-size: 0.72rem;">' + t.count + ' article' + (t.count === 1 ? '' : 's') + '</span>' +
          '</div>' +
          '<button class="btn-icon" style="color: var(--text-muted); padding: 0.2rem 0.4rem; height: auto;" data-tag="' + enc + '" onclick="handleDeleteGlobalTagClick(this)" title="Remove tag from all articles">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
          '</button>' +
        '</div>';
      }).join('');

      containers.forEach(c => {
        c.innerHTML = html;
      });
    }



    async function deleteGlobalTag(tagSlugOrLabel) {
      const tagLower = tagSlugOrLabel.toLowerCase();
      const tags = getEffectiveGlobalTags();
      const tagObj = tags.find(t => (t.slug || '').toLowerCase() === tagLower || (t.label || '').toLowerCase() === tagLower);
      const label = tagObj ? tagObj.label : tagSlugOrLabel;
      const count = tagObj ? tagObj.count : 0;

      let confirmMsg = 'Are you sure you want to delete tag "#' + label + '" from your library?';
      if (count > 0) {
        confirmMsg = 'Are you sure you want to delete "#' + label + '"? This will untag ' + count + ' article' + (count === 1 ? '' : 's') + ' across your library.';
      }

      const confirmed = await showConfirmDialog('Delete Tag', confirmMsg, 'Delete Tag', true);
      if (!confirmed) return;

      let modified = false;
      for (const entry of allEntries) {
        if (entry.tags && entry.tags.length > 0) {
          const prevLen = entry.tags.length;
          entry.tags = entry.tags.filter(t => {
            const l = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
            return l !== tagLower;
          });
          if (entry.tags.length !== prevLen) modified = true;
        }
      }
      if (cachedGlobalTags) {
        cachedGlobalTags = cachedGlobalTags.filter(t => (t.slug || '').toLowerCase() !== tagLower && (t.label || '').toLowerCase() !== tagLower);
      }
      if (modified) {
        syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
        renderSidebarTags();
        filterArticles();
      }
      renderGlobalTagManagerUI();
      showToast('Tag #' + label + ' deleted');

      try {
        await authFetch('/api/tags/' + encodeURIComponent(tagSlugOrLabel) + '.json', {
          method: 'DELETE'
        });
      } catch (e) {}
    }

    async function submitCreateGlobalTag() {
      const input = document.getElementById('newGlobalTagInput');
      const val = input ? input.value.trim().replace(/^#/, '') : '';
      if (!val) return;
      if (!cachedGlobalTags) cachedGlobalTags = [];
      const exists = cachedGlobalTags.some(t => (t.label || '').toLowerCase() === val.toLowerCase() || (t.slug || '').toLowerCase() === val.toLowerCase());
      if (!exists) {
        cachedGlobalTags.push({ id: Date.now(), label: val, slug: val.toLowerCase(), count: 0 });
      }
      input.value = '';
      renderSidebarTags();
      renderGlobalTagManagerUI();
      showToast('Tag #' + val + ' created');

      try {
        const res = await authFetch('/api/tags.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label: val })
        });
        if (res.ok) {
          const created = await res.json();
          const idx = cachedGlobalTags.findIndex(t => t.slug === created.slug || t.label.toLowerCase() === created.label.toLowerCase());
          if (idx >= 0) cachedGlobalTags[idx] = created;
          else cachedGlobalTags.push(created);
        }
        loadGlobalTags();
      } catch (e) {}
    }

    async function cleanupUnusedTags() {
      const usedTags = new Set();
      (allEntries || []).forEach(e => {
        (e.tags || []).forEach(t => {
          const l = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
          if (l) usedTags.add(l);
        });
      });

      const unusedList = (cachedGlobalTags || []).filter(t => {
        const l = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
        return !usedTags.has(l);
      });

      if (unusedList.length === 0) {
        showToast('No unused tags in library');
        return;
      }

      const confirmed = await showConfirmDialog(
        'Clean Up Unused Tags',
        'Are you sure you want to delete ' + unusedList.length + ' unused tag' + (unusedList.length === 1 ? '' : 's') + ' from your library?',
        'Delete Unused Tags',
        true
      );
      if (!confirmed) return;

      cachedGlobalTags = (cachedGlobalTags || []).filter(t => {
        const l = (typeof t === 'string' ? t : (t.label || t.name || t.slug || '')).trim().toLowerCase();
        return usedTags.has(l);
      });

      renderSidebarTags();
      renderGlobalTagManagerUI();
      showToast(unusedList.length + ' unused tag' + (unusedList.length === 1 ? '' : 's') + ' cleaned');

      for (const t of unusedList) {
        const idOrSlug = t.id || t.slug || t.label;
        if (idOrSlug) {
          authFetch('/api/tags/' + encodeURIComponent(idOrSlug) + '.json', { method: 'DELETE' }).catch(() => {});
        }
      }
    }

    function openEditTitleModal(id) {
      const item = allEntries.find(e => e.id === id);
      if (!item) return;
      document.getElementById('editTitleEntryId').value = String(id);
      document.getElementById('editTitleInput').value = item.title;
      openModal('editTitleModal');
    }

    async function handleSaveTitle(e) {
      e.preventDefault();
      const id = parseInt(document.getElementById('editTitleEntryId').value, 10);
      const newTitle = document.getElementById('editTitleInput').value.trim();
      if (!id || !newTitle) return;

      const item = allEntries.find(e => e.id === id);
      if (item) {
        item.title = newTitle;
        if (activeArticleId === id) document.getElementById('readerTitle').textContent = newTitle;
        syncLocalEntriesCache(allEntries, cachedGlobalTags, serverLibraryCounts);
      }
      closeModal('editTitleModal');
      filterArticles();
      showToast('✓ Title updated');
      enqueueMutation('edit_title', { id: id, title: newTitle });
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

    function updateSettingsStats() {
      const localEl = document.getElementById('statsLocalArticles');
      const serverEl = document.getElementById('statsServerArticles');
      const compEl = document.getElementById('statsSyncComparison');
      const revEl = document.getElementById('statsSyncRevision');

      const localTotal = allEntries.length;
      const unreadCount = allEntries.filter(e => !e.is_archived).length;
      const serverTotal = (serverLibraryCounts && typeof serverLibraryCounts.total === 'number') ? serverLibraryCounts.total : localTotal;
      const currentRev = Number(localStorage.getItem('wf_sync_rev') || currentSyncRev || 1);
      const isOffline = !navigator.onLine || isOfflineMode;

      if (localEl) {
        localEl.textContent = localTotal + ' (' + unreadCount + ' unread)';
      }
      if (serverEl) {
        serverEl.textContent = isOffline ? (serverTotal + ' (from last sync)') : String(serverTotal);
      }
      if (compEl) {
        if (isOffline) {
          compEl.textContent = 'Offline (Cached from Rev ' + currentRev + ')';
          compEl.style.color = 'var(--warning, #f59e0b)';
        } else if (localTotal === serverTotal) {
          compEl.textContent = 'In Sync ✓ (' + localTotal + '/' + serverTotal + ')';
          compEl.style.color = 'var(--accent, #3b82f6)';
        } else {
          const diff = localTotal - serverTotal;
          compEl.textContent = (diff > 0 ? ('+' + diff) : String(diff)) + ' diff (Local: ' + localTotal + ', Server: ' + serverTotal + ')';
          compEl.style.color = 'var(--warning, #f59e0b)';
        }
      }
      if (revEl) {
        revEl.textContent = 'Rev ' + currentRev;
      }

      // Populate Overview Stats in Server & Data Panel
      const unreadStatEl = document.getElementById('settingsStatUnread');
      const starredStatEl = document.getElementById('settingsStatStarred');
      const timeStatEl = document.getElementById('settingsStatReadingTime');

      const unread = allEntries.filter(e => !e.is_archived).length;
      const starred = allEntries.filter(e => e.is_starred).length;
      const totalReadingMins = allEntries
        .filter(e => !e.is_archived)
        .reduce((sum, e) => sum + (e.reading_time || Math.max(1, Math.round((e.content?.length || 500) / 1000))), 0);

      if (unreadStatEl) unreadStatEl.textContent = String(unread);
      if (starredStatEl) starredStatEl.textContent = String(starred);
      if (timeStatEl) timeStatEl.textContent = totalReadingMins >= 60 ? Math.floor(totalReadingMins / 60) + 'h ' + (totalReadingMins % 60) + 'm' : totalReadingMins + 'm';
    }

        function setParserEngine(mode: ParserMode) {
      setParserMode(mode);
      updateParserEngineUI();
      showToast(`Article extractor set to: ${mode.toUpperCase()}`);
    }

        function updateParserEngineUI() {
      const currentMode = getParserMode();
      const isCap = isCapacitorApp();
      
      const btnsContainer = document.getElementById('settingsParserBtns');
      const webNotice = document.getElementById('settingsParserWebNotice');
      const descEl = document.getElementById('settingsParserEngineDesc');

      if (isCap) {
        if (btnsContainer) btnsContainer.style.display = 'grid';
        if (webNotice) webNotice.style.display = 'none';

        const btns = document.querySelectorAll('#settingsParserBtns .opt-parser-btn');
        btns.forEach((btn) => {
          const p = btn.getAttribute('data-parser');
          if (p === currentMode) {
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-outline');
          } else {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline');
          }
        });

        if (descEl) {
          if (currentMode === 'auto') {
            descEl.textContent = 'Auto (Recommended): Extracts on-device via mobile connection to bypass bot checks & CPU limits; falls back to Cloudflare Worker if needed.';
          } else if (currentMode === 'device') {
            descEl.textContent = 'Device Only: Extracts articles entirely on your phone. Zero server-side scraping compute.';
          } else {
            descEl.textContent = 'Server Only: Sends URL to Cloudflare Worker to scrape on edge.';
          }
        }
      } else {
        if (btnsContainer) btnsContainer.style.display = 'none';
        if (webNotice) webNotice.style.display = 'block';

        if (descEl) {
          descEl.textContent = 'Web browsers enforce Same-Origin (CORS) security policies that block direct webpage scraping from external sites. Articles added from the web dashboard are parsed via your Cloudflare Worker. On-device extraction is active in the Wallaflare Android App.';
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

    
    let activeSettingsTab = 'appearance';

    
    async function populateServerConfigInputs() {
      let savedServerUrl = localStorage.getItem('wf_server_url') || '';
      let savedAuthToken = localStorage.getItem('wf_auth_token') || '';

      if (isCapacitorApp() && (!savedServerUrl || !savedAuthToken) && window.Capacitor?.Plugins?.WallaflareNative?.getServerConfig) {
        try {
          const res = await window.Capacitor.Plugins.WallaflareNative.getServerConfig();
          if (res) {
            if (res.server_url && !savedServerUrl) {
              savedServerUrl = res.server_url;
              localStorage.setItem('wf_server_url', savedServerUrl);
            }
            if (res.auth_token && !savedAuthToken) {
              savedAuthToken = res.auth_token;
              localStorage.setItem('wf_auth_token', savedAuthToken);
            }
          }
        } catch (e) {}
      }

      const effectiveServerUrl = (isCapacitorApp() ? savedServerUrl : (savedServerUrl || window.location.origin)) || window.location.origin;

      const serverUrlEl = document.getElementById('syncServerUrl');
      if (serverUrlEl) {
        serverUrlEl.textContent = effectiveServerUrl;
      }

      const opdsUrlEl = document.getElementById('syncOpdsUrl');
      if (opdsUrlEl) {
        opdsUrlEl.textContent = effectiveServerUrl + '/opds';
      }

      const opdsAuthUrlEl = document.getElementById('syncOpdsAuthUrl');
      if (opdsAuthUrlEl) {
        if (savedAuthToken) {
          opdsAuthUrlEl.textContent = effectiveServerUrl + '/opds?token=••••••••••••';
          opdsAuthUrlEl.setAttribute('data-full-url', effectiveServerUrl + '/opds?token=' + encodeURIComponent(savedAuthToken));
        } else {
          opdsAuthUrlEl.textContent = effectiveServerUrl + '/opds?token=OPDS_TOKEN';
          opdsAuthUrlEl.setAttribute('data-full-url', effectiveServerUrl + '/opds?token=OPDS_TOKEN');
        }
      }

      const initialHasOpds = (window as any).WF_HAS_OPDS_TOKEN !== undefined 
        ? Boolean((window as any).WF_HAS_OPDS_TOKEN)
        : (localStorage.getItem('wf_has_opds_token') === 'true');
      updateOpdsTokenBadge(initialHasOpds);




      const urlInputs = [
        document.getElementById('settingsServerUrlInput'),
        document.getElementById('serverUrlInput')
      ].filter(Boolean) as HTMLInputElement[];

      const tokenInputs = [
        document.getElementById('settingsServerTokenInput'),
        document.getElementById('serverTokenInput')
      ].filter(Boolean) as HTMLInputElement[];

      urlInputs.forEach(input => {
        input.value = effectiveServerUrl;
      });

      tokenInputs.forEach(input => {
        input.value = '';
        if (savedAuthToken) {
          input.placeholder = '•••••••••••• (Saved - leave blank to keep)';
        } else {
          input.placeholder = 'Enter AUTH_TOKEN';
        }
      });
    }

    function openSettingsModal(initialTab = null) {
      const modal = document.getElementById('settingsModal');
      if (!modal) return;

      const isMobile = window.innerWidth < 768;
      const targetTab = initialTab || (isMobile ? 'root' : 'appearance');

      const syncClientSecretEl = document.getElementById('syncClientSecretDisplay');
      if (syncClientSecretEl) {
        syncClientSecretEl.textContent = 'wallaflare';
      }

      const serverRow = document.getElementById('serverConnectionSettingsRow');
      if (serverRow) {
        serverRow.style.display = isCapacitorApp() ? 'flex' : 'none';
      }
      populateServerConfigInputs();
      updateSettingsStats();
      updateParserEngineUI();
      const webTip = document.getElementById('siteCookieWebTip');
      if (webTip) webTip.style.display = isCapacitorApp() ? 'none' : 'block';

      if (isMobile) {
        if (targetTab && targetTab !== 'root') {
          switchSettingsTab(targetTab, true);
          modal.classList.add('is-viewing-panel');
          const backBtn = document.getElementById('settingsMobileBackBtn');
          if (backBtn) backBtn.style.display = 'inline-flex';
        } else {
          modal.classList.remove('is-viewing-panel');
          const backBtn = document.getElementById('settingsMobileBackBtn');
          if (backBtn) backBtn.style.display = 'none';
          const title = document.getElementById('settingsModalTitle');
          if (title) title.textContent = 'Settings';
        }
      } else {
        switchSettingsTab(targetTab === 'root' ? 'appearance' : targetTab, false);
        modal.classList.remove('is-viewing-panel');
      }

      openModal('settingsModal');
    }

    let lastDataTabSyncTime = 0;
    let lastCookiesTabFetchTime = 0;
    let lastTagsTabFetchTime = 0;

    function switchSettingsTab(tabName, activateMobile = true) {
      activeSettingsTab = tabName || 'appearance';
      updateSettingsStats();

      const now = Date.now();
      populateServerConfigInputs();

      if (activeSettingsTab === 'data') {
        if (now - lastDataTabSyncTime > 15000) {
          lastDataTabSyncTime = now;
          loadArticles(true, false).then(() => {
            updateSettingsStats();
          }).catch(() => {});
        }
      } else if (activeSettingsTab === 'cookies') {
        if (now - lastCookiesTabFetchTime > 15000) {
          lastCookiesTabFetchTime = now;
          loadSiteCookies();
        }
      } else if (activeSettingsTab === 'tags') {
        if (now - lastTagsTabFetchTime > 15000) {
          lastTagsTabFetchTime = now;
          loadGlobalTags().then(() => renderGlobalTagManagerUI()).catch(() => {});
        }
      }

      // Update nav buttons
      document.querySelectorAll('#settingsNavPane .settings-nav-item').forEach(btn => {
        if (btn.getAttribute('data-tab') === activeSettingsTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Update panels
      document.querySelectorAll('#settingsContentPane .settings-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
      });

      const activePanel = document.getElementById('settingsPanel-' + activeSettingsTab);
      if (activePanel) {
        activePanel.classList.add('active');
        activePanel.style.display = 'block';
      }

      const titles = {
        appearance: 'Theme & Appearance',
        cookies: 'Cookie Vault & Paywalls',
        integrations: 'Apps & KOReader Sync',
        tags: 'Tag Management',
        data: 'Server & Data',
        about: 'About & Updates'
      };

      const titleEl = document.getElementById('settingsModalTitle');
      const modal = document.getElementById('settingsModal');
      const backBtn = document.getElementById('settingsMobileBackBtn');

      if (window.innerWidth < 768 && activateMobile) {
        if (modal) modal.classList.add('is-viewing-panel');
        if (backBtn) backBtn.style.display = 'inline-flex';
        if (titleEl) titleEl.textContent = titles[activeSettingsTab] || 'Settings';
      } else {
        if (titleEl) titleEl.textContent = 'Settings';
      }

    }

    function handleSettingsMobileBack() {
      const modal = document.getElementById('settingsModal');
      const backBtn = document.getElementById('settingsMobileBackBtn');
      const titleEl = document.getElementById('settingsModalTitle');
      if (modal) modal.classList.remove('is-viewing-panel');
      if (backBtn) backBtn.style.display = 'none';
      if (titleEl) titleEl.textContent = 'Settings';
    }

    function openGlobalTagModal() {
      openSettingsModal('tags');
    }

    function openSyncModal() {
      openSettingsModal('integrations');
    }

    function openServerConnectModal() {
      openSettingsModal('data');
    }

    function openWipeDbModal() {
      openSettingsModal('data');
    }


    async function reconcileDatabase() {
      const ok = await showConfirmDialog(
        'Reconcile Database',
        'This will clear local storage and re-sync all articles, tags, and counts fresh from Cloudflare D1.\\n\\nContinue?',
        'Reconcile & Sync',
        false
      );
      if (!ok) return;

      showToast('Reconciling database...');
      localStorage.removeItem('wf_sync_rev');
      localStorage.removeItem('wf_instance_id');
      localStorage.removeItem('wf_cached_articles');
      localStorage.removeItem('wf_cached_tags');
      localStorage.removeItem('wf_cached_counts');
      localStorage.removeItem('wf_pending_mutations');
      localStorage.removeItem('wf_instance_id');
      currentSyncRev = 0;
      allEntries = [];
      await clearIndexedDB();
      filterArticles();
      await loadArticles(false, true);
      showToast('✓ Database fully reconciled');
    }


    
    function normalizeUrl(url) {
      if (!url) return '';
      url = url.trim();
      if (!url) return '';
      if (url.startsWith('//')) return 'https:' + url;
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      return url;
    }

    function handleSaveServerConnection(e) {
      if (e) e.preventDefault();
      const form = (e && e.target && e.target.tagName === 'FORM') ? e.target : document;
      const urlInput = (form.querySelector('#settingsServerUrlInput') || form.querySelector('#serverUrlInput') || document.getElementById('settingsServerUrlInput') || document.getElementById('serverUrlInput')) as HTMLInputElement;
      const tokenInput = (form.querySelector('#settingsServerTokenInput') || form.querySelector('#serverTokenInput') || document.getElementById('settingsServerTokenInput') || document.getElementById('serverTokenInput')) as HTMLInputElement;

      let url = (urlInput?.value || '').trim();
      const token = (tokenInput?.value || '').trim();

      if (url) {
        url = normalizeUrl(url).replace(/\/+$/, '');
        localStorage.setItem('wf_server_url', url);
      }
      if (token) {
        localStorage.setItem('wf_auth_token', token);
      }
      syncNativeServerConfig();
      populateServerConfigInputs();
      closeModal('serverConnectModal');
      closeModal('settingsModal');
      showToast('✓ Server settings saved');
      loadArticles(false);
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
        checkNativePendingSavedArticles();
        processOutboxMutations();
        const now = Date.now();
        if (now - lastRefreshTime > 4000) {
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


    let currentMinNativeVersion = '1.0.0';

    function getAppWebVersion() {
      return window.WF_BUILD_VERSION || '${OTA_VERSION}';
    }

    function getRunningNativeVersion() {
      if (typeof (window as any).AndroidNative?.getAppVersion === 'function') {
        try {
          const v = (window as any).AndroidNative.getAppVersion();
          if (v) return String(v);
        } catch (e) {}
      }
      return (window as any).WF_NATIVE_VERSION || '1.0';
    }

    function compareSemVer(a, b) {
      const pa = String(a || '1.0.0').split(/[\.-]/).map(n => parseInt(n, 10) || 0);
      const pb = String(b || '1.0.0').split(/[\.-]/).map(n => parseInt(n, 10) || 0);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
      }
      return 0;
    }

    function checkNativeApkVersion(minNative) {
      if (!isCapacitorApp() || !minNative) return;
      currentMinNativeVersion = minNative;
      const runningNativeVer = getRunningNativeVersion();
      if (compareSemVer(runningNativeVer, minNative) < 0) {
        console.warn('[OTA] Native app update available. Installed APK:', runningNativeVer, 'Required:', minNative);
        setTimeout(() => {
          showToast('📲 New Android APK (v' + minNative + ') available! Install updated APK for latest native features.', 10000);
        }, 1200);
        updateVersionDisplay();
      }
    }

    let isDownloadingOta = false;
    async function checkCapacitorOtaFromVersion(serverVer, minNative) {
      if (!isCapacitorApp() || isDownloadingOta || !serverVer) return;
      const updater = window.Capacitor?.Plugins?.CapacitorUpdater;
      if (!updater) return;

      const currentLocal = window.WF_BUILD_VERSION || (await updater.getLatest().catch(() => null))?.version || '';
      if (serverVer === currentLocal) return;

      isDownloadingOta = true;
      try {
        const serverBase = getEffectiveServerUrl();
        const downloadUrl = (serverBase ? serverBase : '') + '/api/app/bundle.zip';
        console.log('[OTA] Downloading updated bundle reported in header:', serverVer);

        const downloaded = await updater.download({
          url: downloadUrl,
          version: serverVer
        });

        if (downloaded) {
          await updater.set(downloaded);
          console.log('[OTA] Bundle installed successfully for version:', serverVer);
          if (!activeArticleId && (!window.location.pathname || window.location.pathname === '/' || window.location.pathname === '/unread')) {
            showToast('✓ Updated to latest web assets');
            setTimeout(() => {
              updater.reload().catch(() => window.location.reload());
            }, 600);
          } else {
            showOtaRestartBanner();
          }
        }
      } catch (err) {
        console.warn('[OTA] Header updater error:', err);
      } finally {
        isDownloadingOta = false;
      }
    }

    function showOtaRestartBanner() {
      showToast('🚀 New update ready! Tap here to reload', 12000);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.style.cursor = 'pointer';
        toast.onclick = () => {
          const updater = window.Capacitor?.Plugins?.CapacitorUpdater;
          if (updater) {
            updater.reload().catch(() => window.location.reload());
          } else {
            window.location.reload();
          }
        };
      }
    }

    async function initCapacitorOtaUpdater() {
      if (!isCapacitorApp()) return;
      const updater = window.Capacitor?.Plugins?.CapacitorUpdater;
      if (updater) {
        await updater.notifyAppReady().catch(() => {});
      }
      try {
        const serverBase = getEffectiveServerUrl();
        if (serverBase) {
          const res = await fetch(serverBase + '/api/app/version.json?_t=' + Date.now()).catch(() => null);
          if (res && res.ok) {
            const manifest = await res.json().catch(() => null);
            if (manifest) {
              if (typeof manifest.has_opds_token === 'boolean') {
                (window as any).WF_HAS_OPDS_TOKEN = manifest.has_opds_token;
                localStorage.setItem('wf_has_opds_token', manifest.has_opds_token ? 'true' : 'false');
                updateOpdsTokenBadge(manifest.has_opds_token);
              }
              if (manifest.has_opds_token !== undefined) {
                (window as any).WF_HAS_OPDS_TOKEN = Boolean(manifest.has_opds_token);
              }
              if (manifest.min_native_version) {
                checkNativeApkVersion(manifest.min_native_version);
              }
              if (manifest.version) {
                checkCapacitorOtaFromVersion(manifest.version, manifest.min_native_version);
              }
            }
          }
        }
      } catch (e) {}
    }

    function updateVersionDisplay() {
      const ver = getAppWebVersion();
      const label = document.getElementById('sidebarVersionLabel');
      const mobileLabel = document.getElementById('mobileVersionLabel');
      const settingsLabel = document.getElementById('settingsVersionLabel');
      
      let text = 'Wallaflare v1.0.0 (Web: ' + ver + ')';
      if (isCapacitorApp()) {
        const nativeVer = getRunningNativeVersion();
        const isOutdated = currentMinNativeVersion && compareSemVer(nativeVer, currentMinNativeVersion) < 0;
        text = isOutdated 
          ? 'Wallaflare (APK: v' + nativeVer + ' ⚠️ update to v' + currentMinNativeVersion + ' • Web: ' + ver + ')'
          : 'Wallaflare (APK: v' + nativeVer + ' • Web: ' + ver + ')';
      }
      if (label) label.textContent = text;
      if (mobileLabel) mobileLabel.textContent = text;
      if (settingsLabel) settingsLabel.textContent = text;
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
    initAppearanceSettings();
    setViewMode(localStorage.getItem('wf_view_mode') || 'list');
    updateVersionDisplay();
    renderFromInstantLocalCache();
    handleRouteState();
    checkSetupStatus().then((isSetup) => {
      if (!isSetup) {
        loadArticles(true);
      }
    });
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
    initSelectionDeselectListener();
    initReaderSelectionHandlers();
    initCapacitorOtaUpdater();


    // In-Reader Search Engine (Ctrl+F / Cmd+F)
    let readerSearchMatches = [];
    let activeReaderSearchIndex = -1;
    let currentReaderSearchQuery = '';

    function toggleReaderSearchBar() {
      const bar = document.getElementById('readerSearchBar');
      if (bar && bar.style.display !== 'none') {
        closeReaderSearchBar();
      } else {
        openReaderSearchBar();
      }
    }

    function openReaderSearchBar() {
      const bar = document.getElementById('readerSearchBar');
      const input = document.getElementById('readerSearchInput');
      if (!bar || !input) return;
      bar.style.display = 'flex';
      input.focus();
      input.select();
      const query = (input.value || '').trim();
      if (query) {
        // Standard browser behavior: Reopening restores matches & index without auto-scrolling
        const rememberedIndex = (query.toLowerCase() === currentReaderSearchQuery.toLowerCase() && activeReaderSearchIndex >= 0) ? activeReaderSearchIndex : 0;
        performReaderSearch(query, false, rememberedIndex);
      }
    }

    function closeReaderSearchBar() {
      const bar = document.getElementById('readerSearchBar');
      if (bar) bar.style.display = 'none';
      clearReaderSearchMarksOnly();
    }

    function clearReaderSearchMarksOnly() {
      readerSearchMatches = [];
      const container = document.getElementById('readerBody');
      if (!container) return;
      const marks = container.querySelectorAll('mark.reader-search-match');
      marks.forEach(m => {
        const parent = m.parentNode;
        if (parent) {
          while (m.firstChild) parent.insertBefore(m.firstChild, m);
          parent.removeChild(m);
          parent.normalize();
        }
      });
    }

    function clearReaderSearchMatches() {
      clearReaderSearchMarksOnly();
      activeReaderSearchIndex = -1;
      currentReaderSearchQuery = '';
      const countEl = document.getElementById('readerSearchCount');
      if (countEl) countEl.textContent = '0/0';
    }

    function handleReaderSearchInput(val) {
      // User is actively editing the search query -> reset to match 0 and jump to first match
      performReaderSearch(val, true, 0);
    }

    function handleReaderSearchKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) jumpReaderSearchMatch(-1);
        else jumpReaderSearchMatch(1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeReaderSearchBar();
      }
    }

    function performReaderSearch(query, shouldScroll = true, targetIndex = 0) {
      const q = (query || '').trim();
      clearReaderSearchMarksOnly();
      if (!q) {
        currentReaderSearchQuery = '';
        activeReaderSearchIndex = -1;
        const countEl = document.getElementById('readerSearchCount');
        if (countEl) countEl.textContent = '0/0';
        return;
      }

      currentReaderSearchQuery = q;
      const container = document.getElementById('readerBody');
      if (!container) return;

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      let node;
      const textNodes = [];
      while ((node = walker.nextNode())) {
        if (node.parentElement && (node.parentElement.tagName === 'SCRIPT' || node.parentElement.tagName === 'STYLE')) continue;
        textNodes.push(node);
      }

      const qLower = q.toLowerCase();
      const matchElements = [];

      for (const tNode of textNodes) {
        let text = tNode.nodeValue || '';
        let lower = text.toLowerCase();
        let idx = lower.indexOf(qLower);
        if (idx === -1) continue;

        let currentNode = tNode;
        while (idx !== -1) {
          const matchText = (currentNode.nodeValue || '').substring(idx, idx + q.length);
          const after = (currentNode.nodeValue || '').substring(idx + q.length);

          const mark = document.createElement('mark');
          mark.className = 'reader-search-match';
          mark.textContent = matchText;

          currentNode.nodeValue = (currentNode.nodeValue || '').substring(0, idx);
          const afterNode = document.createTextNode(after);

          const parent = currentNode.parentNode;
          if (parent) {
            parent.insertBefore(mark, currentNode.nextSibling);
            parent.insertBefore(afterNode, mark.nextSibling);
          }

          matchElements.push(mark);

          currentNode = afterNode;
          lower = (currentNode.nodeValue || '').toLowerCase();
          idx = lower.indexOf(qLower);
        }
      }

      readerSearchMatches = matchElements;
      if (readerSearchMatches.length > 0) {
        activeReaderSearchIndex = Math.max(0, Math.min(targetIndex, readerSearchMatches.length - 1));
        updateActiveReaderSearchMatch(shouldScroll);
      } else {
        activeReaderSearchIndex = -1;
        const countEl = document.getElementById('readerSearchCount');
        if (countEl) countEl.textContent = '0/0';
      }
    }

    function jumpReaderSearchMatch(delta) {
      if (readerSearchMatches.length === 0) return;
      activeReaderSearchIndex = (activeReaderSearchIndex + delta + readerSearchMatches.length) % readerSearchMatches.length;
      updateActiveReaderSearchMatch(true);
    }

    function updateActiveReaderSearchMatch(shouldScroll = true) {
      readerSearchMatches.forEach((m, idx) => {
        if (idx === activeReaderSearchIndex) m.classList.add('active-match');
        else m.classList.remove('active-match');
      });

      const countEl = document.getElementById('readerSearchCount');
      if (countEl) {
        countEl.textContent = readerSearchMatches.length > 0 ? ((activeReaderSearchIndex + 1) + '/' + readerSearchMatches.length) : '0/0';
      }

      if (shouldScroll && readerSearchMatches.length > 0 && activeReaderSearchIndex >= 0) {
        const currentMark = readerSearchMatches[activeReaderSearchIndex];
        if (currentMark) {
          currentMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

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
  try { (window as any).nodeToMd = nodeToMd; } catch (e) {}
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
  try { (window as any).toggleReaderSearchBar = toggleReaderSearchBar; } catch (e) {}
  try { (window as any).openReaderSearchBar = openReaderSearchBar; } catch (e) {}
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
  try { (window as any).handleInitialSetup = handleInitialSetup; } catch (e) {}
  try { (window as any).handleUpdateSecurityTokens = handleUpdateSecurityTokens; } catch (e) {}
  try { (window as any).togglePasswordVisibility = togglePasswordVisibility; } catch (e) {}
  try { (window as any).checkSetupStatus = checkSetupStatus; } catch (e) {}
  try { (window as any).saveArticlesToOfflineDb = saveArticlesToOfflineDb; } catch (e) {}
  try { (window as any).getArticlesFromOfflineDb = getArticlesFromOfflineDb; } catch (e) {}
  try { (window as any).initPullToRefresh = initPullToRefresh; } catch (e) {}
  try { (window as any).initRefocusRefresh = initRefocusRefresh; } catch (e) {}
  try { (window as any).getAppWebVersion = getAppWebVersion; } catch (e) {}
  try { (window as any).compareSemVer = compareSemVer; } catch (e) {}
  try { (window as any).checkCapacitorOtaFromVersion = checkCapacitorOtaFromVersion; } catch (e) {}
  try { (window as any).showOtaRestartBanner = showOtaRestartBanner; } catch (e) {}
  try { (window as any).initCapacitorOtaUpdater = initCapacitorOtaUpdater; } catch (e) {}
  try { (window as any).updateVersionDisplay = updateVersionDisplay; } catch (e) {}
  try { (window as any).initReaderHoverTopBar = initReaderHoverTopBar; } catch (e) {}
  try { (window as any).initSelectionDeselectListener = initSelectionDeselectListener; } catch (e) {}
  try { (window as any).initInfiniteScroll = initInfiniteScroll; } catch (e) {}
}





if (typeof window !== "undefined") {
  const w = window as any;
  w.syncAddTextTagChips = syncAddTextTagChips;
  w.setReaderFont = setReaderFont;

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
  } catch (e) {}
}

function syncAddTextTagChips() {
  const raw = ((document.getElementById('addTextTagsInput') as HTMLInputElement)?.value || '').trim();
  addTextCustomTags = raw ? raw.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  renderAddTextTagChips();
}



if (typeof window !== "undefined") {
  const w = window as any;
  w.syncAddTextTagChips = syncAddTextTagChips;
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
  } catch (e) {}
}
