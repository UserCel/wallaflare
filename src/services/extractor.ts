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

export function resolveRelativeUrls(document: any, baseUrl: string) {
  if (!baseUrl) return;
  try {
    // Resolve all <a> hrefs
    document.querySelectorAll('a[href]').forEach((a: any) => {
      const rawHref = a.getAttribute('href')?.trim();
      if (
        rawHref &&
        !rawHref.startsWith('mailto:') &&
        !rawHref.startsWith('tel:') &&
        !rawHref.startsWith('javascript:') &&
        !rawHref.startsWith('#')
      ) {
        try {
          const resolved = new URL(rawHref, baseUrl).href;
          a.setAttribute('href', resolved);
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        } catch {}
      }
    });

    // Resolve all <img> src
    document.querySelectorAll('img[src]').forEach((img: any) => {
      const rawSrc = img.getAttribute('src')?.trim();
      if (rawSrc && !rawSrc.startsWith('data:')) {
        try {
          img.setAttribute('src', new URL(rawSrc, baseUrl).href);
        } catch {}
      }
    });

    // Resolve <source srcset>
    document.querySelectorAll('source[srcset]').forEach((srcEl: any) => {
      const rawSrcset = srcEl.getAttribute('srcset')?.trim();
      if (rawSrcset) {
        try {
          const parts = rawSrcset.split(',').map((part: string) => {
            const [url, descriptor] = part.trim().split(/\s+/);
            const resolved = new URL(url, baseUrl).href;
            return descriptor ? `${resolved} ${descriptor}` : resolved;
          });
          srcEl.setAttribute('srcset', parts.join(', '));
        } catch {}
      }
    });
  } catch (e) {
    console.warn('Error resolving relative URLs:', e);
  }
}

export function extractArticleFromHtml(html: string, originalUrl?: string): ExtractedArticle {
  const fullHtml = html.includes('<html')
    ? html
    : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;

  const { document } = parseHTML(fullHtml);

  // If baseUrl provided, resolve relative links before parsing
  if (originalUrl) {
    resolveRelativeUrls(document, originalUrl);
  }

  // Extract meta tags for fallback/preview
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
  const docTitle = document.querySelector('title')?.textContent?.trim();

  let ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  let twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');

  // Resolve preview picture URLs if relative
  if (originalUrl) {
    if (ogImage && !ogImage.startsWith('http://') && !ogImage.startsWith('https://') && !ogImage.startsWith('data:')) {
      try { ogImage = new URL(ogImage, originalUrl).href; } catch {}
    }
    if (twitterImage && !twitterImage.startsWith('http://') && !twitterImage.startsWith('https://') && !twitterImage.startsWith('data:')) {
      try { twitterImage = new URL(twitterImage, originalUrl).href; } catch {}
    }
  }


  // If no meta og:image / twitter:image, find the first prominent image in the document as previewPicture
  let firstArticleImg: string | null = null;
  if (!ogImage && !twitterImage) {
    const allImgs = Array.from(document.querySelectorAll('article img, main img, body img'));
    for (const imgEl of allImgs as any[]) {
      const src = imgEl.getAttribute('src')?.trim();
      const className = (imgEl.getAttribute('class') || '').toLowerCase();
      // Ignore tiny inline menu icons/badges
      if (className.includes('inline') || className.includes('icon') || className.includes('badge')) {
        continue;
      }
      if (src && !src.startsWith('data:') && !src.endsWith('.svg')) {
        firstArticleImg = src;
        break;
      }
    }
  }

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
  const previewPicture = ogImage || twitterImage || firstArticleImg || null;
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
