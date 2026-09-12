import { zipSync, strToU8 } from 'fflate';
import { parseHTML } from 'linkedom';

export { zipSync, strToU8 };

function parseHtmlDoc(html: string): any {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(html, 'text/html');
  }
  return parseHTML(html).document;
}

export interface EpubArticleInput {
  id?: number | string;
  title: string;
  content: string;
  url?: string | null;
  domain_name?: string | null;
  preview_picture?: string | null;
  reading_time?: number | null;
  author?: string | null;
  authors?: string[] | null;
  created_at?: string;
  published_at?: string | null;
  language?: string;
  tags?: Array<string | { label: string; slug?: string }> | null;
}

export interface EpubOptions {
  maxImages?: number;
}

export interface DigestOptions {
  title?: string;
  author?: string;
  coverFilename?: string;
  filter?: string;
  maxImages?: number;
}

export const DEFAULT_EPUB_MAX_IMAGES = 20;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB per image
const IMAGE_FETCH_TIMEOUT_MS = 4500; // 4.5s per image

export function isRtlLanguage(lang?: string | null, textSample?: string | null): boolean {
  if (lang) {
    const l = lang.toLowerCase().split('-')[0];
    if (['he', 'iw', 'ar', 'fa', 'ur', 'yi', 'ji'].includes(l)) {
      return true;
    }
  }
  if (textSample) {
    // Strip HTML tags so we test actual article content and not English HTML markup/attributes
    const cleanText = textSample.replace(/<[^>]+>/g, ' ');
    const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return rtlRegex.test(cleanText.slice(0, 3000));
  }
  return false;
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

function serializeNodeToXhtml(node: any, out: string[]) {
  if (!node) return;
  const type = node.nodeType;
  // Text node
  if (type === 3) {
    out.push(escapeXml(node.nodeValue || ''));
    return;
  }
  // Comment node
  if (type === 8) {
    out.push('<!--', (node.nodeValue || '').replace(/--/g, '__'), '-->');
    return;
  }
  // Element node
  if (type === 1) {
    const tag = (node.tagName || '').toLowerCase();
    if (!tag) return;
    out.push('<', tag);
    const attrs = node.attributes;
    if (attrs && attrs.length > 0) {
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        out.push(' ', attr.name, '="', escapeXml(attr.value || ''), '"');
      }
    }
    if (VOID_ELEMENTS.has(tag)) {
      out.push('/>');
      return;
    }
    out.push('>');
    const children = node.childNodes;
    if (children && children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        serializeNodeToXhtml(children[i], out);
      }
    }
    out.push('</', tag, '>');
    return;
  }
  // Document or DocumentFragment
  const children = node.childNodes;
  if (children && children.length > 0) {
    for (let i = 0; i < children.length; i++) {
      serializeNodeToXhtml(children[i], out);
    }
  }
}

export function bodyToXhtml(body: any): string {
  const out: string[] = [];
  const children = body.childNodes;
  if (children && children.length > 0) {
    for (let i = 0; i < children.length; i++) {
      serializeNodeToXhtml(children[i], out);
    }
  }
  return out.join('');
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface BundledImage {
  id: string;
  href: string;
  zipPath: string;
  mime: string;
  data: Uint8Array;
}

function getBestImageUrl(img: any, articleUrl?: string | null): string | null {
  const resolve = (u: string | null | undefined): string | null => {
    if (!u) return null;
    u = u.trim();
    if (u.startsWith('//')) return 'https:' + u;
    if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('data:')) return u;
    if (articleUrl && (u.startsWith('/') || !u.includes(':'))) {
      try { return new URL(u, articleUrl).href; } catch { return null; }
    }
    return null;
  };

  const rawSrcset = img.getAttribute('srcset')?.trim() || img.getAttribute('data-srcset')?.trim();
  if (rawSrcset) {
    const candidates = rawSrcset
      .split(',')
      .map((item: string) => {
        const parts = item.trim().split(/\s+/);
        const url = resolve(parts[0]);
        const width = parts[1] && parts[1].endsWith('w') ? parseInt(parts[1].slice(0, -1), 10) : 1000;
        return { url, width };
      })
      .filter((c: any) => c.url);

    if (candidates.length > 0) {
      // Prioritize reasonable size (~800-1200px) for e-ink reading
      candidates.sort((a: any, b: any) => Math.abs(a.width - 1000) - Math.abs(b.width - 1000));
      return candidates[0].url;
    }
  }

  const rawSrc = img.getAttribute('src')?.trim() ||
                 img.getAttribute('data-src')?.trim() ||
                 img.getAttribute('data-lazy-src')?.trim() ||
                 img.getAttribute('data-original')?.trim() ||
                 img.getAttribute('data-actualsrc')?.trim();

  return resolve(rawSrc);
}

async function fetchImageBytes(
  targetUrl: string,
  refererUrl?: string | null
): Promise<{ data: Uint8Array; mime: string; ext: string } | null> {
  if (!targetUrl) return null;

  // 1. Embedded Data URL
  if (targetUrl.startsWith('data:image/')) {
    const commaIdx = targetUrl.indexOf(',');
    if (commaIdx > 0) {
      try {
        const header = targetUrl.slice(0, commaIdx);
        const b64 = targetUrl.slice(commaIdx + 1);
        const mime = header.split(';')[0].replace('data:', '').trim() || 'image/jpeg';
        let ext = 'jpg';
        if (mime.includes('png')) ext = 'png';
        else if (mime.includes('webp')) ext = 'webp';
        else if (mime.includes('gif')) ext = 'gif';
        else if (mime.includes('svg')) ext = 'svg';

        const binStr = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
        if (bytes.byteLength > 0 && bytes.byteLength <= MAX_IMAGE_BYTES) {
          return { data: bytes, mime, ext };
        }
      } catch {}
    }
    return null;
  }

  // 2. HTTP / HTTPS URL
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

    // In browser environments, setting User-Agent or Referer is forbidden and throws
    const isBrowser = typeof window !== 'undefined' && typeof (window as any).document !== 'undefined';
    const reqHeaders: Record<string, string> = {
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    };
    if (!isBrowser) {
      reqHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
      if (refererUrl) {
        reqHeaders['Referer'] = refererUrl;
      }
    }

    const fetchOptions: any = {
      headers: reqHeaders,
      signal: controller.signal,
    };
    if (!isBrowser) {
      fetchOptions.cf = {
        cacheTtl: 86400,
        cacheEverything: true,
      };
    }

    const res = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const pathname = (() => { try { return new URL(targetUrl).pathname.toLowerCase(); } catch { return ''; } })();
    let ext = 'jpg';
    let mime = 'image/jpeg';
    if (ct.includes('png') || pathname.endsWith('.png')) { ext = 'png'; mime = 'image/png'; }
    else if (ct.includes('webp') || pathname.endsWith('.webp')) { ext = 'webp'; mime = 'image/webp'; }
    else if (ct.includes('gif') || pathname.endsWith('.gif')) { ext = 'gif'; mime = 'image/gif'; }
    else if (ct.includes('svg') || pathname.endsWith('.svg')) { ext = 'svg'; mime = 'image/svg+xml'; }
    else if (ct.includes('avif') || pathname.endsWith('.avif')) { ext = 'avif'; mime = 'image/avif'; }

    const buf = await res.arrayBuffer();
    if (buf.byteLength > 0 && buf.byteLength <= MAX_IMAGE_BYTES) {
      return { data: new Uint8Array(buf), mime, ext };
    }
  } catch (e) {
    // Fetch failed or timed out
  }
  return null;
}

function cleanAndSanitizeDoc(rawHtml: string, isRtl?: boolean): any {
  const document = parseHtmlDoc(`<!DOCTYPE html><html><body>${rawHtml || ''}</body></html>`);

  // Remove unsafe elements
  const removeSelectors = ['script', 'style', 'iframe', 'noscript', 'object', 'embed'];
  removeSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el: any) => el.remove());
  });

  // Clean KOReader/Crengine incompatible wrappers around images
  document.querySelectorAll('.gallery-indication, .mobileView, span.mobileView, div.mobileView').forEach((el: any) => el.remove());
  document.querySelectorAll('[contenteditable]').forEach((el: any) => el.removeAttribute('contenteditable'));
  document.querySelectorAll('a.gelleryOpener').forEach((a: any) => {
    const img = a.querySelector('img');
    if (img) {
      a.replaceWith(img);
    }
  });

  // For RTL documents, strip hardcoded left alignments and ensure block elements have dir="rtl" for Qt/Okular
  if (isRtl) {
    document.querySelectorAll('[align="left"], [align="start"]').forEach((el: any) => {
      el.removeAttribute('align');
    });
    document.querySelectorAll('[style]').forEach((el: any) => {
      const s = el.getAttribute('style') || '';
      if (/text-align\s*:\s*left/i.test(s)) {
        const cleaned = s.replace(/text-align\s*:\s*left/gi, 'text-align: right');
        el.setAttribute('style', cleaned);
      }
    });
    document.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, blockquote, li, dt, dd, article, section, header, nav, dl, ul, ol').forEach((el: any) => {
      el.setAttribute('dir', 'rtl');
      el.setAttribute('align', 'right');
    });
  }

  return document;
}

async function processInlineImages(
  document: any,
  articleUrl: string | undefined | null,
  bundledImages: BundledImage[],
  urlToBundledImage: Map<string, BundledImage>,
  maxImages: number
): Promise<void> {
  const allImgs: any[] = Array.from(document.querySelectorAll('img'));
  const uniqueUrls: string[] = [];

  for (const img of allImgs) {
    const targetUrl = getBestImageUrl(img, articleUrl);
    if (targetUrl) {
      img.setAttribute('data-target-url', targetUrl);
      if (!uniqueUrls.includes(targetUrl) && (bundledImages.length + uniqueUrls.length) < maxImages) {
        uniqueUrls.push(targetUrl);
      }
    }
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.removeAttribute('data-src');
    img.removeAttribute('data-srcset');
    img.removeAttribute('data-lazy-src');
    img.removeAttribute('data-original');
    img.removeAttribute('data-actualsrc');
    img.removeAttribute('loading');
    if (!img.getAttribute('alt')) img.setAttribute('alt', '');
  }

  let inlineCounter = 0;
  for (const img of bundledImages) {
    if (img.id.startsWith('inline-img-')) {
      const n = parseInt(img.id.replace('inline-img-', ''), 10);
      if (!isNaN(n) && n > inlineCounter) inlineCounter = n;
    }
  }

  const inlineFetchTasks = uniqueUrls.map(async (targetUrl) => {
    if (urlToBundledImage.has(targetUrl)) return;

    const imgResult = await fetchImageBytes(targetUrl, articleUrl);
    if (imgResult) {
      inlineCounter++;
      const currentIdx = inlineCounter;
      const imgFilename = `inline_${currentIdx}.${imgResult.ext}`;
      const imgId = `inline-img-${currentIdx}`;
      const bundled: BundledImage = {
        id: imgId,
        href: `images/${imgFilename}`,
        zipPath: `OEBPS/images/${imgFilename}`,
        mime: imgResult.mime,
        data: imgResult.data,
      };
      bundledImages.push(bundled);
      urlToBundledImage.set(targetUrl, bundled);
    }
  });

  await Promise.allSettled(inlineFetchTasks);

  // Update all img elements to point to their bundled local URLs
  for (const img of allImgs) {
    const targetUrl = img.getAttribute('data-target-url');
    img.removeAttribute('data-target-url');
    if (targetUrl && urlToBundledImage.has(targetUrl)) {
      const bundled = urlToBundledImage.get(targetUrl)!;
      img.setAttribute('src', bundled.href);
    }
  }

  // Normalize figure and image structures for flawless rendering across all e-readers (KOReader, Kindle, Kobo)
  document.querySelectorAll('figure').forEach((fig: any) => {
    fig.removeAttribute('data-block');
    fig.removeAttribute('data-editor');
    fig.removeAttribute('data-offset-key');
    fig.removeAttribute('contenteditable');

    const img = fig.querySelector('img');
    const captionEl = fig.querySelector('.ImageDetails, figcaption, .caption');
    const captionText = captionEl ? captionEl.textContent?.trim() : '';

    if (img) {
      img.removeAttribute('id');
      img.removeAttribute('aria-hidden');
      img.removeAttribute('data-no-id');
      img.removeAttribute('loading');

      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      if (captionText) {
        fig.innerHTML = `<img src="${src}" alt="${escapeXml(alt)}"/><figcaption>${escapeXml(captionText)}</figcaption>`;
      } else {
        fig.innerHTML = `<img src="${src}" alt="${escapeXml(alt)}"/>`;
      }
    }
  });

  // Strip all non-semantic site container classes from root elements
  document.querySelectorAll('.dynamicHeightItemsColumn, .RelativeElementsContainer, .site_page_root, .no-print').forEach((el: any) => {
    el.removeAttribute('class');
    el.removeAttribute('style');
  });
}

function getArticleStyleCss(): string {
  return `@charset "utf-8";
body {
  margin: 0;
  padding: 0;
}
body.rtl, .rtl, .rtl p, .rtl div, .rtl h1, .rtl h2, .rtl h3, .rtl h4, .rtl h5, .rtl h6, .rtl li, .rtl blockquote, .rtl dd, .rtl dt,
body[dir="rtl"], html[dir="rtl"] body, [dir="rtl"] p, [dir="rtl"] div, [dir="rtl"] h1, [dir="rtl"] h2, [dir="rtl"] h3, [dir="rtl"] li {
  direction: rtl;
  text-align: right;
}
dl dt {
  font-weight: bold;
  margin-top: 0.8em;
}
dl dd {
  margin-left: 0;
  margin-bottom: 0.25em;
  word-break: break-all;
}
.rtl dl dd, [dir="rtl"] dl dd {
  margin-right: 0;
  direction: rtl;
  text-align: right;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0.8em auto;
}
.article-lead-image {
  margin: 0.8em 0 1.5em 0;
  text-align: center;
  display: block;
}
.article-lead-image img, img.lead-image {
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  display: block;
}
figure {
  margin: 1.2em 0;
  padding: 0;
  text-align: center;
  display: block;
}
figure img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}
figcaption {
  font-size: 0.85em;
  font-style: italic;
  margin-top: 0.4em;
  text-align: center;
  display: block;
}
blockquote {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 3px solid #ccc;
}
.rtl blockquote, [dir="rtl"] blockquote {
  border-left: none;
  border-right: 3px solid #ccc;
  direction: rtl;
  text-align: right;
}
.article-header {
  margin: 1.5em 0 1em;
  padding-bottom: 0.5em;
}
.article-header h1 {
  margin: 0 0 0.3em;
  font-size: 1.6em;
  line-height: 1.25;
}
.article-meta {
  color: #555;
  font-size: 0.88em;
  margin: 0.2em 0;
  line-height: 1.4;
}
.article-divider {
  border: 0;
  border-top: 1px solid #ccc;
  margin: 1em 0 1.5em;
}
.digest-toc-list {
  list-style-type: decimal;
  padding-left: 1.4em;
  margin: 1em 0;
}
.rtl .digest-toc-list, [dir="rtl"] .digest-toc-list {
  padding-left: 0;
  padding-right: 1.4em;
  direction: rtl;
  text-align: right;
}
.digest-toc-item {
  margin-bottom: 0.9em;
  line-height: 1.4;
}
.digest-toc-item a {
  font-weight: bold;
  text-decoration: none;
  color: inherit;
}
.digest-toc-meta {
  font-size: 0.85em;
  color: #666;
  margin-top: 0.15em;
}
`;
}

export async function generateEpub(
  article: EpubArticleInput,
  options?: EpubOptions
): Promise<Uint8Array> {
  const maxImages = typeof options?.maxImages === 'number' && options.maxImages >= 0
    ? options.maxImages
    : DEFAULT_EPUB_MAX_IMAGES;
  const uid = `urn:wallabag:${article.id || Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const title = article.title || 'Untitled Article';
  const escapedTitle = escapeXml(title);
  const isRtl = isRtlLanguage(article.language, (article.title || '') + ' ' + (article.content || ''));
  const lang = article.language || (isRtl ? 'he' : 'en');
  const domain = article.domain_name || (article.url ? (() => { try { return new URL(article.url).hostname; } catch { return 'wallabag'; } })() : 'wallabag');
  const escapedDomain = escapeXml(domain);
  const readingTime = article.reading_time || 1;
  const authorName = article.author || (article.authors && article.authors.length > 0 ? article.authors.join(', ') : '');
  const escapedAuthor = escapeXml(authorName);

  const addedOnStr = article.created_at ? new Date(article.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const publishedOnStr = article.published_at ? new Date(article.published_at).toISOString().split('T')[0] : (escapedDomain !== 'wallabag' && escapedDomain !== 'direct-input' ? escapedDomain : 'Unknown');
  const originalUrl = article.url ? escapeXml(article.url) : '';

  const bundledImages: BundledImage[] = [];
  const urlToBundledImage = new Map<string, BundledImage>();
  let coverFilename: string | null = null;

  // 1. Fetch Cover Image if present
  let previewUrl = article.preview_picture ? article.preview_picture.trim() : null;
  if (previewUrl?.startsWith('//')) {
    previewUrl = 'https:' + previewUrl;
  } else if (previewUrl && !previewUrl.startsWith('http://') && !previewUrl.startsWith('https://') && !previewUrl.startsWith('data:') && article.url) {
    try { previewUrl = new URL(previewUrl, article.url).href; } catch {}
  }

  if (previewUrl && bundledImages.length < maxImages) {
    const imgRes = await fetchImageBytes(previewUrl, article.url);
    if (imgRes) {
      coverFilename = `cover.${imgRes.ext}`;
      const coverImage: BundledImage = {
        id: 'cover-image',
        href: `images/${coverFilename}`,
        zipPath: `OEBPS/images/${coverFilename}`,
        mime: imgRes.mime,
        data: imgRes.data,
      };
      bundledImages.push(coverImage);
      urlToBundledImage.set(previewUrl, coverImage);
    }
  }

  // 2. Parse & sanitize content HTML, fetching inline images
  const document = cleanAndSanitizeDoc(article.content || '', isRtl);
  await processInlineImages(document, article.url, bundledImages, urlToBundledImage, maxImages);

  const cleanBodyHtml = bodyToXhtml(document.body);

  // 3. Container XML
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // 4. CoverPage CSS
  const coverCss = `@page {
  padding: 0;
  margin: 0;
}
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  text-align: center;
}
.cover-wrapper {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  text-align: center;
}
svg {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}
img.cover-img {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
  margin: 0 auto;
  padding: 0;
  display: block;
}`;

  // 5. Article Content CSS
  const styleCss = getArticleStyleCss();

  // 6. Navigation document (EPUB3)
  const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
  <title>${escapedTitle}</title>
</head>
<body epub:type="frontmatter toc" dir="${isRtl ? 'rtl' : 'ltr'}">
  <header>
    <h1>${isRtl ? 'תוכן עניינים' : 'Table of Contents'}</h1>
  </header>
  <nav epub:type="toc" id="toc">
    <ol>
      ${coverFilename ? `<li><a href="CoverPage.xhtml">${isRtl ? 'עטיפה' : 'Cover'}</a></li>` : ''}
      <li><a href="summary.xhtml">${isRtl ? 'תקציר' : 'Summary'}</a></li>
      <li><a href="content.xhtml">${escapedTitle}</a></li>
    </ol>
  </nav>
  <nav epub:type="landmarks">
    <h2>Guide</h2>
    <ol>
      ${coverFilename ? '<li><a epub:type="cover" href="CoverPage.xhtml">CoverPage</a></li>' : ''}
      <li><a epub:type="text" href="content.xhtml">${escapedTitle}</a></li>
    </ol>
  </nav>
</body>
</html>`;

  // 7. NCX TOC (EPUB2 / KOReader)
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${lang}">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapedTitle}</text>
  </docTitle>
  <docAuthor>
    <text>${escapedDomain}</text>
  </docAuthor>
  <navMap>
    ${coverFilename ? `<navPoint id="cover-nav" playOrder="1"><navLabel><text>${isRtl ? 'עטיפה' : 'Cover'}</text></navLabel><content src="CoverPage.xhtml"/></navPoint>` : ''}
    <navPoint id="summary-nav" playOrder="${coverFilename ? 2 : 1}">
      <navLabel><text>${isRtl ? 'תקציר' : 'Summary'}</text></navLabel>
      <content src="summary.xhtml"/>
    </navPoint>
    <navPoint id="content-nav" playOrder="${coverFilename ? 3 : 2}">
      <navLabel><text>${escapedTitle}</text></navLabel>
      <content src="content.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;

  // 8. Page 1: CoverPage.xhtml
  const coverXhtml = coverFilename ? `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
  <title>Cover</title>
  <link type="text/css" rel="stylesheet" href="Styles/CoverPage.css"/>
  <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0"/>
</head>
<body class="cover-body">
  <div class="cover-wrapper" epub:type="cover">
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="100%" height="100%" viewBox="0 0 1000 1500" preserveAspectRatio="xMidYMid meet">
      <image width="1000" height="1500" xlink:href="images/${coverFilename}"/>
    </svg>
  </div>
</body>
</html>` : '';

  // 9. Page 2: summary.xhtml
  const summaryXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}" class="${isRtl ? 'rtl' : ''}">
<head>
  <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
  <title>wallabag articles book</title>
  <link type="text/css" rel="stylesheet" href="Styles/style.css"/>${isRtl ? `
  <style type="text/css">
    body, p, div, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, article, section {
      direction: rtl;
      text-align: right;
    }
  </style>` : ''}
</head>
<body dir="${isRtl ? 'rtl' : 'ltr'}" class="${isRtl ? 'rtl' : ''}" style="${isRtl ? 'direction: rtl; text-align: right;' : ''}">
  <h1 dir="${isRtl ? 'rtl' : 'ltr'}">${escapedTitle}</h1>
  <dl dir="${isRtl ? 'rtl' : 'ltr'}">
    <dt dir="${isRtl ? 'rtl' : 'ltr'}">${isRtl ? 'פורסם על ידי' : 'Published by'}</dt>
    <dd dir="${isRtl ? 'rtl' : 'ltr'}">${escapedAuthor || escapedDomain}</dd>

    <dt dir="${isRtl ? 'rtl' : 'ltr'}">${isRtl ? 'פורסם בתאריך' : 'Published on'}</dt>
    <dd dir="${isRtl ? 'rtl' : 'ltr'}">${publishedOnStr}</dd>

    <dt dir="${isRtl ? 'rtl' : 'ltr'}">${isRtl ? 'זמן קריאה משוער' : 'Estimated reading time'}</dt>
    <dd dir="${isRtl ? 'rtl' : 'ltr'}">${readingTime} ${isRtl ? 'דקות' : 'min'}</dd>

    <dt dir="${isRtl ? 'rtl' : 'ltr'}">${isRtl ? 'נוסף בתאריך' : 'Added on'}</dt>
    <dd dir="${isRtl ? 'rtl' : 'ltr'}">${addedOnStr}</dd>

    <dt dir="${isRtl ? 'rtl' : 'ltr'}">${isRtl ? 'כתובת מקור' : 'Address'}</dt>
    <dd dir="${isRtl ? 'rtl' : 'ltr'}">
      <a href="${originalUrl}">${originalUrl || '-'}</a>
    </dd>
  </dl>
</body>
</html>`;

  // 10. Page 3: content.xhtml (Exact Wallabag structure, with opening lead image and style.css link)
  const contentXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}" class="${isRtl ? 'rtl' : ''}">
  <head>
    <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
    <title>${escapedTitle}</title>
    <link type="text/css" rel="stylesheet" href="Styles/style.css"/>${isRtl ? `
    <style type="text/css">
      body, p, div, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, article, section {
        direction: rtl;
        text-align: right;
      }
    </style>` : ''}
  </head>
  <body dir="${isRtl ? 'rtl' : 'ltr'}" class="${isRtl ? 'rtl' : ''}" style="${isRtl ? 'direction: rtl; text-align: right;' : ''}">${cleanBodyHtml}</body>
</html>`;

  // 11. OPF Package file with all manifest items
  const imagesManifest = bundledImages.map(img => {
    const isCoverProp = img.id === 'cover-image' ? ' properties="cover-image"' : '';
    return `<item id="${img.id}" href="${img.href}" media-type="${img.mime}"${isCoverProp}/>`;
  }).join('\n    ');

  const coverMetaItem = coverFilename ? '<meta name="cover" content="cover-image"/>' : '';

  const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xmlns:dcterms="http://purl.org/dc/terms/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	unique-identifier="BookId" version="3.0">
  <metadata>
    <dc:identifier id="BookId">${uid}</dc:identifier>
    <dc:title>${escapedTitle}</dc:title>
    <dc:language>${lang}</dc:language>
    <dc:creator>${escapedAuthor || escapedDomain}</dc:creator>
    <dc:publisher>wallabag</dc:publisher>
    <dc:date>${addedOnStr}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
    ${coverMetaItem}${(article.tags || []).map(t => typeof t === 'string' ? t : t?.label).filter(Boolean).map(t => `\n    <dc:subject>${escapeXml(t)}</dc:subject>`).join('')}
  </metadata>
  <manifest>
    <item id="epub3toc" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncxtoc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="CoverPage.css" href="Styles/CoverPage.css" media-type="text/css"/>
    <item id="style.css" href="Styles/style.css" media-type="text/css"/>
    <item id="summary" href="summary.xhtml" media-type="application/xhtml+xml"/>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    ${coverFilename ? '<item id="CoverPage" href="CoverPage.xhtml" media-type="application/xhtml+xml"/>' : ''}
    ${imagesManifest}
  </manifest>
  <spine toc="ncxtoc"${isRtl ? ' page-progression-direction="rtl"' : ''}>
    ${coverFilename ? '<itemref idref="CoverPage"/>' : ''}
    <itemref idref="summary"/>
    <itemref idref="content"/>
  </spine>
  <guide>
    ${coverFilename ? '<reference type="cover" title="CoverPage" href="CoverPage.xhtml"/>' : ''}
    <reference type="text" title="Entry 1 of 1" href="content.xhtml"/>
  </guide>
</package>`;

  // 12. Build ZIP structure using fflate
  const zipEntries: Record<string, any> = {
    'mimetype': [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(containerXml),
    'OEBPS/content.opf': strToU8(contentOpf),
    'OEBPS/toc.ncx': strToU8(tocNcx),
    'OEBPS/nav.xhtml': strToU8(navXhtml),
    'OEBPS/Styles/CoverPage.css': strToU8(coverCss),
    'OEBPS/Styles/style.css': strToU8(styleCss),
    'OEBPS/summary.xhtml': strToU8(summaryXhtml),
    'OEBPS/content.xhtml': strToU8(contentXhtml),
  };

  if (coverFilename) {
    zipEntries['OEBPS/CoverPage.xhtml'] = strToU8(coverXhtml);
  }

  // Add all bundled images to ZIP
  for (const img of bundledImages) {
    zipEntries[img.zipPath] = img.data;
  }

  return zipSync(zipEntries);
}

export async function generateEpubBlob(article: EpubArticleInput, options?: EpubOptions): Promise<Blob> {
  const bytes = await generateEpub(article, options);
  return new Blob([bytes], { type: 'application/epub+zip' });
}

export async function generateDigestEpub(
  articles: EpubArticleInput[],
  options: DigestOptions = {}
): Promise<Uint8Array> {
  const uid = `urn:wallaflare:digest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const dateStr = new Date().toISOString().split('T')[0];
  const digestTitle = options.title || `Wallaflare Digest — ${dateStr}`;
  const escapedDigestTitle = escapeXml(digestTitle);
  const creator = options.author || 'Wallaflare';
  const escapedCreator = escapeXml(creator);

  if (!articles || articles.length === 0) {
    return generateEpub({
      title: digestTitle,
      content: '<p>No articles included in this digest.</p>',
    });
  }

  // Check RTL dominance
  const rtlCount = articles.filter(a => isRtlLanguage(a.language, (a.title || '') + ' ' + (a.content || ''))).length;
  const primaryRtl = rtlCount > articles.length / 2;
  const primaryLang = primaryRtl ? 'he' : (articles[0].language || 'en');

  const bundledImages: BundledImage[] = [];
  const urlToBundledImage = new Map<string, BundledImage>();
  const maxImages = typeof options.maxImages === 'number' && options.maxImages >= 0
    ? options.maxImages
    : DEFAULT_EPUB_MAX_IMAGES;

  const processedArticles: Array<{
    title: string;
    escapedTitle: string;
    author: string;
    escapedAuthor: string;
    domain: string;
    escapedDomain: string;
    readingTime: number;
    url: string;
    isRtl: boolean;
    lang: string;
    cleanBodyHtml: string;
    leadImageHtml: string;
    chapterFile: string;
    chapterId: string;
  }> = [];

  let totalReadingTime = 0;

  for (let i = 0; i < articles.length; i++) {
    const art = articles[i];
    const artTitle = art.title || `Article ${i + 1}`;
    const artIsRtl = isRtlLanguage(art.language, (art.title || '') + ' ' + (art.content || ''));
    const artLang = art.language || (artIsRtl ? 'he' : 'en');
    const artDomain = art.domain_name || (art.url ? (() => { try { return new URL(art.url).hostname; } catch { return 'wallabag'; } })() : 'wallabag');
    const artAuthor = art.author || (art.authors && art.authors.length > 0 ? art.authors.join(', ') : '');
    const artReadingTime = art.reading_time || 1;
    totalReadingTime += artReadingTime;

    let artPreviewUrl = art.preview_picture ? art.preview_picture.trim() : null;
    if (artPreviewUrl?.startsWith('//')) {
      artPreviewUrl = 'https:' + artPreviewUrl;
    } else if (artPreviewUrl && !artPreviewUrl.startsWith('http://') && !artPreviewUrl.startsWith('https://') && !artPreviewUrl.startsWith('data:') && art.url) {
      try { artPreviewUrl = new URL(artPreviewUrl, art.url).href; } catch {}
    }

    if (artPreviewUrl && !urlToBundledImage.has(artPreviewUrl) && bundledImages.length < maxImages) {
      const imgRes = await fetchImageBytes(artPreviewUrl, art.url);
      if (imgRes) {
        const currentIdx = bundledImages.length + 1;
        const imgFilename = `img_${currentIdx}.${imgRes.ext}`;
        const bundled: BundledImage = {
          id: `img-${currentIdx}`,
          href: `images/${imgFilename}`,
          zipPath: `OEBPS/images/${imgFilename}`,
          mime: imgRes.mime,
          data: imgRes.data,
        };
        bundledImages.push(bundled);
        urlToBundledImage.set(artPreviewUrl, bundled);
      }
    }

    const doc = cleanAndSanitizeDoc(art.content || '', artIsRtl);
    await processInlineImages(doc, art.url, bundledImages, urlToBundledImage, maxImages);

    const firstDocImg = doc.querySelector('img');
    const firstDocImgSrc = firstDocImg ? (firstDocImg.getAttribute('data-target-url') || firstDocImg.getAttribute('src')) : null;
    const isLeadAlreadyInBody = Boolean(firstDocImgSrc && artPreviewUrl && (
      firstDocImgSrc === artPreviewUrl ||
      (urlToBundledImage.has(artPreviewUrl) && firstDocImg.getAttribute('src') === urlToBundledImage.get(artPreviewUrl)!.href)
    ));

    let artLeadImageHtml = '';
    if (artPreviewUrl && !isLeadAlreadyInBody) {
      const bundledCover = urlToBundledImage.get(artPreviewUrl);
      const leadImgSrc = bundledCover ? bundledCover.href : escapeXml(artPreviewUrl);
      artLeadImageHtml = `<div class="article-lead-image"><figure><img src="${leadImgSrc}" alt="${escapeXml(artTitle)}" class="lead-image"/></figure></div>\n`;
    }

    const cleanBodyHtml = bodyToXhtml(doc.body);

    processedArticles.push({
      title: artTitle,
      escapedTitle: escapeXml(artTitle),
      author: artAuthor,
      escapedAuthor: escapeXml(artAuthor),
      domain: artDomain,
      escapedDomain: escapeXml(artDomain),
      readingTime: artReadingTime,
      url: art.url ? escapeXml(art.url) : '',
      isRtl: artIsRtl,
      lang: artLang,
      cleanBodyHtml,
      leadImageHtml: artLeadImageHtml,
      chapterFile: `article_${i + 1}.xhtml`,
      chapterId: `article_${i + 1}`,
    });
  }

  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  const styleCss = getArticleStyleCss();

  const tocItemsHtml = processedArticles.map((p) => `
    <li class="digest-toc-item">
      <a href="${p.chapterFile}">${p.escapedTitle}</a>
      <div class="digest-toc-meta">
        ${p.escapedAuthor ? p.escapedAuthor + ' &#x2022; ' : ''}${p.escapedDomain} &#x2022; ${p.readingTime} ${p.isRtl ? 'דק׳' : 'min'}
      </div>
    </li>`).join('');

  const summaryXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${primaryLang}" dir="${primaryRtl ? 'rtl' : 'ltr'}" class="${primaryRtl ? 'rtl' : ''}">
<head>
  <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
  <title>${escapedDigestTitle}</title>
  <link type="text/css" rel="stylesheet" href="Styles/style.css"/>${primaryRtl ? `
  <style type="text/css">
    body, p, div, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, article, section {
      direction: rtl;
      text-align: right;
    }
  </style>` : ''}
</head>
<body dir="${primaryRtl ? 'rtl' : 'ltr'}" class="${primaryRtl ? 'rtl' : ''}" style="${primaryRtl ? 'direction: rtl; text-align: right;' : ''}">
  <h1 dir="${primaryRtl ? 'rtl' : 'ltr'}">${escapedDigestTitle}</h1>
  <p class="article-meta" dir="${primaryRtl ? 'rtl' : 'ltr'}">${articles.length} ${articles.length === 1 ? 'Article' : 'Articles'} &#x2022; ~${totalReadingTime} ${primaryRtl ? 'דקות קריאה' : 'min read'} &#x2022; ${dateStr}</p>
  <hr class="article-divider"/>
  <h2 dir="${primaryRtl ? 'rtl' : 'ltr'}">${primaryRtl ? 'תוכן עניינים' : 'Table of Contents'}</h2>
  <ol class="digest-toc-list" dir="${primaryRtl ? 'rtl' : 'ltr'}">
    ${tocItemsHtml}
  </ol>
</body>
</html>`;

  const chapterEntries: Record<string, Uint8Array> = {};
  for (const p of processedArticles) {
    const chapterHtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${p.lang}" dir="${p.isRtl ? 'rtl' : 'ltr'}" class="${p.isRtl ? 'rtl' : ''}">
<head>
  <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
  <title>${p.escapedTitle}</title>
  <link type="text/css" rel="stylesheet" href="Styles/style.css"/>${p.isRtl ? `
  <style type="text/css">
    body, p, div, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, article, section {
      direction: rtl;
      text-align: right;
    }
  </style>` : ''}
</head>
<body dir="${p.isRtl ? 'rtl' : 'ltr'}" class="${p.isRtl ? 'rtl' : ''}" style="${p.isRtl ? 'direction: rtl; text-align: right;' : ''}">
  <div class="article-header" dir="${p.isRtl ? 'rtl' : 'ltr'}">
    <h1 dir="${p.isRtl ? 'rtl' : 'ltr'}">${p.escapedTitle}</h1>
    <p class="article-meta" dir="${p.isRtl ? 'rtl' : 'ltr'}">${p.escapedAuthor ? p.escapedAuthor + ' &#x2022; ' : ''}${p.escapedDomain} &#x2022; ${p.readingTime} ${p.isRtl ? 'דק׳' : 'min'}${p.url ? ` &#x2022; <a href="${p.url}">${p.isRtl ? 'מקור' : 'Original'}</a>` : ''}</p>
  </div>
  <hr class="article-divider"/>
  ${p.leadImageHtml}${p.cleanBodyHtml}
</body>
</html>`;
    chapterEntries[`OEBPS/${p.chapterFile}`] = strToU8(chapterHtml);
  }

  const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${primaryLang}" dir="${primaryRtl ? 'rtl' : 'ltr'}" class="${primaryRtl ? 'rtl' : ''}">
<head>
  <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
  <title>${escapedDigestTitle}</title>
  <link type="text/css" rel="stylesheet" href="Styles/style.css"/>${primaryRtl ? `
  <style type="text/css">
    body, p, div, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, article, section {
      direction: rtl;
      text-align: right;
    }
  </style>` : ''}
</head>
<body dir="${primaryRtl ? 'rtl' : 'ltr'}" class="${primaryRtl ? 'rtl' : ''}" style="${primaryRtl ? 'direction: rtl; text-align: right;' : ''}">
  <nav epub:type="toc" id="toc">
    <h2>${primaryRtl ? 'תוכן עניינים' : 'Table of Contents'}</h2>
    <ol>
      <li><a epub:type="frontmatter" href="summary.xhtml">${primaryRtl ? 'תקציר' : 'Summary'}</a></li>
      ${processedArticles.map(p => `<li><a epub:type="text" href="${p.chapterFile}">${p.escapedTitle}</a></li>`).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;

  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="${primaryLang}">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapedDigestTitle}</text>
  </docTitle>
  <docAuthor>
    <text>${escapedCreator}</text>
  </docAuthor>
  <navMap>
    <navPoint id="summary-nav" playOrder="1">
      <navLabel><text>${primaryRtl ? 'תקציר' : 'Summary'}</text></navLabel>
      <content src="summary.xhtml"/>
    </navPoint>
    ${processedArticles.map((p, idx) => `
    <navPoint id="nav-${p.chapterId}" playOrder="${idx + 2}">
      <navLabel><text>${p.escapedTitle}</text></navLabel>
      <content src="${p.chapterFile}"/>
    </navPoint>`).join('')}
  </navMap>
</ncx>`;

  const imagesManifest = bundledImages.map(img =>
    `<item id="${img.id}" href="${img.href}" media-type="${img.mime}"/>`
  ).join('\n    ');

  const chaptersManifest = processedArticles.map(p =>
    `<item id="${p.chapterId}" href="${p.chapterFile}" media-type="application/xhtml+xml"/>`
  ).join('\n    ');

  const chaptersSpine = processedArticles.map(p =>
    `<itemref idref="${p.chapterId}"/>`
  ).join('\n    ');

  const allTags = new Set<string>();
  articles.forEach(a => {
    (a.tags || []).forEach(t => {
      const val = typeof t === 'string' ? t : t?.label;
      if (val) allTags.add(val);
    });
  });
  const tagSubjects = Array.from(allTags).map(t => `\n    <dc:subject>${escapeXml(t)}</dc:subject>`).join('');

  const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
	xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xmlns:dcterms="http://purl.org/dc/terms/"
	xmlns:dc="http://purl.org/dc/elements/1.1/"
	unique-identifier="BookId" version="3.0">
  <metadata>
    <dc:identifier id="BookId">${uid}</dc:identifier>
    <dc:title>${escapedDigestTitle}</dc:title>
    <dc:language>${primaryLang}</dc:language>
    <dc:creator>${escapedCreator}</dc:creator>
    <dc:publisher>Wallaflare</dc:publisher>
    <dc:date>${dateStr}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>${tagSubjects}
  </metadata>
  <manifest>
    <item id="epub3toc" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncxtoc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style.css" href="Styles/style.css" media-type="text/css"/>
    <item id="summary" href="summary.xhtml" media-type="application/xhtml+xml"/>
    ${chaptersManifest}
    ${imagesManifest}
  </manifest>
  <spine toc="ncxtoc"${primaryRtl ? ' page-progression-direction="rtl"' : ''}>
    <itemref idref="summary"/>
    ${chaptersSpine}
  </spine>
  <guide>
    <reference type="toc" title="Table of Contents" href="summary.xhtml"/>
    <reference type="text" title="First Article" href="${processedArticles[0].chapterFile}"/>
  </guide>
</package>`;

  const zipEntries: Record<string, any> = {
    'mimetype': [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(containerXml),
    'OEBPS/content.opf': strToU8(contentOpf),
    'OEBPS/toc.ncx': strToU8(tocNcx),
    'OEBPS/nav.xhtml': strToU8(navXhtml),
    'OEBPS/Styles/style.css': strToU8(styleCss),
    'OEBPS/summary.xhtml': strToU8(summaryXhtml),
    ...chapterEntries,
  };

  for (const img of bundledImages) {
    zipEntries[img.zipPath] = img.data;
  }

  return zipSync(zipEntries);
}

export async function generateDigestEpubBlob(
  articles: EpubArticleInput[],
  options: DigestOptions = {}
): Promise<Blob> {
  const bytes = await generateDigestEpub(articles, options);
  return new Blob([bytes], { type: 'application/epub+zip' });
}
