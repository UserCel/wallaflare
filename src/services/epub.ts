import { zipSync, strToU8 } from 'fflate';
import { parseHTML } from 'linkedom';

export interface EpubArticleInput {
  preview_picture?: string | null;
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
  const uid = `urn:uuid:wallaflare-${article.id || Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const title = article.title || 'Untitled Article';
  const escapedTitle = escapeXml(title);
  const lang = article.language || 'en';
  const domain = article.domain_name || (article.url ? new URL(article.url).hostname : 'Wallaflare');
  const escapedDomain = escapeXml(domain);
  const dateStr = article.created_at ? new Date(article.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
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
  margin-bottom: 2em;
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
.cover-image-wrap {
  text-align: center;
  margin-bottom: 2em;
}
.cover-image {
  max-width: 100%;
  max-height: 480px;
  margin: 0 auto;
  display: block;
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
  const coverHtml = coverBytes
    ? `<div class="cover-image-wrap"><img src="images/${coverFilename}" alt="Cover" class="cover-image"/></div>`
    : '';

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
  ${coverHtml}
  <div class="article-body">
    ${cleanBodyHtml}
  </div>
</body>
</html>`;

  // 6. OPF Package file
  const coverManifestItem = coverBytes
    ? `<item id="cover-image" href="images/${coverFilename}" media-type="${coverMime}" properties="cover-image"/>`
    : '';
  const coverMetaItem = coverBytes
    ? `<meta name="cover" content="cover-image"/>`
    : '';

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
    ${coverMetaItem}
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="content" href="content.xhtml" media-type="application/xhtml+xml"/>
    ${coverManifestItem}
  </manifest>
  <spine toc="ncx">
    <itemref idref="content"/>
  </spine>
</package>`;

  // Build ZIP structure using fflate
  const zipEntries: Record<string, any> = {
    'mimetype': [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(containerXml),
    'OEBPS/content.opf': strToU8(contentOpf),
    'OEBPS/toc.ncx': strToU8(tocNcx),
    'OEBPS/nav.xhtml': strToU8(navXhtml),
    'OEBPS/style.css': strToU8(styleCss),
    'OEBPS/content.xhtml': strToU8(contentXhtml),
  };

  if (coverBytes) {
    zipEntries['OEBPS/images/' + coverFilename] = coverBytes;
  }

  return zipSync(zipEntries);
}
