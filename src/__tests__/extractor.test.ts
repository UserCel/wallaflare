import { describe, it, expect } from 'vitest';
import { extractArticleFromHtml, calculateReadingTime, extractDomain } from '../services/extractor';

describe('Article Extractor Service', () => {
  it('calculates reading time correctly', () => {
    const shortText = 'Hello world, this is a short test article.';
    expect(calculateReadingTime(shortText)).toBe(1);

    // 400 words should be 2 minutes
    const longText = Array(400).fill('word').join(' ');
    expect(calculateReadingTime(longText)).toBe(2);
  });

  it('extracts domain correctly from URLs', () => {
    expect(extractDomain('https://www.example.com/posts/article-1')).toBe('example.com');
    expect(extractDomain('https://blog.cloudflare.com/workers-d1/')).toBe('blog.cloudflare.com');
    expect(extractDomain('invalid-url')).toBe('direct-input');
  });

  it('extracts article content from HTML using Readability and linkedom', () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Sample Blog Post - Tech Daily</title>
        <meta property="og:title" content="Sample Blog Post" />
        <meta property="og:description" content="A comprehensive guide to serverless SQLite." />
        <meta property="og:image" content="https://example.com/banner.png" />
      </head>
      <body>
        <nav><a href="/">Home</a></nav>
        <header><h1>Sample Blog Post</h1></header>
        <main>
          <article>
            <p>Cloudflare Workers paired with D1 SQLite provides instant response times and global distribution.</p>
            <p>With Wallaflare, you can synchronize your reading list directly to your KOReader e-reader device or Wallabag Android app.</p>
            <p>Edge storage ensures zero maintenance and zero operational cost for small-to-medium personal archives.</p>
          </article>
        </main>
        <footer>Copyright 2026</footer>
      </body>
      </html>
    `;

    const result = extractArticleFromHtml(html, 'https://techdaily.io/posts/sample-blog-post');

    expect(result.title).toContain('Sample Blog Post');
    expect(result.domainName).toBe('techdaily.io');
    expect(result.previewPicture).toBe('https://example.com/banner.png');
    expect(result.content).toContain('Cloudflare Workers');
    expect(result.content).toContain('KOReader');
    expect(result.readingTime).toBeGreaterThanOrEqual(1);
    expect(result.language).toBe('en');
  });

  it('gracefully handles sparse or direct text inputs', () => {
    const html = `<p>Just a simple raw paragraph pasted directly by the user.</p>`;
    const result = extractArticleFromHtml(html);

    expect(result.title).toBeDefined();
    expect(result.domainName).toBe('direct-input');
    expect(result.content).toContain('Just a simple raw paragraph');
  });
});
