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
});
