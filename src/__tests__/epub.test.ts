import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { generateEpub } from '../services/epub';

describe('EPUB Generator Service (fflate)', () => {
  it('generates a valid, complete EPUB container structure', () => {
    const article = {
      id: 42,
      title: 'Guide to E-Ink Reading & KOReader',
      content: '<p>Reading on e-ink displays is easy on the eyes and provides a paper-like feel.</p><p>KOReader handles EPUB rendering cleanly.</p>',
      url: 'https://example.com/e-ink-guide',
      domain_name: 'example.com',
      created_at: '2026-08-22T10:00:00.000Z',
      language: 'en',
    };

    const epubBytes = generateEpub(article);
    expect(epubBytes).toBeInstanceOf(Uint8Array);
    expect(epubBytes.byteLength).toBeGreaterThan(500);

    // Unzip and inspect archive files
    const unzipped = unzipSync(epubBytes);

    // Check mimetype
    expect(unzipped['mimetype']).toBeDefined();
    const mimetypeContent = strFromU8(unzipped['mimetype']);
    expect(mimetypeContent).toBe('application/epub+zip');

    // Check container.xml
    expect(unzipped['META-INF/container.xml']).toBeDefined();
    const containerXml = strFromU8(unzipped['META-INF/container.xml']);
    expect(containerXml).toContain('OEBPS/content.opf');

    // Check OPF package metadata
    expect(unzipped['OEBPS/content.opf']).toBeDefined();
    const opf = strFromU8(unzipped['OEBPS/content.opf']);
    expect(opf).toContain('<dc:title>Guide to E-Ink Reading &amp; KOReader</dc:title>');
    expect(opf).toContain('<dc:creator>example.com</dc:creator>');
    expect(opf).toContain('media-type="application/xhtml+xml"');

    // Check NCX TOC for KOReader
    expect(unzipped['OEBPS/toc.ncx']).toBeDefined();
    const toc = strFromU8(unzipped['OEBPS/toc.ncx']);
    expect(toc).toContain('Guide to E-Ink Reading &amp; KOReader');

    // Check EPUB3 Nav
    expect(unzipped['OEBPS/nav.xhtml']).toBeDefined();

    // Check CSS
    expect(unzipped['OEBPS/style.css']).toBeDefined();
    const css = strFromU8(unzipped['OEBPS/style.css']);
    expect(css).toContain('font-family: serif');

    // Check Content XHTML
    expect(unzipped['OEBPS/content.xhtml']).toBeDefined();
    const contentHtml = strFromU8(unzipped['OEBPS/content.xhtml']);
    expect(contentHtml).toContain('Guide to E-Ink Reading &amp; KOReader');
    expect(contentHtml).toContain('Reading on e-ink displays is easy on the eyes');
  });
});
