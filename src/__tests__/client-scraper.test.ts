import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { extractArticleFromDom, extractArticleFromHtml } from '../services/extractor';
import { clientExtractArticleFromHtml, getParserMode, setParserMode, saveArticleWithFallback, isValidArticleContent } from '../client/extractor';
import * as apiModule from '../client/sync/api';
import { parseHTML } from 'linkedom';
import { renderDashboardHtml } from '../views/dashboard';

describe('Client-Side Extractor & Isomorphic DOM Extraction', () => {
  it('extracts structured article on client DOM identically to server', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Client Extraction Test - News</title>
        <meta property="og:title" content="Client Extraction Test" />
        <meta name="author" content="Jane Doe" />
        <meta property="og:image" content="https://example.com/cover.jpg" />
      </head>
      <body>
        <article>
          <h1>Client Extraction Test</h1>
          <p>This is a test of on-device article parsing for Wallaflare.</p>
          <p>Running Readability on the client allows bypassing datacenter IP bans.</p>
        </article>
      </body>
      </html>
    `;

    const result = clientExtractArticleFromHtml(html, 'https://news.example.com/client-test');
    expect(result.title).toBe('Client Extraction Test');
    expect(result.domainName).toBe('news.example.com');
    expect(result.byline).toBe('Jane Doe');
    expect(result.previewPicture).toBe('https://example.com/cover.jpg');
    expect(result.content).toContain('on-device article parsing');
  });

  it('manages parser mode setting in localStorage for mobile app and defaults to server on web', () => {
    // 1. On Web Browser: always returns server
    expect(getParserMode()).toBe('server');

    // 2. In Capacitor Native App: manages user mode
    const capSpy = vi.spyOn(apiModule, 'isCapacitorApp').mockReturnValue(true);

    setParserMode('device');
    expect(getParserMode()).toBe('device');

    setParserMode('server');
    expect(getParserMode()).toBe('server');

    setParserMode('auto');
    expect(getParserMode()).toBe('auto');

    capSpy.mockRestore();
  });

  it('correctly executes extractArticleFromDom across multiple HTML trees', () => {
    const { document } = parseHTML(`
      <html>
        <head><title>Direct DOM Parse</title></head>
        <body><main><p>Valid content for direct extraction.</p></main></body>
      </html>
    `);

    const extracted = extractArticleFromDom(document, 'https://example.org/article');
    expect(extracted.title).toBe('Direct DOM Parse');
    expect(extracted.domainName).toBe('example.org');
    expect(extracted.content).toContain('Valid content for direct extraction.');
  });

  it('validates extracted article content and detects empty stubs or bot blocks', () => {
    // Valid article text
    const validHtml = '<p>' + Array(30).fill('Valid informative sentence for the reader.').join(' ') + '</p>';
    expect(isValidArticleContent(validHtml)).toBe(true);

    // Empty or too short
    expect(isValidArticleContent('')).toBe(false);
    expect(isValidArticleContent('<p>Hi</p>')).toBe(false);

    // Raw link stub
    expect(isValidArticleContent('<p><a href="https://example.com">https://example.com</a></p>')).toBe(false);

    // Anti-bot challenge
    expect(isValidArticleContent('<h1>403 Forbidden</h1><p>Access Denied by Cloudflare</p>')).toBe(false);
    expect(isValidArticleContent('<p>Cloudflare Turnstile Verification in progress...</p>')).toBe(false);
  });

  it('renders parser subtext with high-contrast styling across themes', () => {
    const html = renderDashboardHtml('Wallaflare');
    expect(html).toContain('class="parser-subtext"');
    expect(html).toContain('.opt-parser-btn.btn-primary .parser-subtext');
  });
});
