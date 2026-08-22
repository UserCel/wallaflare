import { zipSync, strToU8 } from 'fflate';
import { parseHTML } from 'linkedom';

export interface EpubArticleInput {
  id?: number | string;
  title: string;
  content: string;
  url?: string | null;
  domain_name?: string | null;
  preview_picture?: string | null;
  reading_time?: number | null;
  authors?: string[] | null;
  created_at?: string;
  published_at?: string | null;
  language?: string;
}

function escapeXml(unsafe: string): string {
  return (unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeToXhtml(htmlContent: string): string {
  try {
    const { document } = parseHTML(`<!DOCTYPE html><html><body>${htmlContent}</body></html>`);
    // Remove unsafe or redundant elements
    const removeSelectors = ['script', 'style', 'iframe', 'noscript', 'object', 'embed'];
    removeSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach((el: any) => el.remove());
    });

    // Ensure all images have alt tags
    document.querySelectorAll('img').forEach((img: any) => {
      if (!img.getAttribute('alt')) {
        img.setAttribute('alt', '');
      }
    });

    return document.body.innerHTML;
  } catch {
    return `<div>${escapeXml(htmlContent)}</div>`;
  }
}

export async function generateEpub(article: EpubArticleInput): Promise<Uint8Array> {
  const uid = `urn:wallabag:${article.id || Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const title = article.title || 'Untitled Article';
  const escapedTitle = escapeXml(title);
  const lang = article.language || 'en';
  const domain = article.domain_name || (article.url ? new URL(article.url).hostname : 'wallabag');
  const escapedDomain = escapeXml(domain);
  const readingTime = article.reading_time || 1;
  const authorsStr = (article.authors && article.authors.length > 0) ? article.authors.join(', ') : '';
  const escapedAuthors = escapeXml(authorsStr) || 'Unknown';

  const addedOnStr = article.created_at ? new Date(article.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const publishedOnStr = article.published_at ? new Date(article.published_at).toISOString().split('T')[0] : 'Unknown';
  const originalUrl = article.url ? escapeXml(article.url) : '';

  const cleanBodyHtml = sanitizeToXhtml(article.content);

  // Fetch cover picture if available
  let coverBytes: Uint8Array | null = null;
  let coverFilename = 'cover.jpg';
  let coverMime = 'image/jpeg';

  if (article.preview_picture && (article.preview_picture.startsWith('http://') || article.preview_picture.startsWith('https://'))) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const imgRes = await fetch(article.preview_picture, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (imgRes.ok) {
        const ct = (imgRes.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('png')) {
          coverFilename = 'cover.png';
          coverMime = 'image/png';
        } else if (ct.includes('webp')) {
          coverFilename = 'cover.webp';
          coverMime = 'image/webp';
        } else if (ct.includes('gif')) {
          coverFilename = 'cover.gif';
          coverMime = 'image/gif';
        } else {
          coverFilename = 'cover.jpg';
          coverMime = 'image/jpeg';
        }

        const buf = await imgRes.arrayBuffer();
        if (buf.byteLength > 0) {
          coverBytes = new Uint8Array(buf);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch EPUB cover image:', e);
    }
  }

  // 1. Container XML
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // 2. CoverPage CSS
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

    // 3. Article Content CSS (clean, unforced spacing so e-reader controls paragraphs)
  const styleCss = `@charset "utf-8";
body {
  margin: 0;
  padding: 0;
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
img {
  max-width: 100%;
  height: auto;
}
`;

  // 4. Navigation document (EPUB3)
  const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head>
  <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
  <title>${escapedTitle}</title>
</head>
<body epub:type="frontmatter toc">
  <header>
    <h1>Table of Contents</h1>
  </header>
  <nav epub:type="toc" id="toc">
    <ol>
      ${coverBytes ? '<li><a href="CoverPage.xhtml">Cover</a></li>' : ''}
      <li><a href="summary.xhtml">Summary</a></li>
      <li><a href="content.xhtml">${escapedTitle}</a></li>
    </ol>
  </nav>
  <nav epub:type="landmarks">
    <h2>Guide</h2>
    <ol>
      ${coverBytes ? '<li><a epub:type="cover" href="CoverPage.xhtml">CoverPage</a></li>' : ''}
      <li><a epub:type="text" href="content.xhtml">${escapedTitle}</a></li>
    </ol>
  </nav>
</body>
</html>`;

  // 5. NCX TOC (EPUB2 / KOReader)
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
    ${coverBytes ? `<navPoint id="cover-nav" playOrder="1"><navLabel><text>Cover</text></navLabel><content src="CoverPage.xhtml"/></navPoint>` : ''}
    <navPoint id="summary-nav" playOrder="${coverBytes ? 2 : 1}">
      <navLabel><text>Summary</text></navLabel>
      <content src="summary.xhtml"/>
    </navPoint>
    <navPoint id="content-nav" playOrder="${coverBytes ? 3 : 2}">
      <navLabel><text>${escapedTitle}</text></navLabel>
      <content src="content.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;

  // 6. Page 1: CoverPage.xhtml (matches Wallabag)
  const coverXhtml = coverBytes ? `<?xml version="1.0" encoding="utf-8"?>
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

    // 7. Page 2: summary.xhtml (Wallabag exact structure)
  const summaryXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
  <title>wallabag articles book</title>
  <link type="text/css" rel="stylesheet" href="Styles/style.css"/>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <dl>
    <dt>Published by</dt>
    <dd>${escapedAuthors !== 'Unknown' ? escapedAuthors : escapedDomain}</dd>
    <dt>Published on</dt>
    <dd>${publishedOnStr}</dd>
    <dt>Estimated reading time</dt>
    <dd>${readingTime} min</dd>
    <dt>Added on</dt>
    <dd>${addedOnStr}</dd>
    <dt>Address</dt>
    <dd>
      <a href="${originalUrl}">${originalUrl || '-'}</a>
    </dd>
  </dl>
</body>
</html>`;

    // 8. Page 3: content.xhtml (Wallabag starts directly with article body, no title repetition)
  const contentXhtml = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <meta http-equiv="Default-Style" content="text/html; charset=utf-8"/>
  <title>wallabag articles book</title>
</head>
<body>
${cleanBodyHtml}
</body>
</html>`;

  // 9. OPF Package file (matches Wallabag OPF structure)
  const coverManifestItem = coverBytes
    ? `<item id="cover-image" href="images/${coverFilename}" media-type="${coverMime}" properties="cover-image"/>\n    <item id="CoverPage" href="CoverPage.xhtml" media-type="application/xhtml+xml"/>`
    : '';
  const coverMetaItem = coverBytes
    ? `<meta name="cover" content="cover-image"/>`
    : '';

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
    <dc:creator>${escapedAuthors !== 'Unknown' ? escapedAuthors : escapedDomain}</dc:creator>
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
    ${coverManifestItem}
  </manifest>
  <spine toc="ncxtoc">
    ${coverBytes ? '<itemref idref="CoverPage"/>' : ''}
    <itemref idref="summary"/>
    <itemref idref="content"/>
  </spine>
  <guide>
    ${coverBytes ? '<reference type="cover" title="CoverPage" href="CoverPage.xhtml"/>' : ''}
    <reference type="text" title="Entry 1 of 1" href="content.xhtml"/>
  </guide>
</package>`;

  // Build ZIP structure using fflate
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

  if (coverBytes) {
    zipEntries['OEBPS/CoverPage.xhtml'] = strToU8(coverXhtml);
    zipEntries['OEBPS/images/' + coverFilename] = coverBytes;
  }

  return zipSync(zipEntries);
}
