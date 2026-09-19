import { applySiteSpecificRules } from './site-rules';
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


export function removeCssHiddenElements(document: any): void {
  if (!document) return;
  try {
    // 1. Process internal <style> tags for hidden selectors
    const styleTags = document.querySelectorAll('style');
    const hiddenSelectors: string[] = [];

    styleTags.forEach((styleEl: any) => {
      const cssText = styleEl.textContent || '';
      if (!cssText) return;

      const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
      let match;
      while ((match = ruleRegex.exec(cssText)) !== null) {
        const rawSelector = match[1].trim();
        const body = match[2].toLowerCase();

        const isHidden = 
          /display\s*:\s*none/.test(body) || 
          /visibility\s*:\s*hidden/.test(body) || 
          /font-size\s*:\s*0(?:px|em|rem|pt|%)?/.test(body) ||
          /opacity\s*:\s*0(?:\.0+)?(?:\s|;|$)/.test(body) ||
          /max-height\s*:\s*0(?:px)?/.test(body) ||
          /height\s*:\s*0(?:px)?(?:\s|;|$)/.test(body);

        if (isHidden && rawSelector) {
          rawSelector.split(',').forEach(sel => {
            const trimmed = sel.trim();
            if (trimmed && !trimmed.startsWith('@') && !trimmed.includes(':') && !trimmed.includes('>') && /^[.#a-zA-Z0-9_-]+$/.test(trimmed)) {
              hiddenSelectors.push(trimmed);
            }
          });
        }
      }
    });

    for (const selector of hiddenSelectors) {
      try {
        document.querySelectorAll(selector).forEach((el: any) => el.remove());
      } catch {}
    }

    // 2. Remove elements with inline hidden styles
    document.querySelectorAll('[style]').forEach((el: any) => {
      const inlineStyle = (el.getAttribute('style') || '').toLowerCase();
      if (/display\s*:\s*none/.test(inlineStyle) || /visibility\s*:\s*hidden/.test(inlineStyle) || /font-size\s*:\s*0(?:px|em|rem|pt)?/.test(inlineStyle)) {
        el.remove();
      }
    });

    // 3. Remove elements with HTML hidden attribute
    document.querySelectorAll('[hidden]').forEach((el: any) => el.remove());
  } catch {}
}

export function sanitizeArticleDom(doc: any): void {
  if (!doc) return;

  // 1. Remove dangerous executable and embedding elements
  const dangerousTags = [
    'script', 'iframe', 'object', 'embed', 'applet', 'link', 
    'meta', 'form', 'input', 'button', 'select', 'textarea', 
    'frame', 'frameset', 'noscript', 'style'
  ];
  dangerousTags.forEach(tag => {
    doc.querySelectorAll(tag).forEach((el: any) => el.remove());
  });

  // 1.5 Clean Wikipedia internal metadata, empty elements, and raw data attributes
  doc.querySelectorAll('.mw-empty-elt, [typeof^="mw:"], .mw-jump-link, .navbox, .vertical-navbox, .metadata, .ambox, .sistersitebox, .catlinks').forEach((el: any) => el.remove());
  doc.querySelectorAll('*').forEach((el: any) => {
    el.removeAttribute('data-mw');
    el.removeAttribute('data-parsoid');
    el.removeAttribute('data-mw-section-id');
    el.removeAttribute('about');
  });

  // 2. Strip all inline JavaScript event handlers (on*) and dangerous URL schemes
  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el: any) => {
    const attrs = Array.from(el.attributes || []) as any[];
    attrs.forEach(attr => {
      if (attr && attr.name && attr.name.toLowerCase().startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });

    const href = el.getAttribute('href');
    if (href && /^(javascript|vbscript|data:text\/html)/i.test(href.trim())) {
      el.removeAttribute('href');
    }
    const src = el.getAttribute('src');
    if (src && /^(javascript|vbscript|data:text\/html)/i.test(src.trim())) {
      el.removeAttribute('src');
    }
  });
}

export function resolveRelativeUrls(document: any, baseUrl: string): void {
  if (!baseUrl || !baseUrl.startsWith('http')) return;

  try {
    const base = new URL(baseUrl);

    // Resolve <img> and <source> src, srcset, and lazy-loaded attributes
    document.querySelectorAll('img, source').forEach((el: any) => {
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

export function preserveSemanticInlineFormatting(document: any): void {
  if (!document) return;
  try {
    document.querySelectorAll('*[style]').forEach((el: any) => {
      const style = (el.getAttribute('style') || '').toLowerCase();
      const isBold = /font-weight\s*:\s*(bold|[6-9]00)/.test(style);
      const isItalic = /font-style\s*:\s*italic/.test(style);

      if (isBold && el.tagName !== 'STRONG' && el.tagName !== 'B' && !/^H[1-6]$/.test(el.tagName)) {
        const strong = document.createElement('strong');
        while (el.firstChild) {
          strong.appendChild(el.firstChild);
        }
        el.appendChild(strong);
      }
      if (isItalic && el.tagName !== 'EM' && el.tagName !== 'I') {
        const em = document.createElement('em');
        while (el.firstChild) {
          em.appendChild(el.firstChild);
        }
        el.appendChild(em);
      }
    });
  } catch {}
}

export function parseHtmlIsomorphic(html: string): { document: any } {
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return { document: doc };
  }
  return parseHTML(html);
}

export function extractArticleFromDom(document: any, originalUrl?: string, rawHtmlFallback?: string): ExtractedArticle {
  const domainName = originalUrl ? extractDomain(originalUrl) : 'direct-input';
  if (originalUrl) {
    resolveRelativeUrls(document, originalUrl);
  }
  preserveSemanticInlineFormatting(document);
  removeCssHiddenElements(document);
  applySiteSpecificRules(document, domainName);

  // Extract meta tags for fallback/preview
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
  const twitterTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute('content');
  const docTitle = document.title || document.querySelector('title')?.textContent;

  const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
  const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');

  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
  const twitterImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
  const firstArticleImg = document.querySelector('article img, main img, .content img, .post img, #content img, .article-body img, .post-content img, .entry-content img, #storyContent img, #chapterContent img')?.getAttribute('src') || null;

  // Enhanced Author / Byline extraction
  let extractedAuthor: string | null = null;
  const authorMeta = document.querySelector('meta[name="author"], meta[property="article:author"], meta[property="books:author"], meta[property="og:article:author"], meta[name="twitter:creator"], meta[property="book:author"]');
  if (authorMeta) {
    const contentVal = authorMeta.getAttribute('content')?.trim();
    if (contentVal && !contentVal.startsWith('http') && !contentVal.startsWith('@') && contentVal.length < 100 && !contentVal.toLowerCase().includes('follow')) {
      extractedAuthor = contentVal;
    } else if (contentVal && contentVal.startsWith('@') && contentVal.length > 1) {
      extractedAuthor = contentVal.slice(1);
    }
  }

  if (!extractedAuthor) {
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
    parsed = null;
  }
  const textContent = parsed?.textContent?.trim() || document.body?.textContent?.trim() || '';
  const title = parsed?.title?.trim() || docTitle?.trim() || ogTitle?.trim() || twitterTitle?.trim() || textContent.slice(0, 50) || 'Untitled Article';
  let content = parsed?.content || document.body?.innerHTML || `<p>${textContent || rawHtmlFallback || ''}</p>`;
  let contentFirstImg: string | null = null;
  if (content) {
    try {
      const { document: contentDoc } = parseHtmlIsomorphic('<!DOCTYPE html><html><body>' + content + '</body></html>');
      if (originalUrl) {
        resolveRelativeUrls(contentDoc, originalUrl);
      }
      applySiteSpecificRules(contentDoc, domainName);
      sanitizeArticleDom(contentDoc);
      content = contentDoc.body ? contentDoc.body.innerHTML : content;

      const imgEl = contentDoc.querySelector('img');
      if (imgEl) {
        const src = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original');
        if (src && !src.startsWith('data:') && !src.endsWith('.svg') && !src.includes('pixel') && !src.includes('tracker')) {
          contentFirstImg = src.trim();
        }
      }
    } catch {}
  }
  const excerpt = parsed?.excerpt || ogDescription || metaDescription || textContent.slice(0, 200);
  let previewPicture = ogImage || twitterImage || contentFirstImg || firstArticleImg || null;
  if (previewPicture && originalUrl) {
    try {
      previewPicture = new URL(previewPicture, originalUrl).toString();
    } catch {}
  }
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

export function markdownToHtml(md: string): string {
  if (!md || typeof md !== 'string') return '';

  // 1. Normalize line endings
  let text = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Protect and extract fenced code blocks (```lang ... ```)
  const codeBlocks: string[] = [];
  text = text.replace(/(?:^|\n)```([a-zA-Z0-9_-]*)\n([\s\S]*?)\n```(?:\n|$)/g, (_match, lang, code) => {
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const langClass = lang ? ` class="language-${lang.trim()}"` : '';
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre><code${langClass}>${escapedCode}</code></pre>`);
    return `\n\n\x1aBLOCK_${idx}\x1a\n\n`;
  });

  // 3. Protect and extract inline code (`...`)
  const inlineCodes: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_match, code) => {
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${escapedCode}</code>`);
    return `\x1aINLINE_${idx}\x1a`;
  });

  // 4. Headings (# H1 to ###### H6)
  text = text.replace(/^(#{1,6})\s+(.+)$/gm, (_match, hashes, content) => {
    const level = hashes.length;
    return `<h${level}>${content.trim()}</h${level}>`;
  });

  // 5. Horizontal rules / Thematic breaks (e.g. * * *, ***, - - -, ---, _ _ _, ___)
  text = text.replace(/^[ ]{0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/gm, '<hr>');

  // 6. Blockquotes (> ...)
  text = text.replace(/^(?:>[ \t]?.*(?:\n|$))+/gm, (block) => {
    const inner = block.split('\n')
      .map(line => line.replace(/^>[ \t]?/, ''))
      .join('\n')
      .trim();
    return `<blockquote><p>${inner.replace(/\n/g, '<br>')}</p></blockquote>\n`;
  });

  // 7. Lists (ordered and unordered)
  text = text.replace(/^(?:[ \t]*(?:[-*+]|\d+\.)[ \t]+.+(?:\n|$))+/gm, (listBlock) => {
    const lines = listBlock.trim().split('\n');
    const isOrdered = /^\s*\d+\./.test(lines[0]);
    const items = lines.map(line => {
      const cleaned = line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').trim();
      return `<li>${cleaned}</li>`;
    }).join('');
    return isOrdered ? `<ol>${items}</ol>\n` : `<ul>${items}</ul>\n`;
  });

  // 8. Images and Links
  // Images: ![alt](url "title")
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_match, alt, src, title) => {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<img src="${src}" alt="${alt}"${titleAttr}>`;
  });
  // Links: [text](url "title")
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_match, linkText, href, title) => {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}" target="_blank" rel="noopener noreferrer"${titleAttr}>${linkText}</a>`;
  });

  // 9. Inline styles
  // Bold + Italic (***text*** or ___text___)
  text = text.replace(/\*\*\*([^*]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/___([^_]+?)___/g, '<strong><em>$1</em></strong>');

  // Bold (**text** or __text__)
  text = text.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+?)__/g, '<strong>$1</strong>');

  // Italic (*text* or _text_)
  text = text.replace(/(?<!\*)\*(?!\s)([^*]+?)(?<!\s|\*)\*(?!\*)/g, '<em>$1</em>');
  text = text.replace(/(?<![a-zA-Z0-9_])_([^_]+?)_(?![a-zA-Z0-9_])/g, '<em>$1</em>');

  // Strikethrough (~~text~~)
  text = text.replace(/~~([^~]+?)~~/g, '<del>$1</del>');

  // Highlight (==text==)
  text = text.replace(/==([^=]+?)==/g, '<mark>$1</mark>');

  // 10. Paragraphs & Line Breaks
  const paragraphs = text.split(/\n\s*\n+/);
  const formattedParagraphs = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (/^(?:<h[1-6]|<blockquote|<ul|<ol|<pre|<hr|<div|<p|<table|\x1aBLOCK_)/i.test(trimmed)) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).filter(Boolean);

  let html = formattedParagraphs.join('\n\n');

  // 11. Restore inline code placeholders
  html = html.replace(/\x1aINLINE_(\d+)\x1a/g, (_match, idx) => {
    return inlineCodes[Number(idx)] || '';
  });

  // 12. Restore code block placeholders
  html = html.replace(/\x1aBLOCK_(\d+)\x1a/g, (_match, idx) => {
    return codeBlocks[Number(idx)] || '';
  });

  return html;
}

export function extractArticleFromHtml(html: string, originalUrl?: string): ExtractedArticle {
  const isFullHtmlDoc = /^\s*<!DOCTYPE|^\s*<html/i.test(html);
  let formattedHtml = html;
  if (!isFullHtmlDoc) {
    formattedHtml = markdownToHtml(html);
  }
  const fullHtml = formattedHtml.includes('<html') || formattedHtml.includes('<!DOCTYPE')
    ? formattedHtml
    : `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${formattedHtml}</body></html>`;
  const { document } = parseHtmlIsomorphic(fullHtml);
  return extractArticleFromDom(document, originalUrl, formattedHtml);
}

export async function extractArticleFromUrl(url: string, cookies?: string): Promise<ExtractedArticle> {
  const parsedUrl = new URL(url);

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Wallaflare/1.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
  };

  if (cookies && cookies.trim().length > 0) {
    headers['Cookie'] = cookies.trim();
  }

  const response = await fetch(parsedUrl.toString(), {
    headers,
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article from ${url}: HTTP ${response.status}`);
  }

  const html = await response.text();
  return extractArticleFromHtml(html, url);
}

export async function extractCoverImageFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(3500)
    });
    if (!res.ok) return null;
    const html = await res.text();
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
                    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (ogMatch && ogMatch[1]) {
      const imgSrc = ogMatch[1].trim();
      if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
        return imgSrc;
      } else if (imgSrc.startsWith('//')) {
        return new URL(url).protocol + imgSrc;
      } else {
        return new URL(imgSrc, url).toString();
      }
    }
  } catch {}
  return null;
}
