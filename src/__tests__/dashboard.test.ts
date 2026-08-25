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

  it('supports hybrid Markdown formatting: inline ==highlights==, footnotes [^note-1], and summary block', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('==');
    expect(html).toContain('[^note-');
    expect(html).toContain('## 🖍️ Highlights & Notes');
  });
});
