import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { ExtractedArticle } from '../types';

export function calculateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function extractDomain(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'direct-input';
  }
}

export function extractArticleFromHtml(html: string, originalUrl?: string): ExtractedArticle {
  const fullHtml = html.includes('<html')
    ? html
    : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;

  const { document } = parseHTML(fullHtml);

  // Extract meta tags for fallback/preview
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
  const docTitle = document.querySelector('title')?.textContent?.trim();

  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

  const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');

  const lang = document.documentElement.getAttribute('lang') || 'en';

  const reader = new Readability(document, {
    charThreshold: 0,
    keepClasses: true,
  });

  const parsed = reader.parse();

  const domainName = originalUrl ? extractDomain(originalUrl) : 'direct-input';
  const textContent = parsed?.textContent?.trim() || document.body?.textContent?.trim() || '';
  const title = parsed?.title || ogTitle || twitterTitle || docTitle || textContent.slice(0, 50) || 'Untitled Article';
  const content = parsed?.content || document.body?.innerHTML || `<p>${textContent || html}</p>`;
  const excerpt = parsed?.excerpt || ogDescription || metaDescription || textContent.slice(0, 200);
  const previewPicture = ogImage || twitterImage || null;
  const readingTime = calculateReadingTime(textContent);

  return {
    title,
    content,
    textContent,
    excerpt,
    byline: parsed?.byline || null,
    domainName,
    previewPicture,
    readingTime,
    language: lang,
  };
}

export async function extractArticleFromUrl(url: string): Promise<ExtractedArticle> {
  const parsedUrl = new URL(url);

  const response = await fetch(parsedUrl.toString(), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Wallaflare/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: HTTP ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return extractArticleFromHtml(html, url);
}
