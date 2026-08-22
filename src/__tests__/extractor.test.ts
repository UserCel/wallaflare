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

  it('converts relative links and images to absolute URLs based on source URL', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <body>
        <article>
          <h1>Wiki Article</h1>
          <p>Read our <a href="/wiki/Special:Statistics">Statistics page</a> or <a href="help/faq.html">FAQ</a>.</p>
          <img src="/images/diagram.png" alt="Diagram" />
        </article>
      </body>
      </html>
    `;
    const result = extractArticleFromHtml(html, 'https://en.wikipedia.org/wiki/Main_Page');
    expect(result.content).toContain('href="https://en.wikipedia.org/wiki/Special:Statistics"');
    expect(result.content).toContain('href="https://en.wikipedia.org/wiki/help/faq.html"');
    expect(result.content).toContain('src="https://en.wikipedia.org/images/diagram.png"');
    expect(result.content).toContain('target="_blank"');
  });



  it('correctly extracts author from twitter:creator/meta tag and ignores author-note headers', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chapter 313: How did we get Here? - The Legend of William Oh</title>
        <meta name="twitter:creator" content="Macronomicon">
      </head>
      <body>
        <div class="portlet solid author-note-portlet">
          <div class="portlet-title">
            <div class="caption">
              <span class="caption-subject">A note from Macronomicon</span>
            </div>
          </div>
          <div class="portlet-body author-note"><p>Enjoy!</p></div>
        </div>
        <article>
          <p>They Say the Key Site Ghost shows up when you least expect it...</p>
        </article>
      </body>
      </html>
    `;
    const res = extractArticleFromHtml(html, 'https://www.royalroad.com/fiction/92144/the-legend-of-william-oh/chapter/3843436/chapter-313');
    expect(res.byline).toBe('Macronomicon');
  });

  it('correctly extracts author from profile link while rejecting Follow Author button', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Chapter 208 - Void Herald</title></head>
      <body>
        <h1 class="font-blue bold">
          <a href="/profile/107213" class="font-blue-dark">Maxime J. Durand (Void Herald)</a>
          <form class="inline-block follow-author-form">
            <button type="submit">Follow Author</button>
          </form>
        </h1>
        <article>
          <p>The chapter begins...</p>
        </article>
      </body>
      </html>
    `;
    const res = extractArticleFromHtml(html, 'https://www.royalroad.com/fiction/139212/the-hundred-reigns/chapter/3843984/chapter-208');
    expect(res.byline).toBe('Maxime J. Durand (Void Herald)');
  });

  it('falls back to the first article image when og:image and twitter:image are absent', () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>No OG Meta Guide</title></head>
      <body>
        <main>
          <h1>Guide Title</h1>
          <img src="pictures/medieval_hero.webp" alt="Hero" />
          <p>Some text here.</p>
        </main>
      </body>
      </html>
    `;
    const result = extractArticleFromHtml(html, 'https://koreader.rocks/user_guide/');
    expect(result.previewPicture).toBe('https://koreader.rocks/user_guide/pictures/medieval_hero.webp');
  });
