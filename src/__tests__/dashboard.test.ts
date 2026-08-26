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

  it('includes right-click context menu for article cards with full actions', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('id="cardContextMenu"');
    expect(html).toContain('handleCardContextMenu');
    expect(html).toContain('openCardContextMenu');
    expect(html).toContain('closeCardContextMenu');
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
});
