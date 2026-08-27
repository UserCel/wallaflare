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
}

const MAX_INLINE_IMAGES = 30;
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
    const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    return rtlRegex.test(textSample.slice(0, 800));
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

function getBestImageUrl(img: any): string | null {
  const rawSrcset = img.getAttribute('srcset')?.trim();
  if (rawSrcset) {
    const candidates = rawSrcset
      .split(',')
      .map((item: string) => {
        const parts = item.trim().split(/\s+/);
        const url = parts[0];
        const width = parts[1] && parts[1].endsWith('w') ? parseInt(parts[1].slice(0, -1), 10) : 1000;
        return { url, width };
      })
      .filter((c: any) => c.url && (c.url.startsWith('http://') || c.url.startsWith('https://')));

    if (candidates.length > 0) {
      // Prioritize reasonable size (~800-1200px) for e-ink reading
      candidates.sort((a: any, b: any) => Math.abs(a.width - 1000) - Math.abs(b.width - 1000));
      return candidates[0].url;
    }
  }

  const rawSrc = img.getAttribute('src')?.trim() || img.getAttribute('data-src')?.trim();
  if (rawSrc && (rawSrc.startsWith('http://') || rawSrc.startsWith('https://'))) {
    return rawSrc;
  }
  return null;
}

export async function generateEpub(article: EpubArticleInput): Promise<Uint8Array> {
  const uid = `urn:wallabag:${article.id || Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const title = article.title || 'Untitled Article';
  const escapedTitle = escapeXml(title);
  const isRtl = isRtlLanguage(article.language, (article.title || '') + ' ' + (article.content || ''));
  const lang = article.language || (isRtl ? 'he' : 'en');
  const domain = article.domain_name || (article.url ? new URL(article.url).hostname : 'wallabag');
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
  if (article.preview_picture && (article.preview_picture.startsWith('http://') || article.preview_picture.startsWith('https://'))) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
      const imgRes = await fetch(article.preview_picture, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          ...(article.url ? { 'Referer': article.url } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (imgRes.ok) {
        const ct = (imgRes.headers.get('content-type') || '').toLowerCase();
        let ext = 'jpg';
        let mime = 'image/jpeg';
        if (ct.includes('png')) { ext = 'png'; mime = 'image/png'; }
        else if (ct.includes('webp')) { ext = 'webp'; mime = 'image/webp'; }
        else if (ct.includes('gif')) { ext = 'gif'; mime = 'image/gif'; }

        const buf = await imgRes.arrayBuffer();
        if (buf.byteLength > 0 && buf.byteLength <= MAX_IMAGE_BYTES) {
          coverFilename = `cover.${ext}`;
          const coverImage: BundledImage = {
            id: 'cover-image',
            href: `images/${coverFilename}`,
            zipPath: `OEBPS/images/${coverFilename}`,
            mime,
            data: new Uint8Array(buf),
          };
          bundledImages.push(coverImage);
          urlToBundledImage.set(article.preview_picture, coverImage);
        }
      }
    } catch (e) {
      console.warn('Cover image fetch failed:', e);
    }
  }

  // 2. Parse & sanitize content HTML, fetching inline images
  const document = parseHtmlDoc(`<!DOCTYPE html><html><body>${article.content || ''}</body></html>`);

  // Remove unsafe elements
  const removeSelectors = ['script', 'style', 'iframe', 'noscript', 'object', 'embed'];
  removeSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el: any) => el.remove());
  });


  // Clean KOReader/Crengine incompatible wrappers around images
  // Remove mobile duplicates, gallery overlays, and unwrap convoluted tags
  document.querySelectorAll('.gallery-indication, .mobileView, span.mobileView, div.mobileView').forEach((el: any) => el.remove());
  document.querySelectorAll('[contenteditable]').forEach((el: any) => el.removeAttribute('contenteditable'));
  document.querySelectorAll('a.gelleryOpener').forEach((a: any) => {
    // If a.gelleryOpener only wraps an image, unwrap it so Crengine renders standard image
    const img = a.querySelector('img');
    if (img) {
      a.replaceWith(img);
    }
  });

  // Extract unique image targets
  const allImgs: any[] = Array.from(document.querySelectorAll('img'));
  const uniqueUrls: string[] = [];

  for (const img of allImgs) {
    const targetUrl = getBestImageUrl(img);
    if (targetUrl) {
      img.setAttribute('data-target-url', targetUrl);
      if (!uniqueUrls.includes(targetUrl) && uniqueUrls.length < MAX_INLINE_IMAGES) {
        uniqueUrls.push(targetUrl);
      }
    }
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.removeAttribute('data-src');
    img.removeAttribute('data-srcset');
    img.removeAttribute('loading');
    if (!img.getAttribute('alt')) img.setAttribute('alt', '');
  }

  // Fetch unique images in parallel
  let inlineCounter = 0;
  const inlineFetchTasks = uniqueUrls.map(async (targetUrl) => {
    if (urlToBundledImage.has(targetUrl)) return;

    try {
      inlineCounter++;
      const currentIdx = inlineCounter;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          ...(article.url ? { 'Referer': article.url } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        let ext = 'jpg';
        let mime = 'image/jpeg';
        if (ct.includes('png')) { ext = 'png'; mime = 'image/png'; }
        else if (ct.includes('webp')) { ext = 'webp'; mime = 'image/webp'; }
        else if (ct.includes('gif')) { ext = 'gif'; mime = 'image/gif'; }
        else if (ct.includes('svg')) { ext = 'svg'; mime = 'image/svg+xml'; }

        const buf = await res.arrayBuffer();
        if (buf.byteLength > 0 && buf.byteLength <= MAX_IMAGE_BYTES) {
          const imgFilename = `inline_${currentIdx}.${ext}`;
          const imgId = `inline-img-${currentIdx}`;
          const bundled: BundledImage = {
            id: imgId,
            href: `images/${imgFilename}`,
            zipPath: `OEBPS/images/${imgFilename}`,
            mime,
            data: new Uint8Array(buf),
          };
          bundledImages.push(bundled);
          urlToBundledImage.set(targetUrl, bundled);
        }
      }
    } catch (e) {
      console.warn(`Inline image ${targetUrl} fetch skipped:`, e);
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
      const targetUrl = img.getAttribute('data-target-url') || '';

      const targetAttr = targetUrl ? ` data-target-url="${targetUrl}"` : '';
      if (captionText) {
        fig.innerHTML = `<img src="${src}" alt="${escapeXml(alt)}"${targetAttr} /><figcaption>${escapeXml(captionText)}</figcaption>`;
      } else {
        fig.innerHTML = `<img src="${src}" alt="${escapeXml(alt)}"${targetAttr} />`;
      }
    }
  });

  // Strip all non-semantic site container classes from root elements
  document.querySelectorAll('.dynamicHeightItemsColumn, .RelativeElementsContainer, .site_page_root, .no-print').forEach((el: any) => {
    el.removeAttribute('class');
    el.removeAttribute('style');
  });

  const cleanBodyHtml = bodyToXhtml(document.body);

  // 3. Container XML
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // 4. CoverPage CSS
  const coverCss = `@page, body, div, img {
	padding: 0pt;
	margin: 0pt;
}
body {
	text-align: center;
}
img.cover-img {
	height: 100%;
	max-height: 100vh;
	max-width: 100%;
	object-fit: contain;
}`;

  // 5. Article Content CSS
  const styleCss = `@charset "utf-8";
body {
  margin: 0;
  padding: 0;
}
body[dir="rtl"], html[dir="rtl"] body {
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
[dir="rtl"] dl dd {
  margin-right: 0;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0.8em auto;
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
[dir="rtl"] blockquote {
  border-left: none;
  border-right: 3px solid #ccc;
}
`;

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
  <title>Cover Image</title>
  <link type="text/css" rel="stylesheet" href="Styles/CoverPage.css"/>
</head>
<body>
  <section epub:type="cover">
    <img src="images/${coverFilename}" alt="Cover image" class="cover-img"/>
  </section>
</body>
</html>` : '';

  // 9. Page 2: summary.xhtml
  const summaryXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
<head>
  <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
  <title>wallabag articles book</title>
  <link type="text/css" rel="stylesheet" href="Styles/style.css"/>
</head>
<body dir="${isRtl ? 'rtl' : 'ltr'}">
  <h1>${escapedTitle}</h1>
  <dl>
    <dt>${isRtl ? 'פורסם על ידי' : 'Published by'}</dt>
    <dd>${escapedAuthor || escapedDomain}</dd>

    <dt>${isRtl ? 'פורסם בתאריך' : 'Published on'}</dt>
    <dd>${publishedOnStr}</dd>

    <dt>${isRtl ? 'זמן קריאה משוער' : 'Estimated reading time'}</dt>
    <dd>${readingTime} ${isRtl ? 'דקות' : 'min'}</dd>

    <dt>${isRtl ? 'נוסף בתאריך' : 'Added on'}</dt>
    <dd>${addedOnStr}</dd>

    <dt>${isRtl ? 'כתובת מקור' : 'Address'}</dt>
    <dd>
      <a href="${originalUrl}">${originalUrl || '-'}</a>
    </dd>
  </dl>
</body>
</html>`;

  // 10. Page 3: content.xhtml (Exact Wallabag structure, raw body with no style link or artificial whitespace)
  const contentXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
  <head>
    <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
    <title>wallabag articles book</title>
    ${isRtl ? '<link type="text/css" rel="stylesheet" href="Styles/style.css"/>' : ''}
  </head>
  <body dir="${isRtl ? 'rtl' : 'ltr'}">${cleanBodyHtml}</body>
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
    ${coverMetaItem}
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
