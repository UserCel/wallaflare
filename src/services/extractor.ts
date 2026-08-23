import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

export interface ExtractedArticle {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  byline: string | null;
  domainName: string;
  previewPicture: string | null;
  readingTime: number;
  language: string;
  publishedAt?: string | null;
}

export function calculateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'direct-input';
  }
}

export function resolveRelativeUrls(document: any, baseUrl: string): void {
  if (!baseUrl || !baseUrl.startsWith('http')) return;

  try {
    const base = new URL(baseUrl);

    // Resolve <img> and <source> src, srcset, and lazy-loaded attributes
    document.querySelectorAll('img, source').forEach((el: any) => {
      // Handle lazy load data-src fallback if src is missing or transparent placeholder
      const dataSrc = el.getAttribute('data-src') || el.getAttribute('data-original') || el.getAttribute('data-lazy-src') || el.getAttribute('data-url');
      const src = el.getAttribute('src');

      if ((!src || src.startsWith('data:') || src.includes('placeholder')) && dataSrc) {
        try {
          el.setAttribute('src', new URL(dataSrc, base).toString());
        } catch {}
      } else if (src) {
        if (src.startsWith('//')) {
          el.setAttribute('src', base.protocol + src);
        } else if (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('data:')) {
          try {
            el.setAttribute('src', new URL(src, base).toString());
          } catch {}
        }
      }

      // Canonicalize protocol-relative and relative srcset (e.g. //upload.wikimedia.org/... 2x)
      const srcset = el.getAttribute('srcset') || el.getAttribute('data-srcset');
      if (srcset) {
        try {
          const cleanedSet = srcset.split(',').map((entry: string) => {
            const parts = entry.trim().split(/\s+/);
            if (parts[0]) {
              if (parts[0].startsWith('//')) {
                parts[0] = base.protocol + parts[0];
              } else if (!parts[0].startsWith('http://') && !parts[0].startsWith('https://') && !parts[0].startsWith('data:')) {
                parts[0] = new URL(parts[0], base).toString();
              }
            }
            return parts.join(' ');
          }).join(', ');
          el.setAttribute('srcset', cleanedSet);
        } catch {}
      }
    });

    // Resolve <a> href attributes and ensure secure external targets
    document.querySelectorAll('a').forEach((a: any) => {
      const href = a.getAttribute('href');
      if (href) {
        if (href.startsWith('//')) {
          a.setAttribute('href', base.protocol + href);
        } else if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('#')) {
          try {
            a.setAttribute('href', new URL(href, base).toString());
          } catch {}
        }
      }
      if (a.getAttribute('href')?.startsWith('http')) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      }
    });
  } catch {}
}

export function extractArticleFromHtml(html: string, originalUrl?: string): ExtractedArticle {
  const { document } = parseHTML(html);

  if (originalUrl) {
    resolveRelativeUrls(document, originalUrl);
  }

  // Extract meta tags for fallback/preview
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
  const docTitle = document.title;

  const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');

  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
  const firstArticleImg = document.querySelector('article img, main img, .content img, .post img, #content img, .article-body img')?.getAttribute('src') || null;

  // Enhanced Author / Byline extraction
  let extractedAuthor: string | null = null;
  const authorMeta = document.querySelector('meta[name="author"], meta[property="article:author"], meta[property="books:author"], meta[property="og:article:author"], meta[name="twitter:creator"]');
  if (authorMeta) {
    const contentVal = authorMeta.getAttribute('content')?.trim();
    if (contentVal && !contentVal.startsWith('http') && !contentVal.startsWith('@') && contentVal.length < 100 && !contentVal.toLowerCase().includes('follow')) {
      extractedAuthor = contentVal;
    } else if (contentVal && contentVal.startsWith('@') && contentVal.length > 1) {
      extractedAuthor = contentVal.slice(1);
    }
  }

  if (!extractedAuthor) {
    // Check dedicated profile / author links (e.g. RoyalRoad <a href="/profile/107213">Author Name</a>)
    const profileLink = document.querySelector('a[href^="/profile/"], a[href*="/profile/"], a[href*="/author/"], a[rel="author"], [property="author"]');
    if (profileLink) {
      const textVal = profileLink.textContent?.trim();
      if (textVal && textVal.length > 1 && textVal.length < 80 && !textVal.toLowerCase().includes('follow') && !textVal.toLowerCase().includes('author dashboard')) {
        extractedAuthor = textVal.replace(/^by\s+/i, '').trim();
      }
    }
  }

  if (!extractedAuthor) {
    const authorEl = document.querySelector('.author-name, .author a, .byline a, .byline, .post-author');
    if (authorEl) {
      const textVal = authorEl.textContent?.trim();
      if (textVal && textVal.length > 1 && textVal.length < 80 && !textVal.toLowerCase().includes('follow')) {
        extractedAuthor = textVal.replace(/^by\s+/i, '').trim();
      }
    }
  }

  // Enhanced Published Date extraction
  let extractedPublishDate: string | null = null;
  const dateMeta = document.querySelector('meta[property="article:published_time"], meta[name="pubdate"], meta[name="publish-date"], meta[name="date"], meta[property="og:published_time"]');
  if (dateMeta) {
    const val = dateMeta.getAttribute('content')?.trim();
    if (val && !isNaN(new Date(val).getTime())) {
      extractedPublishDate = new Date(val).toISOString();
    }
  }
  if (!extractedPublishDate) {
    const timeEl = document.querySelector('time[datetime]');
    if (timeEl) {
      const val = timeEl.getAttribute('datetime')?.trim();
      if (val && !isNaN(new Date(val).getTime())) {
        extractedPublishDate = new Date(val).toISOString();
      }
    }
  }

  // Extract language
  const htmlLang = document.documentElement?.getAttribute('lang') || document.querySelector('html')?.getAttribute('lang') || 'en';
  const lang = htmlLang.split('-')[0].toLowerCase();

  // Clean intrusive proprietary site containers
  document.querySelectorAll('.dynamicHeightItemsColumn, .RelativeElementsContainer, .site_page_root, .no-print').forEach((el: any) => {
    el.removeAttribute('class');
    el.removeAttribute('style');
  });

  // Clean follow author forms/buttons and extraneous social widgets
  document.querySelectorAll('.follow-author-form, form.follow-author, .follow-btn, button[type="submit"]').forEach((el: any) => {
    if (el.textContent && el.textContent.toLowerCase().includes('follow')) {
      el.remove();
    }
  });

  // Clean author-note portlets from header search
  document.querySelectorAll('.author-note-portlet .caption, .portlet-title .caption').forEach((el: any) => {
    if (el.textContent && el.textContent.toLowerCase().includes('a note from')) {
      el.removeAttribute('class');
    }
  });

  // Clean duplicate mobile/gallery overlays
  document.querySelectorAll('.mobileView, span.mobileView, div.mobileView, .gallery-indication').forEach((el: any) => el.remove());

  // Unwrap mobile gallery anchor wrappers
  document.querySelectorAll('a.gelleryOpener').forEach((a: any) => {
    const parent = a.parentNode;
    while (a.firstChild) {
      parent.insertBefore(a.firstChild, a);
    }
    a.remove();
  });



  let parsed: any = null;
  try {
    const reader = new Readability(document, {
      charThreshold: 0,
      keepClasses: true,
    });
    parsed = reader.parse();
  } catch (err) {
    // Graceful fallback for minimal body-less or malformed HTML trees
    parsed = null;
  }

  const domainName = originalUrl ? extractDomain(originalUrl) : 'direct-input';
  const textContent = parsed?.textContent?.trim() || document.body?.textContent?.trim() || '';
  const title = parsed?.title?.trim() || docTitle?.trim() || ogTitle?.trim() || twitterTitle?.trim() || textContent.slice(0, 50) || 'Untitled Article';
  let content = parsed?.content || document.body?.innerHTML || `<p>${textContent || html}</p>`;
  if (originalUrl && content) {
    try {
      const { document: contentDoc } = parseHTML('<!DOCTYPE html><html><body>' + content + '</body></html>');
      resolveRelativeUrls(contentDoc, originalUrl);
      content = contentDoc.body ? contentDoc.body.innerHTML : content;
    } catch {}
  }
  const excerpt = parsed?.excerpt || ogDescription || metaDescription || textContent.slice(0, 200);
  const previewPicture = ogImage || twitterImage || firstArticleImg || null;
  const readingTime = calculateReadingTime(textContent);

  return {
    title,
    content,
    textContent,
    excerpt,
    byline: extractedAuthor || (parsed?.byline && !parsed.byline.toLowerCase().includes('follow') && !parsed.byline.toLowerCase().includes('a note from') && !parsed.byline.toLowerCase().includes('note') ? parsed.byline : null) || null,
    domainName,
    previewPicture,
    readingTime,
    language: lang,
    publishedAt: extractedPublishDate || null,
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
    throw new Error(`Failed to fetch article from ${url}: HTTP ${response.status}`);
  }

  const html = await response.text();
  return extractArticleFromHtml(html, url);
}
