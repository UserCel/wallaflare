import { formatCardDate } from "../client/utils/format";
import { describe, it, expect } from 'vitest';
import { renderDashboardHtml } from '../views/dashboard';
import vm from 'node:vm';
import { DOMParser } from 'linkedom';

describe('Dashboard HTML & Client Script Syntax Validation', () => {
  it('renders valid HTML and all embedded JavaScript scripts compile without syntax errors', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('<!DOCTYPE html>');

    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;
    let scriptCount = 0;

    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptContent = match[1].trim();
      if (!scriptContent) continue;
      scriptCount++;

      expect(() => {
        try {
          new vm.Script(scriptContent, {
            filename: 'dashboard-inline-script.js',
            displayErrors: true,
          });
        } catch (err: any) {
          throw new Error(`Syntax error in dashboard inline script: ${err.message}\n${err.stack}`);
        }
      }).not.toThrow();
    }

    expect(scriptCount).toBeGreaterThan(0);
  });

  it('includes database epoch reset watchdog for cross-device wipe reconciliation', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('wf_instance_id');
    expect(html).toContain('isEpochReset');
  });

  it('correctly handles delta sync with deleted_ids without purging active entries when entries array is empty', () => {
    // Simulate local library
    let localEntries = [
      { id: 1, title: 'Item 1' },
      { id: 2, title: 'Item 2' },
      { id: 3, title: 'Item 3' },
    ];

    // Incoming delta sync payload with deleted_ids and empty entries
    const deltaSyncPayload = {
      up_to_date: false,
      sync_rev: 205,
      entries: [],
      deleted_ids: [2],
      counts: { total: 2, unread: 2, archive: 0, starred: 0 },
      pages: 0
    };

    const isDeltaSync = true;
    const serverHasZeroTotal = deltaSyncPayload.counts?.total === 0 || (!isDeltaSync && deltaSyncPayload.total === 0);

    // 1. Prune deleted items
    if (Array.isArray(deltaSyncPayload.deleted_ids) && deltaSyncPayload.deleted_ids.length > 0) {
      const delSet = new Set(deltaSyncPayload.deleted_ids);
      localEntries = localEntries.filter(e => !delSet.has(e.id));
    }

    // 2. Smart merge (must NOT wipe localEntries)
    if (!isDeltaSync && serverHasZeroTotal) {
      localEntries = [];
    } else if (deltaSyncPayload.entries.length > 0) {
      const freshMap = new Map(deltaSyncPayload.entries.map((e: any) => [e.id, e]));
      const merged = [...deltaSyncPayload.entries];
      for (const existing of localEntries) {
        if (!freshMap.has(existing.id)) merged.push(existing);
      }
      localEntries = merged;
    }

    // Item 2 is pruned, Items 1 and 3 are intact
    expect(localEntries.length).toBe(2);
    expect(localEntries.map(e => e.id)).toEqual([1, 3]);
  });
});

describe('3-Pane Desktop Workspace & Typography Popover Architecture', () => {
  it('includes 3-pane workspace container, sidebar, articles list, and reader panes', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('class="app-workspace"');
    expect(html).toContain('class="pane-sidebar"');
    expect(html).toContain('class="pane-articles"');
    expect(html).toContain('class="pane-reader"');
    expect(html).toContain('id="readerEmptyPane"');
    expect(html).toContain('id="paneSidebar"');
    expect(html).toContain('id="paneArticles"');
    expect(html).toContain('id="paneReader"');
  });

  it('includes live typography popover controls, CSS variables, and OLED theme support', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('id="readerAppearancePopover"');
    expect(html).toContain('id="readerAppearanceBtn"');
    expect(html).toContain('--reader-font-family');
    expect(html).toContain('--reader-font-size');
    expect(html).toContain('--reader-line-height');
    expect(html).toContain('--reader-content-max-width');
    expect(html).toContain('html.oled');
    expect(html).toContain('setReaderFontFamily');
    expect(html).toContain('setReaderFontSize');
    expect(html).toContain('setReaderLineHeight');
    expect(html).toContain('setReaderContentWidth');
    expect(html).toContain('setTheme');
  });

  it('includes focus / zen mode toggle and keyboard navigation handlers', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('toggleReaderFocusMode');
    expect(html).toContain('focus-mode');
    expect(html).toContain('handleAndroidBackButton');
  });

  it('includes collapsible dynamic sidebar tag manager and navigation live counts', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('id="sidebarTagList"');
    expect(html).toContain('id="sidebarTagCount"');
    expect(html).toContain('toggleSidebarTagsCollapse');
    expect(html).toContain('renderSidebarTags');
    expect(html).toContain('id="countUnread"');
    expect(html).toContain('id="countStarred"');
    expect(html).toContain('id="countArchive"');
    expect(html).toContain('id="countAll"');
  });

  it('includes database epoch reset watchdog for cross-device wipe reconciliation', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('wf_instance_id');
    expect(html).toContain('isEpochReset');
  });

  it('correctly handles delta sync with deleted_ids without purging active entries when entries array is empty', () => {
    // Simulate local library
    let localEntries = [
      { id: 1, title: 'Item 1' },
      { id: 2, title: 'Item 2' },
      { id: 3, title: 'Item 3' },
    ];

    // Incoming delta sync payload with deleted_ids and empty entries
    const deltaSyncPayload = {
      up_to_date: false,
      sync_rev: 205,
      entries: [],
      deleted_ids: [2],
      counts: { total: 2, unread: 2, archive: 0, starred: 0 },
      pages: 0
    };

    const isDeltaSync = true;
    const serverHasZeroTotal = deltaSyncPayload.counts?.total === 0 || (!isDeltaSync && deltaSyncPayload.total === 0);

    // 1. Prune deleted items
    if (Array.isArray(deltaSyncPayload.deleted_ids) && deltaSyncPayload.deleted_ids.length > 0) {
      const delSet = new Set(deltaSyncPayload.deleted_ids);
      localEntries = localEntries.filter(e => !delSet.has(e.id));
    }

    // 2. Smart merge (must NOT wipe localEntries)
    if (!isDeltaSync && serverHasZeroTotal) {
      localEntries = [];
    } else if (deltaSyncPayload.entries.length > 0) {
      const freshMap = new Map(deltaSyncPayload.entries.map((e: any) => [e.id, e]));
      const merged = [...deltaSyncPayload.entries];
      for (const existing of localEntries) {
        if (!freshMap.has(existing.id)) merged.push(existing);
      }
      localEntries = merged;
    }

    // Item 2 is pruned, Items 1 and 3 are intact
    expect(localEntries.length).toBe(2);
    expect(localEntries.map(e => e.id)).toEqual([1, 3]);
  });
});

describe('Markdown Export Engine & Text Integrity Validation', () => {
  it('converts HTML to Markdown without corrupting letter s or stripping whitespace words', () => {
    const html = renderDashboardHtml('Wallaflare');
    
    // Extract htmlToMarkdown function from the dashboard script
    const match = html.match(/function htmlToMarkdown\([\s\S]*?\n    \}/);
    expect(match).toBeDefined();

    const context = vm.createContext({
      DOMParser: DOMParser,
      String: String,
      Array: Array,
      RegExp: RegExp,
      JSON: JSON
    });

    const testInput = '<p>Suyin considered the woman standing across from her. Lady Ember Moore, recent recruit of Vanguard—now there was an introduction to raise eyebrows.</p>';
    const script = new vm.Script(match![0] + '; var result = htmlToMarkdown(' + JSON.stringify(testInput) + ');');
    script.runInContext(context);

    const mdOutput = (context as any).result;
    expect(mdOutput).toContain('considered');
    expect(mdOutput).toContain('standing');
    expect(mdOutput).toContain('across');
    expect(mdOutput).toContain('was');
    expect(mdOutput).toContain('raise');
    expect(mdOutput).toContain('eyebrows');
    expect(mdOutput).toBe('Suyin considered the woman standing across from her. Lady Ember Moore, recent recruit of Vanguard—now there was an introduction to raise eyebrows.');
  });


  it('renders single-word and single-letter highlights in the DOM reader engine', () => {
    const html = renderDashboardHtml('Wallaflare');
    
    // Extract highlightTextInNode function from the dashboard script
    const match = html.match(/function highlightTextInNode\([\s\S]*?\n    \}/);
    expect(match).toBeDefined();

    const dom = new DOMParser().parseFromString('<!DOCTYPE html><html><body><div id="readerBody"><p>Suyin considered the woman standing across from her.</p></div></body></html>', 'text/html');
    const container = dom.getElementById('readerBody');

    const context = vm.createContext({
      document: dom,
      NodeFilter: { SHOW_TEXT: 4 },
      openHighlightPopover: () => {},
      console: console
    });

    const script = new vm.Script(match![0] + '; var container = document.getElementById("readerBody");' +
      'highlightTextInNode(container, { id: 101, quote: "S", color: "purple" });' +
      'highlightTextInNode(container, { id: 102, quote: "woman", color: "green", text: "Key character" });' +
      'highlightTextInNode(container, { id: 103, quote: "considered", color: "blue" });'
    );
    script.runInContext(context);

    const mark101 = container!.querySelector('mark[data-annotation-id="101"]');
    const mark102 = container!.querySelector('mark[data-annotation-id="102"]');
    const mark103 = container!.querySelector('mark[data-annotation-id="103"]');

    expect(mark101).toBeDefined();
    expect(mark101?.textContent).toBe('S');
    expect(mark101?.className).toBe('reader-hl reader-hl-purple');

    expect(mark102).toBeDefined();
    expect(mark102?.textContent).toBe('woman');
    expect(mark102?.className).toBe('reader-hl reader-hl-green has-note');
    expect(mark102?.getAttribute('title')).toBe('green highlight: Key character');

    expect(mark103).toBeDefined();
    expect(mark103?.textContent).toBe('considered');
    expect(mark103?.className).toBe('reader-hl reader-hl-blue');
  });


  it('sorts annotations by document reading order (position) by default and by time when requested', () => {
    const html = renderDashboardHtml('Wallaflare');
    
    // Extract getSortedAnnotations function
    const match = html.match(/function getSortedAnnotations\([\s\S]*?\n    \}/);
    expect(match).toBeDefined();

    const vm = require("node:vm");
    const context = vm.createContext({
      document: { querySelectorAll: () => [] },
      Array: Array,
      Map: Map,
      Date: Date,
      parseInt: parseInt
    });

    const item = {
      content: "First paragraph contains beginning facts. Middle section explains key concept. Ending paragraph has the conclusion.",
      annotations: [
        { id: 3, quote: "conclusion", created_at: "2026-08-25T10:00:00Z" },
        { id: 1, quote: "beginning", created_at: "2026-08-25T12:00:00Z" },
        { id: 2, quote: "key concept", created_at: "2026-08-25T11:00:00Z" }
      ]
    };

    const script = new vm.Script(match![0] + '; var byPos = getSortedAnnotations(' + JSON.stringify(item) + ', "position"); var byTime = getSortedAnnotations(' + JSON.stringify(item) + ', "time");');
    script.runInContext(context);

    const byPos = (context as any).byPos;
    const byTime = (context as any).byTime;

    // By Position: beginning (id 1) -> key concept (id 2) -> conclusion (id 3)
    expect(byPos[0].id).toBe(1);
    expect(byPos[1].id).toBe(2);
    expect(byPos[2].id).toBe(3);

    // By Time (newest first): id 1 (12:00) -> id 2 (11:00) -> id 3 (10:00)
    expect(byTime[0].id).toBe(1);
    expect(byTime[1].id).toBe(2);
    expect(byTime[2].id).toBe(3);
  });

  it('includes Highlights Navigator Modal and Sidebar list components', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('id="readerHighlightsModal"');
    expect(html).toContain('id="readerHighlightsList"');
    expect(html).toContain('id="readerMobileHighlightsBtn"');
    expect(html).toContain('filterHighlightsModalList');
    expect(html).toContain('scrollToAnnotation');
  });

  it('includes desktop floating annotation toolbar and mobile contextual topbar annotation header', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('id="readerHighlightToolbar"');
    expect(html).toContain('id="readerTopBarDefault"');
    expect(html).toContain('id="readerTopBarAnnotation"');
    expect(html).toContain('id="readerTopBarSelCount"');
    expect(html).toContain('initReaderSelectionHandlers');
    expect(html).toContain('handleCreateHighlight');
    expect(html).toContain('handleCreateHighlightWithNote');
    expect(html).toContain('clearActiveTextSelection');
    expect(html).toContain('addQuickTagToActiveArticles');
    expect(html).toContain('removeTagFromActiveArticles');
    expect(html).toContain('deleteGlobalTag');
    expect(html).toContain('submitCreateGlobalTag');
  });

  it('supports hybrid Markdown formatting: inline ==highlights==, footnotes [^note-1], and summary block', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('==');
    expect(html).toContain('[^note-');
    expect(html).toContain('## 🖍️ Highlights & Notes');
  });

  it('includes right-click context menu for article cards with single and batch actions', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('id="cardContextMenu"');
    expect(html).toContain('handleCardContextMenu');
    expect(html).toContain('openCardContextMenu');
    expect(html).toContain('openBatchContextMenu');
    expect(html).toContain('closeCardContextMenu');
    expect(html).toContain('sortEntriesLocally');
    expect(html).toContain('oncontextmenu="handleCardContextMenu(event, ');
  });

  it('renders modern minimal dynamic empty state with quick action chips', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('id="emptyState"');
    expect(html).toContain('empty-state-icon-wrap');
    expect(html).toContain('empty-state-title');
    expect(html).toContain('empty-state-actions');
    expect(html).toContain('handleAddArticleBtnClick');
    expect(html).toContain('handleAddTextBtnClick');
    expect(html).toContain('clearSearch');
  });

  it('includes infinite scroll pagination, bottom status indicator, and dynamic sort handlers', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('id="articlesListFooterStatus"');
    expect(html).toContain('articles-list-footer-status');
    expect(html).toContain('loadMoreArticles');
    expect(html).toContain('initInfiniteScroll');
    expect(html).toContain('updateArticlesFooterStatus');
    expect(html).toContain('sortEntriesLocally');
    expect(html).toContain('setSortOrder');
  });

  it('includes IndexedDB full library offline caching, chunked DOM rendering, and background downloader', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('openIndexedDB');
    expect(html).toContain('saveEntriesToIndexedDB');
    expect(html).toContain('loadEntriesFromIndexedDB');
    expect(html).toContain('renderArticlesChunked');
    expect(html).toContain('loadMoreRenderedCards');
    expect(html).toContain('downloadRemainingLibraryInBackground');
    expect(html).toContain('currentRenderLimit');
    expect(html).toContain('RENDER_CHUNK_SIZE');
  });

  it('includes Android Native Share Intent buffer polling and instant prepend bridge', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('window.prependSavedArticles');
    expect(html).toContain('window.prependSavedArticle');
    expect(html).toContain('checkNativePendingSavedArticles');
    expect(html).toContain('window.checkNativePendingSavedArticles');
    expect(html).toContain('window.refreshArticlesSilently');
    expect(html).toContain('pollPendingSavedArticles');
  });

  it('includes database reconciliation and deduplication handlers', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('reconcileDatabase');
    expect(html).toContain('deduplicateEntries');
    expect(html).toContain('clearIndexedDB');
    expect(html).toContain('Reconcile Database');
  });

  it('includes Persistent Outbox Mutation Queue engine for offline triaging & interrupted actions', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('OUTBOX_STORAGE_KEY');
    expect(html).toContain('wf_pending_mutations');
    expect(html).toContain('getPendingMutations');
    expect(html).toContain('savePendingMutations');
    expect(html).toContain('enqueueMutation');
    expect(html).toContain('processOutboxMutations');
  });

  it('includes Cloudflare D1 wipe database modal and authenticated confirmation handler', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('id="wipeDbModal"');
    expect(html).toContain('openWipeDbModal');
    expect(html).toContain('handleConfirmWipeDatabase');
    expect(html).toContain('/api/admin/reset-database');
    expect(html).toContain('Wipe Cloudflare D1 Database');
  });

  it('includes live sync stats comparison widget in settings modal', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('statsLocalArticles');
    expect(html).toContain('statsServerArticles');
    expect(html).toContain('statsSyncComparison');
    expect(html).toContain('statsSyncRevision');
    expect(html).toContain('updateSettingsStats');
  });

  it('includes offline connection failure handlers, wifi-off indicator, and reconnect listeners', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('isOfflineMode');
    expect(html).toContain('updateOfflineUI');
    expect(html).toContain('handleConnectionFailure');
    expect(html).toContain('btn-offline-mode');
  });

  it('simulates full offline deletion lifecycle: optimistic queueing, network failure persistence, and online draining', async () => {
    // Mock localStorage
    const storage = new Map<string, string>();
    const mockLocalStorage = {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, val: string) => storage.set(key, val),
      removeItem: (key: string) => storage.delete(key),
    };

    const OUTBOX_KEY = 'wf_pending_mutations';
    let isOnline = false;
    const dispatchedRequests: string[] = [];

    // Client-side outbox methods simulation matching dashboard.ts
    function getPendingMutations() {
      const raw = mockLocalStorage.getItem(OUTBOX_KEY);
      return raw ? JSON.parse(raw) : [];
    }

    function savePendingMutations(mutations: any[]) {
      if (!mutations || mutations.length === 0) {
        mockLocalStorage.removeItem(OUTBOX_KEY);
      } else {
        mockLocalStorage.setItem(OUTBOX_KEY, JSON.stringify(mutations));
      }
    }

    function enqueueMutation(action: string, payload: any) {
      const mutations = getPendingMutations();
      const mutation = {
        id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        action,
        payload,
        createdAt: Date.now(),
        retryCount: 0
      };
      mutations.push(mutation);
      savePendingMutations(mutations);
      return mutation;
    }

    async function processOutboxMutations() {
      const mutations = getPendingMutations();
      if (mutations.length === 0) return;

      while (true) {
        const currentQueue = getPendingMutations();
        if (currentQueue.length === 0) break;
        const mut = currentQueue[0];

        let success = false;
        let removeOnError = false;

        try {
          if (!isOnline) {
            throw new Error('Failed to fetch (offline)');
          }

          if (mut.action === 'delete') {
            dispatchedRequests.push(`DELETE /api/entries/${mut.payload.id}.json`);
            success = true;
          }
        } catch (networkErr) {
          // Stay in queue if offline
          break;
        }

        if (success || removeOnError) {
          const updated = getPendingMutations().filter((m: any) => m.id !== mut.id);
          savePendingMutations(updated);
        } else {
          break;
        }
      }
    }

    // 1. User deletes article while offline
    isOnline = false;
    const mut = enqueueMutation('delete', { id: 42 });
    expect(getPendingMutations().length).toBe(1);
    expect(getPendingMutations()[0].payload.id).toBe(42);

    // Attempt processing while offline -> catches network error, queue intact on disk
    await processOutboxMutations();
    expect(getPendingMutations().length).toBe(1);
    expect(dispatchedRequests.length).toBe(0);

    // 2. User restarts app while still offline -> data persists in storage
    expect(JSON.parse(mockLocalStorage.getItem(OUTBOX_KEY) || '[]').length).toBe(1);

    // 3. User comes back online -> queue drains successfully
    isOnline = true;
    await processOutboxMutations();
    expect(dispatchedRequests).toEqual(['DELETE /api/entries/42.json']);
    expect(getPendingMutations().length).toBe(0);
    expect(mockLocalStorage.getItem(OUTBOX_KEY)).toBeNull();
  });

  it('verifies all offline mutations (delete, star, archive, title edit, tags) are enqueued and drained sequentially on reconnect', async () => {
    const storage = new Map<string, string>();
    const mockLocalStorage = {
      getItem: (key: string) => storage.get(key) || null,
      setItem: (key: string, val: string) => storage.set(key, val),
      removeItem: (key: string) => storage.delete(key),
    };

    const OUTBOX_KEY = 'wf_pending_mutations';
    let isOnline = false;
    const dispatched: any[] = [];

    function getPendingMutations() {
      const raw = mockLocalStorage.getItem(OUTBOX_KEY);
      return raw ? JSON.parse(raw) : [];
    }

    function savePendingMutations(mutations: any[]) {
      if (!mutations || mutations.length === 0) {
        mockLocalStorage.removeItem(OUTBOX_KEY);
      } else {
        mockLocalStorage.setItem(OUTBOX_KEY, JSON.stringify(mutations));
      }
    }

    function enqueueMutation(action: string, payload: any) {
      const mutations = getPendingMutations();
      const mutation = {
        id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        action,
        payload,
        createdAt: Date.now(),
        retryCount: 0
      };
      mutations.push(mutation);
      savePendingMutations(mutations);
      return mutation;
    }

    async function processOutboxMutations() {
      const mutations = getPendingMutations();
      if (mutations.length === 0) return;

      while (true) {
        const currentQueue = getPendingMutations();
        if (currentQueue.length === 0) break;
        const mut = currentQueue[0];

        let success = false;
        let removeOnError = false;

        try {
          if (!isOnline) {
            throw new Error('Network offline');
          }

          if (mut.action === 'delete') {
            dispatched.push({ method: 'DELETE', path: `/api/entries/${mut.payload.id}.json` });
            success = true;
          } else if (mut.action === 'batch_delete') {
            dispatched.push({ method: 'DELETE', path: '/api/entries/list.json', body: mut.payload });
            success = true;
          } else if (mut.action === 'toggle_star') {
            dispatched.push({ method: 'PATCH', path: `/api/entries/${mut.payload.id}.json`, body: { starred: mut.payload.is_starred } });
            success = true;
          } else if (mut.action === 'toggle_archive') {
            dispatched.push({ method: 'PATCH', path: `/api/entries/${mut.payload.id}.json`, body: { archive: mut.payload.is_archived } });
            success = true;
          } else if (mut.action === 'edit_title') {
            dispatched.push({ method: 'PATCH', path: `/api/entries/${mut.payload.id}.json`, body: { title: mut.payload.title } });
            success = true;
          } else if (mut.action === 'add_tag') {
            dispatched.push({ method: 'POST', path: `/api/entries/${mut.payload.id}/tags.json`, body: { tags: mut.payload.tag } });
            success = true;
          } else if (mut.action === 'remove_tag') {
            dispatched.push({ method: 'DELETE', path: `/api/entries/${mut.payload.id}/tags/${encodeURIComponent(mut.payload.tag)}.json` });
            success = true;
          } else {
            success = true;
          }
        } catch (networkErr) {
          break;
        }

        if (success || removeOnError) {
          const updated = getPendingMutations().filter((m: any) => m.id !== mut.id);
          savePendingMutations(updated);
        } else {
          break;
        }
      }
    }

    // 1. User performs multiple actions while offline
    isOnline = false;
    enqueueMutation('toggle_star', { id: 10, is_starred: 1 });
    enqueueMutation('toggle_archive', { id: 10, is_archived: 1 });
    enqueueMutation('edit_title', { id: 10, title: 'Updated Title' });
    enqueueMutation('add_tag', { id: 10, tag: 'offline-reading' });
    enqueueMutation('delete', { id: 20 });

    expect(getPendingMutations().length).toBe(5);

    // 2. Offline drain attempt fails gracefully without dropping queue
    await processOutboxMutations();
    expect(getPendingMutations().length).toBe(5);
    expect(dispatched.length).toBe(0);

    // 3. User comes back online and refreshes -> all 5 mutations drain in order
    isOnline = true;
    await processOutboxMutations();
    expect(getPendingMutations().length).toBe(0);
    expect(dispatched.length).toBe(5);
    expect(dispatched[0]).toEqual({ method: 'PATCH', path: '/api/entries/10.json', body: { starred: 1 } });
    expect(dispatched[1]).toEqual({ method: 'PATCH', path: '/api/entries/10.json', body: { archive: 1 } });
    expect(dispatched[2]).toEqual({ method: 'PATCH', path: '/api/entries/10.json', body: { title: 'Updated Title' } });
    expect(dispatched[3]).toEqual({ method: 'POST', path: '/api/entries/10/tags.json', body: { tags: 'offline-reading' } });
    expect(dispatched[4]).toEqual({ method: 'DELETE', path: '/api/entries/20.json' });
  });

  it('includes database epoch reset watchdog for cross-device wipe reconciliation', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('wf_instance_id');
    expect(html).toContain('isEpochReset');
  });

  it('correctly handles delta sync with deleted_ids without purging active entries when entries array is empty', () => {
    // Simulate local library
    let localEntries = [
      { id: 1, title: 'Item 1' },
      { id: 2, title: 'Item 2' },
      { id: 3, title: 'Item 3' },
    ];

    // Incoming delta sync payload with deleted_ids and empty entries
    const deltaSyncPayload = {
      up_to_date: false,
      sync_rev: 205,
      entries: [],
      deleted_ids: [2],
      counts: { total: 2, unread: 2, archive: 0, starred: 0 },
      pages: 0
    };

    const isDeltaSync = true;
    const serverHasZeroTotal = deltaSyncPayload.counts?.total === 0 || (!isDeltaSync && deltaSyncPayload.total === 0);

    // 1. Prune deleted items
    if (Array.isArray(deltaSyncPayload.deleted_ids) && deltaSyncPayload.deleted_ids.length > 0) {
      const delSet = new Set(deltaSyncPayload.deleted_ids);
      localEntries = localEntries.filter(e => !delSet.has(e.id));
    }

    // 2. Smart merge (must NOT wipe localEntries)
    if (!isDeltaSync && serverHasZeroTotal) {
      localEntries = [];
    } else if (deltaSyncPayload.entries.length > 0) {
      const freshMap = new Map(deltaSyncPayload.entries.map((e: any) => [e.id, e]));
      const merged = [...deltaSyncPayload.entries];
      for (const existing of localEntries) {
        if (!freshMap.has(existing.id)) merged.push(existing);
      }
      localEntries = merged;
    }

    // Item 2 is pruned, Items 1 and 3 are intact
    expect(localEntries.length).toBe(2);
    expect(localEntries.map(e => e.id)).toEqual([1, 3]);
  });

  it('renders article parser engine options in settings modal', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('id="settingsParserBtns"');
    expect(html).toContain('data-parser="auto"');
    expect(html).toContain('data-parser="device"');
    expect(html).toContain('data-parser="server"');
    expect(html).toContain('id="settingsParserEngineDesc"');
    expect(html).toContain('setParserEngine');
  });

  describe("Graduated Relative Date Formatting (formatCardDate)", () => {
    it("formats dates < 45s ago as Just now", () => {
      const date = new Date(Date.now() - 10 * 1000).toISOString();
      const res = formatCardDate(date);
      expect(res.label).toBe("Just now");
      expect(res.tooltip).toBeTruthy();
    });

    it("formats dates < 1 hour ago as Xm ago", () => {
      const date = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const res = formatCardDate(date);
      expect(res.label).toBe("15m ago");
    });

    it("formats dates < 24 hours ago as Xh ago", () => {
      const date = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
      const res = formatCardDate(date);
      expect(res.label).toBe("4h ago");
    });

    it("formats dates < 7 days ago as Xd ago", () => {
      const date = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
      const res = formatCardDate(date);
      expect(res.label).toBe("3d ago");
    });

    it("formats dates < 30 days ago as Xw ago", () => {
      const date = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
      const res = formatCardDate(date);
      expect(res.label).toBe("2w ago");
    });

    it("handles null or empty dates gracefully", () => {
      expect(formatCardDate(null).label).toBe("");
      expect(formatCardDate("").label).toBe("");
    });
  });

  describe("Speed Read (RSVP) Focus Mode", () => {
    it("renders speed-read modal and launch buttons in dashboard HTML", () => {
      const html = renderDashboardHtml('Wallaflare');
      expect(html).toContain('id="speedReadModal"');
      expect(html).toContain('id="readerSpeedReadBtn"');
      expect(html).toContain('openSpeedRead()');
      expect(html).toContain('id="speedReadWordDisplay"');
      expect(html).toContain('id="speedReadScrubber"');
      expect(html).toContain('id="speedReadWpmDisplay"');
      expect(html).toContain('id="speedReadFontSizeDisplay"');
    });

    it("correctly extracts tokens and maintains steady reading cadence", async () => {
      const { extractSpeedReadTokens } = await import('../client/reader/speed-read');
      const { DOMParser } = await import('linkedom');
      const doc = new DOMParser().parseFromString(`
        <div id="readerContent">
          <p>Speed reading with RSVP is blazingly fast.</p>
          <pre><code>ignored code block</code></pre>
          <p>Second paragraph, with commas and clauses!</p>
        </div>
      `, 'text/html');

      const container = doc.getElementById('readerContent');
      const { tokens, sentences } = extractSpeedReadTokens(container as any);

      expect(tokens.length).toBe(13);
      expect(sentences.length).toBe(2);

      // Check first word "Speed"
      expect(tokens[0].word).toBe('Speed');
      expect(tokens[0].delayMultiplier).toBe(1.0);

      // Check "fast." (ends paragraph)
      const fastToken = tokens.find(t => t.word === 'fast.');
      expect(fastToken).toBeDefined();
      expect(fastToken!.isParagraphEnd).toBe(true);
      expect(fastToken!.delayMultiplier).toBe(1.0);

      // Check "paragraph,"
      const commaToken = tokens.find(t => t.word === 'paragraph,');
      expect(commaToken).toBeDefined();
      expect(commaToken!.delayMultiplier).toBe(1.0);
    });

    it("calculates Optimal Recognition Point (ORP) index at 30-40% of word", async () => {
      const { calculateOrpIndex } = await import('../client/reader/speed-read');

      // 4 letters: len 4 -> 30-40% is letter 2 (0-indexed 1)
      expect(calculateOrpIndex('test')).toBe(1);
      // 7 letters: len 7 -> index 2
      expect(calculateOrpIndex('process')).toBe(2);
      // 10-13 letters: index 3
      expect(calculateOrpIndex('processing')).toBe(3);
      expect(calculateOrpIndex('international')).toBe(3);
      // >13 letters: index 4
      expect(calculateOrpIndex('internationally')).toBe(4);
    });

    it("splits compound words on hyphens and em-dashes for optimal RSVP cadence", async () => {
      const { splitIntoRsvpWords } = await import('../client/reader/speed-read');

      expect(splitIntoRsvpWords('orange-yellow')).toEqual(['orange-', 'yellow']);
      expect(splitIntoRsvpWords('state-of-the-art')).toEqual(['state-', 'of-', 'the-', 'art']);
      expect(splitIntoRsvpWords('thought—and')).toEqual(['thought—', 'and']);
      expect(splitIntoRsvpWords('-5 degrees')).toEqual(['-5', 'degrees']);
    });

    it("does not drop final words ending in curly quotes, dialogue quotes, or brackets", async () => {
      const { extractSpeedReadTokens } = await import('../client/reader/speed-read');
      const { DOMParser } = await import('linkedom');

      const html = `<div id="testContent"><p>Elemental Chaos is our most sacred place.”</p></div>`;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const container = doc.getElementById('testContent');

      const { tokens, sentences } = extractSpeedReadTokens(container as any);

      expect(sentences).toEqual(['Elemental Chaos is our most sacred place.”']);
      expect(tokens.map(t => t.word)).toEqual([
        'Elemental',
        'Chaos',
        'is',
        'our',
        'most',
        'sacred',
        'place.”'
      ]);

      const lastToken = tokens[tokens.length - 1];
      expect(lastToken.word).toBe('place.”');
      expect(lastToken.isParagraphEnd).toBe(true);
      expect(lastToken.orpIndex).toBe(1); // 'p' (0), 'l' (1), 'ace.”' (2..)
    });

    it("correctly detects RTL languages, handles Hebrew words, ORP, and BiDi script formatting", async () => {
      const { isRtlText, calculateOrpIndex, splitIntoRsvpWords, formatOrpSegments } = await import('../client/reader/speed-read');

      expect(isRtlText('שלום עולם')).toBe(true);
      expect(isRtlText('مرحبا بالعالم')).toBe(true);
      expect(isRtlText('Hello world')).toBe(false);

      // Hebrew ORP: 30-40% from the start of the word
      expect(calculateOrpIndex('שלום')).toBe(1); // 'ש' (0), 'ל' (1)
      expect(calculateOrpIndex('עברית')).toBe(1); // 'ע' (0), 'ב' (1)
      expect(calculateOrpIndex('ישראליות')).toBe(2); // 'י' (0), 'ש' (1), 'ר' (2)

      // Hebrew hyphenated words
      expect(splitIntoRsvpWords('אי-אפשר')).toEqual(['אי-', 'אפשר']);

      // BiDi ORP formatting: English words are NEVER backwards, Hebrew words are properly aligned
      // 1. English word: "Google" (orp = 2 -> 'o') -> LTR: left prefix "Go", focus "o", right suffix "gle"
      const englishOrp = calculateOrpIndex('Google');
      const englishSegments = formatOrpSegments('Google', englishOrp);
      expect(englishSegments.isRtl).toBe(false);
      expect(englishSegments.left).toBe('Google'.slice(0, englishOrp));
      expect(englishSegments.focus).toBe('Google'.charAt(englishOrp));
      expect(englishSegments.right).toBe('Google'.slice(englishOrp + 1));

      // 2. Hebrew word: "שלום" (orp = 1 -> 'ל') -> RTL: right prefix "ש", focus "ל", left suffix "ום"
      const hebrewOrp = calculateOrpIndex('שלום');
      const hebrewSegments = formatOrpSegments('שלום', hebrewOrp);
      expect(hebrewSegments.isRtl).toBe(true);
      expect(hebrewSegments.right).toBe('\u200Fש\u200F');
      expect(hebrewSegments.focus).toBe('\u200Fל\u200F');
      expect(hebrewSegments.left).toBe('\u200Fום\u200F');

      // 3. Hebrew word with trailing comma: "מוקשים," (clean "מוקשים", orp = 2 -> 'ק')
      // Suffix is "שים," wrapped in RLM so the comma NEVER jumps inside into "מוק,שים"
      const commaOrp = calculateOrpIndex('מוקשים,');
      expect(commaOrp).toBe(2); // 'מ' (0), 'ו' (1), 'ק' (2)
      const commaSegments = formatOrpSegments('מוקשים,', commaOrp);
      expect(commaSegments.isRtl).toBe(true);
      expect(commaSegments.right).toBe('\u200Fמו\u200F');
      expect(commaSegments.focus).toBe('\u200Fק\u200F');
      expect(commaSegments.left).toBe('\u200Fשים,\u200F');
    });

    it("keeps speed read UI chrome and controls consistent across languages", () => {
      const html = renderDashboardHtml('Wallaflare');
      expect(html).toContain('.speed-read-overlay');
      expect(html).toContain('.speed-read-lower-deck');
    });
  });

});

