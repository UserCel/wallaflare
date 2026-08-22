import { zipSync, strToU8 } from 'fflate';
import { parseHTML } from 'linkedom';

export interface EpubArticleInput {
  id?: number | string;
  title: string;
  content: string;
  url?: string | null;
  domain_name?: string | null;
  created_at?: string;
  language?: string;
}

function escapeXml(unsafe: string): string {
  return unsafe
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

    // Ensure all images have alt tags and clean src
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

export function generateEpub(article: EpubArticleInput): Uint8Array {
  const uid = `urn:uuid:wallaflare-${article.id || Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const title = article.title || 'Untitled Article';
  const escapedTitle = escapeXml(title);
  const lang = article.language || 'en';
  const domain = article.domain_name || (article.url ? new URL(article.url).hostname : 'Wallaflare');
  const escapedDomain = escapeXml(domain);
  const dateStr = article.created_at ? new Date(article.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const originalUrl = article.url ? escapeXml(article.url) : '';

  const cleanBodyHtml = sanitizeToXhtml(article.content);

  // 1. Container XML
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;

  // 2. CSS Stylesheet (tuned for e-ink readers like KOReader & Kindle)
  const styleCss = `
@charset "utf-8";
body {
  font-family: serif;
  line-height: 1.6;
  margin: 5% 5%;
  padding: 0;
  text-align: justify;
  color: #111;
}
h1, h2, h3, h4, h5, h6 {
  font-family: sans-serif;
  line-height: 1.25;
  margin-top: 1.4em;
  margin-bottom: 0.5em;
  text-align: left;
  page-break-after: avoid;
}
h1 { font-size: 1.8em; }
h2 { font-size: 1.4em; }
h3 { font-size: 1.2em; }
p {
  margin: 0 0 1em 0;
  text-indent: 1em;
}
p.no-indent, .title-meta p {
  text-indent: 0;
}
blockquote {
  margin: 1.2em 0 1.2em 1.5em;
  padding-left: 1em;
  border-left: 3px solid #666;
  font-style: italic;
}
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}
pre, code {
  font-family: monospace;
  font-size: 0.9em;
  background-color: #f4f4f4;
  padding: 0.2em 0.4em;
  border-radius: 3px;
}
pre {
  padding: 1em;
  overflow-x: auto;
  white-space: pre-wrap;
}
hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 2em 0;
}
.title-header {
  margin-bottom: 2.5em;
  padding-bottom: 1.5em;
  border-bottom: 1px solid #aaa;
  text-align: left;
}
.title-header h1 {
  font-size: 2em;
  margin-bottom: 0.3em;
}
.title-meta {
  font-size: 0.9em;
  color: #555;
  font-family: sans-serif;
}
.title-meta a {
  color: #555;
  text-decoration: none;
}
`;

  // 3. Navigation document (EPUB3)
  const navXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head>
  <title>${escapedTitle}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="content.xhtml">${escapedTitle}</a></li>
    </ol>
  </nav>
</body>
</html>`;

  // 4. NCX TOC (EPUB2 / KOReader)
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
    <meta name="dtb:depth" content="1"/>
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
    <navPoint id="navPoint-1" playOrder="1">
      <navLabel>
        <text>${escapedTitle}</text>
      </navLabel>
      <content src="content.xhtml"/>
    </navPoint>
  </navMap>
</ncx>`;

  // 5. Article Content XHTML
  const contentXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>${escapedTitle}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="title-header">
    <h1>${escapedTitle}</h1>
    <div class="title-meta">
      <p class="no-indent">
        <strong>Source:</strong> ${escapedDomain} | 
        <strong>Date:</strong> ${dateStr}
        ${originalUrl ? `<br/><strong>URL:</strong> <a href="${originalUrl}">${originalUrl}</a>` : ''}
      </p>
    </div>
  </div>
  <div class="article-body">
    ${cleanBodyHtml}
  </div>
</body>
</html>`;

  // 6. OPF Package file
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0" xml:lang="${lang}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">${uid}</dc:identifier>
    <dc:title>${escapedTitle}</dc:title>
    <dc:language>${lang}</dc:language>
    <dc:creator>${escapedDomain}</dc:creator>
    <dc:publisher>Wallaflare</dc:publisher>
    <dc:date>${dateStr}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`;

  // Build ZIP structure using fflate
  // mimetype must be uncompressed (level 0)
  const zipData = zipSync({
    'mimetype': [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(containerXml),
    'OEBPS/content.opf': strToU8(contentOpf),
    'OEBPS/toc.ncx': strToU8(tocNcx),
    'OEBPS/nav.xhtml': strToU8(navXhtml),
    'OEBPS/style.css': strToU8(styleCss),
    'OEBPS/content.xhtml': strToU8(contentXhtml),
  });

  return zipData;
}
