import { describe, it, expect } from 'vitest';
import { generateEpub } from '../services/epub';
import { unzipSync, strFromU8 } from 'fflate';
import { parseHTML } from 'linkedom';

describe('EPUB 3 Generator', () => {
  it('generates a valid, readable EPUB zip package', async () => {
    const epubData = await generateEpub({
      id: 42,
      title: 'Edge Computing and the Future of Web',
      content: '<p>Cloudflare Workers provide sub-millisecond cold starts across 300+ edge locations globally.</p>',
      url: 'https://blog.cloudflare.com/edge-computing',
      domain_name: 'blog.cloudflare.com',
      created_at: '2026-08-22T08:00:00Z',
      language: 'en',
    });

    expect(epubData).toBeInstanceOf(Uint8Array);
    expect(epubData.byteLength).toBeGreaterThan(500);

    // Verify magic EPUB signature (PK ZIP header)
    expect(epubData[0]).toBe(0x50); // 'P'
    expect(epubData[1]).toBe(0x4B); // 'K'
  }, 15000);

  it('produces 100% strictly valid XHTML/XML even with unclosed void tags and nested spans', async () => {
    const problematicHtml = `
      <p class="intro"><em>Abyss…this upgrade is too good. </em>Will mused.</p>
      <p><span class="warning"><br>This story has been taken without authorization. Report any sightings.<br></span></p>
      <hr>
      <p>Image without self-closing tag: <img src="https://example.com/test.jpg" alt="test"></p>
      <p>Another paragraph with <br> inside text and <b>unclosed formatting</p>
    `;

    const epubData = await generateEpub({
      id: 313,
      title: 'Chapter 313 How did we get Here - The Legend of William Oh',
      content: problematicHtml,
      url: 'https://royalroad.com/fiction/chapter/313',
      domain_name: 'royalroad.com',
      language: 'en',
    });

    const unzipped = unzipSync(epubData);
    const xhtmlFiles = Object.keys(unzipped).filter(name => name.endsWith('.xhtml') || name.endsWith('.xml') || name.endsWith('.opf') || name.endsWith('.ncx'));

    expect(xhtmlFiles.length).toBeGreaterThan(3);

    for (const filename of xhtmlFiles) {
      const xmlStr = strFromU8(unzipped[filename]);
      
      // Strict verification: check that <br> is rendered as self-closing <br/> in XML
      if (filename.endsWith('content.xhtml')) {
        expect(xmlStr).toContain('<br/>');
        expect(xmlStr).not.toMatch(/<br>(?!<\/br>)/);
        expect(xmlStr).toContain('<hr/>');
      }

      // Verify it parses without error
      const { document } = parseHTML(xmlStr);
      expect(document).toBeDefined();
    }
  }, 15000);

  it('generates a multi-article Digest EPUB with Table of Contents and independent chapter directions', async () => {
    const { generateDigestEpub } = await import('../services/epub');
    const digestData = await generateDigestEpub([
      {
        id: 101,
        title: 'First Tech Article',
        content: '<p>English content about tech innovations and edge computing.</p>',
        domain_name: 'tech.example.com',
        reading_time: 3,
        language: 'en',
        tags: ['tech', 'cloud'],
      },
      {
        id: 102,
        title: 'מאמר בעברית על בינה מלאכותית',
        content: '<p>תוכן בעברית על התפתחות הבינה המלאכותית בישראל ובעולם.</p>',
        domain_name: 'ai.example.org',
        reading_time: 5,
        language: 'he',
        tags: ['ai', 'hebrew'],
      },
    ], {
      title: 'Wallaflare Weekly Digest',
    });

    expect(digestData).toBeInstanceOf(Uint8Array);
    expect(digestData.byteLength).toBeGreaterThan(1000);

    const unzipped = unzipSync(digestData);
    const files = Object.keys(unzipped);

    // Verify multi-chapter files exist
    expect(files).toContain('OEBPS/summary.xhtml');
    expect(files).toContain('OEBPS/article_1.xhtml');
    expect(files).toContain('OEBPS/article_2.xhtml');
    expect(files).toContain('OEBPS/nav.xhtml');
    expect(files).toContain('OEBPS/toc.ncx');
    expect(files).toContain('OEBPS/content.opf');

    // Verify summary table of contents has both articles
    const summaryStr = strFromU8(unzipped['OEBPS/summary.xhtml']);
    expect(summaryStr).toContain('First Tech Article');
    expect(summaryStr).toContain('מאמר בעברית על בינה מלאכותית');
    expect(summaryStr).toContain('article_1.xhtml');
    expect(summaryStr).toContain('article_2.xhtml');

    // Verify chapter 1 direction is LTR and chapter 2 is RTL
    const ch1Str = strFromU8(unzipped['OEBPS/article_1.xhtml']);
    expect(ch1Str).toContain('dir="ltr"');
    const ch2Str = strFromU8(unzipped['OEBPS/article_2.xhtml']);
    expect(ch2Str).toContain('dir="rtl"');

    // Verify EPUB 3 nav.xhtml and NCX contain both articles
    const navStr = strFromU8(unzipped['OEBPS/nav.xhtml']);
    expect(navStr).toContain('article_1.xhtml');
    expect(navStr).toContain('article_2.xhtml');

    const ncxStr = strFromU8(unzipped['OEBPS/toc.ncx']);
    expect(ncxStr).toContain('nav-article_1');
    expect(ncxStr).toContain('nav-article_2');

    // Verify OPF contains <dc:subject> tags
    const opfStr = strFromU8(unzipped['OEBPS/content.opf']);
    expect(opfStr).toContain('<dc:subject>tech</dc:subject>');
    expect(opfStr).toContain('<dc:subject>ai</dc:subject>');
  }, 15000);

  it('bundles opening lead image and inline images into the EPUB zip', async () => {
    // 1x1 PNG data URLs for deterministic offline testing
    const coverPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const inlinePngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mN8//8/AwAI/AL+X8c2/wAAAABJRU5ErkJggg==';

    const epubData = await generateEpub({
      id: 777,
      title: 'Article With Images',
      content: `
        <p>Introduction paragraph.</p>
        <p><img src="${inlinePngDataUrl}" alt="Inline Test Figure"/></p>
        <p>Concluding paragraph.</p>
      `,
      url: 'https://example.com/with-images',
      domain_name: 'example.com',
      preview_picture: coverPngDataUrl,
      language: 'en',
    });

    const unzipped = unzipSync(epubData);
    const files = Object.keys(unzipped);

    // Verify cover image exists in zip
    expect(files).toContain('OEBPS/images/cover.png');
    expect(files).toContain('OEBPS/CoverPage.xhtml');

    // Verify inline image exists in zip
    expect(files).toContain('OEBPS/images/inline_1.png');

    // Verify content.xhtml links style.css
    const contentStr = strFromU8(unzipped['OEBPS/content.xhtml']);
    expect(contentStr).toContain('<link type="text/css" rel="stylesheet" href="Styles/style.css"/>');

    // Verify opening lead image is placed at top of content.xhtml
    expect(contentStr).toContain('article-lead-image');
    expect(contentStr).toContain('src="images/cover.png"');

    // Verify inline image src was rewritten to bundled local path
    expect(contentStr).toContain('src="images/inline_1.png"');

    // Verify OPF manifest declares cover-image and inline images
    const opfStr = strFromU8(unzipped['OEBPS/content.opf']);
    expect(opfStr).toContain('id="cover-image"');
    expect(opfStr).toContain('properties="cover-image"');
    expect(opfStr).toContain('id="inline-img-1"');
    expect(opfStr).toContain('href="images/inline_1.png"');
  }, 15000);

  it('enforces right alignment for Okular and Qt readers in Hebrew/RTL EPUBs', async () => {
    const hebrewHtml = `
      <div align="left" style="text-align: left;">
        <p style="text-align: left;">פסקה ראשונה עם יישור שגוי מהאתר המקורי.</p>
        <p>פסקה שניה בעברית.</p>
      </div>
    `;

    const epubData = await generateEpub({
      id: 999,
      title: 'כותרת בעברית לבדיקת אוקולר',
      content: hebrewHtml,
      language: 'he',
    });

    const unzipped = unzipSync(epubData);
    const contentStr = strFromU8(unzipped['OEBPS/content.xhtml']);
    const styleCss = strFromU8(unzipped['OEBPS/Styles/style.css']);

    // Verify class="rtl" is present for Okular/Qt
    expect(contentStr).toContain('class="rtl"');

    // Verify embedded style tag exists in head without !important (which breaks Qt CSS parser)
    expect(contentStr).toContain('direction: rtl;');
    expect(contentStr).toContain('text-align: right;');

    // Verify block elements have dir="rtl" and align="right" for Qt QTextDocument block formatting
    expect(contentStr).toContain('<p align="right" dir="rtl">');

    // Verify hardcoded left alignments from scraped html were cleaned/fixed
    expect(contentStr).not.toContain('align="left"');
    expect(contentStr).not.toContain('text-align: left');
    expect(contentStr).toContain('text-align: right');

    // Verify style.css contains class-based rules for Qt
    expect(styleCss).toContain('body.rtl, .rtl, .rtl p');
    expect(styleCss).toContain('direction: rtl;');
    expect(styleCss).toContain('text-align: right;');
  }, 15000);

  it('respects configurable maxImages budget option', async () => {
    const pngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const epubData = await generateEpub({
      id: 888,
      title: 'Article With Many Images',
      content: `
        <p><img src="${pngDataUrl}" alt="Img 1"/></p>
        <p><img src="${pngDataUrl}" alt="Img 2"/></p>
        <p><img src="${pngDataUrl}" alt="Img 3"/></p>
      `,
      preview_picture: pngDataUrl,
      language: 'en',
    }, { maxImages: 1 });

    const unzipped = unzipSync(epubData);
    const files = Object.keys(unzipped);
    const imageFiles = files.filter(f => f.startsWith('OEBPS/images/'));

    // With maxImages = 1, only 1 image (the cover) should be bundled
    expect(imageFiles.length).toBe(1);
    expect(imageFiles).toContain('OEBPS/images/cover.png');
  }, 15000);
});


